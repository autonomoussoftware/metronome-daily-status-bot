'use strict'

const BigNumber = require('bignumber.js')
const config = require('config')
const toUSD = require('./eth-to-usd.js')
const Web3 = require('web3')
const timeDiffInWords = require('./time-diff-in-words')
const { setLocalState, clearLocalState } = require('./local-state')

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
  const maxPrice = Web3.utils.fromWei(heartbeat.currentAuctionPrice)

  return toUSD(maxPrice)
    .then(function (usd) {
      m.auction.startedAt = new Date()
      m.auction.maxPrice = maxPrice
      m.auction.current = heartbeat.currAuction
      m.auction.maxPriceUSD = usd
      m.auction.supplyLot = heartbeat.dailyMintable

      return setLocalState(m.auction)
    })
}

function setFinalState (heartbeat, m) {
  m.auction.endedAt = new Date()
  m.auction.minPrice = Web3.utils.fromWei(heartbeat._lastPurchasePrice)

  return toUSD(m.auction.minPrice)
    .then(function (usd) {
      m.auction.minPriceUSD = usd
      return clearLocalState()
    })
}

function getReportMessage (auction) {
  const timeElapsed = timeDiffInWords(auction.startedAt, auction.endedAt)
  const maxPrice = BigNumber(auction.maxPrice).toFixed(6)
  const maxPriceUSD = BigNumber(auction.maxPriceUSD).toFixed(2)
  const minPrice = BigNumber(auction.minPrice).toFixed(6)
  const minPriceUSD = BigNumber(auction.minPriceUSD).toFixed(2)
  const nextPrice = BigNumber(minPrice).times(2).toFixed(6)
  const nextPriceUSD = BigNumber(minPriceUSD).times(2).toFixed(2)
  const supplyLot = BigNumber(auction.supplyLot).div(1e18).toFixed(2)
  const { displayName, symbol } = config.eth

  return `Today's #metronome daily supply lot at ${displayName}: ${supplyLot} $MET\n` +
         `Open ${maxPrice} ${symbol} ($${maxPriceUSD}), ` +
         `Final ${minPrice} ${symbol} ($${minPriceUSD}), ` +
         `${timeElapsed} elapsed\n` +
         `Tomorrow's open ${nextPrice} ${symbol} ($${nextPriceUSD})\n` +
         'https://metronome.io'
}

module.exports = {
  hasAuctionStarted,
  hasAuctionEnded,
  setInitialState,
  setFinalState,
  getReportMessage
}
