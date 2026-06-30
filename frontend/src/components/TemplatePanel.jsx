import React, { useState, useEffect, useRef } from 'react';
import API_BASE, { authFetch } from '../config';

function TemplatePanel({ onInsert, disabled }) {
  const [templates, setTemplates] = useState([]);
  const [open, setOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function fetchTemplates() {
    try {
      const res = await authFetch(`${API_BASE}/api/templates`);
      const data = await res.json();
      setTemplates(data);
    } catch {}
  }

  function handleInsert(content) {
    onInsert(content);
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative', marginBottom: '6px' }} ref={dropdownRef}>
      <button
        onClick={() => !disabled && setOpen(p => !p)}
        disabled={disabled}
        style={{
          padding: '5px 12px', borderRadius: '6px', border: '1px solid #e0e0e0',
          background: '#fff', color: disabled ? '#ccc' : '#555',
          fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}
      >
        快捷模板 {open ? '▲' : '▼'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50,
          backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '280px', maxWidth: '400px',
          marginTop: '4px', overflow: 'hidden'
        }}>
          {templates.length === 0 ? (
            <div style={{ padding: '14px 16px', color: '#bbb', fontSize: '13px' }}>尚無模板</div>
          ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {templates.map(t => (
                <button key={t._id} onClick={() => handleInsert(t.content)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', border: 'none', borderBottom: '1px solid #f5f5f5',
                  background: 'none', cursor: 'pointer', fontSize: '14px',
                  color: '#333', lineHeight: 1.4
                }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '13px' }}>{t.title}</div>
                  <div style={{ color: '#888', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {t.content.length > 60 ? t.content.slice(0, 60) + '...' : t.content}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px' }}>
            <button onClick={() => { setOpen(false); setShowManager(true); }} style={{
              background: 'none', border: 'none', color: '#2196F3', fontSize: '13px',
              cursor: 'pointer', padding: '2px 4px'
            }}>
              + 管理模板
            </button>
          </div>
        </div>
      )}

      {showManager && (
        <TemplateManager
          templates={templates}
          onClose={() => setShowManager(false)}
          onRefresh={fetchTemplates}
        />
      )}
    </div>
  );
}

function TemplateManager({ templates, onClose, onRefresh }) {
  const [list, setList] = useState(templates);
  const [editing, setEditing] = useState(null); // null = new, or template object
  const [form, setForm] = useState({ title: '', content: '', order: 0 });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setList(templates); }, [templates]);

  function openNew() {
    setEditing(null);
    setForm({ title: '', content: '', order: list.length });
    setShowForm(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({ title: t.title, content: t.content, order: t.order });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      alert('標題和內容為必填');
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `${API_BASE}/api/templates/${editing._id}`
        : `${API_BASE}/api/templates`;
      const method = editing ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('操作失敗');
      await onRefresh();
      setShowForm(false);
    } catch (err) {
      alert(`操作失敗：${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此模板？')) return;
    try {
      const res = await authFetch(`${API_BASE}/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('刪除失敗');
      await onRefresh();
    } catch (err) {
      alert(`刪除失敗：${err.message}`);
    }
  }

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '14px',
    lineHeight: '1.5', outline: 'none', marginTop: '4px'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '10px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '520px', maxWidth: '100%',
        maxHeight: 'calc(100dvh - 20px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
            {showForm ? (editing ? '編輯模板' : '新增模板') : '快捷回覆模板'}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999'
          }}>✕</button>
        </div>

        {!showForm ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {list.length === 0 && (
                <div style={{ textAlign: 'center', color: '#bbb', marginTop: '30px', fontSize: '14px' }}>
                  尚無模板，點擊新增
                </div>
              )}
              {list.map(t => (
                <div key={t._id} style={{
                  padding: '12px 14px', marginBottom: '10px', borderRadius: '8px',
                  border: '1px solid #f0f0f0', backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{t.title}</div>
                      <div style={{ fontSize: '13px', color: '#777', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {t.content}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(t)} style={{
                        padding: '4px 10px', borderRadius: '5px', border: '1px solid #e0e0e0',
                        background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555'
                      }}>編輯</button>
                      <button onClick={() => handleDelete(t._id)} style={{
                        padding: '4px 10px', borderRadius: '5px', border: '1px solid #ffcdd2',
                        background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#e53935'
                      }}>刪除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0' }}>
              <button onClick={openNew} style={{
                width: '100%', padding: '10px', borderRadius: '8px', border: '2px dashed #e0e0e0',
                background: '#fff', color: '#2196F3', fontSize: '14px', cursor: 'pointer', fontWeight: '600'
              }}>
                + 新增模板
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '2px' }}>
                模板名稱 *
              </label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="例：報價說明、感謝詞..." style={fieldStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '2px' }}>
                模板內容 *
              </label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="輸入模板內容..." rows={6} style={fieldStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '2px' }}>
                排序
              </label>
              <input type="number" value={form.order}
                onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                style={{ ...fieldStyle, width: '100px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowForm(false)} style={{
                padding: '8px 18px', borderRadius: '6px', border: '1px solid #e0e0e0',
                background: '#fff', color: '#666', fontSize: '14px', cursor: 'pointer'
              }}>返回</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 18px', borderRadius: '6px', border: 'none',
                background: saving ? '#b0bec5' : '#2196F3', color: '#fff',
                fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer'
              }}>
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplatePanel;
