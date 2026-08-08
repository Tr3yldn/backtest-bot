# Backtest Bench

A local web app for backtesting trading strategies against historical crypto candles — load a symbol, pick a strategy, then rewind and replay the chart bar by bar to see trades and equity unfold.

## Features

- Historical OHLCV candles from Coinbase's public exchange API (no API key required)
- Built-in strategies: SMA Crossover, RSI Reversal, MACD Crossover — each with adjustable parameters
- Candlestick chart with volume, indicator overlays, and buy/sell markers ([lightweight-charts](https://tradingview.github.io/lightweight-charts/))
- Equity curve chart
- Scrubber + play/pause/step controls to rewind and replay the backtest bar by bar
- Live stats as you scrub: total return, win rate, max drawdown, trade count

## Getting started

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL in your browser.

## How it works

- `src/lib/coinbase.ts` — fetches historical candles from Coinbase's public API (proxied through Vite's dev server to avoid CORS)
- `src/lib/indicators.ts` — SMA/EMA/RSI/MACD indicator math
- `src/lib/strategies.ts` — turns indicator crossovers into buy/sell signals
- `src/lib/backtest.ts` — simulates a long-only, all-in/all-out backtest and computes stats
- `src/components/` — chart, controls, scrubber, and stats UI

## Notes

This is a backtesting/paper-trading tool only — it does not place real trades or connect to any brokerage/exchange account.
