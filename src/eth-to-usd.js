'use strict'

const pRetry = require('p-retry')
const coincap = require('coincap-lib')
const config = require('config')

const retry = fn => pRetry(fn, { retries: config.coincap.retries })
const toUSD = eth => retry(() => coincap.coin('ETH').then(res => res.price * eth))

module.exports = toUSD
