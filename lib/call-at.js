'use strict'

const differenceInMilliseconds = require('date-fns/differenceInMilliseconds')
const formatDistance = require('date-fns/formatDistance')
const toUTC = require('./to-utc-date')

function callFnAt (scanAuctionFn, date) {
  const now = toUTC(new Date())
  const startAt = toUTC(date)
  const initIn = differenceInMilliseconds(startAt, now)
  const timer = setTimeout(scanAuctionFn, initIn)

  return {
    timer,
    timeRemaining: formatDistance(startAt, now, { includeSeconds: true })
  }
}

module.exports = callFnAt
