'use strict'

const Web3 = require('web3')
const MetronomeContracts = require('metronome-contracts')
const config = require('config')
const beforeExit = require('before-exit')
const timeBombs = require('time-bombs')
const logger = require('../logger')
const callAt = require('./call-at')
const tweet = require('./twitter')
const { getLocalState } = require('./local-state')
const debounce = require('../lib/promise-lead-debounce')
const {
  hasAuctionStarted,
  hasAuctionEnded,
  setInitialState,
  setFinalState,
  resetMonitorState,
  getReportMessage
} = require('./monitor-service')

const toInt = str => Number.parseInt(str, 10)
const toMs = secs => secs * 1000

const web3 = new Web3(config.eth.wsUrl)
const contracts = new MetronomeContracts(web3)
const getHeartbeat = () => contracts.auctions.methods
  .heartbeat()
  .call()
  .then(heartbeat => (Object.assign({}, heartbeat, {
    minting: toInt(heartbeat.minting),
    nextAuctionGMT: toMs(toInt(heartbeat.nextAuctionGMT)),
    currAuction: toInt(heartbeat.currAuction)
  })))

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
  logger.info('Auction started')
  const subscription = web3.eth.subscribe('newBlockHeaders')
  // Make sure the ethereum node we are connected is up and running. If for some
  // reason it hangs, exit the process to start the bot and connect to a new node
  const bomb = timeBombs.create(config.eth.timeToLive, process.exit)

  if (!isRestart) {
    resetMonitorState(monitor.auction)
  }

  subscription.on('data', debounce(function (header) {
    logger.debug(`New block header received: ${header.hash}`)
    bomb.reset(config.eth.timeToLive)

    getHeartbeat()
      .then(function (heartbeat) {
        logger.debug(`heartbeat current auction price: ${heartbeat.currentAuctionPrice}`)
        logger.debug(`heartbeat minting: ${heartbeat.minting}`)

        if (monitor.auction.endedAt) {
          logger.debug('Trying to process a subscription block but auction has ended')
          return
        }

        if (!hasAuctionStarted(heartbeat, monitor)) {
          return
        }

        if (!monitor.auction.startedAt) {
          return setInitialState(heartbeat, monitor)
        }

        if (!hasAuctionEnded(heartbeat, monitor)) {
          return
        }

        bomb.deactivate()

        return setFinalState(heartbeat, monitor)
          .then(function () {
            const message = getReportMessage(monitor.auction)

            logger.info(message)
            tweet(message)
              .catch(function (err) {
                logger.warn('Twitter failed:', err.message || err)
              })

            const { timeRemaining } = callAt(scanAuction, heartbeat.nextAuctionGMT)
            logger.debug(`Scan auction ended, next scan will start in ${timeRemaining}`)

            return subscription.unsubscribe()
          })
          .catch(function (err) {
            logger.warn('Failed setting final state:', err.message || err)
          })
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

  return Promise.all([getHeartbeat(), getLocalState()])
    .then(function ([heartbeat, auction]) {
      // If the bot was shutdown during an auction we retrieve the information
      // from the storage, otherwise we wait until the next auction to start
      // processing
      if (heartbeat.currAuction === auction.current) {
        monitor.auction = auction
        logger.debug('Local Current auction state found, loading into memory')
        return scanAuction({ isRestart: true })
      }

      monitor.auction.current = heartbeat.currAuction + 1
      const { timeRemaining } = callAt(scanAuction, heartbeat.nextAuctionGMT)
      logger.debug(`Scan auction will start in ${timeRemaining}`)
    })
    .catch(function (err) {
      logger.warn('Staring the auction monitor failed:', err.message || err)
    })
}

beforeExit.do(function (code) {
  logger.warn(`About to exit with code: ${code}`)
})

module.exports = startMonitor
