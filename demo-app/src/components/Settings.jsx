export default function Settings({
  litellmUrl,
  apiKey,
  atlassianToken,
  cloudId,
  tools,
  toolsLoading,
  toolsError,
  connectLoading,
  connectError,
  settingsOpen,
  onLitellmUrlChange,
  onApiKeyChange,
  onAtlassianTokenChange,
  onCloudIdChange,
  onListTools,
  onConnect,
  onDisconnect,
  onSettingsToggle,
  onPersist,
  onFetchCloudId,
  cloudIdFetchLoading,
  cloudIdFetchError,
}) {
  return (
    <section
      className="settings-section"
      data-open={settingsOpen}
      aria-labelledby="settings-heading"
    >
      <button
        type="button"
        id="settings-heading"
        className="settings-toggle"
        onClick={onSettingsToggle}
        aria-expanded={settingsOpen}
        aria-controls="settings-panel"
      >
        <span>Settings &amp; connection</span>
        <span className="settings-toggle-icon" aria-hidden>▼</span>
      </button>
      <div id="settings-panel" role="region" aria-labelledby="settings-heading" hidden={!settingsOpen}>
        {settingsOpen && (
          <div className="settings-panel">
            <div className="settings-group">
              <h3 className="settings-group-title">Required</h3>
              <label>
                LiteLLM proxy URL
                <span className="label-hint"> e.g. http://localhost:4000</span>
                <input
                  type="url"
                  value={litellmUrl}
                  onChange={(e) => {
                    onLitellmUrlChange(e.target.value)
                    onPersist?.('litellmUrl', e.target.value)
                  }}
                  placeholder="http://localhost:4000"
                  autoComplete="url"
                />
              </label>
              <label>
                LiteLLM API key
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    onApiKeyChange(e.target.value)
                    onPersist?.('litellmApiKey', e.target.value)
                  }}
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="settings-group">
              <h3 className="settings-group-title">Atlassian (Jira &amp; Confluence)</h3>
              {atlassianToken ? (
                <div className="atlassian-connect">
                  <span className="connected-badge">Connected</span>
                  <button
                    type="button"
                    className="disconnect-btn"
                    onClick={onDisconnect}
                    aria-label="Disconnect Atlassian"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="connect-atlassian-btn"
                    onClick={onConnect}
                    disabled={connectLoading || !apiKey}
                    aria-busy={connectLoading}
                  >
                    {connectLoading ? 'Redirecting…' : 'Connect to Atlassian'}
                  </button>
                  <p className="connect-hint">
                    Sign in with Atlassian to let the assistant use Jira and Confluence on your behalf.
                  </p>
                </>
              )}
              {connectError && <p className="error-inline">{connectError}</p>}

              {atlassianToken ? (
                <div className="cloud-id-row">
                  <label>
                    Atlassian Cloud ID
                    <span className="label-hint"> — required for Jira/Confluence (your profile, issues, etc.)</span>
                    <input
                      type="text"
                      value={cloudId}
                      onChange={(e) => {
                        onCloudIdChange(e.target.value)
                        onPersist?.('atlassianCloudId', e.target.value)
                      }}
                      placeholder="e.g. from Connect, or click Fetch"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onFetchCloudId}
                    disabled={cloudIdFetchLoading}
                    aria-busy={cloudIdFetchLoading}
                  >
                    {cloudIdFetchLoading ? 'Fetching…' : 'Fetch Cloud ID'}
                  </button>
                  {cloudIdFetchError && <p className="error-inline">{cloudIdFetchError}</p>}
                  {!cloudId && !cloudIdFetchLoading && (
                    <p className="connect-hint">
                      If you connected via the button above, Cloud ID was set automatically. Otherwise click Fetch Cloud ID or paste it (find it at admin.atlassian.com → your site → URL has /s/&lt;cloudId&gt;/).
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="settings-group">
              <h3 className="settings-group-title">Optional (advanced)</h3>
              <label>
                Atlassian token
                <span className="label-hint"> — or paste a token instead of connecting</span>
                <input
                  type="password"
                  value={atlassianToken}
                  onChange={(e) => {
                    onAtlassianTokenChange(e.target.value)
                    onPersist?.('atlassianToken', e.target.value)
                  }}
                  placeholder="Bearer or token"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="settings-group">
              <h3 className="settings-group-title">MCP tools</h3>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onListTools}
                  disabled={toolsLoading || !apiKey}
                  aria-busy={toolsLoading}
                >
                  {toolsLoading ? 'Loading…' : 'List available tools'}
                </button>
              </div>
              {toolsError && <p className="error-inline">{toolsError}</p>}
              {tools.length > 0 && (
                <details className="tools-list" open>
                  <summary>Tools ({tools.length})</summary>
                  <ul>
                    {tools.map((t) => (
                      <li key={t.name}>
                        <code>{t.name}</code>
                        {t.description && ` — ${t.description}`}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
