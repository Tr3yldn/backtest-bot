# Backtest Bench

A local web app for backtesting trading strategies across crypto, stocks, funds/ETFs, indices, bonds, futures, and forex — load a symbol, pick a strategy, then rewind and replay the chart bar by bar to see trades and equity unfold. Includes a separate Options Lab for exploring theoretical option payoffs over real historical underlying prices.

## Features

**Strategy Backtest**
- Historical OHLCV price data across seven asset classes:
  - Crypto — via Coinbase's public exchange API
  - Stocks, Funds/ETFs, Indices & Economy (VIX, yields, dollar index), Bonds (Treasury ETFs and yields), Futures (including metals: gold, silver, platinum, copper), and Forex — all via Yahoo Finance
- Live symbol search (any stock/ETF/index/future/forex pair Yahoo covers, not just the curated shortlist) alongside a popular-symbols quick list
- Timeframes from 1m up to monthly, the same set on every asset class (1m, 3m, 5m, 15m, 30m, 1h, 4h, [6h on crypto], 1d, 1w, 1mo) — 3m/4h/30m(crypto)/weekly/monthly are all synthesized from finer native candles since neither Coinbase nor Yahoo provide them directly (weekly/monthly on crypto are grouped by real calendar week/month, not a fixed candle count)
- Daily timeframe pulls **full available history** — decades back for long-listed stocks (all the way to IPO in many cases), full history since listing for crypto. Intraday timeframes are capped at a generous but bounded amount (unlimited 1m/5m data isn't practical to fetch or render); 1m/5m/15m/30m/1h are additionally hard-capped by Yahoo itself (7–60 days) regardless of what we request. No free source provides sub-minute (tick/second-level) data anywhere — that would require a paid feed
- Built-in strategies: SMA Crossover, RSI Reversal, MACD Crossover, Bollinger Bounce, Donchian Breakout — each with adjustable parameters
- Large, chart-first layout: a big candlestick chart with volume, indicator overlays, and buy/sell markers ([lightweight-charts](https://tradingview.github.io/lightweight-charts/)) — controls are compact so the chart dominates the screen, and the scrubber sits directly under it
- Charting tools: trend line, rectangle, and Fibonacci retracement (click to start, click to finish, Esc to cancel a pending draw) — Fibonacci draws the standard 0/23.6/38.2/50/61.8/78.6/100% levels with price labels
- Equity curve chart
- Scrubber + play/pause/step controls to rewind and replay the backtest bar by bar
- Live stats as you scrub: total return, win rate, max drawdown, trade count

**Options Lab**
- Pick an underlying (stock, fund, or index), option type, position (long/short), strike offset, days to expiry, implied volatility, and risk-free rate
- Computes theoretical option value day-by-day using the Black-Scholes model over the underlying's *real* historical price path
- Same rewind/scrub interaction, showing option value and P&L evolve as the underlying moves
- **Theoretical pricing only** — there is no free source of real historical option market quotes, so this is a model, not real option data. Useful for building intuition about payoff shape and time decay.

No API keys required for either of the above, and neither places real trades.

**Strategy Tester (manual session recorder)**
- Load any symbol/timeframe, scrub the chart bar by bar, and record your *own* manual trades as you go — pick Long or Short, click "Enter … Here" at the bar you'd have entered, scrub forward, then "Exit Trade Here" when you'd have closed it
- Tags every entry/exit with the exact bar's close price and shows them as buy/sell markers on the chart, same as the automated backtest
- Live stats while you go: win rate, total (compounded) return, avg win/loss, best/worst trade
- Name and save sessions (stored in your browser's local storage — nothing leaves your machine) to compare different manual approaches later; reload or delete saved sessions from the list
- The market/symbol/timeframe locks once a session has trades in it, so recorded trade indices always line up with the loaded candles — start a new session to switch markets

**AI Coach (optional, bring your own Anthropic API key)**
- A chat panel appears under both the Strategy Backtest results and the Strategy Tester's results — click "Get AI Feedback" for an opening critique, then keep typing follow-up questions ("why is my win rate so low?", "what would happen if I widened my stop?") and it replies in the same conversation
- Every message is grounded in your current stats and trade list — not a person, not financial advice, just a second set of eyes on the numbers
- "Start Over" clears the conversation so you can ask for a fresh take
- Fully optional: with no key configured it just shows a setup hint instead of the button, and the rest of the app works exactly the same
- Requires your own [Anthropic API key](https://console.anthropic.com) — this is pay-per-use billed directly to you (typically well under a cent per message at normal usage); see Setup below

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

Then open the printed `localhost` URL in your browser. This runs the Strategy Backtest, Options Lab, and Strategy Tester tabs — no keys needed (the Strategy Tester's AI Coach panel just shows a setup hint instead of a button until you add a key, see below).

To use the **Paper Trading** and **Auto-Trader** tabs, you also need the local backend running with your own Alpaca paper trading keys:

1. Sign up at [alpaca.markets](https://alpaca.markets) (free), make sure you're in **Paper Trading** mode, and generate an API key pair from Account → API Keys.
2. Copy `.env.example` to `.env` and fill in `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY`. `.env` is gitignored — never commit real keys.
3. Run `npm run dev:full` instead of `npm run dev` — this starts both the web app and the trading backend together.

To use the **AI Coach** ("Get AI Feedback") panel:

1. Create your own key at [console.anthropic.com](https://console.anthropic.com) (requires setting up billing on your Anthropic account — this is separate from, and unrelated to, your Alpaca account).
2. Add it to `.env` as `ANTHROPIC_API_KEY=sk-ant-...`.
3. Run `npm run dev:full` (same backend that serves Paper Trading/Auto-Trader also serves the AI endpoint).

## How it works

- `src/lib/coinbase.ts` — fetches crypto candles from Coinbase's public API
- `src/lib/yahoo.ts` — fetches stocks/funds/indices/bonds/futures/forex candles from Yahoo Finance
- `src/lib/markets.ts` — unifies both data sources behind one asset-class/symbol/timeframe catalog (proxied through Vite's dev server to avoid CORS)
- `src/lib/indicators.ts` — SMA/EMA/RSI/MACD/Bollinger/Donchian indicator math
- `src/lib/strategies.ts` — turns indicator crossovers into buy/sell signals
- `src/lib/backtest.ts` — simulates a long-only, all-in/all-out backtest and computes stats
- `src/lib/blackScholes.ts` + `src/lib/optionsBacktest.ts` — theoretical option pricing and the Options Lab's day-by-day simulation
- `src/lib/manualTester.ts` — manual trade/session types, win-rate/return stats, and localStorage persistence for the Strategy Tester
- `server/` — Express (TypeScript, run via `tsx`) backend that holds the Alpaca secret key and Anthropic API key server-side; the browser only ever talks to `server/`, never to Alpaca or Anthropic directly
  - `server/autotrader.ts` — the Auto-Trader's polling loop; imports `runStrategy` from `src/lib/strategies.ts` directly so it evaluates signals with the exact same logic shown in the Strategy Backtest tab
  - `server/marketData.ts` — server-side candle fetcher (reuses `src/lib/yahoo.ts` with an absolute URL instead of the browser's proxied relative path)
  - `server/ai.ts` — calls Claude (via `@anthropic-ai/sdk`) for the AI Coach panel; keeps your stats/trade summary in the system prompt and continues the conversation turn by turn
- `src/lib/tradingApi.ts` / `src/lib/autoTraderApi.ts` / `src/lib/aiApi.ts` — frontend clients for the backend above
- `src/lib/resample.ts` — aggregates N consecutive candles into one (used to synthesize the 4h timeframe)
- `src/lib/drawingTools.ts` — trend line / rectangle / Fibonacci chart primitives, built on lightweight-charts' plugin API
- `src/components/SymbolSearch.tsx` — live symbol search box (Yahoo's search endpoint), used anywhere a non-crypto symbol is picked
- `src/components/AiFeedbackPanel.tsx` — the AI Coach chat panel shared by Strategy Backtest and Strategy Tester
- `src/components/BacktestView.tsx` / `OptionsLab.tsx` / `StrategyTesterView.tsx` / `PaperTradingView.tsx` / `AutoTraderView.tsx` — the five tabs, built from shared chart/scrubber/stats/strategy-field components

## Notes

Strategy Backtest, Options Lab, and Strategy Tester are pure backtesting/practice tools — no live connection, no real trades. Options pricing is model-based (Black-Scholes), not sourced from real historical option markets. Paper Trading and Auto-Trader place real orders, but only against Alpaca's simulated paper account — no real money is ever at risk through this app.

No free data source provides second-level or tick data — 1-minute candles are the finest resolution available anywhere in this app. Real-time tick data requires a paid feed (Polygon.io, IEX, etc.) and isn't wired up here.

Strategy Tester sessions are stored only in your browser's local storage — they aren't synced anywhere and are specific to one browser on one machine. The AI Coach panel sends only your stats and trade list (numbers, no personal data) to Anthropic's API using your own key; it's entirely optional and the rest of the app functions identically without it.
