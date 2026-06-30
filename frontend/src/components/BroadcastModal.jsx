import React, { useState, useEffect } from 'react';
import API_BASE, { authFetch } from '../config';

function BroadcastModal({ onClose }) {
  const [labels, setLabels] = useState([]);
  const [customerLabels, setCustomerLabels] = useState({});
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { sent, failed, total }

  useEffect(() => {
    authFetch(`${API_BASE}/api/labels`).then(r => r.json()).then(setLabels).catch(() => {});
    authFetch(`${API_BASE}/api/customers/labels`).then(r => r.json()).then(setCustomerLabels).catch(() => {});
  }, []);

  // Count recipients for the selected label
  const recipientCount = selectedLabelId
    ? Object.values(customerLabels).filter(lbls => lbls.some(l => l._id === selectedLabelId)).length
    : 0;

  const selectedLabel = labels.find(l => l._id === selectedLabelId);
  const canSend = selectedLabelId && message.trim() && recipientCount > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    if (!confirm(`確定要發送給 ${recipientCount} 位「${selectedLabel?.name}」標籤用戶嗎？`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await authFetch(`${API_BASE}/api/customers/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelId: selectedLabelId, message: message.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '發送失敗');
      setResult(data);
      setMessage('');
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '10px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '480px', maxWidth: '100%',
        maxHeight: 'calc(100dvh - 20px)', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>群發訊息</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>依標籤批量發送給客戶</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999'
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Label selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
              選擇標籤
            </label>
            <select
              value={selectedLabelId}
              onChange={e => { setSelectedLabelId(e.target.value); setResult(null); }}
              style={{
                width: '100%', padding: '9px 10px', borderRadius: '8px',
                border: '1px solid #e0e0e0', fontSize: '14px', outline: 'none',
                backgroundColor: '#fff', cursor: 'pointer'
              }}
            >
              <option value="">-- 請選擇標籤 --</option>
              {labels.map(l => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>

            {/* Recipient preview */}
            {selectedLabelId && (
              <div style={{
                marginTop: '8px', padding: '8px 12px', borderRadius: '6px',
                backgroundColor: recipientCount > 0 ? '#e8f5e9' : '#fff8e1',
                fontSize: '13px',
                color: recipientCount > 0 ? '#2e7d32' : '#f57f17'
              }}>
                {recipientCount > 0
                  ? `將發送給 ${recipientCount} 位用戶`
                  : '此標籤目前沒有任何用戶'}
              </div>
            )}
          </div>

          {/* Message input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
              訊息內容
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="輸入要發送的訊息..."
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px',
                borderRadius: '8px', border: '1px solid #e0e0e0',
                fontSize: '14px', lineHeight: '1.6', resize: 'vertical', outline: 'none'
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#bbb', marginTop: '2px' }}>
              {message.length} 字元
            </div>
          </div>

          {/* Result banner */}
          {result && !result.error && (
            <div style={{
              padding: '12px 14px', borderRadius: '8px', backgroundColor: '#e8f5e9',
              color: '#2e7d32', fontSize: '14px'
            }}>
              發送完成：成功 <strong>{result.sent}</strong> 位
              {result.failed > 0 && (
                <span style={{ color: '#c62828' }}>，失敗 {result.failed} 位</span>
              )}
            </div>
          )}
          {result?.error && (
            <div style={{
              padding: '12px 14px', borderRadius: '8px', backgroundColor: '#ffebee',
              color: '#c62828', fontSize: '14px'
            }}>
              錯誤：{result.error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'flex-end', gap: '10px'
        }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: '8px', border: '1px solid #e0e0e0',
            background: '#fff', color: '#666', fontSize: '14px', cursor: 'pointer'
          }}>關閉</button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding: '9px 24px', borderRadius: '8px', border: 'none',
              backgroundColor: canSend ? '#06C755' : '#b0bec5',
              color: '#fff', fontSize: '14px', fontWeight: 'bold',
              cursor: canSend ? 'pointer' : 'not-allowed'
            }}
          >
            {sending ? '發送中...' : `發送給 ${recipientCount} 人`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BroadcastModal;
