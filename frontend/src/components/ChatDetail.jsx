import React from 'react';

function ChatDetail({ message }) {
  if (!message) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        請選擇一則訊息
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#333' }}>用戶：</span>
        <span style={{ color: '#555' }}>{message.displayName || message.lineUserId}</span>
        <span style={{ marginLeft: '12px', fontSize: '12px', color: '#aaa' }}>
          ID: {message.lineUserId}
        </span>
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
