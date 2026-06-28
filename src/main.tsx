import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#b91c1c' }}>
          <h2>クラッシュ情報（デバッグ用）</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fef2f2', padding: 16, borderRadius: 8 }}>
            {e.message}{'\n\n'}{e.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

window.addEventListener('unhandledrejection', (e) => {
  document.getElementById('root')!.innerHTML =
    `<div style="padding:24px;font-family:monospace;color:#b91c1c"><h2>未処理エラー</h2><pre style="white-space:pre-wrap;background:#fef2f2;padding:16px;border-radius:8px">${e.reason}</pre></div>`
})

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
)
