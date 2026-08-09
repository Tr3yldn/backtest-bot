import { fetchCandles as fetchCoinbaseCandles, PRODUCTS } from './coinbase'
import { aggregateByCalendarPeriod, aggregateCandles } from './resample'
import type { Candle } from './types'
import { fetchYahooCandles } from './yahoo'

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
    { id: 'PL=F', label: 'Platinum Futures' },
    { id: 'HG=F', label: 'Copper Futures' },
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

// '4h', '1wk', and '1mo' aren't native Coinbase granularities — they're
// synthesized from 1h/1d candles (see fetchMarketCandles below).
const CRYPTO_TIMEFRAMES: Timeframe[] = [
  { key: '60', label: '1m' },
  { key: '300', label: '5m' },
  { key: '900', label: '15m' },
  { key: '3600', label: '1h' },
  { key: '4h', label: '4h' },
  { key: '21600', label: '6h' },
  { key: '86400', label: '1d' },
  { key: '1wk', label: '1w' },
  { key: '1mo', label: '1mo' },
]

// '4h' isn't native to Yahoo either — synthesized from 1h candles.
const YAHOO_ASSET_TIMEFRAMES: Timeframe[] = [
  { key: '1m', label: '1m' },
  { key: '5m', label: '5m' },
  { key: '15m', label: '15m' },
  { key: '30m', label: '30m' },
  { key: '60m', label: '1h' },
  { key: '4h', label: '4h' },
  { key: '1d', label: '1d' },
  { key: '1wk', label: '1w' },
  { key: '1mo', label: '1mo' },
]

export const TIMEFRAMES_BY_CLASS: Record<AssetClass, Timeframe[]> = {
  crypto: CRYPTO_TIMEFRAMES,
  stocks: YAHOO_ASSET_TIMEFRAMES,
  funds: YAHOO_ASSET_TIMEFRAMES,
  indices: YAHOO_ASSET_TIMEFRAMES,
  bonds: YAHOO_ASSET_TIMEFRAMES,
  futures: YAHOO_ASSET_TIMEFRAMES,
  forex: YAHOO_ASSET_TIMEFRAMES,
}

// How much history to request per crypto granularity. Daily fetches the full
// available history (pagination stops naturally at the symbol's Coinbase
// listing date); intraday granularities are capped generously but boundedly —
// unlimited 1m/5m data would mean fetching and rendering millions of candles.
const CRYPTO_CANDLE_COUNT: Record<number, number> = {
  60: 3000, // 1m
  300: 3000, // 5m
  900: 3000, // 15m
  3600: 5000, // 1h
  21600: 5000, // 6h
  86400: Infinity, // 1d — full history
}

export async function fetchMarketCandles(
  assetClass: AssetClass,
  symbolId: string,
  timeframeKey: string,
): Promise<Candle[]> {
  if (assetClass === 'crypto') {
    if (timeframeKey === '4h') {
      const hourly = await fetchCoinbaseCandles(symbolId, 3600, CRYPTO_CANDLE_COUNT[3600])
      return aggregateCandles(hourly, 4)
    }
    if (timeframeKey === '1wk' || timeframeKey === '1mo') {
      const daily = await fetchCoinbaseCandles(symbolId, 86400, Infinity)
      return aggregateByCalendarPeriod(daily, timeframeKey === '1wk' ? 'week' : 'month')
    }
    const granularity = Number(timeframeKey)
    return fetchCoinbaseCandles(symbolId, granularity, CRYPTO_CANDLE_COUNT[granularity] ?? 3000)
  }

  if (timeframeKey === '4h') {
    const hourly = await fetchYahooCandles(symbolId, '60m')
    return aggregateCandles(hourly, 4)
  }
  return fetchYahooCandles(symbolId, timeframeKey)
}
