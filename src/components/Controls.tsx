import { ASSET_CLASSES, ASSET_CLASS_LABELS, SYMBOLS_BY_CLASS, TIMEFRAMES_BY_CLASS, type AssetClass } from '../lib/markets'
import type { StrategyConfig, StrategyId } from '../lib/types'

interface Props {
  assetClass: AssetClass
  symbolId: string
  timeframeKey: string
  strategyConfig: StrategyConfig
  loading: boolean
  error: string | null
  onAssetClassChange: (assetClass: AssetClass) => void
  onSymbolChange: (id: string) => void
  onTimeframeChange: (key: string) => void
  onStrategyChange: (config: StrategyConfig) => void
  onLoad: () => void
}

export function Controls({
  assetClass,
  symbolId,
  timeframeKey,
  strategyConfig,
  loading,
  error,
  onAssetClassChange,
  onSymbolChange,
  onTimeframeChange,
  onStrategyChange,
  onLoad,
}: Props) {
  const symbols = SYMBOLS_BY_CLASS[assetClass]
  const timeframes = TIMEFRAMES_BY_CLASS[assetClass]

  return (
    <div className="controls">
      <div className="controls-row">
        <label>
          Market
          <select value={assetClass} onChange={(e) => onAssetClassChange(e.target.value as AssetClass)}>
            {ASSET_CLASSES.map((ac) => (
              <option key={ac} value={ac}>
                {ASSET_CLASS_LABELS[ac]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Symbol
          <select value={symbolId} onChange={(e) => onSymbolChange(e.target.value)}>
            {symbols.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Interval
          <select value={timeframeKey} onChange={(e) => onTimeframeChange(e.target.value)}>
            {timeframes.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Strategy
          <select
            value={strategyConfig.id}
            onChange={(e) => onStrategyChange({ ...strategyConfig, id: e.target.value as StrategyId })}
          >
            <option value="sma-crossover">SMA Crossover</option>
            <option value="rsi">RSI Reversal</option>
            <option value="macd">MACD Crossover</option>
            <option value="bollinger">Bollinger Bounce</option>
            <option value="donchian">Donchian Breakout</option>
          </select>
        </label>

        <button className="btn btn-primary" onClick={onLoad} disabled={loading}>
          {loading ? 'Loading…' : 'Load & Run'}
        </button>
      </div>

      <div className="controls-row">
        {strategyConfig.id === 'sma-crossover' && (
          <>
            <label>
              Fast period
              <input
                type="number"
                min={2}
                max={200}
                value={strategyConfig.smaCrossover.fastPeriod}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategyConfig,
                    smaCrossover: { ...strategyConfig.smaCrossover, fastPeriod: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              Slow period
              <input
                type="number"
                min={3}
                max={400}
                value={strategyConfig.smaCrossover.slowPeriod}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategyConfig,
                    smaCrossover: { ...strategyConfig.smaCrossover, slowPeriod: Number(e.target.value) },
                  })
                }
              />
            </label>
          </>
        )}

        {strategyConfig.id === 'rsi' && (
          <>
            <label>
              Period
              <input
                type="number"
                min={2}
                max={100}
                value={strategyConfig.rsi.period}
                onChange={(e) =>
                  onStrategyChange({ ...strategyConfig, rsi: { ...strategyConfig.rsi, period: Number(e.target.value) } })
                }
              />
            </label>
            <label>
              Oversold
              <input
                type="number"
                min={1}
                max={49}
                value={strategyConfig.rsi.oversold}
                onChange={(e) =>
                  onStrategyChange({ ...strategyConfig, rsi: { ...strategyConfig.rsi, oversold: Number(e.target.value) } })
                }
              />
            </label>
            <label>
              Overbought
              <input
                type="number"
                min={51}
                max={99}
                value={strategyConfig.rsi.overbought}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategyConfig,
                    rsi: { ...strategyConfig.rsi, overbought: Number(e.target.value) },
                  })
                }
              />
            </label>
          </>
        )}

        {strategyConfig.id === 'macd' && (
          <>
            <label>
              Fast period
              <input
                type="number"
                min={2}
                max={100}
                value={strategyConfig.macd.fastPeriod}
                onChange={(e) =>
                  onStrategyChange({ ...strategyConfig, macd: { ...strategyConfig.macd, fastPeriod: Number(e.target.value) } })
                }
              />
            </label>
            <label>
              Slow period
              <input
                type="number"
                min={3}
                max={200}
                value={strategyConfig.macd.slowPeriod}
                onChange={(e) =>
                  onStrategyChange({ ...strategyConfig, macd: { ...strategyConfig.macd, slowPeriod: Number(e.target.value) } })
                }
              />
            </label>
            <label>
              Signal period
              <input
                type="number"
                min={2}
                max={100}
                value={strategyConfig.macd.signalPeriod}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategyConfig,
                    macd: { ...strategyConfig.macd, signalPeriod: Number(e.target.value) },
                  })
                }
              />
            </label>
          </>
        )}

        {strategyConfig.id === 'bollinger' && (
          <>
            <label>
              Period
              <input
                type="number"
                min={2}
                max={100}
                value={strategyConfig.bollinger.period}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategyConfig,
                    bollinger: { ...strategyConfig.bollinger, period: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              Std dev multiplier
              <input
                type="number"
                min={0.5}
                max={5}
                step={0.1}
                value={strategyConfig.bollinger.stdDevMultiplier}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategyConfig,
                    bollinger: { ...strategyConfig.bollinger, stdDevMultiplier: Number(e.target.value) },
                  })
                }
              />
            </label>
          </>
        )}

        {strategyConfig.id === 'donchian' && (
          <label>
            Channel period
            <input
              type="number"
              min={2}
              max={200}
              value={strategyConfig.donchian.period}
              onChange={(e) =>
                onStrategyChange({
                  ...strategyConfig,
                  donchian: { ...strategyConfig.donchian, period: Number(e.target.value) },
                })
              }
            />
          </label>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}
