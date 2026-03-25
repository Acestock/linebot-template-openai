import React from 'react';

const STYLE_LABELS = ['正式', '親切', '簡潔'];

function ReplyPicker({ aiReplies, selectedReply, onSelect }) {
  if (!aiReplies || aiReplies.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#333', fontSize: '14px' }}>
        AI 回覆建議
      </div>
      {aiReplies.map((reply, index) => (
        <label
          key={index}
          style={{
            display: 'block',
            marginBottom: '10px',
            cursor: 'pointer',
            padding: '10px 12px',
            borderRadius: '8px',
            border: `2px solid ${selectedReply === reply ? '#2196F3' : '#e0e0e0'}`,
            backgroundColor: selectedReply === reply ? '#e3f2fd' : '#fff',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input
              type="radio"
              name="aiReply"
              value={reply}
              checked={selectedReply === reply}
              onChange={() => onSelect(reply)}
              style={{ marginTop: '3px', accentColor: '#2196F3' }}
            />
            <div>
              <span style={{
                fontSize: '11px',
                backgroundColor: '#e3f2fd',
                color: '#1565C0',
                padding: '1px 6px',
                borderRadius: '8px',
                marginBottom: '4px',
                display: 'inline-block'
              }}>
                {STYLE_LABELS[index] || `選項 ${index + 1}`}
              </span>
              <div style={{ fontSize: '14px', color: reply ? '#222' : '#bbb', marginTop: '2px', lineHeight: '1.5' }}>
                {reply || '（空白 — 請自行輸入）'}
              </div>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

export default ReplyPicker;
