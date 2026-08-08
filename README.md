# Backtest Bench

A local web app for backtesting trading strategies across crypto, stocks, funds/ETFs, indices, bonds, futures, and forex — load a symbol, pick a strategy, then rewind and replay the chart bar by bar to see trades and equity unfold. Includes a separate Options Lab for exploring theoretical option payoffs over real historical underlying prices.

## Features

**Strategy Backtest**
- Historical OHLCV price data across seven asset classes:
  - Crypto — via Coinbase's public exchange API
  - Stocks, Funds/ETFs, Indices & Economy (VIX, yields, dollar index), Bonds (Treasury ETFs and yields), Futures, and Forex — all via Yahoo Finance
- Built-in strategies: SMA Crossover, RSI Reversal, MACD Crossover, Bollinger Bounce, Donchian Breakout — each with adjustable parameters
- Candlestick chart with volume, indicator overlays, and buy/sell markers ([lightweight-charts](https://tradingview.github.io/lightweight-charts/))
- Equity curve chart
- Scrubber + play/pause/step controls to rewind and replay the backtest bar by bar
- Live stats as you scrub: total return, win rate, max drawdown, trade count

**Options Lab**
- Pick an underlying (stock, fund, or index), option type, position (long/short), strike offset, days to expiry, implied volatility, and risk-free rate
- Computes theoretical option value day-by-day using the Black-Scholes model over the underlying's *real* historical price path
- Same rewind/scrub interaction, showing option value and P&L evolve as the underlying moves
- **Theoretical pricing only** — there is no free source of real historical option market quotes, so this is a model, not real option data. Useful for building intuition about payoff shape and time decay.

No API keys required for any of the above, and nothing here places real trades — this is a paper/backtesting tool only.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL in your browser.

## How it works

- `src/lib/coinbase.ts` — fetches crypto candles from Coinbase's public API
- `src/lib/yahoo.ts` — fetches stocks/funds/indices/bonds/futures/forex candles from Yahoo Finance
- `src/lib/markets.ts` — unifies both data sources behind one asset-class/symbol/timeframe catalog (proxied through Vite's dev server to avoid CORS)
- `src/lib/indicators.ts` — SMA/EMA/RSI/MACD/Bollinger/Donchian indicator math
- `src/lib/strategies.ts` — turns indicator crossovers into buy/sell signals
- `src/lib/backtest.ts` — simulates a long-only, all-in/all-out backtest and computes stats
- `src/lib/blackScholes.ts` + `src/lib/optionsBacktest.ts` — theoretical option pricing and the Options Lab's day-by-day simulation
- `src/components/BacktestView.tsx` / `OptionsLab.tsx` — the two tabs, built from shared chart/scrubber/stats components

## Notes

This is a backtesting/paper-trading tool only — it does not place real trades or connect to any brokerage/exchange account. Options pricing is model-based (Black-Scholes), not sourced from real historical option markets.
