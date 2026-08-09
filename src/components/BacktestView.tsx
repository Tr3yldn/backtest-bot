import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runBacktest, computeStats } from '../lib/backtest'
import { fetchMarketCandles, SYMBOLS_BY_CLASS, TIMEFRAMES_BY_CLASS, type AssetClass } from '../lib/markets'
import { DEFAULT_STRATEGY_CONFIG } from '../lib/strategies'
import type { BacktestResult, Candle, StrategyConfig } from '../lib/types'
import type { FeedbackRequest } from '../lib/aiApi'
import { AiFeedbackPanel } from './AiFeedbackPanel'
import { Controls } from './Controls'
import { EquityChart } from './EquityChart'
import { PriceChart } from './PriceChart'
import { Scrubber } from './Scrubber'
import { StatsPanel } from './StatsPanel'

const STRATEGY_LABELS: Record<StrategyConfig['id'], string> = {
  'sma-crossover': 'SMA Crossover',
  rsi: 'RSI Reversal',
  macd: 'MACD Crossover',
  bollinger: 'Bollinger Bounce',
  donchian: 'Donchian Breakout',
}

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function BacktestView() {
  const [assetClass, setAssetClass] = useState<AssetClass>('crypto')
  const [symbolId, setSymbolId] = useState(SYMBOLS_BY_CLASS.crypto[0].id)
  const [symbolLabel, setSymbolLabel] = useState(SYMBOLS_BY_CLASS.crypto[0].label)
  const [timeframeKey, setTimeframeKey] = useState('3600')
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>(DEFAULT_STRATEGY_CONFIG)

  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(120)

  const handleAssetClassChange = useCallback((next: AssetClass) => {
    setAssetClass(next)
    setSymbolId(SYMBOLS_BY_CLASS[next][0].id)
    setSymbolLabel(SYMBOLS_BY_CLASS[next][0].label)
    setTimeframeKey(TIMEFRAMES_BY_CLASS[next][TIMEFRAMES_BY_CLASS[next].length - 1].key)
  }, [])

  const handleSymbolChange = useCallback((id: string, label: string) => {
    setSymbolId(id)
    setSymbolLabel(label)
  }, [])

  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setIsPlaying(false)
    try {
      const data = await fetchMarketCandles(assetClass, symbolId, timeframeKey)
      if (requestIdRef.current !== requestId) return // a newer load superseded this one
      if (data.length === 0) throw new Error('No candle data returned.')
      setCandles(data)
      setCurrentIndex(Math.min(50, data.length - 1))
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      setError(err instanceof Error ? err.message : 'Failed to load candles.')
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
  }, [assetClass, symbolId, timeframeKey])

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

  const buildFeedbackRequest = useCallback((): FeedbackRequest => {
    const closedTrades = (backtestResult?.trades ?? []).filter((t) => t.exitIndex <= currentIndex)
    const wins = closedTrades.filter((t) => t.returnPct > 0)
    const losses = closedTrades.filter((t) => t.returnPct <= 0)
    return {
      source: 'backtest',
      symbolLabel,
      timeframeLabel: TIMEFRAMES_BY_CLASS[assetClass].find((t) => t.key === timeframeKey)?.label ?? timeframeKey,
      strategyLabel: STRATEGY_LABELS[strategyConfig.id],
      stats: {
        totalReturnPct: stats?.totalReturnPct ?? 0,
        winRate: stats?.winRate ?? 0,
        tradeCount: stats?.tradeCount ?? 0,
        maxDrawdownPct: stats?.maxDrawdownPct,
        avgWinPct: wins.length > 0 ? wins.reduce((a, t) => a + t.returnPct, 0) / wins.length : undefined,
        avgLossPct: losses.length > 0 ? losses.reduce((a, t) => a + t.returnPct, 0) / losses.length : undefined,
      },
      trades: closedTrades.map((t) => ({
        direction: 'long',
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        returnPct: t.returnPct,
      })),
    }
  }, [backtestResult, currentIndex, symbolLabel, assetClass, timeframeKey, strategyConfig, stats])

  return (
    <>
      <Controls
        assetClass={assetClass}
        symbolId={symbolId}
        symbolLabel={symbolLabel}
        timeframeKey={timeframeKey}
        strategyConfig={strategyConfig}
        loading={loading}
        error={error}
        onAssetClassChange={handleAssetClassChange}
        onSymbolChange={handleSymbolChange}
        onTimeframeChange={setTimeframeKey}
        onStrategyChange={setStrategyConfig}
        onLoad={load}
      />

      {candles.length > 0 && backtestResult && stats && (
        <>
          <div className="panel panel-chart-main">
            <PriceChart
              candles={candles}
              currentIndex={currentIndex}
              signals={backtestResult.signals}
              indicatorSeries={backtestResult.indicatorSeries}
              enableDrawing
              height="min(72vh, 860px)"
            />
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

          <StatsPanel stats={stats} />

          <div className="panel">
            <h3 className="panel-title">Equity Curve</h3>
            <EquityChart equityCurve={backtestResult.equityCurve} currentIndex={currentIndex} />
          </div>

          <AiFeedbackPanel
            buildRequest={buildFeedbackRequest}
            disabled={stats.tradeCount === 0}
            disabledReason="No closed trades yet — scrub further or pick different strategy parameters."
          />
        </>
      )}

      {loading && candles.length === 0 && <div className="loading-banner">Loading candles…</div>}
    </>
  )
}
