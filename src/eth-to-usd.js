'use strict'

const pRetry = require('p-retry')
const config = require('config')
const fetch = require('isomorphic-fetch')
const retry = fn => pRetry(fn, { retries: config.coincap.retries })
const toUSD = eth => retry(() => fetch(`${config.coincap.baseUrl}/rates/${config.eth.id}`).then(response => response.json().then(res => res.data.rateUsd * eth)))
module.exports = toUSD
