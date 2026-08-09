import { useEffect, useRef, useState } from 'react'
import { searchYahooSymbols, type SymbolSearchResult } from '../lib/yahoo'
import type { MarketSymbol } from '../lib/markets'

interface Props {
  value: string
  valueLabel: string
  popular: MarketSymbol[]
  onSelect: (symbol: string, label: string) => void
  disabled?: boolean
  /** Restrict results to these Yahoo `typeDisp` values (e.g. ['Equity', 'ETF']). Omit to allow all types. */
  filterTypes?: string[]
}

export function SymbolSearch({ value, valueLabel, popular, onSelect, disabled, filterTypes }: Props) {
  const [query, setQuery] = useState(valueLabel)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SymbolSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(valueLabel)
  }, [valueLabel])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(valueLabel)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [valueLabel])

  const handleQueryChange = (next: string) => {
    setQuery(next)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (next.trim().length === 0) {
      setResults([])
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true)
      try {
        const found = await searchYahooSymbols(next)
        setResults(filterTypes ? found.filter((r) => filterTypes.includes(r.type)) : found)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const showPopular = query.trim().length === 0
  const listItems = showPopular
    ? popular.map((p) => ({ symbol: p.id, name: p.label, type: '', exchange: '' }))
    : results

  return (
    <div className="symbol-search" ref={containerRef}>
      <label>
        Symbol
        <input
          type="text"
          value={query}
          disabled={disabled}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search any symbol…"
        />
      </label>
      {open && (
        <div className="symbol-search-dropdown">
          {loading && <div className="symbol-search-item symbol-search-empty">Searching…</div>}
          {!loading && listItems.length === 0 && (
            <div className="symbol-search-item symbol-search-empty">
              {showPopular ? 'Type to search any symbol' : 'No matches'}
            </div>
          )}
          {!loading &&
            listItems.map((item) => (
              <button
                key={item.symbol}
                type="button"
                className={`symbol-search-item ${item.symbol === value ? 'symbol-search-item-active' : ''}`}
                onClick={() => {
                  onSelect(item.symbol, item.name)
                  setQuery(item.name)
                  setOpen(false)
                }}
              >
                <span className="symbol-search-symbol">{item.symbol}</span>
                <span className="symbol-search-name">{item.name}</span>
                {item.type && <span className="symbol-search-type">{item.type}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
