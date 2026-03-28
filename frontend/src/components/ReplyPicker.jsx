import React from 'react';

const STYLE_LABELS         = ['正式', '親切', '簡潔'];
const PURCHASE_STYLE_LABELS = ['引導下單', '安心保證', '簡潔促成'];

function ReplyPicker({ aiReplies, loading, selectedReply, onSelect, intent = 'none' }) {
  const isPurchase = intent === 'purchase';

  if (loading) {
    return (
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333', fontSize: '14px' }}>AI 回覆建議</div>
        <div style={{ color: '#90a4ae', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #b0bec5', borderTopColor: '#2196F3', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          AI 正在分析訊息中...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!aiReplies || aiReplies.length === 0) return null;

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      {/* Purchase intent banner */}
      {isPurchase && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1.5px solid #86efac'
        }}>
          <span style={{ fontSize: '20px' }}>🛒</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#15803d' }}>客戶有明確購買意圖</div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '1px' }}>以下建議已針對促成交易優化，適合主動引導下單</div>
          </div>
        </div>
      )}

      <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#333', fontSize: '14px' }}>
        AI 回覆建議
      </div>
      {aiReplies.map((reply, index) => {
        const isSelected = selectedReply === reply;
        return (
          <label key={index} style={{
            display: 'block', marginBottom: '10px', cursor: 'pointer',
            padding: '10px 12px', borderRadius: '8px', transition: 'all 0.15s',
            border: `2px solid ${isSelected ? (isPurchase ? '#22c55e' : '#2196F3') : '#e0e0e0'}`,
            backgroundColor: isSelected ? (isPurchase ? '#f0fdf4' : '#e3f2fd') : '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <input type="radio" name="aiReply" value={reply} checked={isSelected}
                onChange={() => onSelect(reply)}
                style={{ marginTop: '3px', accentColor: isPurchase ? '#22c55e' : '#2196F3' }} />
              <div>
                <span style={{
                  fontSize: '11px', padding: '1px 6px', borderRadius: '8px',
                  marginBottom: '4px', display: 'inline-block',
                  backgroundColor: isPurchase ? '#dcfce7' : '#e3f2fd',
                  color: isPurchase ? '#15803d' : '#1565C0'
                }}>
                  {isPurchase
                    ? (PURCHASE_STYLE_LABELS[index] || `選項 ${index + 1}`)
                    : (STYLE_LABELS[index] || `選項 ${index + 1}`)
                  }
                </span>
                <div style={{ fontSize: '14px', color: reply ? '#222' : '#bbb', marginTop: '2px', lineHeight: '1.5' }}>
                  {reply || '（空白 — 請自行輸入）'}
                </div>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default ReplyPicker;
