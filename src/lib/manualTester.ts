import type { AssetClass } from './markets'

export type Direction = 'long' | 'short'

export interface ManualTrade {
  id: string
  direction: Direction
  entryIndex: number
  entryTime: number
  entryPrice: number
  exitIndex: number | null
  exitTime: number | null
  exitPrice: number | null
}

export interface TesterSession {
  id: string
  name: string
  assetClass: AssetClass
  symbolId: string
  symbolLabel: string
  timeframeKey: string
  trades: ManualTrade[]
  createdAt: number
  updatedAt: number
}

export interface ManualTesterStats {
  totalTrades: number
  closedTrades: number
  openTrades: number
  wins: number
  losses: number
  winRate: number
  totalReturnPct: number
  avgWinPct: number
  avgLossPct: number
  bestTradePct: number
  worstTradePct: number
}

export function tradeReturnPct(trade: ManualTrade): number | null {
  if (trade.exitPrice === null) return null
  const raw = (trade.exitPrice - trade.entryPrice) / trade.entryPrice
  const signed = trade.direction === 'long' ? raw : -raw
  return signed * 100
}

export function computeManualStats(trades: ManualTrade[]): ManualTesterStats {
  const closed = trades.filter((t) => t.exitPrice !== null)
  const returns = closed.map((t) => tradeReturnPct(t) as number)
  const wins = returns.filter((r) => r > 0)
  const losses = returns.filter((r) => r <= 0)

  // Compounded return across all closed trades taken in sequence.
  const totalReturnPct = (returns.reduce((equity, r) => equity * (1 + r / 100), 1) - 1) * 100

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: trades.length - closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    totalReturnPct,
    avgWinPct: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
    avgLossPct: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
    bestTradePct: returns.length > 0 ? Math.max(...returns) : 0,
    worstTradePct: returns.length > 0 ? Math.min(...returns) : 0,
  }
}

const STORAGE_KEY = 'backtest-bench:tester-sessions'

export function loadSessions(): TesterSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSessions(sessions: TesterSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function upsertSession(sessions: TesterSession[], session: TesterSession): TesterSession[] {
  const next = sessions.filter((s) => s.id !== session.id)
  next.unshift(session)
  return next
}

export function deleteSession(sessions: TesterSession[], id: string): TesterSession[] {
  return sessions.filter((s) => s.id !== id)
}

export function createEmptySession(
  assetClass: AssetClass,
  symbolId: string,
  symbolLabel: string,
  timeframeKey: string,
): TesterSession {
  const now = Date.now()
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${symbolLabel} session`,
    assetClass,
    symbolId,
    symbolLabel,
    timeframeKey,
    trades: [],
    createdAt: now,
    updatedAt: now,
  }
}
