import { runStrategy } from '../src/lib/strategies.ts'
import type { StrategyConfig } from '../src/lib/types.ts'
import { alpacaRequest, AlpacaError } from './alpaca.ts'
import { fetchCandlesForAutoTrader } from './marketData.ts'

export type AutoTraderTimeframe = '1m' | '5m' | '15m' | '30m' | '60m' | '4h' | '1d'

export interface AutoTraderConfig {
  symbol: string
  timeframeKey: AutoTraderTimeframe
  strategyConfig: StrategyConfig
  qtyPerTrade: number
  maxTradesPerDay: number
}

interface LogEntry {
  time: string
  message: string
  level: 'info' | 'action' | 'error'
}

const MAX_LOG = 200
const POLL_INTERVAL_MS: Record<AutoTraderTimeframe, number> = {
  '1m': 30_000,
  '5m': 60_000,
  '15m': 60_000,
  '30m': 120_000,
  '60m': 5 * 60_000,
  '4h': 10 * 60_000,
  '1d': 30 * 60_000,
}

const state = {
  config: null as AutoTraderConfig | null,
  armed: false,
  lastCheckedCandleTime: null as number | null,
  log: [] as LogEntry[],
  tradesToday: 0,
  tradesTodayDate: '',
  timer: null as ReturnType<typeof setInterval> | null,
}

function addLog(message: string, level: LogEntry['level'] = 'info') {
  state.log.unshift({ time: new Date().toISOString(), message, level })
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function resetDailyCounterIfNeeded() {
  const today = todayStr()
  if (state.tradesTodayDate !== today) {
    state.tradesTodayDate = today
    state.tradesToday = 0
  }
}

export function getStatus() {
  resetDailyCounterIfNeeded()
  return {
    armed: state.armed,
    config: state.config,
    tradesToday: state.tradesToday,
    log: state.log.slice(0, 50),
  }
}

export function setConfig(config: AutoTraderConfig) {
  disarm()
  state.config = config
  state.lastCheckedCandleTime = null
  addLog(
    `Config updated: ${config.symbol} · ${config.strategyConfig.id} · ${config.timeframeKey} · qty ${config.qtyPerTrade} · max ${config.maxTradesPerDay}/day`,
  )
}

async function getPositionQty(symbol: string): Promise<number> {
  try {
    const position = await alpacaRequest<{ qty: string }>(`/v2/positions/${symbol}`)
    return Number(position.qty)
  } catch (err) {
    if (err instanceof AlpacaError && err.status === 404) return 0
    throw err
  }
}

async function checkOnce() {
  if (!state.config) return
  resetDailyCounterIfNeeded()

  const { symbol, timeframeKey, strategyConfig, qtyPerTrade, maxTradesPerDay } = state.config

  try {
    const candles = await fetchCandlesForAutoTrader(symbol, timeframeKey)
    if (candles.length === 0) {
      addLog('No candle data returned, skipping check.', 'error')
      return
    }

    const { signals } = runStrategy(candles, strategyConfig)
    const lastIndex = candles.length - 1
    const lastCandle = candles[lastIndex]
    const latestSignal = signals.find((s) => s.index === lastIndex)

    if (!latestSignal) {
      addLog(`Checked ${symbol} @ ${new Date(lastCandle.time * 1000).toLocaleString()} — no new signal.`)
      return
    }

    if (state.lastCheckedCandleTime === lastCandle.time) {
      // Already evaluated this candle on a previous poll.
      return
    }
    state.lastCheckedCandleTime = lastCandle.time

    if (state.tradesToday >= maxTradesPerDay) {
      addLog(`Signal (${latestSignal.type}) detected but daily trade cap (${maxTradesPerDay}) reached — skipping.`, 'error')
      return
    }

    const currentQty = await getPositionQty(symbol)

    if (latestSignal.type === 'buy' && currentQty > 0) {
      addLog(`Buy signal on ${symbol} but already holding a position — skipping (long-only, no pyramiding).`)
      return
    }
    if (latestSignal.type === 'sell' && currentQty <= 0) {
      addLog(`Sell signal on ${symbol} but no open position — skipping.`)
      return
    }

    const order = await alpacaRequest<{ id: string }>('/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        symbol,
        qty: String(latestSignal.type === 'sell' ? currentQty : qtyPerTrade),
        side: latestSignal.type,
        type: 'market',
        time_in_force: 'day',
      }),
    })

    state.tradesToday += 1
    addLog(
      `${latestSignal.type.toUpperCase()} ${symbol} order placed (id ${order.id}) — trade ${state.tradesToday}/${maxTradesPerDay} today.`,
      'action',
    )
  } catch (err) {
    addLog(`Error during check: ${err instanceof Error ? err.message : String(err)}`, 'error')
  }
}

export function arm() {
  if (!state.config) throw new Error('Configure the auto-trader before arming it.')
  if (state.armed) return
  state.armed = true
  const intervalMs = POLL_INTERVAL_MS[state.config.timeframeKey] ?? 5 * 60_000
  addLog(`Armed. Checking every ${Math.round(intervalMs / 1000)}s.`, 'action')
  void checkOnce()
  state.timer = setInterval(() => void checkOnce(), intervalMs)
}

export function disarm() {
  if (state.timer) clearInterval(state.timer)
  state.timer = null
  if (state.armed) addLog('Disarmed.', 'action')
  state.armed = false
}
