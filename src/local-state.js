'use strict'

const storage = require('node-persist')
const config = require('config')

function getLocalState () {
  return storage.init({ dir: config.storage.dir })
    .then(() => storage.getItem('state'))
    .then(function (state) {
      if (!state) {
        return state
      }
      if (state.startedAt) {
        state.startedAt = new Date(state.startedAt)
      }
      if (state.endedAt) {
        state.endedAt = new Date(state.endedAt)
      }
      return state
    })
}

function setLocalState (state) {
  return storage.setItem('state', state)
}

function clearLocalState () {
  return storage.clear()
}

module.exports = { getLocalState, setLocalState, clearLocalState }
