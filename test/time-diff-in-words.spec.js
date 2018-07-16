/* global describe, it, expect */

'use strict'

const timeDiffInWords = require('../src/time-diff-in-words')
const addMinutes = require('date-fns/add_minutes')
const addHours = require('date-fns/add_hours')

describe('Time diff in words', function () {
  it('should return the time difference (minutes) in readable words', function () {
    const now = new Date()
    const then = addMinutes(now, 10)
    const diff = timeDiffInWords(now, then)

    expect(diff).toBe('10 minutes')
  })

  it('should return the time difference (hours) in readable words', function () {
    const now = new Date()
    const then = addHours(now, 4)
    const diff = timeDiffInWords(now, then)

    expect(diff).toBe('4 hours')
  })

  it('should return the time difference (hours and minutes) in readable words', function () {
    const now = new Date()
    const then = addHours(addMinutes(now, 10), 4)
    const diff = timeDiffInWords(now, then)

    expect(diff).toBe('4 hours and 10 minutes')
  })
})
