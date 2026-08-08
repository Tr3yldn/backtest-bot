import { ASSET_CLASSES, ASSET_CLASS_LABELS, SYMBOLS_BY_CLASS, TIMEFRAMES_BY_CLASS, type AssetClass } from '../lib/markets'
import type { StrategyConfig } from '../lib/types'
import { StrategyParamFields, StrategyTypeSelect } from './StrategySelectFields'

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

        <StrategyTypeSelect strategyConfig={strategyConfig} onStrategyChange={onStrategyChange} />

        <button className="btn btn-primary" onClick={onLoad} disabled={loading}>
          {loading ? 'Loading…' : 'Load & Run'}
        </button>
      </div>

      <div className="controls-row">
        <StrategyParamFields strategyConfig={strategyConfig} onStrategyChange={onStrategyChange} />
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}
