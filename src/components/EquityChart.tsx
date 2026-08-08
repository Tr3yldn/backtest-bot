import { useEffect, useRef } from 'react'
import { createChart, LineSeries, type IChartApi, type ISeriesApi, type LineData, type UTCTimestamp } from 'lightweight-charts'
import type { EquityPoint } from '../lib/types'

interface Props {
  equityCurve: EquityPoint[]
  currentIndex: number
}

export function EquityChart({ equityCurve, currentIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#c9d1d9' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
      autoSize: true,
    })
    chartRef.current = chart
    seriesRef.current = chart.addSeries(LineSeries, {
      color: '#7c9cff',
      lineWidth: 2,
      priceLineVisible: false,
    })

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const data: LineData[] = equityCurve.slice(0, currentIndex + 1).map((p) => ({
      time: p.time as UTCTimestamp,
      value: p.equity,
    }))
    series.setData(data)
  }, [equityCurve, currentIndex])

  return <div ref={containerRef} style={{ width: '100%', height: '180px' }} />
}
