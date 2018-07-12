'use strict'

const coincap = require('coincap-lib')

const toUSD = eth => coincap.coin('ETH').then(res => res.price * eth)

module.exports = toUSD
