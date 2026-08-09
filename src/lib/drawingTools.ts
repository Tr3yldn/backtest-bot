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

export type DrawingType = 'trendline' | 'rectangle'

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

  private toPixel(point: DrawingPoint): { x: number; y: number } | null {
    if (!this.chart || !this.series) return null
    const x = this.chart.timeScale().timeToCoordinate(point.time)
    const y = this.series.priceToCoordinate(point.price)
    if (x === null || y === null) return null
    return { x, y }
  }

  abstract drawShape(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }): void

  paneViews(): readonly IPrimitivePaneView[] {
    const self = this
    const renderer: IPrimitivePaneRenderer = {
      draw: (target) => {
        target.useMediaCoordinateSpace(({ context }) => {
          const p1 = self.toPixel(self.getP1())
          const p2 = self.toPixel(self.getP2())
          if (!p1 || !p2) return
          self.drawShape(context, p1, p2)
        })
      },
    }
    return [{ renderer: () => renderer }]
  }
}

class TrendLinePrimitive extends BaseDrawingPrimitive {
  drawShape(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }): void {
    ctx.save()
    ctx.strokeStyle = STROKE_COLOR
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
    ctx.restore()
  }
}

class RectanglePrimitive extends BaseDrawingPrimitive {
  drawShape(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }): void {
    const x = Math.min(p1.x, p2.x)
    const y = Math.min(p1.y, p2.y)
    const w = Math.abs(p2.x - p1.x)
    const h = Math.abs(p2.y - p1.y)
    ctx.save()
    ctx.fillStyle = FILL_COLOR
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = STROKE_COLOR
    ctx.lineWidth = 1.5
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }
}

export function createDrawingPrimitive(
  type: DrawingType,
  getP1: () => DrawingPoint,
  getP2: () => DrawingPoint,
): BaseDrawingPrimitive {
  return type === 'trendline' ? new TrendLinePrimitive(getP1, getP2) : new RectanglePrimitive(getP1, getP2)
}
