export interface Candle {
  time: number // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type SignalType = 'buy' | 'sell'

export interface Signal {
  index: number
  type: SignalType
}

export interface Trade {
  entryIndex: number
  entryTime: number
  entryPrice: number
  exitIndex: number
  exitTime: number
  exitPrice: number
  returnPct: number
}

export interface EquityPoint {
  time: number
  equity: number
}

export type StrategyId = 'sma-crossover' | 'rsi' | 'macd'

export interface SmaCrossoverParams {
  fastPeriod: number
  slowPeriod: number
}

export interface RsiParams {
  period: number
  oversold: number
  overbought: number
}

export interface MacdParams {
  fastPeriod: number
  slowPeriod: number
  signalPeriod: number
}

export interface StrategyConfig {
  id: StrategyId
  smaCrossover: SmaCrossoverParams
  rsi: RsiParams
  macd: MacdParams
}

export interface BacktestResult {
  signals: Signal[]
  trades: Trade[]
  equityCurve: EquityPoint[]
  indicatorSeries: Record<string, (number | null)[]>
}

export interface BacktestStats {
  startingEquity: number
  endingEquity: number
  totalReturnPct: number
  winRate: number
  maxDrawdownPct: number
  tradeCount: number
  openTrade: boolean
}
