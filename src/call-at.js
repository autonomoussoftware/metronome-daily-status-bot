'use strict'

const differenceInMilliseconds = require('date-fns/difference_in_milliseconds')
const timeDiffInWords = require('./time-diff-in-words')

function callFnAt (fn, date) {
  const now = new Date()
  const initIn = Math.max(differenceInMilliseconds(date, now), 0)
  const timer = setTimeout(fn, initIn)
  const timeRemaining = initIn === 0 ? '0 seconds' : timeDiffInWords(now, date)

  return { timer, timeRemaining }
}

module.exports = callFnAt
