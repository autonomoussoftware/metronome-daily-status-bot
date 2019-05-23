/* global jest, describe, it, expect, beforeEach */

'use strict'

const sinon = require('sinon')
const web3Mock = require('./mocks/web3')
const metronomeContractsMock = require('./mocks/metronome-contracts')
const callAtMock = require('./mocks/call-at')
const monitorServicesMock = require('./mocks/monitor-service')

const logger = {
  info: sinon.spy(),
  debug: sinon.spy(),
  warn: sinon.spy(),
  error: sinon.spy(),
  verbose: sinon.spy()
}

jest.doMock('bloq-service-logger', () => ({
  info: logger.info,
  debug: logger.debug,
  error: logger.error,
  warn: logger.warn,
  verbose: logger.verbose
}))
jest.doMock('web3', () => web3Mock)
jest.doMock('metronome-contracts', () => metronomeContractsMock)
jest.doMock('../src/call-at', () => callAtMock)
jest.doMock('../src/monitor-service', () => monitorServicesMock)

const startMonitor = require('../src')

describe('Metronome daily auction monitor', function () {
  beforeEach(function () {
    logger.info.resetHistory()
    logger.debug.resetHistory()
    logger.error.resetHistory()
    logger.warn.resetHistory()
  })

  it('should start the monitor and scan auctions', function (done) {
    jest.useFakeTimers()

    return startMonitor()
      .then(function () {
        jest.runOnlyPendingTimers()

        expect(logger.verbose.callCount).toBe(2)
        expect(logger.debug.callCount).toBe(3)
        expect(logger.debug.calledWith('Scan auction will start in __TIME_REMAINING__')).toBe(true)

        web3Mock.emitMockEvent({ hash: 1 })
        web3Mock.emitMockEvent({ hash: 2 })
        web3Mock.emitMockEvent({ hash: 3 })
        web3Mock.emitMockEvent({ hash: 4 })

        process.nextTick(function () {
          expect(monitorServicesMock.spies.setInitialState.calledOnce).toBe(true)
          done()
        })
      })
  })
})
