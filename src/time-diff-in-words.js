'use strict'

const timediff = require('timediff')

function timeDiffInWords (dateA, dateB, format = 'YDHm') {
  const diff = timediff(dateA, dateB, format)

  const diffArr = Object.keys(diff)
    .filter(k => !!diff[k])
    .map(k => `${diff[k]} ${k}`)

  if (!diffArr.length) {
    return '0 minutes'
  }
  if (diffArr.length === 1) {
    return diffArr[0]
  }

  const last = diffArr.pop()
  return `${diffArr.join(', ')} and ${last}`
}

module.exports = timeDiffInWords
