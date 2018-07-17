'use strict'

const Web3 = require('web3')
const MetronomeContracts = require('metronome-contracts')
const config = require('config')
const beforeExit = require('before-exit')

const logger = require('../logger')
const callAt = require('./call-at')
const tweet = require('./twitter')
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
  timer: null,

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

function scanAuction () {
  logger.info('Auction started')
  const subscription = web3.eth.subscribe('newBlockHeaders')

  subscription.on('data', function (header) {
    logger.debug(`New block header received: ${header.hash}`)

    getHeartbeat()
      .then(function (heartbeat) {
        logger.debug(`heartbeat current auction price: ${heartbeat.currentAuctionPrice}`)
        logger.debug(`heartbeat minting: ${heartbeat.minting}`)

        if (!hasAuctionStarted(heartbeat, monitor)) {
          return
        }

        if (!monitor.auction.startedAt) {
          return setInitialState(heartbeat, monitor)
        }

        if (!hasAuctionEnded(heartbeat, monitor)) {
          return
        }

        return setFinalState(heartbeat, monitor)
          .then(function () {
            const message = getReportMessage(monitor.auction)

            logger.info(message)
            tweet(message)
              .catch(function (err) {
                logger.warn('Twitter failed:', err.message || err)
              })

            return subscription.unsubscribe()
          })
          .then(function () {
            resetMonitorState(monitor.auction)
            const { timer, timeRemaining } = callAt(scanAuction, heartbeat.nextAuctionGMT)
            monitor.timer = timer
            logger.debug(`Scan auction ended, next scan will start in ${timeRemaining}`)
          })
          .catch(function (err) {
            logger.warn('Failed setting final state:', err.message || err)
          })
      })
      .catch(function (err) {
        logger.warn('Heartbeat failed:', err.message || err)
      })
  })

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
  return getHeartbeat()
    .then(function (heartbeat) {
      monitor.auction.current = heartbeat.currAuction + 1
      const { timer, timeRemaining } = callAt(scanAuction, heartbeat.nextAuctionGMT)
      monitor.timer = timer
      logger.debug(`Scan auction will start in ${timeRemaining}`)
    })
    .catch(function (err) {
      logger.warn('Heartbeat failed:', err.message || err)
    })
}

beforeExit.do(function (code) {
  logger.warn(`About to exit with code: ${code}`)
})

module.exports = startMonitor
