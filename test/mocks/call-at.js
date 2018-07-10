'use strict'

function callFnAt (scanAuctionFn) {
  const timer = setTimeout(scanAuctionFn, 0)

  return {
    timer,
    timeRemaining: 0
  }
}

module.exports = callFnAt
