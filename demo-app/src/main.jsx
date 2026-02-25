import React, { Component, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import OAuthCallback from './pages/OAuthCallback.jsx'
import './index.css'

// Ensure React is available globally for any dependency that expects it (e.g. window.React)
if (typeof window !== 'undefined') {
  window.React = React
}

class ErrorBoundary extends Component {
  state = { error: null, errorInfo: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState((s) => ({ ...s, errorInfo }))
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Error message:', error?.message)
    console.error('[ErrorBoundary] Error stack:', error?.stack)
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack)
  }

  render() {
    const { error, errorInfo } = this.state
    if (error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '720px', margin: '0 auto' }}>
          <h1>Something went wrong</h1>
          <p style={{ color: '#b91c1c', fontWeight: 600 }}>{error.message}</p>
          {error.stack && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer' }}>Error stack</summary>
              <pre style={{ background: '#f5f5f5', padding: '1rem', overflow: 'auto', fontSize: '0.8rem' }}>
                {error.stack}
              </pre>
            </details>
          )}
          {errorInfo?.componentStack && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer' }}>Component stack</summary>
              <pre style={{ background: '#fef3c7', padding: '1rem', overflow: 'auto', fontSize: '0.8rem' }}>
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
