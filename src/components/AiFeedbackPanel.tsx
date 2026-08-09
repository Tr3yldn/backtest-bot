import { useEffect, useState } from 'react'
import { getAiStatus, sendCoachMessage, type ChatMessage, type StrategyContext } from '../lib/aiApi'

interface Props {
  buildRequest: () => StrategyContext
  disabled?: boolean
  disabledReason?: string
}

const OPENING_MESSAGE = 'Please review my results and give me feedback.'

export function AiFeedbackPanel({ buildRequest, disabled, disabledReason }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAiStatus()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false))
  }, [])

  const send = async (nextMessages: ChatMessage[]) => {
    setLoading(true)
    setError(null)
    try {
      const reply = await sendCoachMessage(buildRequest(), nextMessages)
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the AI coach.')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = () => {
    const seed: ChatMessage[] = [{ role: 'user', content: OPENING_MESSAGE }]
    setMessages(seed)
    send(seed)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    send(next)
  }

  const handleReset = () => {
    setMessages([])
    setInput('')
    setError(null)
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

      {messages.length === 0 ? (
        <button
          className="btn btn-primary"
          onClick={handleStart}
          disabled={disabled || loading || configured === null}
          title={disabled ? disabledReason : undefined}
        >
          {loading ? 'Thinking…' : 'Get AI Feedback'}
        </button>
      ) : (
        <>
          <div className="ai-chat-thread">
            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-message ai-chat-message-${m.role}`}>
                <span className="ai-chat-role">{m.role === 'user' ? 'You' : 'Coach'}</span>
                <p className="ai-chat-text">{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className="ai-chat-message ai-chat-message-assistant">
                <span className="ai-chat-role">Coach</span>
                <p className="ai-chat-text ai-chat-thinking">Thinking…</p>
              </div>
            )}
          </div>

          <form className="ai-chat-input-row" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up question…"
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
            <button type="button" className="btn" onClick={handleReset} disabled={loading}>
              Start Over
            </button>
          </form>
        </>
      )}

      {disabled && messages.length === 0 && disabledReason && <p className="ai-hint">{disabledReason}</p>}
      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}
