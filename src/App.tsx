import { useState } from 'react'
import './App.css'
import { AutoTraderView } from './components/AutoTraderView'
import { BacktestView } from './components/BacktestView'
import { OptionsLab } from './components/OptionsLab'
import { PaperTradingView } from './components/PaperTradingView'
import { StrategyTesterView } from './components/StrategyTesterView'

type View = 'backtest' | 'options' | 'tester' | 'paper' | 'autotrader'

function App() {
  const [view, setView] = useState<View>('backtest')

  return (
    <div className="app">
      <header className="app-header">
        <h1>Backtest Bench</h1>
        <p className="subtitle">
          Load historical prices across crypto, stocks, funds, indices, bonds, futures, and forex, run a strategy,
          then rewind and replay it bar by bar.
        </p>
        <nav className="tabs">
          <button className={`tab ${view === 'backtest' ? 'tab-active' : ''}`} onClick={() => setView('backtest')}>
            Strategy Backtest
          </button>
          <button className={`tab ${view === 'options' ? 'tab-active' : ''}`} onClick={() => setView('options')}>
            Options Lab
          </button>
          <button className={`tab ${view === 'tester' ? 'tab-active' : ''}`} onClick={() => setView('tester')}>
            Strategy Tester
          </button>
          <button className={`tab ${view === 'paper' ? 'tab-active' : ''}`} onClick={() => setView('paper')}>
            Paper Trading
          </button>
          <button className={`tab ${view === 'autotrader' ? 'tab-active' : ''}`} onClick={() => setView('autotrader')}>
            Auto-Trader
          </button>
        </nav>
      </header>

      {view === 'backtest' && <BacktestView />}
      {view === 'options' && <OptionsLab />}
      {view === 'tester' && <StrategyTesterView />}
      {view === 'paper' && <PaperTradingView />}
      {view === 'autotrader' && <AutoTraderView />}
    </div>
  )
}

export default App
