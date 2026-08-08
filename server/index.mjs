import 'dotenv/config'
import express from 'express'
import { alpacaRequest, isConfigured } from './alpaca.mjs'

const app = express()
app.use(express.json())

function asyncRoute(handler) {
  return (req, res, next) => handler(req, res, next).catch(next)
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
      return res.status(400).json({ message: 'symbol is required' })
    }
    if (!qty || Number(qty) <= 0) {
      return res.status(400).json({ message: 'qty must be a positive number' })
    }
    if (side !== 'buy' && side !== 'sell') {
      return res.status(400).json({ message: 'side must be "buy" or "sell"' })
    }
    if (type !== 'market' && type !== 'limit') {
      return res.status(400).json({ message: 'type must be "market" or "limit"' })
    }
    if (type === 'limit' && (!limit_price || Number(limit_price) <= 0)) {
      return res.status(400).json({ message: 'limit_price is required for limit orders' })
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

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message)
  res.status(err.status ?? 500).json({ message: err.message })
})

const port = process.env.PORT ?? 8787
app.listen(port, () => {
  console.log(`Trading backend listening on http://localhost:${port} (configured: ${isConfigured()})`)
})
