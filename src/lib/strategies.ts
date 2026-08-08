import type { Candle, Signal, StrategyConfig } from './types'
import { bollingerBands, donchianChannel, ema, macdLine, rsi, sma } from './indicators'

function emaOfSeries(series: (number | null)[], period: number): (number | null)[] {
  const firstIdx = series.findIndex((v) => v !== null)
  if (firstIdx === -1) return series.map(() => null)
  const values = series.slice(firstIdx) as number[]
  const emaValues = ema(values, period)
  const out: (number | null)[] = new Array(series.length).fill(null)
  for (let i = 0; i < emaValues.length; i++) out[firstIdx + i] = emaValues[i]
  return out
}

export interface StrategyOutput {
  signals: Signal[]
  indicatorSeries: Record<string, (number | null)[]>
}

export function runStrategy(candles: Candle[], config: StrategyConfig): StrategyOutput {
  const closes = candles.map((c) => c.close)

  if (config.id === 'sma-crossover') {
    const { fastPeriod, slowPeriod } = config.smaCrossover
    const fast = sma(closes, fastPeriod)
    const slow = sma(closes, slowPeriod)
    const signals: Signal[] = []
    let inPosition = false
    for (let i = 1; i < candles.length; i++) {
      if (fast[i] === null || slow[i] === null || fast[i - 1] === null || slow[i - 1] === null) continue
      const crossedUp = (fast[i - 1] as number) <= (slow[i - 1] as number) && (fast[i] as number) > (slow[i] as number)
      const crossedDown = (fast[i - 1] as number) >= (slow[i - 1] as number) && (fast[i] as number) < (slow[i] as number)
      if (crossedUp && !inPosition) {
        signals.push({ index: i, type: 'buy' })
        inPosition = true
      } else if (crossedDown && inPosition) {
        signals.push({ index: i, type: 'sell' })
        inPosition = false
      }
    }
    return { signals, indicatorSeries: { fast, slow } }
  }

  if (config.id === 'rsi') {
    const { period, oversold, overbought } = config.rsi
    const r = rsi(closes, period)
    const signals: Signal[] = []
    let inPosition = false
    for (let i = 1; i < candles.length; i++) {
      if (r[i] === null || r[i - 1] === null) continue
      const crossedUpFromOversold = (r[i - 1] as number) < oversold && (r[i] as number) >= oversold
      const crossedDownFromOverbought = (r[i - 1] as number) > overbought && (r[i] as number) <= overbought
      if (crossedUpFromOversold && !inPosition) {
        signals.push({ index: i, type: 'buy' })
        inPosition = true
      } else if (crossedDownFromOverbought && inPosition) {
        signals.push({ index: i, type: 'sell' })
        inPosition = false
      }
    }
    return { signals, indicatorSeries: { rsi: r } }
  }

  if (config.id === 'macd') {
    const { fastPeriod, slowPeriod, signalPeriod } = config.macd
    const { macd } = macdLine(closes, fastPeriod, slowPeriod)
    const signalLine = emaOfSeries(macd, signalPeriod)
    const signals: Signal[] = []
    let inPosition = false
    for (let i = 1; i < candles.length; i++) {
      if (macd[i] === null || signalLine[i] === null || macd[i - 1] === null || signalLine[i - 1] === null) continue
      const crossedUp = (macd[i - 1] as number) <= (signalLine[i - 1] as number) && (macd[i] as number) > (signalLine[i] as number)
      const crossedDown = (macd[i - 1] as number) >= (signalLine[i - 1] as number) && (macd[i] as number) < (signalLine[i] as number)
      if (crossedUp && !inPosition) {
        signals.push({ index: i, type: 'buy' })
        inPosition = true
      } else if (crossedDown && inPosition) {
        signals.push({ index: i, type: 'sell' })
        inPosition = false
      }
    }
    return { signals, indicatorSeries: { macd, signal: signalLine } }
  }

  if (config.id === 'bollinger') {
    const { period, stdDevMultiplier } = config.bollinger
    const { middle, upper, lower } = bollingerBands(closes, period, stdDevMultiplier)
    const signals: Signal[] = []
    let inPosition = false
    for (let i = 1; i < candles.length; i++) {
      if (upper[i] === null || lower[i] === null || upper[i - 1] === null || lower[i - 1] === null) continue
      const bouncedUpFromLower = closes[i - 1] < (lower[i - 1] as number) && closes[i] >= (lower[i] as number)
      const bouncedDownFromUpper = closes[i - 1] > (upper[i - 1] as number) && closes[i] <= (upper[i] as number)
      if (bouncedUpFromLower && !inPosition) {
        signals.push({ index: i, type: 'buy' })
        inPosition = true
      } else if (bouncedDownFromUpper && inPosition) {
        signals.push({ index: i, type: 'sell' })
        inPosition = false
      }
    }
    return { signals, indicatorSeries: { middle, upper, lower } }
  }

  // donchian
  const { period } = config.donchian
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const { upper, lower } = donchianChannel(highs, lows, period)
  const signals: Signal[] = []
  let inPosition = false
  for (let i = 1; i < candles.length; i++) {
    if (upper[i] === null || lower[i] === null) continue
    const breakoutUp = closes[i] > (upper[i] as number)
    const breakoutDown = closes[i] < (lower[i] as number)
    if (breakoutUp && !inPosition) {
      signals.push({ index: i, type: 'buy' })
      inPosition = true
    } else if (breakoutDown && inPosition) {
      signals.push({ index: i, type: 'sell' })
      inPosition = false
    }
  }
  return { signals, indicatorSeries: { donchianUpper: upper, donchianLower: lower } }
}

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  id: 'sma-crossover',
  smaCrossover: { fastPeriod: 10, slowPeriod: 30 },
  rsi: { period: 14, oversold: 30, overbought: 70 },
  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  bollinger: { period: 20, stdDevMultiplier: 2 },
  donchian: { period: 20 },
}
