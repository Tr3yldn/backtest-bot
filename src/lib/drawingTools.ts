import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts'

export interface DrawingPoint {
  time: Time
  price: number
}

export type DrawingType = 'trendline' | 'rectangle' | 'fibonacci'

export interface Drawing {
  id: string
  type: DrawingType
  p1: DrawingPoint
  p2: DrawingPoint
}

const STROKE_COLOR = '#f0b90b'
const FILL_COLOR = 'rgba(240, 185, 11, 0.12)'

abstract class BaseDrawingPrimitive implements ISeriesPrimitive<Time> {
  protected chart: IChartApi | null = null
  protected series: ISeriesApi<'Candlestick'> | null = null
  private requestUpdate: (() => void) | null = null
  private getP1: () => DrawingPoint
  private getP2: () => DrawingPoint

  constructor(getP1: () => DrawingPoint, getP2: () => DrawingPoint) {
    this.getP1 = getP1
    this.getP2 = getP2
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this.chart = param.chart
    this.series = param.series as ISeriesApi<'Candlestick'>
    this.requestUpdate = param.requestUpdate
  }

  detached(): void {
    this.chart = null
    this.series = null
    this.requestUpdate = null
  }

  update(): void {
    this.requestUpdate?.()
  }

  protected toPixel(point: DrawingPoint): { x: number; y: number } | null {
    if (!this.chart || !this.series) return null
    const x = this.chart.timeScale().timeToCoordinate(point.time)
    const y = this.series.priceToCoordinate(point.price)
    if (x === null || y === null) return null
    return { x, y }
  }

  protected priceToY(price: number): number | null {
    return this.series?.priceToCoordinate(price) ?? null
  }

  abstract render(ctx: CanvasRenderingContext2D, p1: DrawingPoint, p2: DrawingPoint): void

  paneViews(): readonly IPrimitivePaneView[] {
    const self = this
    const renderer: IPrimitivePaneRenderer = {
      draw: (target) => {
        target.useMediaCoordinateSpace(({ context }) => {
          self.render(context, self.getP1(), self.getP2())
        })
      },
    }
    return [{ renderer: () => renderer }]
  }
}

class TrendLinePrimitive extends BaseDrawingPrimitive {
  render(ctx: CanvasRenderingContext2D, p1: DrawingPoint, p2: DrawingPoint): void {
    const a = this.toPixel(p1)
    const b = this.toPixel(p2)
    if (!a || !b) return
    ctx.save()
    ctx.strokeStyle = STROKE_COLOR
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.restore()
  }
}

class RectanglePrimitive extends BaseDrawingPrimitive {
  render(ctx: CanvasRenderingContext2D, p1: DrawingPoint, p2: DrawingPoint): void {
    const a = this.toPixel(p1)
    const b = this.toPixel(p2)
    if (!a || !b) return
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    const w = Math.abs(b.x - a.x)
    const h = Math.abs(b.y - a.y)
    ctx.save()
    ctx.fillStyle = FILL_COLOR
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = STROKE_COLOR
    ctx.lineWidth = 1.5
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }
}

const FIB_LEVELS: { level: number; color: string }[] = [
  { level: 0, color: '#9aa4b2' },
  { level: 0.236, color: '#f23645' },
  { level: 0.382, color: '#ff9800' },
  { level: 0.5, color: '#4ecb8d' },
  { level: 0.618, color: '#00bcd4' },
  { level: 0.786, color: '#2962ff' },
  { level: 1, color: '#9aa4b2' },
]

class FibonacciPrimitive extends BaseDrawingPrimitive {
  render(ctx: CanvasRenderingContext2D, p1: DrawingPoint, p2: DrawingPoint): void {
    const a = this.toPixel(p1)
    const b = this.toPixel(p2)
    if (!a || !b) return
    const left = Math.min(a.x, b.x)
    const right = Math.max(a.x, b.x)

    ctx.save()
    ctx.font = '11px sans-serif'
    ctx.textBaseline = 'bottom'
    for (const { level, color } of FIB_LEVELS) {
      const price = p1.price + (p2.price - p1.price) * level
      const y = this.priceToY(price)
      if (y === null) continue
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(left, y)
      ctx.lineTo(right, y)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillText(`${(level * 100).toFixed(1)}% (${price.toFixed(2)})`, left + 4, y - 2)
    }
    ctx.restore()
  }
}

export function createDrawingPrimitive(
  type: DrawingType,
  getP1: () => DrawingPoint,
  getP2: () => DrawingPoint,
): BaseDrawingPrimitive {
  if (type === 'trendline') return new TrendLinePrimitive(getP1, getP2)
  if (type === 'rectangle') return new RectanglePrimitive(getP1, getP2)
  return new FibonacciPrimitive(getP1, getP2)
}
