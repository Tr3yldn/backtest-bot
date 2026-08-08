import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import { alpacaRequest, AlpacaError, isConfigured } from './alpaca.ts'
import * as autotrader from './autotrader.ts'
import type { AutoTraderConfig } from './autotrader.ts'

const app = express()
app.use(express.json())

function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next)
}

app.get('/api/status', (_req, res) => {
  res.json({ configured: isConfigured() })
})

app.get(
  '/api/account',
  asyncRoute(async (_req, res) => {
    res.json(await alpacaRequest('/v2/account'))
  }),
)

app.get(
  '/api/positions',
  asyncRoute(async (_req, res) => {
    res.json(await alpacaRequest('/v2/positions'))
  }),
)

app.get(
  '/api/orders',
  asyncRoute(async (_req, res) => {
    res.json(await alpacaRequest('/v2/orders?status=all&limit=50&direction=desc'))
  }),
)

app.post(
  '/api/orders',
  asyncRoute(async (req, res) => {
    const { symbol, qty, side, type, time_in_force, limit_price } = req.body ?? {}

    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ message: 'symbol is required' })
      return
    }
    if (!qty || Number(qty) <= 0) {
      res.status(400).json({ message: 'qty must be a positive number' })
      return
    }
    if (side !== 'buy' && side !== 'sell') {
      res.status(400).json({ message: 'side must be "buy" or "sell"' })
      return
    }
    if (type !== 'market' && type !== 'limit') {
      res.status(400).json({ message: 'type must be "market" or "limit"' })
      return
    }
    if (type === 'limit' && (!limit_price || Number(limit_price) <= 0)) {
      res.status(400).json({ message: 'limit_price is required for limit orders' })
      return
    }

    const order = await alpacaRequest('/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        symbol,
        qty: String(qty),
        side,
        type,
        time_in_force: time_in_force ?? 'day',
        ...(type === 'limit' ? { limit_price: String(limit_price) } : {}),
      }),
    })
    res.json(order)
  }),
)

app.delete(
  '/api/orders/:id',
  asyncRoute(async (req, res) => {
    await alpacaRequest(`/v2/orders/${req.params.id}`, { method: 'DELETE' })
    res.status(204).end()
  }),
)

app.get('/api/autotrader/status', (_req, res) => {
  res.json(autotrader.getStatus())
})

app.post('/api/autotrader/config', (req, res) => {
  const config = req.body as Partial<AutoTraderConfig>
  const { symbol, timeframeKey, strategyConfig, qtyPerTrade, maxTradesPerDay } = config

  if (!symbol || typeof symbol !== 'string') {
    res.status(400).json({ message: 'symbol is required' })
    return
  }
  if (timeframeKey !== '15m' && timeframeKey !== '60m' && timeframeKey !== '1d') {
    res.status(400).json({ message: 'timeframeKey must be "15m", "60m", or "1d"' })
    return
  }
  if (!strategyConfig || typeof strategyConfig !== 'object') {
    res.status(400).json({ message: 'strategyConfig is required' })
    return
  }
  if (!qtyPerTrade || Number(qtyPerTrade) <= 0) {
    res.status(400).json({ message: 'qtyPerTrade must be a positive number' })
    return
  }
  if (!maxTradesPerDay || Number(maxTradesPerDay) <= 0) {
    res.status(400).json({ message: 'maxTradesPerDay must be a positive number' })
    return
  }

  autotrader.setConfig({
    symbol,
    timeframeKey,
    strategyConfig,
    qtyPerTrade: Number(qtyPerTrade),
    maxTradesPerDay: Number(maxTradesPerDay),
  })
  res.json(autotrader.getStatus())
})

app.post('/api/autotrader/arm', (_req, res) => {
  try {
    autotrader.arm()
    res.json(autotrader.getStatus())
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to arm.' })
  }
})

app.post('/api/autotrader/disarm', (_req, res) => {
  autotrader.disarm()
  res.json(autotrader.getStatus())
})

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof AlpacaError ? err.status : 500
  const message = err instanceof Error ? err.message : 'Unknown error'
  console.error('[server]', message)
  res.status(status).json({ message })
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => {
  console.log(`Trading backend listening on http://localhost:${port} (configured: ${isConfigured()})`)
})
