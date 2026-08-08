import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMarketCandles, SYMBOLS_BY_CLASS, type AssetClass } from '../lib/markets'
import { DEFAULT_OPTIONS_CONFIG, runOptionsBacktest, type OptionsConfig, type OptionsResult } from '../lib/optionsBacktest'
import type { Candle } from '../lib/types'
import { EquityChart } from './EquityChart'
import { PriceChart } from './PriceChart'
import { Scrubber } from './Scrubber'

const UNDERLYING_ASSET_CLASSES: AssetClass[] = ['stocks', 'funds', 'indices']

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export function OptionsLab() {
  const [assetClass, setAssetClass] = useState<AssetClass>('stocks')
  const [symbolId, setSymbolId] = useState(SYMBOLS_BY_CLASS.stocks[0].id)
  const [config, setConfig] = useState<OptionsConfig>(DEFAULT_OPTIONS_CONFIG)

  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(250)

  const handleAssetClassChange = useCallback((next: AssetClass) => {
    setAssetClass(next)
    setSymbolId(SYMBOLS_BY_CLASS[next][0].id)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsPlaying(false)
    try {
      const data = await fetchMarketCandles(assetClass, symbolId, '1d')
      if (data.length === 0) throw new Error('No candle data returned.')
      setCandles(data)
      setCurrentIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candles.')
    } finally {
      setLoading(false)
    }
  }, [assetClass, symbolId])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const result: OptionsResult | null = useMemo(() => {
    if (candles.length === 0) return null
    return runOptionsBacktest(candles, config)
  }, [candles, config])

  useEffect(() => {
    if (result && currentIndex > result.expiryIndex) {
      setCurrentIndex(result.expiryIndex)
    }
  }, [result, currentIndex])

  useEffect(() => {
    if (isPlaying && result && currentIndex >= result.expiryIndex) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentIndex, result])

  const priceLines = useMemo(() => {
    if (!result) return []
    return [{ price: result.strike, color: '#f0b90b', title: 'Strike' }]
  }, [result])

  const equityCurveData = useMemo(() => {
    if (!result) return []
    return result.points.map((p) => ({ time: p.time, equity: p.pnl }))
  }, [result])

  const currentPoint = result?.points[Math.min(currentIndex, result.points.length - 1)]

  return (
    <>
      <div className="options-disclaimer">
        Theoretical pricing only, via the Black-Scholes model over real historical underlying prices — not real
        historical option market quotes (no free source exists for those). Use this to build intuition about payoff
        shape and time decay, not as a substitute for real option data.
      </div>

      <div className="controls">
        <div className="controls-row">
          <label>
            Underlying market
            <select value={assetClass} onChange={(e) => handleAssetClassChange(e.target.value as AssetClass)}>
              {UNDERLYING_ASSET_CLASSES.map((ac) => (
                <option key={ac} value={ac}>
                  {ac === 'stocks' ? 'Stocks' : ac === 'funds' ? 'Funds / ETFs' : 'Indices'}
                </option>
              ))}
            </select>
          </label>

          <label>
            Symbol
            <select value={symbolId} onChange={(e) => setSymbolId(e.target.value)}>
              {SYMBOLS_BY_CLASS[assetClass].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Option type
            <select
              value={config.optionType}
              onChange={(e) => setConfig({ ...config, optionType: e.target.value as OptionsConfig['optionType'] })}
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </label>

          <label>
            Position
            <select
              value={config.position}
              onChange={(e) => setConfig({ ...config, position: e.target.value as OptionsConfig['position'] })}
            >
              <option value="long">Long (buy)</option>
              <option value="short">Short (sell)</option>
            </select>
          </label>

          <button className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Load & Run'}
          </button>
        </div>

        <div className="controls-row">
          <label>
            Strike offset from spot (%)
            <input
              type="number"
              min={-50}
              max={50}
              value={config.strikeOffsetPct}
              onChange={(e) => setConfig({ ...config, strikeOffsetPct: Number(e.target.value) })}
            />
          </label>
          <label>
            Days to expiry
            <input
              type="number"
              min={1}
              max={365}
              value={config.expiryDays}
              onChange={(e) => setConfig({ ...config, expiryDays: Number(e.target.value) })}
            />
          </label>
          <label>
            Implied volatility (%)
            <input
              type="number"
              min={1}
              max={300}
              value={config.ivPercent}
              onChange={(e) => setConfig({ ...config, ivPercent: Number(e.target.value) })}
            />
          </label>
          <label>
            Risk-free rate (%)
            <input
              type="number"
              min={0}
              max={15}
              step={0.1}
              value={config.riskFreeRatePercent}
              onChange={(e) => setConfig({ ...config, riskFreeRatePercent: Number(e.target.value) })}
            />
          </label>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </div>

      {result && currentPoint && (
        <>
          <div className="stats-panel">
            <div className="stat">
              <span className="stat-label">Strike</span>
              <span className="stat-value">{formatUsd(result.strike)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Premium ({config.position})</span>
              <span className="stat-value">{formatUsd(result.premium)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Option Value</span>
              <span className="stat-value">{formatUsd(currentPoint.optionValue)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">P&amp;L (per share)</span>
              <span className={`stat-value ${currentPoint.pnl >= 0 ? 'positive' : 'negative'}`}>
                {currentPoint.pnl >= 0 ? '+' : ''}
                {formatUsd(currentPoint.pnl)}
              </span>
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-title">Underlying Price ({symbolId}) with Strike</h3>
            <PriceChart candles={candles} currentIndex={currentIndex} signals={[]} indicatorSeries={{}} priceLines={priceLines} />
          </div>

          <div className="panel">
            <h3 className="panel-title">Option P&amp;L Per Share</h3>
            <EquityChart equityCurve={equityCurveData} currentIndex={currentIndex} />
          </div>

          <Scrubber
            currentIndex={currentIndex}
            maxIndex={result.expiryIndex}
            isPlaying={isPlaying}
            speedMs={speedMs}
            label={`${formatDate(currentPoint.time)} · ${result.expiryIndex - currentIndex} days to expiry`}
            onIndexChange={setCurrentIndex}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onSpeedChange={setSpeedMs}
            onReset={() => {
              setIsPlaying(false)
              setCurrentIndex(0)
            }}
          />
        </>
      )}

      {loading && candles.length === 0 && <div className="loading-banner">Loading underlying price history…</div>}
    </>
  )
}
