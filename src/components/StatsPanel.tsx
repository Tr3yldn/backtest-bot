import type { BacktestStats } from '../lib/types'

interface Props {
  stats: BacktestStats
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function StatsPanel({ stats }: Props) {
  const returnClass = stats.totalReturnPct >= 0 ? 'positive' : 'negative'

  return (
    <div className="stats-panel">
      <div className="stat">
        <span className="stat-label">Equity</span>
        <span className="stat-value">{formatUsd(stats.endingEquity)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Total Return</span>
        <span className={`stat-value ${returnClass}`}>
          {stats.totalReturnPct >= 0 ? '+' : ''}
          {stats.totalReturnPct.toFixed(2)}%
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Win Rate</span>
        <span className="stat-value">{stats.winRate.toFixed(1)}%</span>
      </div>
      <div className="stat">
        <span className="stat-label">Max Drawdown</span>
        <span className="stat-value negative">-{stats.maxDrawdownPct.toFixed(2)}%</span>
      </div>
      <div className="stat">
        <span className="stat-label">Trades</span>
        <span className="stat-value">
          {stats.tradeCount}
          {stats.openTrade ? ' (1 open)' : ''}
        </span>
      </div>
    </div>
  )
}
