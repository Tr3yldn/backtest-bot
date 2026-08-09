import { useEffect, useRef, useState } from 'react'
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
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle, Signal } from '../lib/types'
import { createDrawingPrimitive, type Drawing, type DrawingPoint, type DrawingType } from '../lib/drawingTools'

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
  enableDrawing?: boolean
  height?: string
}

const INDICATOR_COLORS = ['#f0b90b', '#7c9cff', '#4ecb8d', '#ff6b6b']

export function PriceChart({
  candles,
  currentIndex,
  signals,
  indicatorSeries,
  priceLines,
  enableDrawing,
  height = '440px',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const priceLinesRef = useRef<IPriceLine[]>([])

  const [activeTool, setActiveTool] = useState<DrawingType | 'none'>('none')
  const [drawingCount, setDrawingCount] = useState(0)
  const activeToolRef = useRef<DrawingType | 'none'>('none')
  const drawingsRef = useRef<Map<string, ReturnType<typeof createDrawingPrimitive>>>(new Map())
  const previewPrimitiveRef = useRef<ReturnType<typeof createDrawingPrimitive> | null>(null)
  const previewPointsRef = useRef<{ p1: DrawingPoint; p2: DrawingPoint } | null>(null)

  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

  const cancelPending = () => {
    const series = candleSeriesRef.current
    if (previewPrimitiveRef.current && series) {
      series.detachPrimitive(previewPrimitiveRef.current)
    }
    previewPrimitiveRef.current = null
    previewPointsRef.current = null
  }

  const clearAllDrawings = () => {
    const series = candleSeriesRef.current
    if (!series) return
    cancelPending()
    drawingsRef.current.forEach((primitive) => series.detachPrimitive(primitive))
    drawingsRef.current.clear()
    setDrawingCount(0)
  }

  const handleToolClick = (tool: DrawingType) => {
    cancelPending()
    setActiveTool((current) => (current === tool ? 'none' : tool))
  }

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

    function pointFromEvent(param: MouseEventParams<Time>): DrawingPoint | null {
      if (!param.point || !candleSeriesRef.current || !chartRef.current) return null
      // param.time is occasionally undefined on the very first click after data
      // loads (a lightweight-charts timing quirk), even though the pixel
      // position is valid — fall back to a direct coordinate lookup.
      const time = param.time ?? chartRef.current.timeScale().coordinateToTime(param.point.x)
      if (!time) return null
      const price = candleSeriesRef.current.coordinateToPrice(param.point.y)
      if (price === null) return null
      return { time, price }
    }

    function handleClick(param: MouseEventParams<Time>) {
      const tool = activeToolRef.current
      const series = candleSeriesRef.current
      if (tool === 'none' || !series) return
      const point = pointFromEvent(param)
      if (!point) return

      if (!previewPointsRef.current) {
        previewPointsRef.current = { p1: point, p2: point }
        const primitive = createDrawingPrimitive(
          tool,
          () => previewPointsRef.current!.p1,
          () => previewPointsRef.current!.p2,
        )
        previewPrimitiveRef.current = primitive
        series.attachPrimitive(primitive)
        return
      }

      const drawing: Drawing = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: tool,
        p1: previewPointsRef.current.p1,
        p2: point,
      }
      if (previewPrimitiveRef.current) series.detachPrimitive(previewPrimitiveRef.current)
      previewPrimitiveRef.current = null
      previewPointsRef.current = null

      const primitive = createDrawingPrimitive(
        drawing.type,
        () => drawing.p1,
        () => drawing.p2,
      )
      series.attachPrimitive(primitive)
      drawingsRef.current.set(drawing.id, primitive)
      setDrawingCount(drawingsRef.current.size)
    }

    function handleCrosshairMove(param: MouseEventParams<Time>) {
      if (!previewPointsRef.current || !previewPrimitiveRef.current) return
      const point = pointFromEvent(param)
      if (!point) return
      previewPointsRef.current.p2 = point
      previewPrimitiveRef.current.update()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelPending()
    }

    chart.subscribeClick(handleClick)
    chart.subscribeCrosshairMove(handleCrosshairMove)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      markersRef.current = null
      indicatorSeriesRef.current.clear()
      drawingsRef.current.clear()
      previewPrimitiveRef.current = null
      previewPointsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div style={{ position: 'relative' }}>
      {enableDrawing && (
        <div className="drawing-toolbar">
          <button
            type="button"
            className={`btn drawing-tool-btn ${activeTool === 'trendline' ? 'drawing-tool-btn-active' : ''}`}
            onClick={() => handleToolClick('trendline')}
            title="Trend line: click to start, click again to finish. Esc to cancel."
          >
            ／ Trend Line
          </button>
          <button
            type="button"
            className={`btn drawing-tool-btn ${activeTool === 'rectangle' ? 'drawing-tool-btn-active' : ''}`}
            onClick={() => handleToolClick('rectangle')}
            title="Rectangle: click to start, click again to finish. Esc to cancel."
          >
            ▭ Rectangle
          </button>
          <button
            type="button"
            className={`btn drawing-tool-btn ${activeTool === 'fibonacci' ? 'drawing-tool-btn-active' : ''}`}
            onClick={() => handleToolClick('fibonacci')}
            title="Fibonacci retracement: click the swing start, click the swing end. Esc to cancel."
          >
            𝄒 Fib Retracement
          </button>
          <button type="button" className="btn drawing-tool-btn" onClick={clearAllDrawings} disabled={drawingCount === 0}>
            Clear {drawingCount > 0 ? `(${drawingCount})` : ''}
          </button>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  )
}
