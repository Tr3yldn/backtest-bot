import type { Candle } from './types'

/**
 * Combines every `factor` consecutive candles into one larger candle.
 * Used to synthesize timeframes (e.g. 4h) that the underlying data source
 * doesn't provide natively.
 */
export function aggregateCandles(candles: Candle[], factor: number): Candle[] {
  if (factor <= 1) return candles
  const out: Candle[] = []

  for (let i = 0; i < candles.length; i += factor) {
    const group = candles.slice(i, i + factor)
    if (group.length === 0) continue

    out.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
    })
  }

  return out
}
