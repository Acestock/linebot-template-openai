import React, { useState, useEffect } from 'react';

function SendPanel({ message, draftReply, onDraftChange, onSent, onSkipped }) {
  const [sending, setSending] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const isReplied = message?.status === 'replied';
  const isSkipped = message?.status === 'failed' && message?.errorMessage === 'Skipped by admin';
  const disabled = isReplied || isSkipped || !message || message.status === 'processing';

  async function handleSend() {
    if (!draftReply.trim()) {
      alert('請輸入回覆內容');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${message._id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedReply: draftReply })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '發送失敗');
      onSent(data.message);
    } catch (err) {
      alert(`發送失敗：${err.message}`);
    } finally {
      setSending(false);
    }
  }

  async function handleSkip() {
    if (!confirm('確定略過此訊息？')) return;
    setSkipping(true);
    try {
      const res = await fetch(`/api/messages/${message._id}/skip`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失敗');
      onSkipped(data.message);
    } catch (err) {
      alert(`操作失敗：${err.message}`);
    } finally {
      setSkipping(false);
    }
  }

  if (!message) return null;

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333', fontSize: '14px' }}>
        回覆內容
      </div>
      <textarea
        value={draftReply}
        onChange={(e) => onDraftChange(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? '此訊息已處理' : '輸入或選擇回覆內容...'}
        rows={5}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          fontSize: '14px',
          lineHeight: '1.6',
          resize: 'vertical',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          color: disabled ? '#999' : '#222',
          outline: 'none'
        }}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={handleSend}
          disabled={disabled || sending}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: disabled || sending ? '#b0bec5' : '#2196F3',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: disabled || sending ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s'
          }}
        >
          {sending ? '發送中...' : '發送到 LINE'}
        </button>
        <button
          onClick={handleSkip}
          disabled={disabled || skipping}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            backgroundColor: disabled || skipping ? '#f5f5f5' : '#fff',
            color: disabled || skipping ? '#bbb' : '#757575',
            fontSize: '14px',
            cursor: disabled || skipping ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {skipping ? '處理中...' : '略過'}
        </button>
      </div>
      {isReplied && (
        <div style={{ marginTop: '8px', color: '#4CAF50', fontSize: '13px' }}>
          ✓ 已於 {new Date(message.repliedAt).toLocaleString('zh-TW')} 發送
        </div>
      )}
    </div>
  );
}

export default SendPanel;
