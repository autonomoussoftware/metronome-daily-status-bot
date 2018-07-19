'use strict'

const { logger: config } = require('config')
const winston = require('winston')
require('winston-papertrail')

winston.transports.Slack = require('slack-winston').Slack

const requiredProps = {
  Papertrail: 'host',
  Slack: 'webhook_url'
}

const transports = Object.keys(config)
  .map(t =>
    config[t] &&
    (requiredProps[t] ? config[t][requiredProps[t]] : true) &&
    new winston.transports[t](config[t])
  )
  .filter(t => !!t)

const logger = new winston.Logger({ transports })

module.exports = logger
