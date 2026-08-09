export interface TradeSummary {
  direction: string
  entryPrice: number
  exitPrice: number | null
  returnPct: number | null
}

export interface FeedbackRequest {
  source: 'backtest' | 'manual-session'
  symbolLabel: string
  timeframeLabel: string
  strategyLabel?: string
  stats: {
    totalReturnPct: number
    winRate: number
    tradeCount: number
    maxDrawdownPct?: number
    avgWinPct?: number
    avgLossPct?: number
  }
  trades: TradeSummary[]
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/trading${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed (${res.status})`)
  }
  return body as T
}

export function getAiStatus(): Promise<{ configured: boolean }> {
  return request('/ai/status')
}

export function getStrategyFeedback(req: FeedbackRequest): Promise<string> {
  return request<{ feedback: string }>('/ai/feedback', {
    method: 'POST',
    body: JSON.stringify(req),
  }).then((r) => r.feedback)
}
