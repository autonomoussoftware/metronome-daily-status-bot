'use strict'

const heartbeat = {
  _dailyMintable: '2880000000000000000000',
  minting: '40',
  currAuction: '1',
  currentAuctionPrice: '100000000',
  _lastPurchasePrice: '500000000',
  nextAuctionGMT: 1531785600000
}

let isFirstCall = true
function getheartbeat () {
  if (isFirstCall) {
    isFirstCall = false
    return {
      minting: 0,
      currAuction: 0,
      nextAuctionGMT: heartbeat.nextAuctionGMT
    }
  }

  heartbeat.minting -= 20
  if (heartbeat.minting === 0) {
    heartbeat.currAuction += 1
  }

  return heartbeat
}

const MetronomeContracts = function () {
  this.Auctions = {
    methods: {
      dailyAuctionStartTime () {
        return {
          call () {
            return Promise.resolve()
          }
        }
      },
      heartbeat () {
        return {
          call () {
            return Promise.resolve(getheartbeat())
          }
        }
      },
      lastPurchaseTick () {
        return {
          call () {
            return Promise.resolve()
          }
        }
      },
      mintable () {
        return {
          call () {
            return Promise.resolve()
          }
        }
      }
    }
  }
}

module.exports = MetronomeContracts
