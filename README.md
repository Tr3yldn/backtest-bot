# Backtest Bench

A local web app for backtesting trading strategies across crypto, stocks, funds/ETFs, indices, bonds, futures, and forex — load a symbol, pick a strategy, then rewind and replay the chart bar by bar to see trades and equity unfold. Includes a separate Options Lab for exploring theoretical option payoffs over real historical underlying prices.

## Features

**Strategy Backtest**
- Historical OHLCV price data across seven asset classes:
  - Crypto — via Coinbase's public exchange API
  - Stocks, Funds/ETFs, Indices & Economy (VIX, yields, dollar index), Bonds (Treasury ETFs and yields), Futures (including metals: gold, silver, platinum, copper), and Forex — all via Yahoo Finance
- Live symbol search (any stock/ETF/index/future/forex pair Yahoo covers, not just the curated shortlist) alongside a popular-symbols quick list
- Timeframes from 1m up to monthly (1m, 5m, 15m, 30m, 1h, 4h, 6h, 1d, 1w, 1mo) — 4h is synthesized from 1h candles, and crypto's weekly/monthly are synthesized from daily candles grouped by real calendar week/month (Coinbase doesn't provide those granularities natively)
- Daily timeframe pulls **full available history** — decades back for long-listed stocks (all the way to IPO in many cases), full history since listing for crypto. Intraday timeframes are capped at a generous but bounded amount (unlimited 1m/5m data isn't practical to fetch or render); 1m/5m/15m/30m/1h are additionally hard-capped by Yahoo itself (7–60 days) regardless of what we request. No free source provides sub-minute (tick/second-level) data anywhere — that would require a paid feed
- Built-in strategies: SMA Crossover, RSI Reversal, MACD Crossover, Bollinger Bounce, Donchian Breakout — each with adjustable parameters
- Large, chart-first layout: a big candlestick chart with volume, indicator overlays, and buy/sell markers ([lightweight-charts](https://tradingview.github.io/lightweight-charts/)) — controls are compact so the chart dominates the screen, and the scrubber sits directly under it
- Basic charting tools: trend line and rectangle (click to start, click to finish, Esc to cancel a pending draw) — more tools (Fibonacci retracement, etc.) planned
- Equity curve chart
- Scrubber + play/pause/step controls to rewind and replay the backtest bar by bar
- Live stats as you scrub: total return, win rate, max drawdown, trade count

**Options Lab**
- Pick an underlying (stock, fund, or index), option type, position (long/short), strike offset, days to expiry, implied volatility, and risk-free rate
- Computes theoretical option value day-by-day using the Black-Scholes model over the underlying's *real* historical price path
- Same rewind/scrub interaction, showing option value and P&L evolve as the underlying moves
- **Theoretical pricing only** — there is no free source of real historical option market quotes, so this is a model, not real option data. Useful for building intuition about payoff shape and time decay.

No API keys required for either of the above, and neither places real trades.

**Paper Trading**
- Connects to your own [Alpaca](https://alpaca.markets) **paper trading** account (free, simulated $100k account — no real money)
- Live account equity/cash/buying power, open positions, and order history, auto-refreshed every 5s
- Place market or limit orders (buy/sell) and cancel open ones, straight from the UI
- Requires a small local backend (see Setup below) so your API secret never reaches the browser

**Auto-Trader**
- Connects one of the five strategies to your Alpaca paper account and trades it *unattended* — no manual click per order
- Restricted to stocks/funds (symbols that map 1:1 onto Alpaca's tradable universe)
- Polls for a new signal on the latest candle only (never retroactively acts on older signals), checks your current position before buying/selling so it never pyramids or sells short, and enforces a configurable max-trades-per-day cap
- Explicit arm/disarm switch, defaults to disarmed; an activity log shows every check and action
- Only runs while the local backend process (`npm run dev:full`) is alive on your machine — it is not a 24/7 cloud bot

## Setup

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL in your browser. This runs the Strategy Backtest and Options Lab tabs — no keys needed.

To use the **Paper Trading** tab, you also need the local backend running with your own Alpaca paper trading keys:

1. Sign up at [alpaca.markets](https://alpaca.markets) (free), make sure you're in **Paper Trading** mode, and generate an API key pair from Account → API Keys.
2. Copy `.env.example` to `.env` and fill in `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY`. `.env` is gitignored — never commit real keys.
3. Run `npm run dev:full` instead of `npm run dev` — this starts both the web app and the trading backend together.

## How it works

- `src/lib/coinbase.ts` — fetches crypto candles from Coinbase's public API
- `src/lib/yahoo.ts` — fetches stocks/funds/indices/bonds/futures/forex candles from Yahoo Finance
- `src/lib/markets.ts` — unifies both data sources behind one asset-class/symbol/timeframe catalog (proxied through Vite's dev server to avoid CORS)
- `src/lib/indicators.ts` — SMA/EMA/RSI/MACD/Bollinger/Donchian indicator math
- `src/lib/strategies.ts` — turns indicator crossovers into buy/sell signals
- `src/lib/backtest.ts` — simulates a long-only, all-in/all-out backtest and computes stats
- `src/lib/blackScholes.ts` + `src/lib/optionsBacktest.ts` — theoretical option pricing and the Options Lab's day-by-day simulation
- `server/` — Express (TypeScript, run via `tsx`) backend that holds the Alpaca secret key server-side and proxies account/position/order requests; the browser only ever talks to `server/`, never to Alpaca directly
  - `server/autotrader.ts` — the Auto-Trader's polling loop; imports `runStrategy` from `src/lib/strategies.ts` directly so it evaluates signals with the exact same logic shown in the Strategy Backtest tab
  - `server/marketData.ts` — server-side candle fetcher (reuses `src/lib/yahoo.ts` with an absolute URL instead of the browser's proxied relative path)
- `src/lib/tradingApi.ts` / `src/lib/autoTraderApi.ts` — frontend clients for the backend above
- `src/lib/resample.ts` — aggregates N consecutive candles into one (used to synthesize the 4h timeframe)
- `src/lib/drawingTools.ts` — trend line / rectangle chart primitives, built on lightweight-charts' plugin API
- `src/components/SymbolSearch.tsx` — live symbol search box (Yahoo's search endpoint), used anywhere a non-crypto symbol is picked
- `src/components/BacktestView.tsx` / `OptionsLab.tsx` / `PaperTradingView.tsx` / `AutoTraderView.tsx` — the four tabs, built from shared chart/scrubber/stats/strategy-field components

## Notes

Strategy Backtest and Options Lab are pure backtesting tools — no live connection, no real trades. Options pricing is model-based (Black-Scholes), not sourced from real historical option markets. Paper Trading and Auto-Trader place real orders, but only against Alpaca's simulated paper account — no real money is ever at risk through this app.

No free data source provides second-level or tick data — 1-minute candles are the finest resolution available anywhere in this app. Real-time tick data requires a paid feed (Polygon.io, IEX, etc.) and isn't wired up here.
