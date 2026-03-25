import React from 'react';

const STATUS_LABELS = {
  pending: { text: '待回覆', color: '#2196F3' },
  processing: { text: '處理中', color: '#FF9800' },
  replied: { text: '已回覆', color: '#4CAF50' },
  failed: { text: '發送失敗', color: '#F44336' }
};

function StatusBadge({ status }) {
  const config = STATUS_LABELS[status] || { text: status, color: '#9E9E9E' };
  return (
    <span style={{
      backgroundColor: config.color,
      color: '#fff',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap'
    }}>
      {config.text}
    </span>
  );
}

function ChatList({ messages, selectedId, onSelect }) {
  return (
    <div style={{
      width: '280px',
      minWidth: '280px',
      borderRight: '1px solid #e0e0e0',
      overflowY: 'auto',
      height: '100vh',
      backgroundColor: '#fafafa'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
        fontWeight: 'bold',
        fontSize: '16px',
        color: '#333'
      }}>
        訊息列表
      </div>
      {messages.length === 0 && (
        <div style={{ padding: '24px', color: '#999', textAlign: 'center' }}>
          尚無訊息
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg._id}
          onClick={() => onSelect(msg._id)}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            cursor: 'pointer',
            backgroundColor: selectedId === msg._id ? '#e3f2fd' : '#fff',
            transition: 'background-color 0.15s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
              {msg.displayName || msg.lineUserId}
            </span>
            <StatusBadge status={msg.status} />
          </div>
          <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {msg.userMessage}
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
            {new Date(msg.createdAt).toLocaleString('zh-TW')}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChatList;
