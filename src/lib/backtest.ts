import type { BacktestResult, BacktestStats, Candle, EquityPoint, Signal, StrategyConfig, Trade } from './types'
import { runStrategy } from './strategies'

const STARTING_CASH = 10000

export function runBacktest(candles: Candle[], config: StrategyConfig): BacktestResult {
  const { signals, indicatorSeries } = runStrategy(candles, config)
  const signalByIndex = new Map<number, Signal>(signals.map((s) => [s.index, s]))

  const trades: Trade[] = []
  const equityCurve: EquityPoint[] = []

  let cash = STARTING_CASH
  let units = 0
  let entryIndex = -1
  let entryPrice = 0

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]
    const signal = signalByIndex.get(i)

    if (signal?.type === 'buy' && units === 0) {
      units = cash / candle.close
      cash = 0
      entryIndex = i
      entryPrice = candle.close
    } else if (signal?.type === 'sell' && units > 0) {
      cash = units * candle.close
      trades.push({
        entryIndex,
        entryTime: candles[entryIndex].time,
        entryPrice,
        exitIndex: i,
        exitTime: candle.time,
        exitPrice: candle.close,
        returnPct: ((candle.close - entryPrice) / entryPrice) * 100,
      })
      units = 0
      entryIndex = -1
      entryPrice = 0
    }

    const equity = units > 0 ? units * candle.close : cash
    equityCurve.push({ time: candle.time, equity })
  }

  return { signals, trades, equityCurve, indicatorSeries }
}

export function computeStats(result: BacktestResult, uptoIndex: number): BacktestStats {
  const equitySlice = result.equityCurve.slice(0, uptoIndex + 1)
  const startingEquity = STARTING_CASH
  const endingEquity = equitySlice.length > 0 ? equitySlice[equitySlice.length - 1].equity : startingEquity

  let peak = -Infinity
  let maxDrawdownPct = 0
  for (const point of equitySlice) {
    peak = Math.max(peak, point.equity)
    const drawdown = peak > 0 ? ((peak - point.equity) / peak) * 100 : 0
    maxDrawdownPct = Math.max(maxDrawdownPct, drawdown)
  }

  const closedTrades = result.trades.filter((t) => t.exitIndex <= uptoIndex)
  const wins = closedTrades.filter((t) => t.returnPct > 0).length
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0

  const openTrade = result.trades.some((t) => t.entryIndex <= uptoIndex && t.exitIndex > uptoIndex)

  return {
    startingEquity,
    endingEquity,
    totalReturnPct: ((endingEquity - startingEquity) / startingEquity) * 100,
    winRate,
    maxDrawdownPct,
    tradeCount: closedTrades.length,
    openTrade,
  }
}
