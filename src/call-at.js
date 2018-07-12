'use strict'

const differenceInMilliseconds = require('date-fns/difference_in_milliseconds')
const distanceInWordsStrict = require('date-fns/distance_in_words_strict')

function callFnAt (fn, date) {
  const now = new Date()
  const initIn = differenceInMilliseconds(date, now)
  const timer = setTimeout(fn, initIn)

  return {
    timer,
    timeRemaining: distanceInWordsStrict(date, now)
  }
}

module.exports = callFnAt
