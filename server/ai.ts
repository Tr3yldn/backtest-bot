import Anthropic from '@anthropic-ai/sdk'

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export interface TradeSummary {
  direction: string
  entryPrice: number
  exitPrice: number | null
  returnPct: number | null
}

export interface FeedbackRequest {
  source: 'backtest' | 'manual-session'
  symbolLabel: string
  timeframeLabel: string
  strategyLabel?: string
  stats: {
    totalReturnPct: number
    winRate: number
    tradeCount: number
    maxDrawdownPct?: number
    avgWinPct?: number
    avgLossPct?: number
  }
  trades: TradeSummary[]
}

const SYSTEM_PROMPT = `You are a trading strategy coach reviewing the results of a backtest or a manually recorded practice trading session inside a local backtesting tool. You are not a financial advisor and the user knows this is a hobby project — do not add disclaimers about seeking a financial advisor, and do not repeat obvious facts already shown in the stats. Give direct, specific, concrete feedback:

- 2-4 sentences on what the results actually show (be honest if the sample size is too small to conclude anything).
- 3-5 short bullet points of concrete, actionable observations or improvement ideas grounded in the specific numbers and trades given (e.g. risk sizing, win/loss asymmetry, overtrading, drawdown, whether the trade count is even statistically meaningful).
- Keep the whole reply under 200 words. Plain text with simple "-" bullets, no markdown headers, no tables.`

function buildPrompt(req: FeedbackRequest): string {
  const lines: string[] = []
  lines.push(`Source: ${req.source === 'backtest' ? 'Automated strategy backtest' : 'Manually recorded practice session'}`)
  lines.push(`Symbol: ${req.symbolLabel}`)
  lines.push(`Timeframe: ${req.timeframeLabel}`)
  if (req.strategyLabel) lines.push(`Strategy: ${req.strategyLabel}`)
  lines.push('')
  lines.push('Stats:')
  lines.push(`- Total return: ${req.stats.totalReturnPct.toFixed(2)}%`)
  lines.push(`- Win rate: ${req.stats.winRate.toFixed(1)}%`)
  lines.push(`- Trade count: ${req.stats.tradeCount}`)
  if (req.stats.maxDrawdownPct !== undefined) lines.push(`- Max drawdown: ${req.stats.maxDrawdownPct.toFixed(2)}%`)
  if (req.stats.avgWinPct !== undefined) lines.push(`- Avg win: ${req.stats.avgWinPct.toFixed(2)}%`)
  if (req.stats.avgLossPct !== undefined) lines.push(`- Avg loss: ${req.stats.avgLossPct.toFixed(2)}%`)
  lines.push('')

  if (req.trades.length > 0) {
    lines.push(`Trades (most recent ${Math.min(req.trades.length, 40)} of ${req.trades.length}):`)
    for (const t of req.trades.slice(-40)) {
      const ret = t.returnPct === null ? 'open' : `${t.returnPct >= 0 ? '+' : ''}${t.returnPct.toFixed(2)}%`
      lines.push(`- ${t.direction} entry ${t.entryPrice.toFixed(2)} -> exit ${t.exitPrice?.toFixed(2) ?? 'open'} (${ret})`)
    }
  }

  return lines.join('\n')
}

export async function getStrategyFeedback(req: FeedbackRequest): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server (.env is missing it).')
  }

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(req) }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  if (!text) throw new Error('AI returned an empty response.')
  return text
}
