import React, { useState } from 'react';
import API_BASE, { authFetch } from '../config';
import TemplatePanel from './TemplatePanel';

function SendPanel({ conversation, draftReply, onDraftChange, onSent, onSkipped }) {
  const [sending, setSending] = useState(false);
  const [skipping, setSkipping] = useState(false);

  if (!conversation) return null;

  const { lineUserId, pendingCount, status, lastRepliedMsg } = conversation;
  const isReplied = pendingCount === 0 && status === 'replied';
  const isSkipped = pendingCount === 0 && status === 'failed';
  const disabled = pendingCount === 0 || sending || skipping;

  async function handleSend() {
    if (!draftReply.trim()) {
      alert('請輸入回覆內容');
      return;
    }
    setSending(true);
    try {
      const res = await authFetch(
        `${API_BASE}/api/conversations/${encodeURIComponent(lineUserId)}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedReply: draftReply })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '發送失敗');
      onSent(lineUserId);
    } catch (err) {
      alert(`發送失敗：${err.message}`);
    } finally {
      setSending(false);
    }
  }

  async function handleSkip() {
    if (!confirm('確定略過此客戶所有未回覆訊息？')) return;
    setSkipping(true);
    try {
      const res = await authFetch(
        `${API_BASE}/api/conversations/${encodeURIComponent(lineUserId)}/skip`,
        { method: 'PATCH' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失敗');
      onSkipped(lineUserId);
    } catch (err) {
      alert(`操作失敗：${err.message}`);
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>回覆內容</div>
        <TemplatePanel disabled={disabled} onInsert={onDraftChange} />
      </div>

      <textarea
        value={draftReply}
        onChange={(e) => onDraftChange(e.target.value)}
        disabled={disabled}
        placeholder={
          isReplied ? '已回覆此客戶' :
          isSkipped ? '已略過此客戶訊息' :
          '輸入或選擇回覆內容...'
        }
        rows={4}
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
          disabled={disabled}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: disabled ? '#b0bec5' : '#2196F3',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s'
          }}
        >
          {sending ? '發送中...' : pendingCount > 1 ? `發送到 LINE（回覆 ${pendingCount} 則）` : '發送到 LINE'}
        </button>
        <button
          onClick={handleSkip}
          disabled={disabled}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            backgroundColor: disabled ? '#f5f5f5' : '#fff',
            color: disabled ? '#bbb' : '#757575',
            fontSize: '14px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {skipping ? '處理中...' : '略過'}
        </button>
      </div>

      {isReplied && lastRepliedMsg && (
        <div style={{ marginTop: '8px', color: '#4CAF50', fontSize: '13px' }}>
          ✓ 已發送回覆
        </div>
      )}
    </div>
  );
}

export default SendPanel;
