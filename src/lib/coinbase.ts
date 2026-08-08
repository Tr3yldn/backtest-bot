import type { Candle } from './types'

export interface Product {
  id: string
  label: string
}

export const PRODUCTS: Product[] = [
  { id: 'BTC-USD', label: 'Bitcoin / USD' },
  { id: 'ETH-USD', label: 'Ethereum / USD' },
  { id: 'SOL-USD', label: 'Solana / USD' },
  { id: 'DOGE-USD', label: 'Dogecoin / USD' },
  { id: 'LTC-USD', label: 'Litecoin / USD' },
  { id: 'ADA-USD', label: 'Cardano / USD' },
  { id: 'AVAX-USD', label: 'Avalanche / USD' },
  { id: 'LINK-USD', label: 'Chainlink / USD' },
  { id: 'XRP-USD', label: 'XRP / USD' },
  { id: 'DOT-USD', label: 'Polkadot / USD' },
  { id: 'ATOM-USD', label: 'Cosmos / USD' },
  { id: 'BCH-USD', label: 'Bitcoin Cash / USD' },
  { id: 'UNI-USD', label: 'Uniswap / USD' },
  { id: 'AAVE-USD', label: 'Aave / USD' },
  { id: 'ARB-USD', label: 'Arbitrum / USD' },
  { id: 'OP-USD', label: 'Optimism / USD' },
  { id: 'SHIB-USD', label: 'Shiba Inu / USD' },
  { id: 'NEAR-USD', label: 'NEAR Protocol / USD' },
  { id: 'ETC-USD', label: 'Ethereum Classic / USD' },
  { id: 'FIL-USD', label: 'Filecoin / USD' },
]

export interface Granularity {
  seconds: number
  label: string
}

export const GRANULARITIES: Granularity[] = [
  { seconds: 900, label: '15m' },
  { seconds: 3600, label: '1h' },
  { seconds: 21600, label: '6h' },
  { seconds: 86400, label: '1d' },
]

const MAX_CANDLES_PER_REQUEST = 300

type RawCandle = [number, number, number, number, number, number] // time, low, high, open, close, volume

async function fetchChunk(
  productId: string,
  granularity: number,
  startSec: number,
  endSec: number,
): Promise<RawCandle[]> {
  const start = new Date(startSec * 1000).toISOString()
  const end = new Date(endSec * 1000).toISOString()
  const url = `/api/coinbase/products/${productId}/candles?granularity=${granularity}&start=${start}&end=${end}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Coinbase request failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as RawCandle[]
  return Array.isArray(data) ? data : []
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetches historical candles by paging backward in time, since Coinbase caps
 * each request at 300 candles.
 */
export async function fetchCandles(
  productId: string,
  granularitySeconds: number,
  desiredCount: number,
): Promise<Candle[]> {
  const chunks: RawCandle[] = []
  let endSec = Math.floor(Date.now() / 1000)
  const maxIterations = Math.ceil(desiredCount / MAX_CANDLES_PER_REQUEST) + 2

  for (let i = 0; i < maxIterations && chunks.length < desiredCount; i++) {
    const startSec = endSec - granularitySeconds * MAX_CANDLES_PER_REQUEST
    const chunk = await fetchChunk(productId, granularitySeconds, startSec, endSec)
    if (chunk.length === 0) break
    chunks.push(...chunk)
    endSec = startSec
    if (i < maxIterations - 1) await sleep(150)
  }

  const seen = new Set<number>()
  const candles: Candle[] = []
  for (const [time, low, high, open, close, volume] of chunks) {
    if (seen.has(time)) continue
    seen.add(time)
    candles.push({ time, open, high, low, close, volume })
  }

  candles.sort((a, b) => a.time - b.time)
  return candles.slice(-desiredCount)
}
