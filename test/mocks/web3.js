'use strict'

const EventEmitter = require('events')

const emitter = new EventEmitter()

const Web3Mock = function () {
  this.eth = {
    subscribe () {
      return {
        on (ev, fn) {
          emitter.on('data', data => fn(data))
        }
      }
    },
    clearSubscriptions () {

    }
  }

  this.utils = {
    fromWei: v => v
  }
}

Web3Mock.emitMockEvent = function () {
  let hash = 0
  emitter.emit('data', { hash: hash += 1 })
}

module.exports = Web3Mock
