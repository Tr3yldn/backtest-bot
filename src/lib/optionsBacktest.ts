import { blackScholesPrice, type OptionType } from './blackScholes'
import type { Candle } from './types'

export type OptionPosition = 'long' | 'short'

export interface OptionsConfig {
  optionType: OptionType
  position: OptionPosition
  strikeOffsetPct: number
  expiryDays: number
  ivPercent: number
  riskFreeRatePercent: number
}

export interface OptionsPoint {
  time: number
  spot: number
  optionValue: number
  pnl: number
}

export interface OptionsResult {
  strike: number
  premium: number
  points: OptionsPoint[]
  expiryIndex: number
}

export const DEFAULT_OPTIONS_CONFIG: OptionsConfig = {
  optionType: 'call',
  position: 'long',
  strikeOffsetPct: 0,
  expiryDays: 30,
  ivPercent: 30,
  riskFreeRatePercent: 4.5,
}

/**
 * Simulates a single option position's theoretical value over a real historical
 * underlying price path, using Black-Scholes pricing (not real market option quotes,
 * which are not freely available for backtesting).
 */
export function runOptionsBacktest(candles: Candle[], config: OptionsConfig): OptionsResult {
  const { optionType, position, strikeOffsetPct, expiryDays, ivPercent, riskFreeRatePercent } = config
  const sigma = ivPercent / 100
  const r = riskFreeRatePercent / 100

  const spot0 = candles[0].close
  const strike = spot0 * (1 + strikeOffsetPct / 100)
  const premium = blackScholesPrice(optionType, spot0, strike, expiryDays / 365, r, sigma)

  const expiryIndex = Math.min(expiryDays, candles.length - 1)
  const points: OptionsPoint[] = []

  for (let i = 0; i <= expiryIndex; i++) {
    const candle = candles[i]
    const remainingDays = Math.max(expiryDays - i, 0)
    const T = remainingDays / 365
    const optionValue = blackScholesPrice(optionType, candle.close, strike, T, r, sigma)
    const rawPnl = optionValue - premium
    const pnl = position === 'long' ? rawPnl : -rawPnl
    points.push({ time: candle.time, spot: candle.close, optionValue, pnl })
  }

  return { strike, premium, points, expiryIndex }
}
