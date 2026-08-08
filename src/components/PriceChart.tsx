import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle, Signal } from '../lib/types'

export interface PriceLineSpec {
  price: number
  color: string
  title: string
}

interface Props {
  candles: Candle[]
  currentIndex: number
  signals: Signal[]
  indicatorSeries: Record<string, (number | null)[]>
  priceLines?: PriceLineSpec[]
}

const INDICATOR_COLORS = ['#f0b90b', '#7c9cff', '#4ecb8d', '#ff6b6b']

export function PriceChart({ candles, currentIndex, signals, indicatorSeries, priceLines }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const priceLinesRef = useRef<IPriceLine[]>([])

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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4ecb8d',
      downColor: '#ff6b6b',
      borderVisible: false,
      wickUpColor: '#4ecb8d',
      wickDownColor: '#ff6b6b',
    })
    candleSeriesRef.current = candleSeries
    markersRef.current = createSeriesMarkers(candleSeries, [])

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    volumeSeriesRef.current = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      markersRef.current = null
      indicatorSeriesRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const candleSeries = candleSeriesRef.current
    const volumeSeries = volumeSeriesRef.current
    const chart = chartRef.current
    if (!candleSeries || !volumeSeries || !chart) return

    const visible = candles.slice(0, currentIndex + 1)

    const candleData: CandlestickData[] = visible.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    candleSeries.setData(candleData)

    const volumeData: HistogramData[] = visible.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(78,203,141,0.5)' : 'rgba(255,107,107,0.5)',
    }))
    volumeSeries.setData(volumeData)

    const indicatorKeys = Object.keys(indicatorSeries)
    const existingKeys = new Set(indicatorSeriesRef.current.keys())

    indicatorKeys.forEach((key, i) => {
      let series = indicatorSeriesRef.current.get(key)
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS[i % INDICATOR_COLORS.length],
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        })
        indicatorSeriesRef.current.set(key, series)
      }
      existingKeys.delete(key)
      const data: LineData[] = []
      for (let idx = 0; idx <= currentIndex; idx++) {
        const value = indicatorSeries[key][idx]
        if (value !== null && value !== undefined) {
          data.push({ time: candles[idx].time as UTCTimestamp, value })
        }
      }
      series.setData(data)
    })

    existingKeys.forEach((key) => {
      const series = indicatorSeriesRef.current.get(key)
      if (series) {
        chart.removeSeries(series)
        indicatorSeriesRef.current.delete(key)
      }
    })

    const visibleSignals = signals.filter((s) => s.index <= currentIndex)
    const markers: SeriesMarker<Time>[] = visibleSignals.map((s) => ({
      time: candles[s.index].time as UTCTimestamp,
      position: s.type === 'buy' ? 'belowBar' : 'aboveBar',
      color: s.type === 'buy' ? '#4ecb8d' : '#ff6b6b',
      shape: s.type === 'buy' ? 'arrowUp' : 'arrowDown',
      text: s.type === 'buy' ? 'BUY' : 'SELL',
    }))
    markersRef.current?.setMarkers(markers)

    priceLinesRef.current.forEach((line) => candleSeries.removePriceLine(line))
    priceLinesRef.current = (priceLines ?? []).map((spec) =>
      candleSeries.createPriceLine({
        price: spec.price,
        color: spec.color,
        lineWidth: 1,
        lineStyle: 2,
        title: spec.title,
      }),
    )
  }, [candles, currentIndex, signals, indicatorSeries, priceLines])

  return <div ref={containerRef} style={{ width: '100%', height: '440px' }} />
}
