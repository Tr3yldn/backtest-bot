export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null)
  const k = 2 / (period + 1)
  let prev: number | null = null
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period
      prev = seed
      out[i] = seed
    } else if (i >= period) {
      prev = values[i] * k + (prev as number) * (1 - k)
      out[i] = prev
    }
  }
  return out
}

export function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null)
  if (values.length <= period) return out

  let gainSum = 0
  let lossSum = 0
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1]
    if (change >= 0) gainSum += change
    else lossSum -= change
  }
  let avgGain = gainSum / period
  let avgLoss = lossSum / period
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1]
    const gain = change >= 0 ? change : 0
    const loss = change < 0 ? -change : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }

  return out
}

export function macdLine(
  values: number[],
  fastPeriod: number,
  slowPeriod: number,
): { macd: (number | null)[]; fast: (number | null)[]; slow: (number | null)[] } {
  const fast = ema(values, fastPeriod)
  const slow = ema(values, slowPeriod)
  const macd = values.map((_, i) =>
    fast[i] !== null && slow[i] !== null ? (fast[i] as number) - (slow[i] as number) : null,
  )
  return { macd, fast, slow }
}

export function bollingerBands(
  values: number[],
  period: number,
  stdDevMultiplier: number,
): { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(values, period)
  const upper: (number | null)[] = new Array(values.length).fill(null)
  const lower: (number | null)[] = new Array(values.length).fill(null)

  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i] as number
    const window = values.slice(i - period + 1, i + 1)
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period
    const stdDev = Math.sqrt(variance)
    upper[i] = mean + stdDevMultiplier * stdDev
    lower[i] = mean - stdDevMultiplier * stdDev
  }

  return { middle, upper, lower }
}

export function donchianChannel(
  highs: number[],
  lows: number[],
  period: number,
): { upper: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = new Array(highs.length).fill(null)
  const lower: (number | null)[] = new Array(lows.length).fill(null)

  for (let i = period; i < highs.length; i++) {
    upper[i] = Math.max(...highs.slice(i - period, i))
    lower[i] = Math.min(...lows.slice(i - period, i))
  }

  return { upper, lower }
}
