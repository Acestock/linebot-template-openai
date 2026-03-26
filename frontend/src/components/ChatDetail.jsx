import React, { useState } from 'react';
import CustomerHistory from './CustomerHistory';

function ChatDetail({ conversation }) {
  const [showHistory, setShowHistory] = useState(false);

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        請選擇一位客戶
      </div>
    );
  }

  const { lineUserId, displayName, pendingMessages = [], pendingCount, status, lastRepliedMsg } = conversation;

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      {showHistory && (
        <CustomerHistory
          lineUserId={lineUserId}
          displayName={displayName}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* User info row */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>
          {displayName || lineUserId}
        </span>
        <span style={{ fontSize: '12px', color: '#bbb' }}>
          {lineUserId}
        </span>
        <button onClick={() => setShowHistory(true)} style={{
          padding: '2px 10px', borderRadius: '12px',
          border: '1px solid #2196F3', background: '#fff', color: '#2196F3',
          fontSize: '12px', cursor: 'pointer'
        }}>
          歷史紀錄
        </button>
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
              <div key={msg._id || i} style={{
                backgroundColor: '#f0f7ff',
                borderRadius: '8px',
                padding: '10px 14px',
                borderLeft: '3px solid #2196F3',
                fontSize: '14px',
                color: '#222',
                lineHeight: '1.6'
              }}>
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

      {/* Replied state */}
      {pendingCount === 0 && status === 'replied' && lastRepliedMsg && (
        <div style={{
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '14px',
          color: '#2e7d32',
          lineHeight: '1.6'
        }}>
          <div style={{ fontSize: '12px', color: '#66bb6a', marginBottom: '4px' }}>最後一則回覆</div>
          {lastRepliedMsg}
        </div>
      )}

      {/* Skipped state */}
      {pendingCount === 0 && status === 'failed' && (
        <div style={{
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          color: '#bbb'
        }}>
          此客戶的訊息已略過
        </div>
      )}
    </div>
  );
}

export default ChatDetail;
