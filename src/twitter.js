'use strict'

const Twitter = require('twitter')
const config = require('config')

const client = new Twitter({
  consumer_key: config.Twitter.consumerKey,
  consumer_secret: config.Twitter.consumerSecret,
  access_token_key: config.Twitter.accessTokenKey,
  access_token_secret: config.Twitter.accessTokenSecret
})

const tweet = content => client.post('statuses/update', { status: content })

module.exports = tweet
