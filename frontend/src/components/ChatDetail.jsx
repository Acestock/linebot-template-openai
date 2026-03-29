import React, { useState, useRef, useEffect } from 'react';
import CustomerHistory from './CustomerHistory';
import API_BASE from '../config';

function LabelPicker({ lineUserId, labels, currentLabels, onLabelsChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const currentIds = new Set(currentLabels.map(l => l._id));

  async function toggle(label) {
    const newIds = currentIds.has(label._id)
      ? [...currentIds].filter(id => id !== label._id)
      : [...currentIds, label._id];

    try {
      const res = await fetch(`${API_BASE}/api/customers/${encodeURIComponent(lineUserId)}/labels`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelIds: newIds })
      });
      const newLabels = await res.json();
      onLabelsChange(lineUserId, newLabels);
    } catch {}
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button onClick={() => setOpen(p => !p)} style={{
        padding: '2px 10px', borderRadius: '12px', border: '1px dashed #bbb',
        background: '#fff', color: '#888', fontSize: '12px', cursor: 'pointer'
      }}>
        + 標籤
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '160px', zIndex: 50, overflow: 'hidden'
        }}>
          {labels.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: '12px', color: '#bbb' }}>
              尚無標籤，請在設定中新增
            </div>
          ) : (
            labels.map(label => {
              const active = currentIds.has(label._id);
              return (
                <div key={label._id} onClick={() => toggle(label)} style={{
                  padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: active ? label.color + '15' : 'transparent',
                  borderBottom: '1px solid #f5f5f5'
                }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = label.color + '20'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = active ? label.color + '15' : 'transparent'}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: label.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#333', flex: 1 }}>{label.name}</span>
                  {active && <span style={{ color: label.color, fontSize: '14px' }}>✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function AutoReplyToggle({ lineUserId, enabled, onChange }) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/customers/autoreply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, enabled: !enabled })
      });
      onChange(!enabled);
    } catch {}
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={enabled ? '此用戶 AI 自動回覆已啟用，點擊關閉' : '此用戶 AI 自動回覆已關閉，點擊啟用'}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '2px 10px', borderRadius: '12px', cursor: 'pointer',
        border: `1px solid ${enabled ? '#00B900' : '#bbb'}`,
        backgroundColor: enabled ? '#e8f5e9' : '#f5f5f5',
        color: enabled ? '#2e7d32' : '#999',
        fontSize: '12px', fontWeight: '500',
        opacity: loading ? 0.6 : 1, transition: 'all 0.2s'
      }}
    >
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%',
        backgroundColor: enabled ? '#00B900' : '#bbb',
        flexShrink: 0
      }} />
      {enabled ? 'AI 回覆開' : 'AI 回覆關'}
    </button>
  );
}

function ProactiveSend({ lineUserId, displayName, onSent }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/customers/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, displayName, message: text.trim() })
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || '發送失敗');
      } else {
        setText('');
        setOpen(false);
        onSent && onSent();
      }
    } catch {
      setError('網路錯誤，請稍後再試');
    }
    setSending(false);
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          width: '100%', padding: '8px', borderRadius: '8px',
          border: '1px dashed #bbb', background: '#fafafa', color: '#888',
          fontSize: '13px', cursor: 'pointer'
        }}>
          ✉ 主動傳訊給此客戶
        </button>
      ) : (
        <div style={{
          borderRadius: '8px', border: '1px solid #e0e0e0',
          overflow: 'hidden', backgroundColor: '#fff'
        }}>
          <div style={{
            padding: '8px 12px', backgroundColor: '#f5f5f5',
            fontSize: '12px', color: '#666', borderBottom: '1px solid #e0e0e0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>主動傳訊</span>
            <button onClick={() => { setOpen(false); setText(''); setError(''); }} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '14px', padding: 0
            }}>✕</button>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="輸入要傳送給客戶的訊息..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', border: 'none', resize: 'vertical',
              fontSize: '14px', lineHeight: '1.6', outline: 'none', boxSizing: 'border-box'
            }}
          />
          {error && (
            <div style={{ padding: '4px 12px', fontSize: '12px', color: '#e53935' }}>{error}</div>
          )}
          <div style={{
            padding: '8px 12px', borderTop: '1px solid #f0f0f0',
            display: 'flex', justifyContent: 'flex-end', gap: '8px'
          }}>
            <button onClick={() => { setOpen(false); setText(''); setError(''); }} style={{
              padding: '5px 14px', borderRadius: '6px', border: '1px solid #ddd',
              background: '#fff', color: '#666', fontSize: '13px', cursor: 'pointer'
            }}>取消</button>
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none',
                background: text.trim() ? '#00B900' : '#ccc',
                color: '#fff', fontSize: '13px', cursor: text.trim() ? 'pointer' : 'default'
              }}
            >
              {sending ? '傳送中...' : '傳送'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatDetail({ conversation, labels = [], customerLabels = {}, onLabelsChange, onAutoReplyChange, onRefresh }) {
  const [showHistory, setShowHistory] = useState(false);

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        請選擇一位客戶
      </div>
    );
  }

  const { lineUserId, displayName, pendingMessages = [], pendingCount, status, lastRepliedMsg, autoReplyEnabled = true } = conversation;
  const assignedLabels = customerLabels[lineUserId] || [];

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      {showHistory && (
        <CustomerHistory lineUserId={lineUserId} displayName={displayName} onClose={() => setShowHistory(false)} />
      )}

      {/* User info row */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>
            {displayName || lineUserId}
          </span>
          <span style={{ fontSize: '12px', color: '#bbb' }}>{lineUserId}</span>
          <button onClick={() => setShowHistory(true)} style={{
            padding: '2px 10px', borderRadius: '12px',
            border: '1px solid #2196F3', background: '#fff', color: '#2196F3',
            fontSize: '12px', cursor: 'pointer'
          }}>歷史紀錄</button>
          <AutoReplyToggle
            lineUserId={lineUserId}
            enabled={autoReplyEnabled}
            onChange={(val) => onAutoReplyChange && onAutoReplyChange(lineUserId, val)}
          />
        </div>

        {/* Labels row */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          {assignedLabels.map(label => (
            <span key={label._id} style={{
              fontSize: '12px', padding: '2px 9px', borderRadius: '10px',
              backgroundColor: label.color + '20', color: label.color,
              border: `1px solid ${label.color}50`, fontWeight: '500'
            }}>{label.name}</span>
          ))}
          <LabelPicker
            lineUserId={lineUserId}
            labels={labels}
            currentLabels={assignedLabels}
            onLabelsChange={onLabelsChange}
          />
        </div>
      </div>

      {/* Pending messages */}
      {pendingCount > 0 && (
        <div>
          {pendingCount > 1 && (
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              此用戶共有 <strong>{pendingCount}</strong> 則未回覆訊息，AI 將合併分析：
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingMessages.map((msg, i) => (
              <div key={msg._id || i} style={{ backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '10px 14px', borderLeft: '3px solid #2196F3', fontSize: '14px', color: '#222', lineHeight: '1.6' }}>
                <div style={{ fontSize: '11px', color: '#90a4ae', marginBottom: '3px' }}>
                  {pendingCount > 1 ? `訊息 ${i + 1}　` : ''}
                  {new Date(msg.createdAt).toLocaleString('zh-TW')}
                </div>
                {msg.userMessage}
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingCount === 0 && status === 'replied' && lastRepliedMsg && (
        <div style={{ backgroundColor: '#e8f5e9', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#2e7d32', lineHeight: '1.6' }}>
          <div style={{ fontSize: '12px', color: '#66bb6a', marginBottom: '4px' }}>最後一則回覆</div>
          {lastRepliedMsg}
        </div>
      )}

      {pendingCount === 0 && status === 'failed' && (
        <div style={{ backgroundColor: '#fafafa', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#bbb' }}>
          此客戶的訊息已略過
        </div>
      )}

      <ProactiveSend lineUserId={lineUserId} displayName={displayName} onSent={onRefresh} />
    </div>
  );
}

export default ChatDetail;
