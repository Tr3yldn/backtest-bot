import { ASSET_CLASSES, ASSET_CLASS_LABELS, SYMBOLS_BY_CLASS, TIMEFRAMES_BY_CLASS, type AssetClass } from '../lib/markets'
import type { StrategyConfig } from '../lib/types'
import { StrategyParamFields, StrategyTypeSelect } from './StrategySelectFields'
import { SymbolSearch } from './SymbolSearch'

interface Props {
  assetClass: AssetClass
  symbolId: string
  symbolLabel: string
  timeframeKey: string
  strategyConfig: StrategyConfig
  loading: boolean
  error: string | null
  onAssetClassChange: (assetClass: AssetClass) => void
  onSymbolChange: (id: string, label: string) => void
  onTimeframeChange: (key: string) => void
  onStrategyChange: (config: StrategyConfig) => void
  onLoad: () => void
}

export function Controls({
  assetClass,
  symbolId,
  symbolLabel,
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

        {assetClass === 'crypto' ? (
          <label>
            Symbol
            <select value={symbolId} onChange={(e) => {
              const chosen = SYMBOLS_BY_CLASS.crypto.find((s) => s.id === e.target.value)
              onSymbolChange(e.target.value, chosen?.label ?? e.target.value)
            }}>
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
            onSelect={onSymbolChange}
          />
        )}

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
