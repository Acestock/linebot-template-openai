import React from 'react';

function ChatList({ conversations, selectedUserId, onSelect }) {
  const pending = conversations.filter((c) => c.pendingCount > 0);
  const others = conversations.filter((c) => c.pendingCount === 0);

  return (
    <div style={{
      width: '280px',
      minWidth: '280px',
      borderRight: '1px solid #e0e0e0',
      overflowY: 'auto',
      height: 'calc(100vh - 48px)',
      backgroundColor: '#fafafa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
        fontWeight: 'bold',
        fontSize: '15px',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>客戶對話</span>
        {pending.length > 0 && (
          <span style={{
            backgroundColor: '#f44336', color: '#fff',
            borderRadius: '12px', padding: '1px 9px', fontSize: '12px', fontWeight: 'bold'
          }}>
            {pending.length}
          </span>
        )}
      </div>

      {conversations.length === 0 && (
        <div style={{ padding: '24px', color: '#999', textAlign: 'center', fontSize: '14px' }}>
          尚無訊息
        </div>
      )}

      {/* Pending conversations */}
      {pending.length > 0 && (
        <>
          <SectionLabel label="待回覆" />
          {pending.map((conv) => (
            <ConvItem key={conv.lineUserId} conv={conv} selectedUserId={selectedUserId} onSelect={onSelect} />
          ))}
        </>
      )}

      {/* Other conversations */}
      {others.length > 0 && (
        <>
          <SectionLabel label="已處理" />
          {others.map((conv) => (
            <ConvItem key={conv.lineUserId} conv={conv} selectedUserId={selectedUserId} onSelect={onSelect} />
          ))}
        </>
      )}
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div style={{
      padding: '6px 16px',
      fontSize: '11px',
      fontWeight: '700',
      color: '#aaa',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #eeeeee'
    }}>
      {label}
    </div>
  );
}

function ConvItem({ conv, selectedUserId, onSelect }) {
  const isSelected = conv.lineUserId === selectedUserId;
  const hasPending = conv.pendingCount > 0;
  const latestMsg = conv.pendingMessages && conv.pendingMessages.length > 0
    ? conv.pendingMessages[conv.pendingMessages.length - 1]
    : null;

  return (
    <div
      onClick={() => onSelect(conv.lineUserId)}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e3f2fd' : '#fff',
        borderLeft: isSelected ? '3px solid #2196F3' : '3px solid transparent',
        transition: 'background-color 0.15s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: hasPending ? 'bold' : 'normal', fontSize: '14px', color: '#333' }}>
          {conv.displayName || conv.lineUserId}
        </span>
        {hasPending ? (
          <span style={{
            backgroundColor: '#2196F3', color: '#fff',
            padding: '1px 8px', borderRadius: '12px',
            fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap'
          }}>
            待回覆 {conv.pendingCount}則
          </span>
        ) : (
          <span style={{
            color: conv.status === 'replied' ? '#4CAF50' : '#bbb',
            fontSize: '11px'
          }}>
            {conv.status === 'replied' ? '已回覆' : conv.status === 'failed' ? '略過' : conv.status}
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {latestMsg ? latestMsg.userMessage : (conv.lastRepliedMsg ? `↩ ${conv.lastRepliedMsg}` : '—')}
      </div>
      <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px' }}>
        {new Date(conv.latestAt).toLocaleString('zh-TW')}
      </div>
    </div>
  );
}

export default ChatList;
