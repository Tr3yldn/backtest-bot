import type { StrategyConfig } from './types'

export type AutoTraderTimeframe = '1m' | '5m' | '15m' | '30m' | '60m' | '4h' | '1d'

export interface AutoTraderConfig {
  symbol: string
  timeframeKey: AutoTraderTimeframe
  strategyConfig: StrategyConfig
  qtyPerTrade: number
  maxTradesPerDay: number
}

export interface AutoTraderLogEntry {
  time: string
  message: string
  level: 'info' | 'action' | 'error'
}

export interface AutoTraderStatus {
  armed: boolean
  config: AutoTraderConfig | null
  tradesToday: number
  log: AutoTraderLogEntry[]
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

export function getAutoTraderStatus(): Promise<AutoTraderStatus> {
  return request('/autotrader/status')
}

export function setAutoTraderConfig(config: AutoTraderConfig): Promise<AutoTraderStatus> {
  return request('/autotrader/config', { method: 'POST', body: JSON.stringify(config) })
}

export function armAutoTrader(): Promise<AutoTraderStatus> {
  return request('/autotrader/arm', { method: 'POST' })
}

export function disarmAutoTrader(): Promise<AutoTraderStatus> {
  return request('/autotrader/disarm', { method: 'POST' })
}
