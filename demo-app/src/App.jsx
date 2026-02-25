import { useState, useCallback } from 'react'
import './App.css'
import { generatePKCE, getLiteLLMAuthorizeUrl, storePKCE } from './oauth'
import { DEFAULT_LITELLM_URL, LITELLM_URL_KEY } from './constants'
import { listTools as apiListTools, sendChat, fetchAccessibleResources } from './lib/api'
import { useLocalStorage } from './hooks/useLocalStorage'
import Settings from './components/Settings'
import Chat from './components/Chat'

function persist(key, value) {
  try {
    if (value != null && value !== '') localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch (_) {}
}

export default function App() {
  const [litellmUrl, setLitellmUrl] = useLocalStorage('litellmUrl', DEFAULT_LITELLM_URL)
  const [apiKey, setApiKey] = useLocalStorage('litellmApiKey', '')
  const [atlassianToken, setAtlassianToken] = useLocalStorage('atlassianToken', '')
  const [cloudId, setCloudId] = useLocalStorage('atlassianCloudId', '')
  const [tools, setTools] = useState([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const [toolsError, setToolsError] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState(null)
  const [cloudIdFetchLoading, setCloudIdFetchLoading] = useState(false)
  const [cloudIdFetchError, setCloudIdFetchError] = useState(null)

  const handleListTools = useCallback(async () => {
    setToolsError(null)
    setToolsLoading(true)
    try {
      persist('litellmUrl', litellmUrl)
      persist('litellmApiKey', apiKey)
      const list = await apiListTools(litellmUrl, apiKey, atlassianToken, cloudId)
      setTools(list)
    } catch (e) {
      setToolsError(e.message || String(e))
      setTools([])
    } finally {
      setToolsLoading(false)
    }
  }, [litellmUrl, apiKey, atlassianToken, cloudId])

  const handleSendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || chatLoading) return
    setInput('')
    setChatError(null)
    const userMessage = { role: 'user', content: text }
    setMessages((m) => [...m, userMessage])
    setChatLoading(true)
    try {
      persist('litellmUrl', litellmUrl)
      persist('litellmApiKey', apiKey)
      persist('atlassianToken', atlassianToken)
      persist('atlassianCloudId', cloudId)
      const allMessages = [...messages, userMessage]
      const choice = await sendChat(litellmUrl, apiKey, atlassianToken, cloudId, allMessages)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: choice.content || '(No text)',
          tool_calls: choice.tool_calls,
        },
      ])
    } catch (e) {
      setChatError(e.message || String(e))
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e.message}`, error: true }])
    } finally {
      setChatLoading(false)
    }
  }, [input, messages, chatLoading, litellmUrl, apiKey, atlassianToken, cloudId])

  const connectToAtlassian = useCallback(async () => {
    setConnectError(null)
    setConnectLoading(true)
    const clientId = import.meta.env.VITE_ATLASSIAN_OAUTH_CLIENT_ID
    if (!clientId) {
      setConnectError('VITE_ATLASSIAN_OAUTH_CLIENT_ID is not set in .env.')
      setConnectLoading(false)
      return
    }
    try {
      const base = litellmUrl.replace(/\/$/, '')
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(LITELLM_URL_KEY, base)
      const { codeVerifier, codeChallenge } = await generatePKCE()
      const state =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `state-${Date.now()}-${Math.random().toString(36).slice(2)}`
      storePKCE(state, codeVerifier)
      const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
      const url = getLiteLLMAuthorizeUrl(base, clientId, state, codeChallenge, appOrigin)
      window.location.href = url
    } catch (e) {
      setConnectError(e.message || String(e))
      setConnectLoading(false)
    }
  }, [litellmUrl])

  const disconnectAtlassian = useCallback(() => {
    persist('atlassianToken', '')
    setAtlassianToken('')
    try {
      localStorage.removeItem('atlassianRefreshToken')
    } catch (_) {}
  }, [setAtlassianToken])

  const handlePersist = useCallback((key, value) => {
    persist(key, value)
  }, [])

  const handleFetchCloudId = useCallback(async () => {
    if (!atlassianToken?.trim()) return
    setCloudIdFetchError(null)
    setCloudIdFetchLoading(true)
    try {
      const resources = await fetchAccessibleResources(atlassianToken)
      if (resources.length === 0) {
        setCloudIdFetchError('No Atlassian sites found for this account.')
        return
      }
      const firstId = resources[0].id
      setCloudId(firstId)
      persist('atlassianCloudId', firstId)
    } catch (e) {
      setCloudIdFetchError(e.message || String(e))
    } finally {
      setCloudIdFetchLoading(false)
    }
  }, [atlassianToken, setCloudId, persist])

  const apiReady = Boolean(apiKey?.trim())
  const atlassianReady = Boolean(atlassianToken?.trim())

  return (
    <div className="app">
      <header className="header">
        <h1>LiteLLM + Atlassian MCP Demo</h1>
        <p className="subtitle">
          Chat with an LLM that can use Jira and Confluence tools via LiteLLM proxy
        </p>
      </header>

      <div className="status-strip" role="status" aria-live="polite">
        <span className="status-item">
          <span
            className={`status-dot ${apiReady ? 'status-dot--ok' : 'status-dot--off'}`}
            aria-hidden
          />
          {apiReady ? 'API key set' : 'No API key'}
        </span>
        <span className="status-item">
          <span
            className={`status-dot ${atlassianReady ? 'status-dot--ok' : 'status-dot--off'}`}
            aria-hidden
          />
          {atlassianReady ? 'Atlassian connected' : 'Not connected'}
        </span>
      </div>

      <Settings
        litellmUrl={litellmUrl}
        apiKey={apiKey}
        atlassianToken={atlassianToken}
        cloudId={cloudId}
        tools={tools}
        toolsLoading={toolsLoading}
        toolsError={toolsError}
        connectLoading={connectLoading}
        connectError={connectError}
        settingsOpen={settingsOpen}
        onLitellmUrlChange={setLitellmUrl}
        onApiKeyChange={setApiKey}
        onAtlassianTokenChange={setAtlassianToken}
        onCloudIdChange={setCloudId}
        onListTools={handleListTools}
        onConnect={connectToAtlassian}
        onDisconnect={disconnectAtlassian}
        onSettingsToggle={() => setSettingsOpen((o) => !o)}
        onPersist={handlePersist}
        onFetchCloudId={handleFetchCloudId}
        cloudIdFetchLoading={cloudIdFetchLoading}
        cloudIdFetchError={cloudIdFetchError}
      />

      <Chat
        messages={messages}
        input={input}
        chatLoading={chatLoading}
        chatError={chatError}
        atlassianToken={atlassianToken}
        apiKey={apiKey}
        onInputChange={setInput}
        onSend={handleSendMessage}
      />
    </div>
  )
}
