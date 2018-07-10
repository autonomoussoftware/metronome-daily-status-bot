'use strict'

const heartbeat = {
  minting: '40',
  currAuction: '1',
  currentAuctionPrice: '100000000',
  _lastPurchasePrice: '500000000'
}

let isFirstCall = true
function getheartbeat () {
  if (isFirstCall) {
    isFirstCall = false
    return { minting: 0, currAuction: 0 }
  }

  heartbeat.minting -= 20
  if (heartbeat.minting === 0) {
    heartbeat.currAuction += 1
  }

  return heartbeat
}

const MetronomeContracts = function () {
  this.auctions = {
    methods: {
      heartbeat () {
        return {
          call () {
            return Promise.resolve(getheartbeat())
          }
        }
      }
    }
  }
}

module.exports = MetronomeContracts
