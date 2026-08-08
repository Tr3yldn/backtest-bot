const BASE_URL = 'https://paper-api.alpaca.markets'

function getCredentials() {
  const keyId = process.env.ALPACA_API_KEY_ID
  const secretKey = process.env.ALPACA_API_SECRET_KEY
  if (!keyId || !secretKey) return null
  return { keyId, secretKey }
}

export function isConfigured() {
  return getCredentials() !== null
}

export async function alpacaRequest(path, options = {}) {
  const creds = getCredentials()
  if (!creds) {
    const err = new Error('Alpaca API keys are not configured on the server (.env is missing ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY).')
    err.status = 503
    throw err
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
    const err = new Error(body?.message ?? `Alpaca request failed (${res.status})`)
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}
