import React, { useState } from 'react';
import CustomerHistory from './CustomerHistory';

function ChatDetail({ message }) {
  const [showHistory, setShowHistory] = useState(false);

  if (!message) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        請選擇一則訊息
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      {showHistory && (
        <CustomerHistory
          lineUserId={message.lineUserId}
          displayName={message.displayName}
          onClose={() => setShowHistory(false)}
        />
      )}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#333' }}>用戶：</span>
        <span style={{ color: '#555' }}>{message.displayName || message.lineUserId}</span>
        <span style={{ fontSize: '12px', color: '#aaa' }}>
          ID: {message.lineUserId}
        </span>
        <button onClick={() => setShowHistory(true)} style={{
          marginLeft: '4px', padding: '2px 10px', borderRadius: '12px',
          border: '1px solid #2196F3', background: '#fff', color: '#2196F3',
          fontSize: '12px', cursor: 'pointer'
        }}>
          歷史紀錄
        </button>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#333' }}>時間：</span>
        <span style={{ color: '#555' }}>{new Date(message.createdAt).toLocaleString('zh-TW')}</span>
      </div>
      <div style={{
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '8px',
        fontSize: '15px',
        color: '#222',
        lineHeight: '1.6'
      }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>用戶訊息</div>
        {message.userMessage}
      </div>
      {message.status === 'replied' && message.selectedReply && (
        <div style={{
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '8px',
          fontSize: '14px',
          color: '#2e7d32',
          lineHeight: '1.6'
        }}>
          <div style={{ fontSize: '12px', color: '#388e3c', marginBottom: '4px' }}>已發送回覆</div>
          {message.selectedReply}
        </div>
      )}
      {message.status === 'failed' && message.errorMessage && (
        <div style={{
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          padding: '8px 12px',
          marginTop: '8px',
          fontSize: '13px',
          color: '#c62828'
        }}>
          錯誤：{message.errorMessage}
        </div>
      )}
    </div>
  );
}

export default ChatDetail;
