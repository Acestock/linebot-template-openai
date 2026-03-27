import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'linebot_sticky_notes';

export default function StickyNotes() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      setNotes(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {}
  }, []);

  function persist(updated) {
    setNotes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addNote() {
    if (!input.trim()) return;
    persist([{ id: Date.now(), text: input.trim(), createdAt: new Date().toISOString() }, ...notes]);
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function deleteNote(id) {
    persist(notes.filter(n => n.id !== id));
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 400 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: '58px', right: 0,
          width: '300px', maxHeight: '420px',
          backgroundColor: '#fff', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', backgroundColor: '#FFF9C4', borderBottom: '1px solid #ffe082', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>📝 隨手記事</span>
            <span style={{ fontSize: '12px', color: '#aaa' }}>{notes.length} 則</span>
          </div>

          {/* Notes list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {notes.length === 0 && (
              <div style={{ textAlign: 'center', color: '#bbb', padding: '20px', fontSize: '13px' }}>尚無記事</div>
            )}
            {notes.map(note => (
              <div key={note.id} style={{ padding: '8px 10px', marginBottom: '6px', borderRadius: '6px', backgroundColor: '#fffde7', border: '1px solid #ffe082', position: 'relative' }}>
                <div style={{ fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingRight: '18px', lineHeight: 1.5 }}>{note.text}</div>
                <div style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>{new Date(note.createdAt).toLocaleString('zh-TW')}</div>
                <button onClick={() => deleteNote(note.id)} style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', color: '#ccc', fontSize: '14px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
              placeholder={'輸入訂單或備注...\n(Ctrl+Enter 儲存)'}
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', resize: 'none', outline: 'none', lineHeight: 1.5 }}
            />
            <button onClick={addNote} style={{
              marginTop: '6px', width: '100%', padding: '7px',
              borderRadius: '6px', border: 'none',
              backgroundColor: input.trim() ? '#FFC107' : '#f5f5f5',
              color: input.trim() ? '#333' : '#bbb',
              fontSize: '13px', fontWeight: 'bold',
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'background-color 0.15s'
            }}>
              新增記事
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setOpen(p => !p)} style={{
        width: '48px', height: '48px', borderRadius: '50%',
        backgroundColor: open ? '#FFC107' : '#FFF9C4',
        border: '2px solid #FFC107',
        fontSize: '22px', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color 0.2s'
      }}>
        📝
      </button>
    </div>
  );
}
