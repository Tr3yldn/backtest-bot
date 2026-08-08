import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { Controls } from './components/Controls'
import { EquityChart } from './components/EquityChart'
import { PriceChart } from './components/PriceChart'
import { Scrubber } from './components/Scrubber'
import { StatsPanel } from './components/StatsPanel'
import { runBacktest, computeStats } from './lib/backtest'
import { fetchCandles } from './lib/coinbase'
import { DEFAULT_STRATEGY_CONFIG } from './lib/strategies'
import type { BacktestResult, Candle, StrategyConfig } from './lib/types'

const CANDLE_COUNT = 500

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function App() {
  const [productId, setProductId] = useState('BTC-USD')
  const [granularity, setGranularity] = useState(3600)
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>(DEFAULT_STRATEGY_CONFIG)

  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(120)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsPlaying(false)
    try {
      const data = await fetchCandles(productId, granularity, CANDLE_COUNT)
      if (data.length === 0) throw new Error('No candle data returned.')
      setCandles(data)
      setCurrentIndex(Math.min(50, data.length - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candles.')
    } finally {
      setLoading(false)
    }
  }, [productId, granularity])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const backtestResult: BacktestResult | null = useMemo(() => {
    if (candles.length === 0) return null
    return runBacktest(candles, strategyConfig)
  }, [candles, strategyConfig])

  useEffect(() => {
    if (candles.length > 0 && currentIndex > candles.length - 1) {
      setCurrentIndex(candles.length - 1)
    }
  }, [candles, currentIndex])

  useEffect(() => {
    if (isPlaying && candles.length > 0 && currentIndex >= candles.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentIndex, candles.length])

  const stats = useMemo(() => {
    if (!backtestResult || candles.length === 0) return null
    return computeStats(backtestResult, currentIndex)
  }, [backtestResult, candles, currentIndex])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Backtest Bench</h1>
        <p className="subtitle">Load historical candles, run a strategy, then rewind and replay it bar by bar.</p>
      </header>

      <Controls
        productId={productId}
        granularity={granularity}
        strategyConfig={strategyConfig}
        loading={loading}
        error={error}
        onProductChange={setProductId}
        onGranularityChange={setGranularity}
        onStrategyChange={setStrategyConfig}
        onLoad={load}
      />

      {candles.length > 0 && backtestResult && stats && (
        <>
          <StatsPanel stats={stats} />

          <div className="panel">
            <PriceChart
              candles={candles}
              currentIndex={currentIndex}
              signals={backtestResult.signals}
              indicatorSeries={backtestResult.indicatorSeries}
            />
          </div>

          <div className="panel">
            <h3 className="panel-title">Equity Curve</h3>
            <EquityChart equityCurve={backtestResult.equityCurve} currentIndex={currentIndex} />
          </div>

          <Scrubber
            currentIndex={currentIndex}
            maxIndex={candles.length - 1}
            isPlaying={isPlaying}
            speedMs={speedMs}
            label={formatTime(candles[currentIndex].time)}
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

      {loading && candles.length === 0 && <div className="loading-banner">Loading candles…</div>}
    </div>
  )
}

export default App
