import { useState } from 'react'
import './App.css'
import { BacktestView } from './components/BacktestView'
import { OptionsLab } from './components/OptionsLab'

type View = 'backtest' | 'options'

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
        </nav>
      </header>

      {view === 'backtest' ? <BacktestView /> : <OptionsLab />}
    </div>
  )
}

export default App
