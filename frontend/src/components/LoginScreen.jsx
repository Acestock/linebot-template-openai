import React, { useState } from 'react';
import API_BASE from '../config';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登入失敗，請稍後再試');
      } else {
        localStorage.setItem('adminToken', data.token);
        onLogin(data.token);
      }
    } catch {
      setError('無法連線至伺服器，請稍後再試');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f5f5f5', fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', padding: '40px 36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)', width: '340px', maxWidth: '90vw'
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            backgroundColor: '#00B900', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px'
          }}>💬</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>LINE 客服後台</div>
          <div style={{ fontSize: '13px', color: '#aaa', marginTop: '4px' }}>請登入以繼續</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '5px' }}>
              帳號
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '5px' }}>
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: '14px', padding: '9px 12px', borderRadius: '8px',
              backgroundColor: '#ffebee', color: '#c62828', fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
              backgroundColor: (loading || !username.trim() || !password) ? '#b0bec5' : '#00B900',
              color: '#fff', fontSize: '15px', fontWeight: 'bold',
              cursor: (loading || !username.trim() || !password) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
