import React, { useState, useEffect } from 'react';
import API_BASE, { authFetch } from '../config';

const OVERLAY = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '10px'
};
const MODAL = {
  backgroundColor: '#fff', borderRadius: '14px',
  width: '700px', maxWidth: '100%', maxHeight: 'calc(100dvh - 20px)',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 8px 40px rgba(0,0,0,0.25)'
};

// Visual template preview (CSS grid)
function TemplatePreview({ template, size = 'large' }) {
  const isSmall = size === 'small';
  const W = isSmall ? 120 : 240;
  const H = isSmall ? (template.size.height / template.size.width) * W : (template.size.height / template.size.width) * W;
  const scaleX = W / template.size.width;
  const scaleY = H / template.size.height;

  const COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ce93d8', '#80cbc4'];

  return (
    <div style={{
      width: W, height: H, position: 'relative',
      border: '2px solid #e0e0e0', borderRadius: '6px',
      overflow: 'hidden', backgroundColor: '#f5f5f5', flexShrink: 0
    }}>
      {(template.areas || []).map((area, i) => (
        <div key={i} style={{
          position: 'absolute',
          left:   area.bounds.x * scaleX,
          top:    area.bounds.y * scaleY,
          width:  area.bounds.width  * scaleX - 2,
          height: area.bounds.height * scaleY - 2,
          backgroundColor: COLORS[i % COLORS.length] + '88',
          border: `2px solid ${COLORS[i % COLORS.length]}`,
          borderRadius: '3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isSmall ? '9px' : '12px',
          color: '#333', fontWeight: 'bold'
        }}>
          {isSmall ? '' : `按鈕 ${i + 1}`}
        </div>
      ))}
    </div>
  );
}

// Preview of an existing rich menu — shows background image + button zones overlay
function MenuPreview({ menu }) {
  const [imgState, setImgState] = useState('loading'); // 'loading' | 'ok' | 'error'
  const token = localStorage.getItem('adminToken') || '';
  const imgSrc = `${API_BASE}/api/rich-menu/${menu.richMenuId}/image?token=${encodeURIComponent(token)}`;

  const W = 300;
  const scale = W / (menu.size?.width || 2500);
  const H = (menu.size?.height || 843) * scale;
  const COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ce93d8', '#80cbc4'];

  const ACTION_ICON = { uri: '🔗', message: '💬', postback: '⚡' };

  return (
    <div style={{ padding: '10px 0 4px' }}>
      {/* Visual preview */}
      <div style={{ position: 'relative', width: W, height: H, margin: '0 auto', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', backgroundColor: '#f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {/* Background image */}
        <img
          src={imgSrc}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: imgState === 'ok' ? 'block' : 'none' }}
          onLoad={() => setImgState('ok')}
          onError={() => setImgState('error')}
        />
        {imgState === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span style={{ fontSize: '28px' }}>🖼</span>
            <span style={{ fontSize: '11px', color: '#bbb' }}>尚未上傳圖片</span>
          </div>
        )}
        {imgState === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: '#bbb' }}>載入圖片...</span>
          </div>
        )}

        {/* Button zone overlays */}
        {(menu.areas || []).map((area, i) => (
          <div key={i} style={{
            position: 'absolute',
            left:   area.bounds.x * scale,
            top:    area.bounds.y * scale,
            width:  area.bounds.width  * scale,
            height: area.bounds.height * scale,
            boxSizing: 'border-box',
            border: imgState === 'ok' ? '1.5px solid rgba(255,255,255,0.55)' : `2px solid ${COLORS[i % COLORS.length]}`,
            backgroundColor: imgState === 'ok' ? 'rgba(0,0,0,0.12)' : COLORS[i % COLORS.length] + '55',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
            transition: 'background-color 0.3s'
          }}>
            <span style={{
              fontSize: Math.max(8, H / ((menu.areas || []).length > 3 ? 14 : 10)) + 'px',
              fontWeight: 'bold',
              color: imgState === 'ok' ? '#fff' : '#333',
              textShadow: imgState === 'ok' ? '0 1px 3px rgba(0,0,0,0.9)' : 'none',
              textAlign: 'center', padding: '0 4px', lineHeight: 1.3,
              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {area.action?.label || `按鈕 ${i + 1}`}
            </span>
            <span style={{ fontSize: '9px', color: imgState === 'ok' ? 'rgba(255,255,255,0.75)' : '#666', textShadow: imgState === 'ok' ? '0 1px 2px rgba(0,0,0,0.8)' : 'none' }}>
              {ACTION_ICON[area.action?.type] || ''} {area.action?.type}
            </span>
          </div>
        ))}
      </div>

      {/* Button detail list */}
      {(menu.areas || []).length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menu.areas.map((area, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', padding: '5px 8px', backgroundColor: '#f8f8f8', borderRadius: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length], flexShrink: 0, marginTop: '3px' }} />
              <span style={{ fontWeight: '600', minWidth: '60px', color: '#333' }}>{area.action?.label || `按鈕 ${i + 1}`}</span>
              <span style={{ color: '#888', fontSize: '11px', wordBreak: 'break-all' }}>
                {area.action?.type === 'uri'      && `🔗 ${area.action.uri}`}
                {area.action?.type === 'message'  && `💬 「${area.action.text}」`}
                {area.action?.type === 'postback' && `⚡ ${area.action.data}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTION_TYPES = [
  { value: 'uri',      label: '🔗 連結網址' },
  { value: 'message',  label: '💬 傳送文字' },
  { value: 'postback', label: '⚡ Postback' },
];

export default function RichMenuModal({ onClose }) {
  const [tab, setTab] = useState('create'); // 'create' | 'manage'
  const [templates, setTemplates] = useState([]);
  const [menus, setMenus] = useState([]);
  const [selectedTmpl, setSelectedTmpl] = useState(null);
  const [chatBarText, setChatBarText] = useState('選單');
  const [buttons, setButtons] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [imageUrls, setImageUrls] = useState({}); // { [richMenuId]: url }
  const [uploadingImg, setUploadingImg] = useState(null); // richMenuId or null
  const [step, setStep] = useState(1); // 1 = pick template, 2 = configure buttons
  const [previewId, setPreviewId] = useState(null); // richMenuId of expanded preview
  const [editingMenu, setEditingMenu] = useState(null); // { id, chatBarText } | null
  const [editButtons, setEditButtons] = useState([]);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(null); // richMenuId being loaded

  useEffect(() => {
    loadTemplates();
    loadMenus();
  }, []);

  async function loadTemplates() {
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/templates`);
      const data = await res.json();
      setTemplates(data);
    } catch {}
  }

  async function loadMenus() {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/list`);
      const data = await res.json();
      setMenus(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }

  function pickTemplate(tmpl) {
    setSelectedTmpl(tmpl);
    setButtons(Array.from({ length: tmpl.buttonCount }, (_, i) => ({
      label: `按鈕 ${i + 1}`, actionType: 'uri', uri: '', text: '', data: ''
    })));
    setStep(2);
  }

  function updateButton(idx, field, value) {
    setButtons(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  }

  async function handleCreate() {
    if (!selectedTmpl) return;
    setCreating(true);
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey: selectedTmpl.key, buttons, chatBarText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '建立失敗');
      setCreatedId(data.richMenuId);
      await loadMenus();
      setTab('manage');
      setStep(1);
      alert(`✅ 圖文選單建立成功！\n選單 ID：${data.richMenuId}\n\n請在「管理選單」分頁上傳圖片並設為預設。`);
    } catch (err) {
      alert('建立失敗：' + err.message);
    }
    setCreating(false);
  }

  async function handleSetDefault(id) {
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/${id}/set-default`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || '';
        if (msg.includes('must upload richmenu image') || msg.includes('image')) {
          alert('⚠️ 請先上傳背景圖片，才能設為預設。\n\n步驟：在下方貼上圖片網址 → 點「上傳圖片」→ 再點「設為預設」');
        } else {
          alert('設定失敗：' + (msg || `HTTP ${res.status}`));
        }
        return;
      }
      alert('✅ 已設為預設圖文選單');
      loadMenus();
    } catch (err) { alert('設定失敗：' + err.message); }
  }

  async function handleCancelDefault() {
    if (!confirm('確定取消預設圖文選單？所有用戶將看不到選單。')) return;
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/default`, { method: 'DELETE' });
      if (!res.ok) throw new Error('取消失敗');
      alert('✅ 已取消預設圖文選單');
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此圖文選單？')) return;
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('刪除失敗');
      setMenus(prev => prev.filter(m => m.richMenuId !== id));
    } catch (err) { alert(err.message); }
  }

  async function handleUploadImage(richMenuId) {
    const url = (imageUrls[richMenuId] || '').trim();
    if (!url) { alert('請輸入圖片網址'); return; }
    setUploadingImg(richMenuId);
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/${richMenuId}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '上傳失敗'); }
      alert('✅ 圖片上傳成功！');
      setImageUrls(prev => ({ ...prev, [richMenuId]: '' }));
      // Reset preview to reload image
      setPreviewId(null);
    } catch (err) { alert('圖片上傳失敗：' + err.message); }
    setUploadingImg(null);
  }

  async function handleStartEdit(menu) {
    setEditLoading(menu.richMenuId);
    try {
      const res = await authFetch(`${API_BASE}/api/rich-menu/${menu.richMenuId}/detail`);
      const detail = await res.json();
      if (!res.ok) throw new Error(detail.error);
      setEditButtons((detail.areas || []).map((area, i) => ({
        label: area.action?.label || `按鈕 ${i + 1}`,
        actionType: area.action?.type || 'uri',
        uri: area.action?.uri || '',
        text: area.action?.text || '',
        data: area.action?.data || ''
      })));
      setEditImageUrl('');
      setEditingMenu({ id: menu.richMenuId, chatBarText: detail.chatBarText || menu.chatBarText || '選單' });
    } catch (err) { alert('載入失敗：' + err.message); }
    setEditLoading(null);
  }

  function updateEditButton(idx, field, value) {
    setEditButtons(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  }

  async function handleSaveEdit() {
    if (!editingMenu) return;
    setEditSaving(true);
    try {
      const trimmedImageUrl = editImageUrl.trim();
      const res = await authFetch(`${API_BASE}/api/rich-menu/${editingMenu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buttons: editButtons,
          chatBarText: editingMenu.chatBarText,
          ...(trimmedImageUrl ? { imageUrl: trimmedImageUrl } : {})
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setEditingMenu(null);
      setEditButtons([]);
      setEditImageUrl('');
      await loadMenus();
      const imgMsg = trimmedImageUrl ? '圖片已更新！' : (data.imagePreserved ? '圖片已自動保留。' : '（注意：此選單原本沒有圖片，請至管理頁上傳。）');
      alert(`✅ 按鈕動作已更新，${imgMsg}`);
    } catch (err) { alert('儲存失敗：' + err.message); }
    setEditSaving(false);
  }

  // ── Size spec for template ──
  const tmplWithAreas = selectedTmpl
    ? templates.find(t => t.key === selectedTmpl.key) // templates from API don't have areas
    : null;

  // Enrich template objects with area bounds from presets
  const PRESET_AREAS = {
    grid3:  [
      { bounds: { x: 0, y: 0, width: 833, height: 843 } },
      { bounds: { x: 833, y: 0, width: 834, height: 843 } },
      { bounds: { x: 1667, y: 0, width: 833, height: 843 } }
    ],
    grid6:  [
      { bounds: { x: 0, y: 0, width: 833, height: 843 } },
      { bounds: { x: 833, y: 0, width: 834, height: 843 } },
      { bounds: { x: 1667, y: 0, width: 833, height: 843 } },
      { bounds: { x: 0, y: 843, width: 833, height: 843 } },
      { bounds: { x: 833, y: 843, width: 834, height: 843 } },
      { bounds: { x: 1667, y: 843, width: 833, height: 843 } }
    ],
    large2: [
      { bounds: { x: 0, y: 0, width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 0, width: 1250, height: 422 } },
      { bounds: { x: 1250, y: 422, width: 1250, height: 421 } }
    ],
    grid4:  [
      { bounds: { x: 0, y: 0, width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 0, width: 1250, height: 843 } },
      { bounds: { x: 0, y: 843, width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 843, width: 1250, height: 843 } }
    ]
  };

  const PRESET_SIZES = {
    grid3: { width: 2500, height: 843 },
    grid6: { width: 2500, height: 1686 },
    large2: { width: 2500, height: 843 },
    grid4: { width: 2500, height: 1686 }
  };

  const enrichedTemplates = templates.map(t => ({
    ...t,
    areas: PRESET_AREAS[t.key] || [],
    size:  PRESET_SIZES[t.key] || { width: 2500, height: 843 }
  }));

  const selectedEnriched = selectedTmpl
    ? enrichedTemplates.find(t => t.key === selectedTmpl.key)
    : null;

  return (
    <div style={OVERLAY}>
      <div style={MODAL}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>📋 圖文選單管理</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#999', lineHeight: 1 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
          {[{ key: 'create', label: '➕ 建立選單' }, { key: 'manage', label: '📂 管理選單' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'manage') loadMenus(); }}
              style={{
                flex: 1, padding: '11px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: tab === t.key ? '700' : '400',
                color: tab === t.key ? '#2196F3' : '#777',
                borderBottom: tab === t.key ? '2px solid #2196F3' : '2px solid transparent'
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ─── CREATE TAB ─── */}
          {tab === 'create' && (
            <>
              {step === 1 && (
                <div>
                  <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>
                    選擇一個版型作為圖文選單的按鈕佈局。每個色塊代表一個可點擊區域。
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {enrichedTemplates.map(tmpl => (
                      <div key={tmpl.key}
                        onClick={() => pickTemplate(tmpl)}
                        style={{
                          border: '2px solid #e8edf2', borderRadius: '10px',
                          padding: '14px', cursor: 'pointer', backgroundColor: '#fff',
                          transition: 'all 0.15s',
                          ':hover': { borderColor: '#2196F3' }
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#2196F3'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e8edf2'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                          <TemplatePreview template={tmpl} size="small" />
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#333', textAlign: 'center' }}>{tmpl.name}</div>
                        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '2px' }}>{tmpl.desc}</div>
                        <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginTop: '4px' }}>
                          {tmpl.buttonCount} 個按鈕 · {tmpl.size.width}×{tmpl.size.height}px
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && selectedEnriched && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <button onClick={() => setStep(1)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#666', fontSize: '13px' }}>← 返回</button>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>設定按鈕 — {selectedEnriched.name}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#555' }}>選單列文字</label>
                      <input value={chatBarText} onChange={e => setChatBarText(e.target.value)}
                        placeholder="例：功能選單" maxLength={14}
                        style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '14px' }} />
                      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>顯示在聊天室底部的文字，最多 14 字</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>版型預覽</label>
                      <TemplatePreview template={selectedEnriched} size="small" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {buttons.map((btn, i) => (
                      <div key={i} style={{ border: '1px solid #e8edf2', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#fafbfc' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: '#555', marginBottom: '10px' }}>
                          按鈕 {i + 1}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#777' }}>顯示標籤</label>
                            <input value={btn.label} onChange={e => updateButton(i, 'label', e.target.value)}
                              placeholder={`按鈕 ${i + 1}`} maxLength={20}
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#777' }}>動作類型</label>
                            <select value={btn.actionType} onChange={e => updateButton(i, 'actionType', e.target.value)}
                              style={{ display: 'block', width: '100%', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', backgroundColor: '#fff' }}>
                              {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                            </select>
                          </div>
                        </div>
                        {btn.actionType === 'uri' && (
                          <div>
                            <label style={{ fontSize: '12px', color: '#777' }}>連結網址</label>
                            <input value={btn.uri} onChange={e => updateButton(i, 'uri', e.target.value)}
                              placeholder="https://example.com"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                          </div>
                        )}
                        {btn.actionType === 'message' && (
                          <div>
                            <label style={{ fontSize: '12px', color: '#777' }}>傳送文字（用戶按下時發送）</label>
                            <input value={btn.text} onChange={e => updateButton(i, 'text', e.target.value)}
                              placeholder="例：查看菜單"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                          </div>
                        )}
                        {btn.actionType === 'postback' && (
                          <div>
                            <label style={{ fontSize: '12px', color: '#777' }}>Postback data</label>
                            <input value={btn.data} onChange={e => updateButton(i, 'data', e.target.value)}
                              placeholder="action=menu"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', fontSize: '13px', color: '#1565c0' }}>
                    💡 建立後請至「管理選單」分頁上傳圖片並設為預設。圖片尺寸：{selectedEnriched.size.width} × {selectedEnriched.size.height} px
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button onClick={handleCreate} disabled={creating}
                      style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: creating ? '#b0bec5' : '#00B900', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: creating ? 'not-allowed' : 'pointer' }}>
                      {creating ? '建立中...' : '✅ 建立選單'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── MANAGE TAB ─── */}
          {tab === 'manage' && (editingMenu ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <button onClick={() => setEditingMenu(null)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#666', fontSize: '13px' }}>← 取消</button>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>✏️ 編輯按鈕動作</span>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#555' }}>選單列文字</label>
                <input value={editingMenu.chatBarText} maxLength={14}
                  onChange={e => setEditingMenu(m => ({ ...m, chatBarText: e.target.value }))}
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {editButtons.map((btn, i) => (
                  <div key={i} style={{ border: '1px solid #e8edf2', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#fafbfc' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#555', marginBottom: '10px' }}>按鈕 {i + 1}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#777' }}>顯示標籤</label>
                        <input value={btn.label} onChange={e => updateEditButton(i, 'label', e.target.value)} maxLength={20}
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#777' }}>動作類型</label>
                        <select value={btn.actionType} onChange={e => updateEditButton(i, 'actionType', e.target.value)}
                          style={{ display: 'block', width: '100%', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', backgroundColor: '#fff' }}>
                          {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {btn.actionType === 'uri' && (
                      <div>
                        <label style={{ fontSize: '12px', color: '#777' }}>連結網址</label>
                        <input value={btn.uri} onChange={e => updateEditButton(i, 'uri', e.target.value)}
                          placeholder="https://liff.line.me/..."
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                      </div>
                    )}
                    {btn.actionType === 'message' && (
                      <div>
                        <label style={{ fontSize: '12px', color: '#777' }}>傳送文字</label>
                        <input value={btn.text} onChange={e => updateEditButton(i, 'text', e.target.value)}
                          placeholder="例：查看菜單"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                      </div>
                    )}
                    {btn.actionType === 'postback' && (
                      <div>
                        <label style={{ fontSize: '12px', color: '#777' }}>Postback data</label>
                        <input value={btn.data} onChange={e => updateEditButton(i, 'data', e.target.value)}
                          placeholder="action=menu"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ background: '#f1f8e9', border: '1px solid #c5e1a5', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#558b2f', marginBottom: '6px' }}>
                  更換圖片（選填）— 留空則自動保留現有圖片
                </div>
                <input
                  value={editImageUrl}
                  onChange={e => setEditImageUrl(e.target.value)}
                  placeholder="https://example.com/new-image.jpg（不填則保留原圖）"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setEditingMenu(null)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontSize: '14px', cursor: 'pointer' }}>
                  取消
                </button>
                <button onClick={handleSaveEdit} disabled={editSaving}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: editSaving ? '#b0bec5' : '#00B900', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                  {editSaving ? '儲存中...' : '✅ 儲存'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>LINE 帳號目前建立的圖文選單（上限 10 個）</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCancelDefault} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontSize: '12px', cursor: 'pointer' }}>
                    取消預設選單
                  </button>
                  <button onClick={loadMenus} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontSize: '12px', cursor: 'pointer' }}>
                    🔄 重新整理
                  </button>
                </div>
              </div>

              {loading && <div style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>載入中...</div>}

              {!loading && menus.length === 0 && (
                <div style={{ textAlign: 'center', color: '#bbb', padding: '40px', fontSize: '14px' }}>
                  尚未建立任何圖文選單<br />
                  <span style={{ fontSize: '12px' }}>請至「建立選單」分頁新增</span>
                </div>
              )}

              {menus.map(menu => {
                const isExpanded = previewId === menu.richMenuId;
                return (
                <div key={menu.richMenuId} style={{ border: `1px solid ${isExpanded ? '#90caf9' : '#e8edf2'}`, borderRadius: '10px', padding: '14px', marginBottom: '10px', backgroundColor: '#fafbfc', transition: 'border-color 0.15s' }}>
                  {/* Menu info + action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>{menu.name || '未命名選單'}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        {menu.size?.width}×{menu.size?.height}px · {(menu.areas || []).length} 個按鈕 · 列文字：{menu.chatBarText}
                      </div>
                      <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{menu.richMenuId}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                      <button
                        onClick={() => setPreviewId(isExpanded ? null : menu.richMenuId)}
                        style={{
                          padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                          border: isExpanded ? '1px solid #2196F3' : '1px solid #e0e0e0',
                          background: isExpanded ? '#e3f2fd' : '#fff',
                          color: isExpanded ? '#2196F3' : '#555', fontWeight: isExpanded ? '700' : '400'
                        }}>
                        {isExpanded ? '▲ 收合' : '👁 預覽'}
                      </button>
                      <button onClick={() => handleStartEdit(menu)} disabled={editLoading === menu.richMenuId}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#555', fontSize: '12px', cursor: editLoading === menu.richMenuId ? 'not-allowed' : 'pointer' }}>
                        {editLoading === menu.richMenuId ? '載入...' : '✏️ 編輯'}
                      </button>
                      <button onClick={() => handleDelete(menu.richMenuId)}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #ffcdd2', background: '#fff', color: '#f44336', fontSize: '12px', cursor: 'pointer' }}>
                        刪除
                      </button>
                    </div>
                  </div>

                  {/* Expandable preview */}
                  {isExpanded && (
                    <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e3f2fd' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#1565c0', marginBottom: '8px' }}>選單預覽</div>
                      <MenuPreview menu={menu} />
                    </div>
                  )}

                  {/* Step 1: upload image */}
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e3f2fd', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1565c0', marginBottom: '6px' }}>① 上傳背景圖片（必須先完成）</div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                      圖片需為 HTTPS 公開網址，尺寸：{menu.size?.width}×{menu.size?.height}px，格式：JPG 或 PNG，大小 ≤ 1MB
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        value={imageUrls[menu.richMenuId] || ''}
                        onChange={e => setImageUrls(prev => ({ ...prev, [menu.richMenuId]: e.target.value }))}
                        placeholder="https://example.com/richmenu.jpg"
                        style={{ flex: 1, padding: '7px 9px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '12px' }}
                      />
                      <button
                        onClick={() => handleUploadImage(menu.richMenuId)}
                        disabled={uploadingImg === menu.richMenuId}
                        style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#2196F3', color: '#fff', fontSize: '12px', cursor: uploadingImg === menu.richMenuId ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 'bold' }}>
                        {uploadingImg === menu.richMenuId ? '上傳中...' : '上傳圖片'}
                      </button>
                    </div>
                  </div>

                  {/* Step 2: set default */}
                  <div style={{ backgroundColor: '#f1f8e9', border: '1px solid #c5e1a5', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#558b2f', fontWeight: '700' }}>② 圖片上傳完成後，設為預設選單</span>
                    <button onClick={() => handleSetDefault(menu.richMenuId)}
                      style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#00B900', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}>
                      設為預設
                    </button>
                  </div>
                </div>
              );
              })}

              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff8e1', borderRadius: '8px', fontSize: '12px', color: '#795548', lineHeight: 1.7 }}>
                <strong>💡 操作流程（順序不能顛倒）：</strong><br />
                ① 在「建立選單」分頁設定版型與按鈕動作<br />
                ② 上傳背景圖片（建議用 Canva 設計，尺寸依版型規格）<br />
                ③ 點「設為預設」→ 所有用戶開啟聊天視窗即看到選單<br /><br />
                <strong>⚠️ LINE 規定：</strong>未上傳圖片的選單無法設為預設<br />
                最多建立 10 個選單，同時只能有 1 個預設
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
