'use strict'

const BigNumber = require('bignumber.js')
const toUSD = require('./eth-to-usd.js')
const Web3 = require('web3')
const timeDiffInWords = require('./time-diff-in-words')

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
  m.auction.startedAt = new Date()
  m.auction.maxPrice = Web3.utils.fromWei(heartbeat.currentAuctionPrice)

  return toUSD(m.auction.maxPrice)
    .then(function (usd) {
      m.auction.maxPriceUSD = usd
    })
}

function setFinalState (heartbeat, m) {
  m.auction.endedAt = new Date()
  m.auction.minPrice = Web3.utils.fromWei(heartbeat._lastPurchasePrice)
  m.auction.current += 1

  return toUSD(m.auction.minPrice)
    .then(function (usd) {
      m.auction.minPriceUSD = usd
    })
}

function resetMonitorState (auction) {
  auction.startedAt = null
  auction.endedAt = null
  auction.maxPrice = 0
  auction.maxPriceUSD = 0
  auction.minPrice = 0
  auction.minPriceUSD = 0
}

function getReportMessage (auction) {
  const timeElapsed = timeDiffInWords(auction.startedAt, auction.endedAt)
  const maxPrice = BigNumber(auction.maxPrice).toFixed(6)
  const maxPriceUSD = BigNumber(auction.maxPriceUSD).toFixed(2)
  const minPrice = BigNumber(auction.minPrice).toFixed(6)
  const minPriceUSD = BigNumber(auction.minPriceUSD).toFixed(2)
  const nextPrice = BigNumber(minPrice).times(2)
  const nextPriceUSD = BigNumber(minPriceUSD).times(2)

  return 'Today\'s #metronome Daily Supply Lot: 2880 $MET \n' +
         `Open ${maxPrice} ETH ($${maxPriceUSD}), Final ${minPrice} ` +
         `ETH ($${minPriceUSD}), ${timeElapsed} elapsed \n` +
         `Tomorrow open ${nextPrice} ETH ($${nextPriceUSD}) \n` +
         'https://metronome.io'
}

module.exports = {
  hasAuctionStarted,
  hasAuctionEnded,
  setInitialState,
  setFinalState,
  resetMonitorState,
  getReportMessage
}
