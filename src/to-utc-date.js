'use strict'

function toUTC (dateStr = Date.now()) {
  const date = new Date(dateStr)

  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  )
}

module.exports = toUTC
