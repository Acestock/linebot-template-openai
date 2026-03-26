import React from 'react';

const URGENCY_CONFIG = {
  angry:  { icon: '🔴', label: '情緒激動', bg: '#fff5f5', border: '#ffcdd2' },
  urgent: { icon: '🟡', label: '急迫需求', bg: '#fffde7', border: '#fff9c4' },
  normal: null
};

function ChatList({ conversations, selectedUserId, onSelect, customerLabels = {}, mobile }) {
  const pending = conversations.filter((c) => c.pendingCount > 0);
  const others  = conversations.filter((c) => c.pendingCount === 0);

  return (
    <div style={{
      width: mobile ? '100%' : '280px',
      minWidth: mobile ? 'unset' : '280px',
      borderRight: mobile ? 'none' : '1px solid #e0e0e0',
      overflowY: 'auto',
      height: mobile ? '100%' : 'calc(100vh - 48px)',
      backgroundColor: '#fafafa',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff', fontWeight: 'bold', fontSize: '15px', color: '#333',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span>客戶對話</span>
        {pending.length > 0 && (
          <span style={{ backgroundColor: '#f44336', color: '#fff', borderRadius: '12px', padding: '1px 9px', fontSize: '12px', fontWeight: 'bold' }}>
            {pending.length}
          </span>
        )}
      </div>

      {conversations.length === 0 && (
        <div style={{ padding: '24px', color: '#999', textAlign: 'center', fontSize: '14px' }}>尚無訊息</div>
      )}

      {pending.length > 0 && (
        <>
          <SectionLabel label="待回覆" />
          {pending.map(conv => <ConvItem key={conv.lineUserId} conv={conv} selectedUserId={selectedUserId} onSelect={onSelect} labels={customerLabels[conv.lineUserId] || []} />)}
        </>
      )}

      {others.length > 0 && (
        <>
          <SectionLabel label="已處理" />
          {others.map(conv => <ConvItem key={conv.lineUserId} conv={conv} selectedUserId={selectedUserId} onSelect={onSelect} labels={customerLabels[conv.lineUserId] || []} />)}
        </>
      )}
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div style={{
      padding: '5px 16px', fontSize: '11px', fontWeight: '700', color: '#aaa',
      letterSpacing: '0.5px', textTransform: 'uppercase',
      backgroundColor: '#f5f5f5', borderBottom: '1px solid #eeeeee'
    }}>{label}</div>
  );
}

function ConvItem({ conv, selectedUserId, onSelect, labels = [] }) {
  const isSelected = conv.lineUserId === selectedUserId;
  const hasPending = conv.pendingCount > 0;
  const urgencyConf = URGENCY_CONFIG[conv.urgency];
  const latestMsg = conv.pendingMessages && conv.pendingMessages.length > 0
    ? conv.pendingMessages[conv.pendingMessages.length - 1]
    : null;

  const bgColor = isSelected ? '#e3f2fd'
    : (hasPending && urgencyConf) ? urgencyConf.bg
    : '#fff';
  const borderLeft = isSelected ? '3px solid #2196F3'
    : (hasPending && conv.urgency === 'angry') ? '3px solid #f44336'
    : (hasPending && conv.urgency === 'urgent') ? '3px solid #FFC107'
    : '3px solid transparent';

  return (
    <div onClick={() => onSelect(conv.lineUserId)} style={{
      padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
      cursor: 'pointer', backgroundColor: bgColor, borderLeft,
      transition: 'background-color 0.15s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
          {hasPending && urgencyConf && (
            <span title={urgencyConf.label} style={{ fontSize: '13px', flexShrink: 0 }}>{urgencyConf.icon}</span>
          )}
          <span style={{ fontWeight: hasPending ? 'bold' : 'normal', fontSize: '14px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conv.displayName || conv.lineUserId}
          </span>
        </div>
        {hasPending ? (
          <span style={{
            backgroundColor: conv.urgency === 'angry' ? '#f44336' : conv.urgency === 'urgent' ? '#FF9800' : '#2196F3',
            color: '#fff', padding: '1px 8px', borderRadius: '12px',
            fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0
          }}>
            {conv.urgency === 'angry' ? '⚠ ' : conv.urgency === 'urgent' ? '⏰ ' : ''}{conv.pendingCount}則
          </span>
        ) : (
          <span style={{ color: conv.status === 'replied' ? '#4CAF50' : '#bbb', fontSize: '11px' }}>
            {conv.status === 'replied' ? '已回覆' : conv.status === 'failed' ? '略過' : conv.status}
          </span>
        )}
      </div>
      {labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px', marginBottom: '2px' }}>
          {labels.map(l => (
            <span key={l._id} style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '8px', backgroundColor: l.color + '20', color: l.color, border: `1px solid ${l.color}40` }}>
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: '12px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {latestMsg ? latestMsg.userMessage : (conv.lastRepliedMsg ? `↩ ${conv.lastRepliedMsg}` : '—')}
      </div>
      <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
        {new Date(conv.latestAt).toLocaleString('zh-TW')}
      </div>
    </div>
  );
}

export default ChatList;
