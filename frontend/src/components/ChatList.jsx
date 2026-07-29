import React, { useState } from 'react';

const URGENCY_CONFIG = {
  angry:  { icon: '🔴', label: '情緒激動', bg: '#fff5f5', border: '#ffcdd2' },
  urgent: { icon: '🟡', label: '急迫需求', bg: '#fffde7', border: '#fff9c4' },
  normal: null
};
const PURCHASE_BG     = '#f0fdf4';
const PURCHASE_BORDER = '#22c55e';

function ChatList({ conversations, selectedUserId, onSelect, customerLabels = {}, mobile }) {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all'); // 'all' | 'pending' | 'replied'

  // Filter by status tab
  const byStatus = conversations.filter(c => {
    if (filter === 'pending') return c.pendingCount > 0;
    if (filter === 'replied') return c.pendingCount === 0;
    return true;
  });

  // Filter by search query (displayName or latest message text)
  const query = search.trim().toLowerCase();
  const filtered = query
    ? byStatus.filter(c => {
        const name = (c.displayName || c.lineUserId || '').toLowerCase();
        const msg  = (c.pendingMessages?.[c.pendingMessages.length - 1]?.userMessage || c.lastRepliedMsg || '').toLowerCase();
        return name.includes(query) || msg.includes(query);
      })
    : byStatus;

  const pending = filtered.filter(c => c.pendingCount > 0);
  const others  = filtered.filter(c => c.pendingCount === 0);

  const pendingAll = conversations.filter(c => c.pendingCount > 0).length;

  const FILTER_TABS = [
    { key: 'all',     label: '全部',   count: conversations.length },
    { key: 'pending', label: '待回覆', count: pendingAll },
    { key: 'replied', label: '已處理', count: conversations.length - pendingAll },
  ];

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
      {/* Header row */}
      <div style={{
        padding: '10px 12px 0', borderBottom: '1px solid #eee',
        backgroundColor: '#fff', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>客戶對話</span>
          {pendingAll > 0 && (
            <span style={{ backgroundColor: '#f44336', color: '#fff', borderRadius: '12px', padding: '1px 9px', fontSize: '12px', fontWeight: 'bold' }}>
              {pendingAll}
            </span>
          )}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: '13px', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋客戶或訊息..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px 7px 28px',
              borderRadius: '8px', border: '1px solid #e0e0e0',
              fontSize: '13px', outline: 'none', backgroundColor: '#f8f8f8'
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '14px', padding: 0, lineHeight: 1
            }}>✕</button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '4px', paddingBottom: '0' }}>
          {FILTER_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                flex: 1, padding: '5px 4px',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '12px',
                fontWeight: filter === t.key ? '700' : '400',
                color: filter === t.key ? '#2196F3' : '#888',
                borderBottom: filter === t.key ? '2px solid #2196F3' : '2px solid transparent',
                transition: 'all 0.12s'
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: '3px', fontSize: '11px', opacity: 0.7 }}>({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '24px', color: '#999', textAlign: 'center', fontSize: '14px' }}>
            {query ? '找不到符合的對話' : '尚無訊息'}
          </div>
        )}

        {pending.length > 0 && (
          <>
            <SectionLabel label="待回覆" />
            {pending.map(conv => (
              <ConvItem key={conv.lineUserId} conv={conv} selectedUserId={selectedUserId} onSelect={onSelect} labels={customerLabels[conv.lineUserId] || []} query={query} />
            ))}
          </>
        )}

        {others.length > 0 && (
          <>
            {(filter === 'all' || filter === 'replied') && <SectionLabel label="已處理" />}
            {others.map(conv => (
              <ConvItem key={conv.lineUserId} conv={conv} selectedUserId={selectedUserId} onSelect={onSelect} labels={customerLabels[conv.lineUserId] || []} query={query} />
            ))}
          </>
        )}
      </div>
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

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff176', padding: 0 }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ConvItem({ conv, selectedUserId, onSelect, labels = [], query = '' }) {
  const isSelected    = conv.lineUserId === selectedUserId;
  const hasPending    = conv.pendingCount > 0;
  const urgencyConf   = URGENCY_CONFIG[conv.urgency];
  const hasPurchase   = hasPending && conv.intent === 'purchase';
  const latestMsg     = conv.pendingMessages && conv.pendingMessages.length > 0
    ? conv.pendingMessages[conv.pendingMessages.length - 1]
    : null;

  const bgColor = isSelected       ? '#e3f2fd'
    : hasPurchase                  ? PURCHASE_BG
    : (hasPending && urgencyConf)  ? urgencyConf.bg
    : '#fff';

  const borderLeft = isSelected ? '3px solid #2196F3'
    : (hasPending && conv.urgency === 'angry')   ? '3px solid #f44336'
    : (hasPending && conv.urgency === 'urgent')  ? '3px solid #FFC107'
    : hasPurchase                                ? `3px solid ${PURCHASE_BORDER}`
    : '3px solid transparent';

  const displayName = conv.displayName || conv.lineUserId;
  const msgText = latestMsg ? latestMsg.userMessage : (conv.lastRepliedMsg ? `↩ ${conv.lastRepliedMsg}` : '—');

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
          {hasPurchase && (
            <span title="有購買意圖" style={{ fontSize: '13px', flexShrink: 0 }}>🛒</span>
          )}
          <span style={{ fontWeight: hasPending ? 'bold' : 'normal', fontSize: '14px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {query ? highlight(displayName, query) : displayName}
          </span>
        </div>
        {hasPending ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {hasPurchase && (
              <span style={{ backgroundColor: '#16a34a', color: '#fff', padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>想買</span>
            )}
            <span style={{
              backgroundColor: conv.urgency === 'angry' ? '#f44336' : conv.urgency === 'urgent' ? '#FF9800' : '#2196F3',
              color: '#fff', padding: '1px 8px', borderRadius: '12px',
              fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap'
            }}>
              {conv.urgency === 'angry' ? '⚠ ' : conv.urgency === 'urgent' ? '⏰ ' : ''}{conv.pendingCount}則
            </span>
          </div>
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
        {query ? highlight(msgText, query) : msgText}
      </div>
      <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
        {new Date(conv.latestAt).toLocaleString('zh-TW')}
      </div>
    </div>
  );
}

export default ChatList;
