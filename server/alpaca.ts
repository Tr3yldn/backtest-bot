const BASE_URL = 'https://paper-api.alpaca.markets'

export class AlpacaError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

function getCredentials(): { keyId: string; secretKey: string } | null {
  const keyId = process.env.ALPACA_API_KEY_ID
  const secretKey = process.env.ALPACA_API_SECRET_KEY
  if (!keyId || !secretKey) return null
  return { keyId, secretKey }
}

export function isConfigured(): boolean {
  return getCredentials() !== null
}

export async function alpacaRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const creds = getCredentials()
  if (!creds) {
    throw new AlpacaError(
      'Alpaca API keys are not configured on the server (.env is missing ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY).',
      503,
    )
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'APCA-API-KEY-ID': creds.keyId,
      'APCA-API-SECRET-KEY': creds.secretKey,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = (body as { message?: string } | null)?.message ?? `Alpaca request failed (${res.status})`
    throw new AlpacaError(message, res.status, body)
  }

  return body as T
}
