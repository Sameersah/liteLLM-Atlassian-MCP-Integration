/**
 * PKCE and LiteLLM-mediated OAuth 2.0 flow for Atlassian MCP.
 * LiteLLM proxy handles discovery, authorize redirect to Atlassian, and token exchange.
 */

const OAUTH_CALLBACK_PATH = '/oauth/callback'
const PKCE_STATE_KEY = 'atlassian_oauth_state'
const PKCE_VERIFIER_KEY = 'atlassian_oauth_code_verifier'

/**
 * Generate a cryptographically random string for code_verifier (43–128 chars per RFC).
 */
function randomString(length = 43) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/**
 * Base64URL encode (no padding).
 */
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generate PKCE code_verifier and code_challenge (S256).
 */
export function generatePKCE() {
  const codeVerifier = randomString(43)
  // In browser we need to hash the verifier; use SubtleCrypto if available
  let codeChallenge
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Async: we'll need to return a promise for generatePKCE then
    const encoder = new TextEncoder()
    return crypto.subtle
      .digest('SHA-256', encoder.encode(codeVerifier))
      .then((digest) => {
        codeChallenge = base64UrlEncode(digest)
        return { codeVerifier, codeChallenge }
      })
  }
  // Fallback: use a deterministic placeholder (not secure; real deploy should use crypto.subtle)
  codeChallenge = base64UrlEncode(new Uint8Array(32).fill(0))
  return Promise.resolve({ codeVerifier, codeChallenge })
}

/**
 * Build the URL to start OAuth: redirect to LiteLLM's authorize endpoint.
 * LiteLLM will then redirect the user to Atlassian and back to our callback with the code.
 *
 * @param {string} litellmBase - e.g. http://localhost:4000
 * @param {string} clientId - Atlassian OAuth client ID (public)
 * @param {string} state - random state
 * @param {string} codeChallenge - PKCE code challenge (S256)
 * @param {string} appOrigin - e.g. http://localhost:5173 (where our app is hosted)
 */
export function getLiteLLMAuthorizeUrl(litellmBase, clientId, state, codeChallenge, appOrigin) {
  const redirectUri = `${appOrigin}${OAUTH_CALLBACK_PATH}`
  const base = litellmBase.replace(/\/$/, '')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${base}/atlassian_mcp/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens via LiteLLM proxy.
 * POST to LiteLLM's token endpoint (LiteLLM exchanges with Atlassian using its client_secret).
 *
 * @param {string} litellmBase - e.g. http://localhost:4000
 * @param {string} clientId - Atlassian OAuth client ID
 * @param {string} code - authorization code from callback
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Promise<{ access_token: string, refresh_token?: string, expires_in?: number }>}
 */
export async function exchangeCodeForToken(litellmBase, clientId, code, codeVerifier) {
  const base = litellmBase.replace(/\/$/, '')
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
  })
  const res = await fetch(`${base}/atlassian_mcp/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  return res.json()
}

export function getStoredPKCE() {
  const state = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(PKCE_STATE_KEY) : null
  const codeVerifier = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(PKCE_VERIFIER_KEY) : null
  return { state, codeVerifier }
}

export function clearStoredPKCE() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(PKCE_STATE_KEY)
    sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  }
}

export function storePKCE(state, codeVerifier) {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(PKCE_STATE_KEY, state)
    sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
  }
}

export { OAUTH_CALLBACK_PATH }
