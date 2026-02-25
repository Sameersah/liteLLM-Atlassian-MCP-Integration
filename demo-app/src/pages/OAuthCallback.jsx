import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  exchangeCodeForToken,
  getStoredPKCE,
  clearStoredPKCE,
} from '../oauth'
import { LITELLM_URL_KEY, DEFAULT_LITELLM_URL } from '../constants'
import { fetchAccessibleResources } from '../lib/api'

function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Exchanging code for token…')
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const stored = getStoredPKCE()

    if (!code) {
      setError('No authorization code in URL.')
      clearStoredPKCE()
      return
    }
    if (!stored.codeVerifier) {
      setError('Missing code verifier (session may have expired). Try connecting again.')
      clearStoredPKCE()
      return
    }
    if (state && stored.state && state !== stored.state) {
      setError('State mismatch. Try connecting again.')
      clearStoredPKCE()
      return
    }

    const litellmUrl =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(LITELLM_URL_KEY)) ||
      DEFAULT_LITELLM_URL
    const clientId = import.meta.env.VITE_ATLASSIAN_OAUTH_CLIENT_ID || ''

    if (!clientId) {
      setError('VITE_ATLASSIAN_OAUTH_CLIENT_ID is not set. Configure it in .env.')
      clearStoredPKCE()
      return
    }

    setStatus('Exchanging code for token…')
    exchangeCodeForToken(litellmUrl, clientId, code, stored.codeVerifier)
      .then(async (data) => {
        clearStoredPKCE()
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(LITELLM_URL_KEY)
        const token = data.access_token
        if (token) {
          try {
            const storedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
            localStorage.setItem('atlassianToken', storedToken)
            if (data.refresh_token) localStorage.setItem('atlassianRefreshToken', data.refresh_token)
            setStatus('Fetching your Atlassian site…')
            const resources = await fetchAccessibleResources(storedToken)
            if (resources.length > 0) {
              localStorage.setItem('atlassianCloudId', resources[0].id)
            }
          } catch (_) {}
        }
        setStatus('Connected. Redirecting…')
        navigate('/', { replace: true })
      })
      .catch((err) => {
        clearStoredPKCE()
        setError(err.message || String(err))
      })
  }, [searchParams, navigate])

  return (
    <div className="oauth-callback">
      {error ? (
        <>
          <div className="oauth-callback-icon" aria-hidden>⚠️</div>
          <h1 className="oauth-callback-title">Connection failed</h1>
          <p className="oauth-callback-status">{status}</p>
          <p className="error">{error}</p>
          <button type="button" onClick={() => navigate('/', { replace: true })}>
            Back to app
          </button>
        </>
      ) : (
        <>
          <div className="oauth-callback-spinner" aria-hidden />
          <h1 className="oauth-callback-title">Connecting to Atlassian</h1>
          <p className="oauth-callback-status">{status}</p>
        </>
      )}
    </div>
  )
}

export default OAuthCallback
