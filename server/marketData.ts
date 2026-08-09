import { aggregateCandles } from '../src/lib/resample.ts'
import type { Candle } from '../src/lib/types.ts'
import { fetchYahooCandles } from '../src/lib/yahoo.ts'

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com'
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; backtest-bot/1.0)' }

export async function fetchCandlesForAutoTrader(symbol: string, timeframeKey: string): Promise<Candle[]> {
  if (timeframeKey === '4h') {
    const hourly = await fetchYahooCandles(symbol, '60m', YAHOO_BASE_URL, YAHOO_HEADERS)
    return aggregateCandles(hourly, 4)
  }
  return fetchYahooCandles(symbol, timeframeKey, YAHOO_BASE_URL, YAHOO_HEADERS)
}
