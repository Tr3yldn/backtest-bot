import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelOrder,
  getAccount,
  getOrders,
  getPositions,
  getStatus,
  placeOrder,
  type AlpacaAccount,
  type AlpacaOrder,
  type AlpacaPosition,
} from '../lib/tradingApi'

function formatUsd(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function PaperTradingView() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [account, setAccount] = useState<AlpacaAccount | null>(null)
  const [positions, setPositions] = useState<AlpacaPosition[]>([])
  const [orders, setOrders] = useState<AlpacaOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [symbol, setSymbol] = useState('AAPL')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [qty, setQty] = useState(1)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const pollRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const status = await getStatus()
      setConfigured(status.configured)
      if (!status.configured) return

      const [acc, pos, ord] = await Promise.all([getAccount(), getPositions(), getOrders()])
      setAccount(acc)
      setPositions(pos)
      setOrders(ord)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the trading backend.')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))

    pollRef.current = window.setInterval(refresh, 5000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [refresh])

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMessage(null)
    try {
      await placeOrder({
        symbol: symbol.toUpperCase(),
        qty,
        side,
        type: orderType,
        ...(orderType === 'limit' ? { limit_price: limitPrice } : {}),
      })
      setSubmitMessage(`Order submitted: ${side} ${qty} ${symbol.toUpperCase()}`)
      await refresh()
    } catch (err) {
      setSubmitMessage(err instanceof Error ? `Error: ${err.message}` : 'Order failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelOrder(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order.')
    }
  }

  if (loading) {
    return <div className="loading-banner">Connecting to trading backend…</div>
  }

  if (configured === false) {
    return (
      <div className="controls">
        <h3 className="panel-title">Backend not configured</h3>
        <p className="subtitle">
          The trading backend is running but doesn't have Alpaca paper trading keys yet. Add them to a{' '}
          <code>.env</code> file in the project root (copy <code>.env.example</code>) as{' '}
          <code>ALPACA_API_KEY_ID</code> and <code>ALPACA_API_SECRET_KEY</code>, then restart{' '}
          <code>npm run dev:full</code>.
        </p>
      </div>
    )
  }

  if (configured === null && error) {
    return (
      <div className="controls">
        <h3 className="panel-title">Can't reach the trading backend</h3>
        <p className="subtitle">
          Make sure the backend is running: <code>npm run server</code> (or <code>npm run dev:full</code> to run both
          the web app and backend together). Error: {error}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="options-disclaimer">
        Paper trading only — orders execute against Alpaca's simulated paper account, not a real brokerage account.
      </div>

      {account && (
        <div className="stats-panel">
          <div className="stat">
            <span className="stat-label">Equity</span>
            <span className="stat-value">{formatUsd(account.equity)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Cash</span>
            <span className="stat-value">{formatUsd(account.cash)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Buying Power</span>
            <span className="stat-value">{formatUsd(account.buying_power)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Account Status</span>
            <span className="stat-value">{account.status}</span>
          </div>
        </div>
      )}

      <div className="controls">
        <h3 className="panel-title">Place Order</h3>
        <form onSubmit={handleSubmitOrder}>
          <div className="controls-row">
            <label>
              Symbol
              <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </label>
            <label>
              Side
              <select value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>
            <label>
              Quantity
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </label>
            <label>
              Order type
              <select value={orderType} onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}>
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </label>
            {orderType === 'limit' && (
              <label>
                Limit price
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                />
              </label>
            )}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : `${side === 'buy' ? 'Buy' : 'Sell'}`}
            </button>
          </div>
        </form>
        {submitMessage && <div className={submitMessage.startsWith('Error') ? 'error-banner' : 'subtitle'}>{submitMessage}</div>}
        {error && <div className="error-banner">{error}</div>}
      </div>

      <div className="panel">
        <h3 className="panel-title">Positions</h3>
        {positions.length === 0 ? (
          <p className="subtitle">No open positions.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Avg Entry</th>
                <th>Current</th>
                <th>Market Value</th>
                <th>Unrealized P/L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.symbol}>
                  <td>{p.symbol}</td>
                  <td>{p.qty}</td>
                  <td>{formatUsd(p.avg_entry_price)}</td>
                  <td>{formatUsd(p.current_price)}</td>
                  <td>{formatUsd(p.market_value)}</td>
                  <td className={Number(p.unrealized_pl) >= 0 ? 'positive' : 'negative'}>
                    {formatUsd(p.unrealized_pl)} ({(Number(p.unrealized_plpc) * 100).toFixed(2)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3 className="panel-title">Recent Orders</h3>
        {orders.length === 0 ? (
          <p className="subtitle">No orders yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Type</th>
                <th>Status</th>
                <th>Filled Price</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.symbol}</td>
                  <td>{o.side}</td>
                  <td>{o.qty}</td>
                  <td>{o.type}</td>
                  <td>{o.status}</td>
                  <td>{o.filled_avg_price ? formatUsd(o.filled_avg_price) : '—'}</td>
                  <td>{new Date(o.submitted_at).toLocaleString()}</td>
                  <td>
                    {(o.status === 'new' || o.status === 'accepted' || o.status === 'pending_new') && (
                      <button className="btn" onClick={() => handleCancel(o.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
