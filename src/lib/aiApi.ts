export interface TradeSummary {
  direction: string
  entryPrice: number
  exitPrice: number | null
  returnPct: number | null
}

export interface StrategyContext {
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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

export function sendCoachMessage(context: StrategyContext, messages: ChatMessage[]): Promise<string> {
  return request<{ reply: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ ...context, messages }),
  }).then((r) => r.reply)
}
