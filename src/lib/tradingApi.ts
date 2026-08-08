export interface AlpacaAccount {
  equity: string
  cash: string
  buying_power: string
  portfolio_value: string
  status: string
}

export interface AlpacaPosition {
  symbol: string
  qty: string
  avg_entry_price: string
  current_price: string
  market_value: string
  unrealized_pl: string
  unrealized_plpc: string
  side: string
}

export interface AlpacaOrder {
  id: string
  symbol: string
  side: string
  qty: string
  type: string
  status: string
  submitted_at: string
  filled_avg_price: string | null
  limit_price: string | null
}

export interface PlaceOrderInput {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  limit_price?: number
  time_in_force?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/trading${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed (${res.status})`)
  }
  return body as T
}

export function getStatus(): Promise<{ configured: boolean }> {
  return request('/status')
}

export function getAccount(): Promise<AlpacaAccount> {
  return request('/account')
}

export function getPositions(): Promise<AlpacaPosition[]> {
  return request('/positions')
}

export function getOrders(): Promise<AlpacaOrder[]> {
  return request('/orders')
}

export function placeOrder(input: PlaceOrderInput): Promise<AlpacaOrder> {
  return request('/orders', { method: 'POST', body: JSON.stringify(input) })
}

export function cancelOrder(id: string): Promise<void> {
  return request(`/orders/${id}`, { method: 'DELETE' })
}
