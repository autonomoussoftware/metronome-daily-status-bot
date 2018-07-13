'use strict'

const differenceInMilliseconds = require('date-fns/difference_in_milliseconds')
const timeDiffInWords = require('./time-diff-in-words')

function callFnAt (fn, date) {
  const now = new Date()
  const initIn = differenceInMilliseconds(date, now)
  const timer = setTimeout(fn, initIn)

  return {
    timer,
    timeRemaining: timeDiffInWords(now, date)
  }
}

module.exports = callFnAt
