export type OptionType = 'call' | 'put'

// Abramowitz & Stegun approximation of the standard normal CDF.
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x >= 0 ? 1 - prob : prob
}

/**
 * Black-Scholes theoretical price for a European option.
 * S: spot price, K: strike, T: time to expiry in years, r: risk-free rate (decimal), sigma: implied volatility (decimal)
 */
export function blackScholesPrice(type: OptionType, S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) {
    return type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)
  }
  if (sigma <= 0) {
    const forward = S - K * Math.exp(-r * T)
    return type === 'call' ? Math.max(forward, 0) : Math.max(-forward, 0)
  }

  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)

  if (type === 'call') {
    return S * normalCdf(d1) - K * Math.exp(-r * T) * normalCdf(d2)
  }
  return K * Math.exp(-r * T) * normalCdf(-d2) - S * normalCdf(-d1)
}
