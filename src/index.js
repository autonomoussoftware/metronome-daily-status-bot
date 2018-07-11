'use strict'

const Web3 = require('web3')
const MetronomeContracts = require('metronome-contracts')
const BigNumber = require('bignumber.js')
const config = require('config')
const formatDistanceStrict = require('date-fns/formatDistanceStrict')
const logger = require('../logger')
const toUTC = require('./to-utc-date')
const toUSD = require('./eth-to-usd.js')
const callAt = require('./call-at')

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

function report (auction) {
  const timeElapsed = formatDistanceStrict(auction.endedAt, auction.startedAt)
  const maxPrice = BigNumber(auction.maxPrice).toFixed(6)
  const maxPriceUSD = BigNumber(auction.maxPriceUSD).toFixed(2)
  const minPrice = BigNumber(auction.minPrice).toFixed(6)
  const minPriceUSD = BigNumber(auction.minPriceUSD).toFixed(2)
  const nextPrice = BigNumber(minPrice).times(2)
  const nextPriceUSD = BigNumber(minPriceUSD).times(2)

  logger.info('Today\'s #metronome Daily Supply Lot: 2880 $MET ' +
              `Open ${maxPrice} ETH ($${maxPriceUSD}), Final ${minPrice} ` +
              `ETH ($${minPriceUSD}), ${timeElapsed} elapsed. ` +
              `Tomorrow open ${nextPrice} ETH ($${nextPriceUSD})`)
}

function hasAuctionStarted (heartbeat, m) {
  const { startedAt, current } = m.auction
  return startedAt || current === heartbeat.currAuction
}

function hasAuctionEnded (heartbeat, m) {
  if (heartbeat.minting === 0) {
    return true
  }
  return heartbeat.currAuction > m.auction.current
}

function setInitialState (heartbeat, m) {
  m.auction.startedAt = toUTC(new Date())
  m.auction.maxPrice = web3.utils.fromWei(heartbeat.currentAuctionPrice)

  return toUSD(m.auction.maxPrice)
    .then(function (usd) {
      m.auction.maxPriceUSD = usd
      logger.debug(`Max price set to: ${usd} USD`)
    })
}

function setFinalState (heartbeat, m) {
  m.auction.endedAt = toUTC(new Date())
  m.auction.minPrice = web3.utils.fromWei(heartbeat._lastPurchasePrice)
  m.auction.current += 1

  return toUSD(m.auction.minPrice)
    .then(function (usd) {
      m.auction.minPriceUSD = usd
      logger.debug(`Min price set to: ${usd} USD`)
    })
}

function scanAuction () {
  logger.debug(`Scan auction ${monitor.auction.current} started`)
  const subscription = web3.eth.subscribe('newBlockHeaders')

  subscription.on('data', function (header) {
    logger.debug(`New block header received: ${header.hash}`)

    getHeartbeat()
      .then(function (heartbeat) {
        logger.debug(`heartbeat currentAuctionPrice: ${heartbeat.currentAuctionPrice}`)
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
            report(monitor.auction)
            return subscription.unsubscribe()
          })
          .then(function () {
            monitor.resetState()
            const { timer, timeRemaining } = callAt(scanAuction, heartbeat.nextAuctionGMT)
            monitor.timer = timer
            logger.info(`Scan auction ended, next scan will start in ${timeRemaining}`)
          })
          .catch(function (err) {
            logger.error('Unsubscription error:', err.message)
          })
      })
      .catch(function (err) {
        logger.error('Heartbeat error:', err.message)
      })
  })

  subscription.on('error', function (err) {
    logger.error('Subscription error:', err.message)
  })
}

monitor.start = function () {
  if (monitor.isRunning) {
    return
  }
  logger.info('Daily auction monitor started')
  monitor.isRunning = true
  return getHeartbeat()
    .then(function (heartbeat) {
      monitor.auction.current = heartbeat.currAuction + 1
      const { timer, timeRemaining } = callAt(scanAuction, heartbeat.nextAuctionGMT)
      monitor.timer = timer
      logger.info(`Scan auction will start in ${timeRemaining}`)
    })
}

monitor.stop = function () {
  clearTimeout(monitor.timer)
  web3.eth.clearSubscriptions()
  monitor.resetState()
  monitor.isRunning = false
  logger.info('Daily auction monitor stopped')
}

monitor.resetState = function () {
  monitor.auction.startedAt = null
  monitor.auction.endedAt = null
  monitor.auction.maxPrice = 0
  monitor.auction.maxPriceUSD = 0
  monitor.auction.minPrice = 0
  monitor.auction.minPriceUSD = 0
}

module.exports = monitor
