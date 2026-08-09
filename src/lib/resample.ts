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

function calendarPeriodKey(date: Date, period: 'week' | 'month'): string {
  if (period === 'month') return `${date.getUTCFullYear()}-${date.getUTCMonth()}`
  const day = date.getUTCDay() // 0 = Sunday
  const diffToMonday = (day + 6) % 7
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - diffToMonday)
  return monday.toISOString().slice(0, 10)
}

/**
 * Groups candles into real calendar weeks (Monday-start) or months, rather
 * than a fixed candle count — needed for crypto's weekly/monthly timeframes
 * since Coinbase doesn't provide those granularities natively and calendar
 * periods have varying lengths (months) or need consistent alignment (weeks).
 */
export function aggregateByCalendarPeriod(candles: Candle[], period: 'week' | 'month'): Candle[] {
  const out: Candle[] = []
  let currentKey: string | null = null
  let group: Candle[] = []

  function flush() {
    if (group.length === 0) return
    out.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
    })
    group = []
  }

  for (const candle of candles) {
    const key = calendarPeriodKey(new Date(candle.time * 1000), period)
    if (currentKey !== null && key !== currentKey) flush()
    currentKey = key
    group.push(candle)
  }
  flush()

  return out
}
