import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
  fetchMarketCandles,
  SYMBOLS_BY_CLASS,
  TIMEFRAMES_BY_CLASS,
  type AssetClass,
} from '../lib/markets'
import {
  computeManualStats,
  createEmptySession,
  deleteSession,
  loadSessions,
  saveSessions,
  tradeReturnPct,
  upsertSession,
  type Direction,
  type ManualTrade,
  type TesterSession,
} from '../lib/manualTester'
import type { Candle, Signal } from '../lib/types'
import type { StrategyContext } from '../lib/aiApi'
import { AiFeedbackPanel } from './AiFeedbackPanel'
import { ManualStatsPanel } from './ManualStatsPanel'
import { PriceChart } from './PriceChart'
import { Scrubber } from './Scrubber'
import { SymbolSearch } from './SymbolSearch'

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tradesToSignals(trades: ManualTrade[]): Signal[] {
  const signals: Signal[] = []
  for (const t of trades) {
    signals.push({ index: t.entryIndex, type: t.direction === 'long' ? 'buy' : 'sell' })
    if (t.exitIndex !== null) {
      signals.push({ index: t.exitIndex, type: t.direction === 'long' ? 'sell' : 'buy' })
    }
  }
  return signals
}

export function StrategyTesterView() {
  const [assetClass, setAssetClass] = useState<AssetClass>('crypto')
  const [symbolId, setSymbolId] = useState(SYMBOLS_BY_CLASS.crypto[0].id)
  const [symbolLabel, setSymbolLabel] = useState(SYMBOLS_BY_CLASS.crypto[0].label)
  const [timeframeKey, setTimeframeKey] = useState('3600')

  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(120)

  const [direction, setDirection] = useState<Direction>('long')
  const [session, setSession] = useState<TesterSession | null>(null)
  const [sessions, setSessions] = useState<TesterSession[]>([])

  useEffect(() => {
    setSessions(loadSessions())
  }, [])

  const locked = session !== null && session.trades.length > 0

  const handleAssetClassChange = useCallback(
    (next: AssetClass) => {
      if (locked) return
      setAssetClass(next)
      setSymbolId(SYMBOLS_BY_CLASS[next][0].id)
      setSymbolLabel(SYMBOLS_BY_CLASS[next][0].label)
      setTimeframeKey(TIMEFRAMES_BY_CLASS[next][TIMEFRAMES_BY_CLASS[next].length - 1].key)
    },
    [locked],
  )

  const handleSymbolChange = useCallback(
    (id: string, label: string) => {
      if (locked) return
      setSymbolId(id)
      setSymbolLabel(label)
    },
    [locked],
  )

  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setIsPlaying(false)
    try {
      const data = await fetchMarketCandles(assetClass, symbolId, timeframeKey)
      if (requestIdRef.current !== requestId) return
      if (data.length === 0) throw new Error('No candle data returned.')
      setCandles(data)
      setCurrentIndex(Math.min(50, data.length - 1))
      setSession((current) =>
        current && current.trades.length > 0 ? current : createEmptySession(assetClass, symbolId, symbolLabel, timeframeKey),
      )
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      setError(err instanceof Error ? err.message : 'Failed to load candles.')
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetClass, symbolId, timeframeKey, symbolLabel])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const hasOpenTrade = session?.trades.some((t) => t.exitPrice === null) ?? false

  const handleNewSession = () => {
    if (session && session.trades.length > 0) {
      const ok = window.confirm('Start a new session? Any unsaved trades in the current session will be lost unless you already saved it.')
      if (!ok) return
    }
    setSession(createEmptySession(assetClass, symbolId, symbolLabel, timeframeKey))
  }

  const handleEnterTrade = () => {
    if (!session || candles.length === 0 || hasOpenTrade) return
    const bar = candles[currentIndex]
    const trade: ManualTrade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      direction,
      entryIndex: currentIndex,
      entryTime: bar.time,
      entryPrice: bar.close,
      exitIndex: null,
      exitTime: null,
      exitPrice: null,
    }
    setSession({ ...session, trades: [...session.trades, trade], updatedAt: Date.now() })
  }

  const handleExitTrade = () => {
    if (!session || candles.length === 0) return
    const openTrade = [...session.trades].reverse().find((t) => t.exitPrice === null)
    if (!openTrade) return
    const bar = candles[currentIndex]
    const trades = session.trades.map((t) =>
      t.id === openTrade.id ? { ...t, exitIndex: currentIndex, exitTime: bar.time, exitPrice: bar.close } : t,
    )
    setSession({ ...session, trades, updatedAt: Date.now() })
  }

  const handleDeleteTrade = (id: string) => {
    if (!session) return
    setSession({ ...session, trades: session.trades.filter((t) => t.id !== id), updatedAt: Date.now() })
  }

  const handleSaveSession = () => {
    if (!session || session.trades.length === 0) return
    const toSave: TesterSession = { ...session, updatedAt: Date.now() }
    const next = upsertSession(sessions, toSave)
    saveSessions(next)
    setSessions(next)
    setSession(toSave)
  }

  const handleLoadSession = (s: TesterSession) => {
    if (session && session.trades.length > 0) {
      const ok = window.confirm('Load this saved session? Any unsaved trades in the current session will be lost.')
      if (!ok) return
    }
    setAssetClass(s.assetClass)
    setSymbolId(s.symbolId)
    setSymbolLabel(s.symbolLabel)
    setTimeframeKey(s.timeframeKey)
    setSession(s)
  }

  const handleDeleteSession = (id: string) => {
    const ok = window.confirm('Delete this saved session? This cannot be undone.')
    if (!ok) return
    const next = deleteSession(sessions, id)
    saveSessions(next)
    setSessions(next)
  }

  const handleLoadSessionAndFetch = (s: TesterSession) => {
    handleLoadSession(s)
    requestIdRef.current++
    const requestId = requestIdRef.current
    setLoading(true)
    setError(null)
    fetchMarketCandles(s.assetClass, s.symbolId, s.timeframeKey)
      .then((data) => {
        if (requestIdRef.current !== requestId) return
        if (data.length === 0) throw new Error('No candle data returned.')
        setCandles(data)
        setCurrentIndex(Math.min(50, data.length - 1))
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return
        setError(err instanceof Error ? err.message : 'Failed to load candles.')
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  }

  const signals = useMemo(() => (session ? tradesToSignals(session.trades) : []), [session])
  const stats = useMemo(() => computeManualStats(session?.trades ?? []), [session])

  const timeframeLabel = TIMEFRAMES_BY_CLASS[assetClass].find((t) => t.key === timeframeKey)?.label ?? timeframeKey

  const buildFeedbackRequest = useCallback((): StrategyContext => {
    const trades = session?.trades ?? []
    return {
      source: 'manual-session',
      symbolLabel,
      timeframeLabel,
      stats: {
        totalReturnPct: stats.totalReturnPct,
        winRate: stats.winRate,
        tradeCount: stats.closedTrades,
        avgWinPct: stats.avgWinPct,
        avgLossPct: stats.avgLossPct,
      },
      trades: trades
        .filter((t) => t.exitPrice !== null)
        .map((t) => ({
          direction: t.direction,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          returnPct: tradeReturnPct(t),
        })),
    }
  }, [session, symbolLabel, timeframeLabel, stats])

  return (
    <>
      <div className="controls">
        <div className="controls-row">
          <label>
            Market
            <select
              value={assetClass}
              disabled={locked}
              onChange={(e) => handleAssetClassChange(e.target.value as AssetClass)}
            >
              {ASSET_CLASSES.map((ac) => (
                <option key={ac} value={ac}>
                  {ASSET_CLASS_LABELS[ac]}
                </option>
              ))}
            </select>
          </label>

          {assetClass === 'crypto' ? (
            <label>
              Symbol
              <select
                value={symbolId}
                disabled={locked}
                onChange={(e) => {
                  const chosen = SYMBOLS_BY_CLASS.crypto.find((s) => s.id === e.target.value)
                  handleSymbolChange(e.target.value, chosen?.label ?? e.target.value)
                }}
              >
                {SYMBOLS_BY_CLASS.crypto.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <SymbolSearch
              value={symbolId}
              valueLabel={symbolLabel}
              popular={SYMBOLS_BY_CLASS[assetClass]}
              onSelect={handleSymbolChange}
              disabled={locked}
            />
          )}

          <label>
            Interval
            <select value={timeframeKey} disabled={locked} onChange={(e) => setTimeframeKey(e.target.value)}>
              {TIMEFRAMES_BY_CLASS[assetClass].map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Load & Run'}
          </button>

          {locked && (
            <span className="ai-hint" style={{ alignSelf: 'center' }}>
              Market locked while this session has trades — save or start a new session to change it.
            </span>
          )}
        </div>

        <div className="controls-row">
          <label>
            Session name
            <input
              type="text"
              value={session?.name ?? ''}
              onChange={(e) => session && setSession({ ...session, name: e.target.value })}
              disabled={!session}
              style={{ minWidth: 220 }}
            />
          </label>
          <button className="btn" onClick={handleNewSession}>
            New Session
          </button>
          <button className="btn" onClick={handleSaveSession} disabled={!session || session.trades.length === 0}>
            Save Session
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </div>

      {candles.length > 0 && (
        <>
          <div className="panel panel-chart-main">
            <PriceChart
              candles={candles}
              currentIndex={currentIndex}
              signals={signals}
              indicatorSeries={{}}
              enableDrawing
              height="min(65vh, 780px)"
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

          <div className="controls tester-trade-controls">
            <div className="controls-row">
              <div className="direction-toggle">
                <button
                  className={`btn ${direction === 'long' ? 'btn-primary' : ''}`}
                  onClick={() => setDirection('long')}
                >
                  Long
                </button>
                <button
                  className={`btn ${direction === 'short' ? 'btn-primary' : ''}`}
                  onClick={() => setDirection('short')}
                >
                  Short
                </button>
              </div>
              <button className="btn btn-primary" onClick={handleEnterTrade} disabled={!session || hasOpenTrade}>
                Enter {direction === 'long' ? 'Long' : 'Short'} Here
              </button>
              <button className="btn" onClick={handleExitTrade} disabled={!hasOpenTrade}>
                Exit Trade Here
              </button>
              {hasOpenTrade && <span className="ai-hint">Open {direction} position — scrub forward, then exit.</span>}
            </div>
          </div>

          <ManualStatsPanel stats={stats} />

          {session && session.trades.length > 0 && (
            <div className="panel">
              <h3 className="panel-title">Recorded Trades</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Direction</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Return</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {session.trades
                    .slice()
                    .reverse()
                    .map((t) => {
                      const ret = tradeReturnPct(t)
                      return (
                        <tr key={t.id}>
                          <td>{t.direction}</td>
                          <td>
                            {formatTime(t.entryTime)} @ {t.entryPrice.toFixed(2)}
                          </td>
                          <td>{t.exitPrice !== null ? `${formatTime(t.exitTime!)} @ ${t.exitPrice.toFixed(2)}` : 'open'}</td>
                          <td className={ret === null ? '' : ret >= 0 ? 'positive' : 'negative'}>
                            {ret === null ? '—' : `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`}
                          </td>
                          <td>
                            <button className="btn" onClick={() => handleDeleteTrade(t.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}

          <AiFeedbackPanel
            buildRequest={buildFeedbackRequest}
            disabled={stats.closedTrades === 0}
            disabledReason="Record at least one closed trade first."
          />
        </>
      )}

      {loading && candles.length === 0 && <div className="loading-banner">Loading candles…</div>}

      {sessions.length > 0 && (
        <div className="panel">
          <h3 className="panel-title">Saved Sessions</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Symbol</th>
                <th>Interval</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const sStats = computeManualStats(s.trades)
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.symbolLabel}</td>
                    <td>{s.timeframeKey}</td>
                    <td>{sStats.closedTrades}</td>
                    <td>{sStats.winRate.toFixed(1)}%</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn" onClick={() => handleLoadSessionAndFetch(s)}>
                        Load
                      </button>
                      <button className="btn" onClick={() => handleDeleteSession(s.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
