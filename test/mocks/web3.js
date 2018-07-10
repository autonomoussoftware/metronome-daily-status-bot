'use strict'

const EventEmitter = require('events')

const emitter = new EventEmitter()
const noop = () => undefined

const Web3Mock = function () {
  this.eth = {
    subscribe () {
      return {
        on (ev, fn) {
          emitter.on('data', data => fn(data))
        }
      }
    },
    clearSubscriptions: noop
  }
  this.utils = {
    fromWei: v => v
  }
}

Web3Mock.emitMockEvent = function (data) {
  emitter.emit('data', data)
}

module.exports = Web3Mock
