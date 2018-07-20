'use strict'

const Web3 = require('web3')
const MetronomeContracts = require('metronome-contracts')
const config = require('config')
const beforeExit = require('before-exit')
const timeBombs = require('time-bombs')
const logger = require('bloq-service-logger')
require('promise-prototype-finally')

const callAt = require('./call-at')
const tweet = require('./twitter')
const { getLocalState } = require('./local-state')
const debounce = require('../lib/promise-lead-debounce')
const {
  hasAuctionStarted,
  hasAuctionEnded,
  setInitialState,
  setFinalState,
  getReportMessage
} = require('./monitor-service')

const toInt = str => Number.parseInt(str, 10)
const toMs = secs => secs * 1000

function createHeartbeat (web3) {
  const contracts = new MetronomeContracts(web3)
  return () =>
    contracts.auctions.methods
      .heartbeat()
      .call()
      .then(heartbeat => (Object.assign({}, heartbeat, {
        minting: toInt(heartbeat.minting),
        nextAuctionGMT: toMs(toInt(heartbeat.nextAuctionGMT)),
        currAuction: toInt(heartbeat.currAuction)
      })))
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
    minPriceUSD: 0
  }
}

function scanAuction ({ isRestart } = {}) {
  logger.verbose(`Blocks scan ${isRestart ? 'restarted' : 'started'}`)

  // Make sure the ethereum node we are connected is up and running. If for some
  // reason it hangs, exit the process to start the bot and connect to a new node
  const bomb = timeBombs.create(config.eth.timeToLive, process.exit)

  const web3 = new Web3(config.eth.wsUrl)
  const getHeartbeat = createHeartbeat(web3)
  const subscription = web3.eth.subscribe('newBlockHeaders')

  subscription.on('data', debounce(function (header) {
    logger.debug(`New block header received: ${header.hash}`)
    bomb.reset(config.eth.timeToLive)

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
          .finally(process.exit)
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
      // If the bot was shutdown during an auction we retrieve the information
      // from the storage, otherwise we wait until the next auction to start
      // processing
      if (heartbeat.currAuction === localState.current) {
        monitor.auction = localState
        logger.debug('Local auction state found, loading into memory')
        return scanAuction({ isRestart: true })
      }

      // The Auction is currently running but we don't have any localstorage data
      if (heartbeat.minting > 0) {
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
