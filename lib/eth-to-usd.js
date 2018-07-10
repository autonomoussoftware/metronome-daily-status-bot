'use strict'

const coincap = require('coincap-lib')

function toUSD (eth) {
  return coincap.coin('ETH').then(res => res.price_usd * eth)
}

module.exports = toUSD
