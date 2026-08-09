import type { ManualTesterStats } from '../lib/manualTester'

interface Props {
  stats: ManualTesterStats
}

export function ManualStatsPanel({ stats }: Props) {
  const returnClass = stats.totalReturnPct >= 0 ? 'positive' : 'negative'

  return (
    <div className="stats-panel">
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
        <span className="stat-label">Trades</span>
        <span className="stat-value">
          {stats.closedTrades}
          {stats.openTrades > 0 ? ` (${stats.openTrades} open)` : ''}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Avg Win / Loss</span>
        <span className="stat-value">
          <span className="positive">+{stats.avgWinPct.toFixed(2)}%</span>{' '}
          <span className="negative">{stats.avgLossPct.toFixed(2)}%</span>
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Best / Worst Trade</span>
        <span className="stat-value">
          <span className={stats.bestTradePct >= 0 ? 'positive' : 'negative'}>
            {stats.bestTradePct >= 0 ? '+' : ''}
            {stats.bestTradePct.toFixed(2)}%
          </span>{' '}
          <span className="negative">{stats.worstTradePct.toFixed(2)}%</span>
        </span>
      </div>
    </div>
  )
}
