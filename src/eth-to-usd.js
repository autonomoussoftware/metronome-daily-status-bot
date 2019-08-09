'use strict'

const pRetry = require('p-retry')
const config = require('config')
const { BittrexClient } = require('bittrex-node')
const client = new BittrexClient()
const retry = fn => pRetry(fn, { retries: config.retries })
const toUSD = eth => retry(() => client.ticker(`USD-${config.eth.symbol}`).then(res => res.Last * eth))
module.exports = toUSD
