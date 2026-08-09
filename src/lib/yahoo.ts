import type { Candle } from './types'

export interface YahooTimeframe {
  key: string
  label: string
  interval: string
  range: string
}

export const YAHOO_TIMEFRAMES: YahooTimeframe[] = [
  { key: '1m', label: '1m', interval: '1m', range: '7d' },
  { key: '5m', label: '5m', interval: '5m', range: '60d' },
  { key: '15m', label: '15m', interval: '15m', range: '60d' },
  { key: '30m', label: '30m', interval: '30m', range: '60d' },
  { key: '60m', label: '1h', interval: '60m', range: '60d' },
  { key: '1d', label: '1d', interval: '1d', range: '2y' },
]

interface YahooChartResult {
  timestamp?: number[]
  indicators?: {
    quote?: Array<{
      open?: (number | null)[]
      high?: (number | null)[]
      low?: (number | null)[]
      close?: (number | null)[]
      volume?: (number | null)[]
    }>
  }
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[]
    error?: { description?: string }
  }
}

/**
 * baseUrl defaults to the Vite-proxied relative path (browser use, avoids CORS).
 * Server-side callers pass the absolute Yahoo host directly, since Node's fetch
 * isn't subject to CORS.
 */
export async function fetchYahooCandles(
  symbol: string,
  timeframeKey: string,
  baseUrl = '/api/yahoo',
  headers?: Record<string, string>,
): Promise<Candle[]> {
  const timeframe = YAHOO_TIMEFRAMES.find((t) => t.key === timeframeKey) ?? YAHOO_TIMEFRAMES[2]
  const url = `${baseUrl}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${timeframe.interval}&range=${timeframe.range}`
  const res = await fetch(url, headers ? { headers } : undefined)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Yahoo Finance request failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as YahooChartResponse
  const result = data.chart?.result?.[0]
  if (!result || !result.timestamp) {
    throw new Error(data.chart?.error?.description ?? `No data returned for symbol "${symbol}".`)
  }

  const timestamps = result.timestamp
  const quote = result.indicators?.quote?.[0] ?? {}
  const { open = [], high = [], low = [], close = [], volume = [] } = quote

  const candles: Candle[] = []
  for (let i = 0; i < timestamps.length; i++) {
    if (open[i] == null || high[i] == null || low[i] == null || close[i] == null) continue
    candles.push({
      time: timestamps[i],
      open: open[i] as number,
      high: high[i] as number,
      low: low[i] as number,
      close: close[i] as number,
      volume: (volume[i] as number) ?? 0,
    })
  }

  return candles
}

export interface SymbolSearchResult {
  symbol: string
  name: string
  type: string
  exchange: string
}

interface YahooSearchQuote {
  symbol: string
  shortname?: string
  longname?: string
  typeDisp?: string
  exchDisp?: string
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[]
}

export async function searchYahooSymbols(
  query: string,
  baseUrl = '/api/yahoo',
  headers?: Record<string, string>,
): Promise<SymbolSearchResult[]> {
  if (query.trim().length === 0) return []
  const url = `${baseUrl}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`
  const res = await fetch(url, headers ? { headers } : undefined)
  if (!res.ok) return []
  const data = (await res.json()) as YahooSearchResponse
  return (data.quotes ?? [])
    .filter((q) => q.symbol)
    .map((q) => ({
      symbol: q.symbol,
      name: q.longname ?? q.shortname ?? q.symbol,
      type: q.typeDisp ?? '',
      exchange: q.exchDisp ?? '',
    }))
}
