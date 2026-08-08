import { fetchCandles as fetchCoinbaseCandles, GRANULARITIES, PRODUCTS } from './coinbase'
import type { Candle } from './types'
import { fetchYahooCandles, YAHOO_TIMEFRAMES } from './yahoo'

export type AssetClass = 'crypto' | 'stocks' | 'funds' | 'indices' | 'bonds' | 'futures' | 'forex'

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  crypto: 'Crypto',
  stocks: 'Stocks',
  funds: 'Funds / ETFs',
  indices: 'Indices & Economy',
  bonds: 'Bonds',
  futures: 'Futures',
  forex: 'Forex',
}

export const ASSET_CLASSES: AssetClass[] = ['crypto', 'stocks', 'funds', 'indices', 'bonds', 'futures', 'forex']

export interface MarketSymbol {
  id: string
  label: string
}

export const SYMBOLS_BY_CLASS: Record<AssetClass, MarketSymbol[]> = {
  crypto: PRODUCTS,
  stocks: [
    { id: 'AAPL', label: 'Apple' },
    { id: 'MSFT', label: 'Microsoft' },
    { id: 'GOOGL', label: 'Alphabet' },
    { id: 'AMZN', label: 'Amazon' },
    { id: 'NVDA', label: 'Nvidia' },
    { id: 'META', label: 'Meta Platforms' },
    { id: 'TSLA', label: 'Tesla' },
    { id: 'JPM', label: 'JPMorgan Chase' },
    { id: 'V', label: 'Visa' },
    { id: 'WMT', label: 'Walmart' },
  ],
  funds: [
    { id: 'SPY', label: 'S&P 500 ETF (SPY)' },
    { id: 'QQQ', label: 'Nasdaq-100 ETF (QQQ)' },
    { id: 'VOO', label: 'Vanguard S&P 500 (VOO)' },
    { id: 'VTI', label: 'Total US Market (VTI)' },
    { id: 'ARKK', label: 'ARK Innovation (ARKK)' },
    { id: 'GLD', label: 'Gold Trust (GLD)' },
    { id: 'USO', label: 'US Oil Fund (USO)' },
  ],
  indices: [
    { id: '^GSPC', label: 'S&P 500' },
    { id: '^DJI', label: 'Dow Jones Industrial' },
    { id: '^IXIC', label: 'Nasdaq Composite' },
    { id: '^RUT', label: 'Russell 2000' },
    { id: '^VIX', label: 'CBOE Volatility Index (VIX)' },
    { id: 'DX-Y.NYB', label: 'US Dollar Index' },
    { id: '^TNX', label: '10-Year Treasury Yield' },
  ],
  bonds: [
    { id: 'TLT', label: '20+ Yr Treasury Bond ETF (TLT)' },
    { id: 'IEF', label: '7-10 Yr Treasury Bond ETF (IEF)' },
    { id: 'SHY', label: '1-3 Yr Treasury Bond ETF (SHY)' },
    { id: 'AGG', label: 'US Aggregate Bond ETF (AGG)' },
    { id: '^TNX', label: '10-Year Treasury Yield' },
    { id: '^TYX', label: '30-Year Treasury Yield' },
  ],
  futures: [
    { id: 'ES=F', label: 'S&P 500 Futures' },
    { id: 'NQ=F', label: 'Nasdaq 100 Futures' },
    { id: 'CL=F', label: 'Crude Oil Futures' },
    { id: 'GC=F', label: 'Gold Futures' },
    { id: 'SI=F', label: 'Silver Futures' },
    { id: 'NG=F', label: 'Natural Gas Futures' },
    { id: 'ZC=F', label: 'Corn Futures' },
  ],
  forex: [
    { id: 'EURUSD=X', label: 'EUR / USD' },
    { id: 'GBPUSD=X', label: 'GBP / USD' },
    { id: 'USDJPY=X', label: 'USD / JPY' },
    { id: 'AUDUSD=X', label: 'AUD / USD' },
    { id: 'USDCAD=X', label: 'USD / CAD' },
    { id: 'USDCHF=X', label: 'USD / CHF' },
    { id: 'NZDUSD=X', label: 'NZD / USD' },
  ],
}

export interface Timeframe {
  key: string
  label: string
}

const CRYPTO_TIMEFRAMES: Timeframe[] = GRANULARITIES.map((g) => ({ key: String(g.seconds), label: g.label }))
const YAHOO_ASSET_TIMEFRAMES: Timeframe[] = YAHOO_TIMEFRAMES.map((t) => ({ key: t.key, label: t.label }))

export const TIMEFRAMES_BY_CLASS: Record<AssetClass, Timeframe[]> = {
  crypto: CRYPTO_TIMEFRAMES,
  stocks: YAHOO_ASSET_TIMEFRAMES,
  funds: YAHOO_ASSET_TIMEFRAMES,
  indices: YAHOO_ASSET_TIMEFRAMES,
  bonds: YAHOO_ASSET_TIMEFRAMES,
  futures: YAHOO_ASSET_TIMEFRAMES,
  forex: YAHOO_ASSET_TIMEFRAMES,
}

const CANDLE_COUNT = 500

export async function fetchMarketCandles(
  assetClass: AssetClass,
  symbolId: string,
  timeframeKey: string,
): Promise<Candle[]> {
  if (assetClass === 'crypto') {
    return fetchCoinbaseCandles(symbolId, Number(timeframeKey), CANDLE_COUNT)
  }
  return fetchYahooCandles(symbolId, timeframeKey)
}
