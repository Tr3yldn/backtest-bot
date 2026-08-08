import { GRANULARITIES, PRODUCTS } from '../lib/coinbase'
import type { StrategyConfig, StrategyId } from '../lib/types'

interface Props {
  productId: string
  granularity: number
  strategyConfig: StrategyConfig
  loading: boolean
  error: string | null
  onProductChange: (id: string) => void
  onGranularityChange: (seconds: number) => void
  onStrategyChange: (config: StrategyConfig) => void
  onLoad: () => void
}

export function Controls({
  productId,
  granularity,
  strategyConfig,
  loading,
  error,
  onProductChange,
  onGranularityChange,
  onStrategyChange,
  onLoad,
}: Props) {
  return (
    <div className="controls">
      <div className="controls-row">
        <label>
          Symbol
          <select value={productId} onChange={(e) => onProductChange(e.target.value)}>
            {PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Interval
          <select value={granularity} onChange={(e) => onGranularityChange(Number(e.target.value))}>
            {GRANULARITIES.map((g) => (
              <option key={g.seconds} value={g.seconds}>
                {g.label}
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
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}
