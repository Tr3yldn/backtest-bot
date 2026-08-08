import type { StrategyConfig, StrategyId } from '../lib/types'

interface Props {
  strategyConfig: StrategyConfig
  onStrategyChange: (config: StrategyConfig) => void
}

export function StrategyTypeSelect({ strategyConfig, onStrategyChange }: Props) {
  return (
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
  )
}

export function StrategyParamFields({ strategyConfig, onStrategyChange }: Props) {
  if (strategyConfig.id === 'sma-crossover') {
    return (
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
    )
  }

  if (strategyConfig.id === 'rsi') {
    return (
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
    )
  }

  if (strategyConfig.id === 'macd') {
    return (
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
    )
  }

  if (strategyConfig.id === 'bollinger') {
    return (
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
    )
  }

  return (
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
  )
}
