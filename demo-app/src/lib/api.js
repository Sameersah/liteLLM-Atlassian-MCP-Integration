import { MCP_SERVER_NAME } from '../constants'

const ATLASSIAN_ACCESSIBLE_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources'

/**
 * Fetch Atlassian sites the user can access (requires OAuth access token).
 * Returns array of { id, name, url, avatarUrl, scopes }; id is the Cloud ID.
 */
export async function fetchAccessibleResources(accessToken) {
  const token = accessToken?.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken || ''}`
  const res = await fetch(ATLASSIAN_ACCESSIBLE_RESOURCES_URL, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: token },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch sites: ${res.status} ${text}`)
  }
  const list = await res.json()
  if (!Array.isArray(list)) throw new Error('Invalid response from Atlassian')
  return list
}

export function buildHeaders(apiKey, atlassianToken, cloudId) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'x-litellm-api-key': apiKey?.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey || ''}`,
  }
  if (atlassianToken?.trim()) {
    const token = atlassianToken.startsWith('Bearer ') ? atlassianToken : `Bearer ${atlassianToken}`
    headers['Authorization'] = token
    headers['x-mcp-atlassian_mcp-authorization'] = token
  }
  if (cloudId?.trim()) {
    headers['x-mcp-atlassian_mcp-x-atlassian-cloud-id'] = cloudId.trim()
  }
  return headers
}

/**
 * Parse SSE (text/event-stream) body: find "data: " lines and JSON.parse the first valid JSON-RPC object.
 */
function parseMcpSseResponse(text) {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const payload = line.slice(6).trim()
      if (payload === '[DONE]' || !payload) continue
      try {
        const data = JSON.parse(payload)
        if (data && (data.result !== undefined || data.error)) return data
      } catch (_) {}
    }
  }
  throw new Error('No valid JSON-RPC message in SSE response')
}

export async function listTools(baseUrl, apiKey, atlassianToken, cloudId) {
  const base = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/${MCP_SERVER_NAME}/mcp`, {
    method: 'POST',
    headers: buildHeaders(apiKey, atlassianToken, cloudId),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  })
  const contentType = res.headers.get('content-type') || ''
  let data
  if (contentType.includes('text/event-stream')) {
    const text = await res.text()
    data = parseMcpSseResponse(text)
  } else {
    data = await res.json()
  }
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.result?.tools ?? []
}

export async function sendChat(baseUrl, apiKey, atlassianToken, cloudId, messages) {
  const base = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey, atlassianToken, cloudId),
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages.map(({ role, content }) => ({ role, content })),
      tools: [
        {
          type: 'mcp',
          server_url: 'litellm_proxy',
          server_label: MCP_SERVER_NAME,
          require_approval: 'never',
        },
      ],
      tool_choice: 'auto',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  const choice = data.choices?.[0]?.message
  if (!choice) throw new Error('No response from model')
  return choice
}
