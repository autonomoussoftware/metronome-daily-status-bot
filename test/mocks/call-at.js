'use strict'

const callAt = require('../../src/call-at')

function callAtMock (...args) {
  const { timer } = callAt(...args)

  return {
    timer,
    timeRemaining: '__TIME_REMAINING__'
  }
}

module.exports = callAtMock
