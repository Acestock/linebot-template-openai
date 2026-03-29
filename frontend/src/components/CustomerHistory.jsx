import React, { useState, useEffect } from 'react';
import API_BASE from '../config';

// Group messages that were replied to together (same repliedAt + same selectedReply)
function groupHistory(messages) {
  const groups = [];
  const batchKey = (msg) => `${msg.repliedAt}__${msg.selectedReply}`;

  for (const msg of messages) {
    if (msg.status === 'replied' && msg.repliedAt && msg.selectedReply) {
      const key = batchKey(msg);
      const existing = groups.find(g => g.batchKey === key);
      if (existing) {
        existing.messages.push(msg);
      } else {
        groups.push({
          batchKey: key,
          messages: [msg],
          selectedReply: msg.selectedReply,
          repliedAt: msg.repliedAt,
          status: 'replied'
        });
      }
    } else {
      groups.push({
        batchKey: null,
        messages: [msg],
        selectedReply: msg.selectedReply,
        repliedAt: msg.repliedAt,
        status: msg.status
      });
    }
  }

  return groups;
}

function CustomerHistory({ lineUserId, displayName, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lineUserId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/customers/${encodeURIComponent(lineUserId)}/history`)
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lineUserId]);

  const statusLabel = { pending: '待回覆', processing: '處理中', replied: '已回覆', failed: '失敗' };
  const statusColor = { pending: '#FF9800', processing: '#2196F3', replied: '#4CAF50', failed: '#f44336' };

  const groups = groupHistory(history);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)',
      zIndex: 200, display: 'flex', justifyContent: 'flex-end'
    }} onClick={onClose}>
      <div style={{
        width: '420px', maxWidth: '95vw', backgroundColor: '#fff',
        height: '100%', display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999', lineHeight: 1, padding: 0
          }}>←</button>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{displayName || lineUserId}</div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>完整對話歷史</div>
          </div>
          <span style={{
            marginLeft: 'auto', fontSize: '12px', color: '#888',
            backgroundColor: '#f5f5f5', borderRadius: '12px', padding: '2px 10px'
          }}>
            {groups.length} 筆對話
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#bbb', marginTop: '40px' }}>載入中...</div>
          )}
          {!loading && groups.length === 0 && (
            <div style={{ textAlign: 'center', color: '#bbb', marginTop: '40px' }}>無歷史紀錄</div>
          )}
          {!loading && groups.map((group, i) => (
            <div key={i} style={{
              marginBottom: '16px', borderRadius: '8px', border: '1px solid #f0f0f0',
              overflow: 'hidden', backgroundColor: '#fafafa'
            }}>
              {/* Group header */}
              <div style={{
                padding: '8px 12px', backgroundColor: '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: '12px', color: '#888'
              }}>
                <span>
                  #{i + 1}
                  {group.messages.length > 1 && (
                    <span style={{
                      marginLeft: '6px', backgroundColor: '#e3f2fd', color: '#1976d2',
                      borderRadius: '10px', padding: '1px 7px', fontSize: '11px'
                    }}>
                      {group.messages.length} 則訊息
                    </span>
                  )}
                  &nbsp;&nbsp;
                  {new Date(group.messages[0].createdAt).toLocaleString('zh-TW')}
                </span>
                <span style={{
                  backgroundColor: statusColor[group.status] || '#bbb',
                  color: '#fff', borderRadius: '4px', padding: '1px 7px', fontSize: '11px'
                }}>
                  {statusLabel[group.status] || group.status}
                </span>
              </div>

              {/* All user messages in this batch */}
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>用戶訊息</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.messages.map((msg, j) => (
                    <div key={msg._id} style={{
                      fontSize: '14px', color: '#333', lineHeight: 1.6,
                      ...(group.messages.length > 1 ? {
                        backgroundColor: '#f0f7ff',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        borderLeft: '3px solid #90caf9'
                      } : {})
                    }}>
                      {group.messages.length > 1 && (
                        <span style={{ fontSize: '11px', color: '#90a4ae', marginRight: '6px' }}>
                          {j + 1}.
                        </span>
                      )}
                      {msg.userMessage}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply (shown once per batch) */}
              {group.status === 'replied' && group.selectedReply && (
                <div style={{
                  padding: '10px 12px', backgroundColor: '#e8f5e9',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <div style={{ fontSize: '12px', color: '#66bb6a', marginBottom: '3px' }}>已發送回覆</div>
                  <div style={{ fontSize: '14px', color: '#2e7d32', lineHeight: 1.6 }}>{group.selectedReply}</div>
                  {group.repliedAt && (
                    <div style={{ fontSize: '11px', color: '#a5d6a7', marginTop: '4px' }}>
                      {new Date(group.repliedAt).toLocaleString('zh-TW')}
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {group.status === 'failed' && group.messages[0].errorMessage && (
                <div style={{
                  padding: '8px 12px', backgroundColor: '#ffebee',
                  borderTop: '1px solid #f0f0f0', fontSize: '12px', color: '#c62828'
                }}>
                  {group.messages[0].errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CustomerHistory;
