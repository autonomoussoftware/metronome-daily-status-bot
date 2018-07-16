'use strict'

const sinon = require('sinon')
const monitorServices = require('../../src/monitor-service')

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
  return monitorServices.hasAuctionStarted(...args)
}

function hasAuctionEnded (...args) {
  spies.hasAuctionEnded(...args)
  return monitorServices.hasAuctionEnded(...args)
}

function setInitialState (...args) {
  spies.setInitialState(...args)
  return monitorServices.setInitialState(...args)
}

function setFinalState (...args) {
  spies.setFinalState(...args)
  return monitorServices.setFinalState(...args)
}

function resetMonitorState (...args) {
  spies.resetMonitorState(...args)
  return monitorServices.resetMonitorState(...args)
}

function getReportMessage (...args) {
  spies.getReportMessage(...args)
  return monitorServices.getReportMessage(...args)
}

module.exports = {
  hasAuctionStarted,
  hasAuctionEnded,
  setInitialState,
  setFinalState,
  resetMonitorState,
  getReportMessage,
  spies
}
