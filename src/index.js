'use strict'

const Web3 = require('web3')
const MetronomeContracts = require('metronome-contracts')
const config = require('config')
const createMetronomeStatus = require('metronome-sdk-status')
const beforeExit = require('before-exit')
const timeBombs = require('time-bombs')
const logger = require('bloq-service-logger')
require('promise-prototype-finally')

const callAt = require('./call-at')
const tweet = require('./twitter')
const { getLocalState } = require('./local-state')
const debounce = require('../lib/promise-lead-debounce')
const { clearLocalState } = require('./local-state')
const {
  hasAuctionStarted,
  hasAuctionEnded,
  setInitialState,
  setFinalState,
  getReportMessage
} = require('./monitor-service')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const toInt = str => Number.parseInt(str, 10)
const toMs = secs => secs * 1000

function createHeartbeat (web3) {
  const contracts = new MetronomeContracts(web3)
  const { getAuctionStatus } = createMetronomeStatus(contracts)
  return () =>
    getAuctionStatus()
      .then(status => ({
        _lastPurchasePrice: status.lastPurchasePrice,
        currAuction: toInt(status.currAuction),
        currentAuctionPrice: status.currentAuctionPrice,
        dailyMintable: status.dailyMintable,
        minting: toInt(status.minting),
        nextAuctionGMT: toMs(status.nextAuctionTime)
      }))
}

const monitor = {
  isRunning: false,

  auction: {
    current: 0,
    startedAt: null,
    endedAt: null,
    maxPrice: 0,
    maxPriceUSD: 0,
    minPrice: 0,
    minPriceUSD: 0,
    supplyLot: '2880000000000000000000'
  }
}

function scanAuction ({ isRestart } = {}) {
  logger.verbose(`Blocks scan ${isRestart ? 'restarted' : 'started'}`)

  // Make sure the ethereum node we are connected is up and running. If for some
  // reason it hangs, exit the process to start the bot and connect to a new node
  const bomb = timeBombs.create(config.eth.wsTimeToLive, process.exit)

  const web3 = new Web3(config.eth.wsUrl)
  const getHeartbeat = createHeartbeat(web3)
  const subscription = web3.eth.subscribe('newBlockHeaders')

  subscription.on('data', debounce(function (header) {
    logger.debug(`New block header received: ${header.hash}`)
    bomb.reset(config.eth.wsTimeToLive)

    return getHeartbeat()
      .then(function (heartbeat) {
        logger.debug(`heartbeat current auction price: ${heartbeat.currentAuctionPrice}`)
        logger.debug(`heartbeat minting: ${heartbeat.minting}`)

        // This might happen when the ethereum node hangs and suddenly sends lots
        // of subscription blocks
        if (monitor.auction.endedAt) {
          logger.debug('Trying to process a subscription block but auction has ended')
          return
        }

        if (!hasAuctionStarted(heartbeat, monitor)) {
          logger.debug('Auction has not started, waiting for next block event')
          return
        }

        if (!monitor.auction.startedAt) {
          return setInitialState(heartbeat, monitor).then(() => logger.info('Auction started'))
        }

        if (!hasAuctionEnded(heartbeat, monitor)) {
          return
        }

        bomb.deactivate()

        return setFinalState(heartbeat, monitor)
          .then(function () {
            const message = getReportMessage(monitor.auction)

            logger.info(message)
            return tweet(message)
              .catch(function (err) {
                logger.warn('Twitter failed:', err.message || err)
              })
          })
          .catch(function (err) {
            logger.warn('Failed setting final state:', err.message || err)
          })
          // We are killing the bot using a timeout to try to avoid connecting
          // to a late node
          .finally(() => delay(config.delayBeforeExit).then(() => process.exit()))
      })
      .catch(function (err) {
        logger.warn('Heartbeat failed:', err.message || err)
      })
  }))

  subscription.on('error', function (err) {
    logger.warn('Subscription failed:', err.message || err)
  })
}

function startMonitor () {
  if (monitor.isRunning) {
    return
  }
  logger.verbose('Daily auction monitor started')
  monitor.isRunning = true

  const web3 = new Web3(config.eth.wsUrl)
  const getHeartbeat = createHeartbeat(web3)

  return Promise.all([getHeartbeat(), getLocalState()])
    .then(function ([heartbeat, localState]) {
      logger.debug(`Heartbeat: ${JSON.stringify(heartbeat, null, 2)}`)
      logger.debug(`Local storage heartbeat: ${JSON.stringify(localState, null, 2)}`)

      // If the bot was shutdown during an auction we retrieve the information
      // from the storage, otherwise we wait until the next auction to start
      // processing
      if (heartbeat.currAuction === localState.current) {
        monitor.auction = localState
        logger.debug('Local auction state found, loading into memory')
        return scanAuction({ isRestart: true })
      }

      // This scenario happens when the bot reconnects to a late node
      if (heartbeat.currAuction < localState.current) {
        logger.warn('Bot connected to a late node, reconnecting')
        return process.exit()
      }

      // This scenario happens when the bot starts the auction using a late node
      // and then it reconnects to an updated one
      if (heartbeat.currAuction > localState.current) {
        logger.warn('Bot found a newer auction, reseting state and restarting scan')
        return clearLocalState()
          .then(function () {
            monitor.auction.current = heartbeat.currAuction
            scanAuction({ isRestart: true })
          })
      }

      // The Auction is currently running but we don't have any localstorage data
      if (heartbeat.minting > 0) {
        logger.warn('Bot started on a live auction')
        monitor.auction.current = heartbeat.currAuction
        return scanAuction({ isRestart: true })
      }

      monitor.auction.current = heartbeat.currAuction + 1
      const { timeRemaining } = callAt(
        scanAuction,
        heartbeat.nextAuctionGMT - config.leadStart
      )
      logger.debug(`Scan auction will start in ${timeRemaining}`)
    })
    .catch(function (err) {
      logger.warn('Staring the auction monitor failed:', err.message || err)
    })
    .finally(() => web3.currentProvider.connection.close())
}

beforeExit.do(function (code) {
  logger.warn(`About to exit with code: ${code}`)
})

module.exports = startMonitor
