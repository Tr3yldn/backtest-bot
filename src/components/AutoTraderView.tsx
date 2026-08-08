import { useCallback, useEffect, useRef, useState } from 'react'
import {
  armAutoTrader,
  disarmAutoTrader,
  getAutoTraderStatus,
  setAutoTraderConfig,
  type AutoTraderStatus,
} from '../lib/autoTraderApi'
import { SYMBOLS_BY_CLASS } from '../lib/markets'
import { DEFAULT_STRATEGY_CONFIG } from '../lib/strategies'
import type { StrategyConfig } from '../lib/types'
import { StrategyParamFields, StrategyTypeSelect } from './StrategySelectFields'

type AutoTraderAssetClass = 'stocks' | 'funds'
type TimeframeKey = '15m' | '60m' | '1d'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString()
}

export function AutoTraderView() {
  const [assetClass, setAssetClass] = useState<AutoTraderAssetClass>('stocks')
  const [symbol, setSymbol] = useState(SYMBOLS_BY_CLASS.stocks[0].id)
  const [timeframeKey, setTimeframeKey] = useState<TimeframeKey>('1d')
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>(DEFAULT_STRATEGY_CONFIG)
  const [qtyPerTrade, setQtyPerTrade] = useState(1)
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(3)

  const [status, setStatus] = useState<AutoTraderStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [arming, setArming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const s = await getAutoTraderStatus()
      setStatus(s)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the trading backend.')
    }
  }, [])

  useEffect(() => {
    refresh()
    pollRef.current = window.setInterval(refresh, 5000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [refresh])

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const s = await setAutoTraderConfig({ symbol, timeframeKey, strategyConfig, qtyPerTrade, maxTradesPerDay })
      setStatus(s)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration.')
    } finally {
      setSaving(false)
    }
  }

  const handleArmToggle = async () => {
    setArming(true)
    try {
      const s = status?.armed ? await disarmAutoTrader() : await armAutoTrader()
      setStatus(s)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change armed state.')
    } finally {
      setArming(false)
    }
  }

  const armed = status?.armed ?? false

  return (
    <>
      <div className="options-disclaimer">
        This places real orders against your Alpaca <strong>paper</strong> account automatically once armed — no
        human clicks "buy" or "sell" per trade. It only runs while this app's backend is running on your machine, and
        only trades stocks/funds (symbols matching Alpaca's tradable universe 1:1). Long-only: buys when flat, sells
        only to close an existing position.
      </div>

      <div className="controls">
        <h3 className="panel-title">Configuration</h3>
        <div className="controls-row">
          <label>
            Market
            <select
              value={assetClass}
              onChange={(e) => {
                const next = e.target.value as AutoTraderAssetClass
                setAssetClass(next)
                setSymbol(SYMBOLS_BY_CLASS[next][0].id)
              }}
              disabled={armed}
            >
              <option value="stocks">Stocks</option>
              <option value="funds">Funds / ETFs</option>
            </select>
          </label>

          <label>
            Symbol
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={armed}>
              {SYMBOLS_BY_CLASS[assetClass].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Interval
            <select value={timeframeKey} onChange={(e) => setTimeframeKey(e.target.value as TimeframeKey)} disabled={armed}>
              <option value="15m">15m</option>
              <option value="60m">1h</option>
              <option value="1d">1d</option>
            </select>
          </label>

          <StrategyTypeSelect strategyConfig={strategyConfig} onStrategyChange={setStrategyConfig} />
        </div>

        <div className="controls-row">
          <StrategyParamFields strategyConfig={strategyConfig} onStrategyChange={setStrategyConfig} />
        </div>

        <div className="controls-row">
          <label>
            Quantity per trade
            <input
              type="number"
              min={1}
              value={qtyPerTrade}
              onChange={(e) => setQtyPerTrade(Number(e.target.value))}
              disabled={armed}
            />
          </label>
          <label>
            Max trades per day
            <input
              type="number"
              min={1}
              max={50}
              value={maxTradesPerDay}
              onChange={(e) => setMaxTradesPerDay(Number(e.target.value))}
              disabled={armed}
            />
          </label>
          <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving || armed}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </div>

      <div className="controls">
        <h3 className="panel-title">Arm / Disarm</h3>
        {status?.config ? (
          <p className="subtitle">
            Running config: <strong>{status.config.symbol}</strong> · {status.config.strategyConfig.id} ·{' '}
            {status.config.timeframeKey} · qty {status.config.qtyPerTrade} · max {status.config.maxTradesPerDay}/day
            {' — '}
            {status.tradesToday}/{status.config.maxTradesPerDay} trades today
          </p>
        ) : (
          <p className="subtitle">No configuration saved yet — save one above before arming.</p>
        )}
        <button
          className="btn"
          style={{
            background: armed ? '#ff6b6b' : '#4ecb8d',
            borderColor: armed ? '#ff6b6b' : '#4ecb8d',
            color: '#0d1117',
            fontWeight: 600,
            padding: '10px 20px',
          }}
          onClick={handleArmToggle}
          disabled={arming || !status?.config}
        >
          {armed ? '■ ARMED — click to disarm' : '▶ DISARMED — click to arm'}
        </button>
      </div>

      <div className="panel">
        <h3 className="panel-title">Activity Log</h3>
        {!status || status.log.length === 0 ? (
          <p className="subtitle">No activity yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              {status.log.map((entry, i) => (
                <tr key={i}>
                  <td>{formatTime(entry.time)}</td>
                  <td className={entry.level === 'error' ? 'negative' : entry.level === 'action' ? 'positive' : undefined}>
                    {entry.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
