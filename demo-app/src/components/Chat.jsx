const SUGGESTED_PROMPTS = [
  'What Jira issues are assigned to me?',
  'Search Confluence for onboarding docs',
  'List recent issues in the current project',
]

export default function Chat({
  messages,
  input,
  chatLoading,
  chatError,
  atlassianToken,
  apiKey,
  onInputChange,
  onSend,
}) {
  const canSend = Boolean(apiKey?.trim())
  const canChat = canSend && atlassianToken
  const isEmpty = messages.length === 0

  const handlePromptClick = (text) => {
    onInputChange(text)
  }

  return (
    <section className="chat-section" aria-label="Chat">
      <div className="messages">
        {isEmpty && (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>
              💬
            </div>
            {!canChat ? (
              <>
                <h2 className="empty-state-title">Connect to get started</h2>
                <p className="empty-state-desc">
                  Add your LiteLLM API key and connect to Atlassian in Settings. Then you can ask
                  about Jira issues and Confluence pages.
                </p>
              </>
            ) : (
              <>
                <h2 className="empty-state-title">Ask about Jira or Confluence</h2>
                <p className="empty-state-desc">
                  Try one of the suggestions below or type your own question.
                </p>
                <div className="suggested-prompts">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="prompt-chip"
                      onClick={() => handlePromptClick(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role} ${msg.error ? 'error' : ''}`}>
            <span className="message-role">{msg.role}</span>
            <div className="message-content">
              {msg.content}
              {msg.tool_calls?.length > 0 && (
                <div className="tool-calls">
                  Used: {msg.tool_calls.map((tc) => tc.function?.name).filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {chatError && <p className="error-inline">{chatError}</p>}
      <div className="input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder={canChat ? 'Ask about Jira or Confluence…' : 'Set API key and connect in Settings…'}
          disabled={chatLoading || !canSend}
          aria-label="Message"
        />
        <button
          type="button"
          className={`btn-send ${chatLoading ? 'loading' : ''}`}
          onClick={onSend}
          disabled={chatLoading || !input.trim() || !canSend}
          aria-label={chatLoading ? 'Sending' : 'Send message'}
        >
          {chatLoading ? 'Sending…' : 'Send'}
        </button>
      </div>
    </section>
  )
}
