'use strict'

const forever = require('forever-monitor')

const child = new (forever.Monitor)('bot.js', {
  max: 3,
  args: []
})

child.start()
