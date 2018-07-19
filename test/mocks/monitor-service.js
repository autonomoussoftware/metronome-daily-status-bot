'use strict'

const sinon = require('sinon')

const spies = {
  hasAuctionStarted: sinon.spy(),
  hasAuctionEnded: sinon.spy(),
  setInitialState: sinon.spy(),
  setFinalState: sinon.spy(),
  resetMonitorState: sinon.spy(),
  getReportMessage: sinon.spy()
}

function hasAuctionStarted (...args) {
  spies.hasAuctionStarted(...args)
  return true
}

function hasAuctionEnded (...args) {
  spies.hasAuctionEnded(...args)
  return true
}

function setInitialState (heartbeat, m) {
  spies.setInitialState(heartbeat, m)

  m.auction.startedAt = new Date()
  m.auction.maxPrice = 1000
  m.auction.maxPriceUSD = 10

  return Promise.resolve()
}

function setFinalState (heartbeat, m) {
  spies.setFinalState(heartbeat, m)
  m.auction.endedAt = new Date()
  m.auction.minPrice = 50
  m.auction.minPriceUSD = 5

  return Promise.resolve()
}

function getReportMessage (...args) {
  spies.getReportMessage(...args)
  return '__FINAL_STATE_MESSAGE__'
}

module.exports = {
  hasAuctionStarted,
  hasAuctionEnded,
  setInitialState,
  setFinalState,
  getReportMessage,
  spies
}
