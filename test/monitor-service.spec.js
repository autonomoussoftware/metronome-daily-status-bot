'use strict'

const { hasAuctionStarted } = require('../src/monitor-service')

describe('Monitor servie', function () {
  it('should detect if the auction starts', function () {
    const heartbeatLast = {
      _lastPurchasePrice: '3445551243478503',
      currAuction: 374,
      currentAuctionPrice: '3445551243478503',
      dailyMintable: '2973654107638815982',
      minting: 0,
      nextAuctionGMT: 1562198400000
    }
    const heartbeatFirst = {
      _lastPurchasePrice: '6891102486957007',
      currAuction: 375,
      currentAuctionPrice: '6891102486957007',
      dailyMintable: '2973654107638815982',
      minting: 2973654107638815982,
      nextAuctionGMT: 1562284800000
    }
    const monitor = {
      auction: {
        current: heartbeatLast.currAuction + 1, // simulate startMonitor()
        endedAt: null,
        maxPrice: 0,
        maxPriceUSD: 0,
        minPrice: 0,
        minPriceUSD: 0,
        startedAt: null,
        supplyLot: '2880000000000000000000'
      },
      isRunning: false
    }
    expect(hasAuctionStarted(heartbeatLast, monitor)).toBeFalsy()
    expect(hasAuctionStarted(heartbeatFirst, monitor)).toBeTruthy()
  })

  it('should detect if the auction is immediately depleted', function () {
    const heartbeatLast = {
      _lastPurchasePrice: '3445551243478503',
      currAuction: 374,
      currentAuctionPrice: '3445551243478503',
      dailyMintable: '2973654107638815982',
      minting: 0,
      nextAuctionGMT: 1562198400000
    }
    const heartbeatFirst = {
      _lastPurchasePrice: '6891102486957007',
      currAuction: 375,
      currentAuctionPrice: '6891102486957007',
      dailyMintable: '2973654107638815982',
      minting: 0,
      nextAuctionGMT: 1562284800000
    }
    const monitor = {
      auction: {
        current: heartbeatLast.currAuction + 1, // simulate startMonitor()
        endedAt: null,
        maxPrice: 0,
        maxPriceUSD: 0,
        minPrice: 0,
        minPriceUSD: 0,
        startedAt: null,
        supplyLot: '2880000000000000000000'
      },
      isRunning: false
    }
    expect(hasAuctionStarted(heartbeatLast, monitor)).toBeFalsy()
    expect(hasAuctionStarted(heartbeatFirst, monitor)).toBeTruthy()
  })
})
