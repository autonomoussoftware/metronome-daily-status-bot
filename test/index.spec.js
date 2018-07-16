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
  error: sinon.spy()
}

jest.doMock('../logger', () => ({
  info: logger.info,
  debug: logger.debug,
  error: logger.error,
  warn: logger.warn
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

  it('should start the monitor and scan auctions', function () {
    jest.useFakeTimers()

    return startMonitor()
      .then(function () {
        jest.runOnlyPendingTimers()

        const debugSpy1Call = logger.debug.getCall(0)
        const debugSpy2Call = logger.debug.getCall(1)

        expect(logger.debug.called).toBe(true)
        expect(logger.debug.calledTwice).toBe(true)

        expect(debugSpy1Call.calledWith('Daily auction monitor started')).toBe(true)
        expect(debugSpy2Call.calledWith('Scan auction will start in __TIME_REMAINING__')).toBe(true)

        web3Mock.emitMockEvent({ hash: 1 })

        expect(logger.info.calledOnce).toBe(true)
        expect(logger.info.calledWith('Scan auction 1 started')).toBe(true)

        expect(logger.debug.calledThrice).toBe(true)
        expect(logger.debug.calledWith('New block header received: 1')).toBe(true)

        web3Mock.emitMockEvent({ hash: 2 })
        expect(logger.debug.calledWith('New block header received: 2')).toBe(true)
      })
  })
})
