import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LiffApp from './liff/LiffApp';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  componentDidCatch(err, info) {
    console.error('[ErrorBoundary] Uncaught render error:', err, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100dvh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '36px 28px',
            textAlign: 'center', maxWidth: '360px', width: '100%',
            boxShadow: '0 2px 16px rgba(0,0,0,0.10)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontWeight: '700', fontSize: '17px', marginBottom: '8px' }}>
              系統發生錯誤
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
              {this.state.error.message || '未知錯誤'}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#111', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '11px 28px',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              重新整理
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const isLiff = window.location.pathname.startsWith('/liff');
// Set a neutral default title immediately so LIFF users don't see the admin title
if (isLiff) document.title = '預約入場系統';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isLiff ? <LiffApp /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
