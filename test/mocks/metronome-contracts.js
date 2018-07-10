'use strict'

const sinon = require('sinon')

const data = {
  heartbeat: {
    minting: '10',
    currAuction: '1',
    currentAuctionPrice: '900000000',
    _lastPurchasePrice: '100000000'
  }
}

const heartbeat = sinon.stub()

heartbeat
  .onFirstCall()
  .returns(Object.assign({}, data, { currAuction: 0, minting: 0 }))

heartbeat.returns(Object.assign(data, {
  currentAuctionPrice: data.currentAuctionPrice - 100,
  minting: data.minting - 1
}))

const MetronomeContracts = function () {
  this.auctions = {
    methods: {
      heartbeat () {
        return {
          call () {
            return Promise.resolve(heartbeat())
          }
        }
      }
    }
  }
}

module.exports = MetronomeContracts
