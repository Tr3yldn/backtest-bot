import type { Candle, Signal, StrategyConfig } from './types'
import { ema, macdLine, rsi, sma } from './indicators'

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

  // macd
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

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  id: 'sma-crossover',
  smaCrossover: { fastPeriod: 10, slowPeriod: 30 },
  rsi: { period: 14, oversold: 30, overbought: 70 },
  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
}
