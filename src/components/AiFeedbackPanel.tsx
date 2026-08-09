import { useEffect, useState } from 'react'
import { getAiStatus, getStrategyFeedback, type FeedbackRequest } from '../lib/aiApi'

interface Props {
  buildRequest: () => FeedbackRequest
  disabled?: boolean
  disabledReason?: string
}

export function AiFeedbackPanel({ buildRequest, disabled, disabledReason }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAiStatus()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false))
  }, [])

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getStrategyFeedback(buildRequest())
      setFeedback(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI feedback.')
    } finally {
      setLoading(false)
    }
  }

  if (configured === false) {
    return (
      <div className="panel ai-panel">
        <h3 className="panel-title">AI Coach</h3>
        <p className="ai-hint">
          Add your own Anthropic API key to <code>.env</code> as <code>ANTHROPIC_API_KEY</code> to turn this on — see
          the README for setup steps. It's pay-per-use on your own account (typically a fraction of a cent per
          request).
        </p>
      </div>
    )
  }

  return (
    <div className="panel ai-panel">
      <h3 className="panel-title">AI Coach</h3>
      <button
        className="btn btn-primary"
        onClick={handleClick}
        disabled={disabled || loading || configured === null}
        title={disabled ? disabledReason : undefined}
      >
        {loading ? 'Thinking…' : 'Get AI Feedback'}
      </button>
      {disabled && disabledReason && <p className="ai-hint">{disabledReason}</p>}
      {error && <div className="error-banner">{error}</div>}
      {feedback && <p className="ai-feedback-text">{feedback}</p>}
    </div>
  )
}
