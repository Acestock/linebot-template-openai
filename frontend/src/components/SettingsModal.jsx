import React, { useState, useEffect } from 'react';
import API_BASE from '../config';

const FIELD = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
  borderRadius: '6px', border: '1px solid #e0e0e0',
  fontSize: '14px', lineHeight: '1.5', outline: 'none', marginTop: '4px'
};
const LABEL = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '2px' };
const GROUP = { marginBottom: '14px' };

// ─── Tab 1: 商家知識庫 ───────────────────────────────────────────────────────
function ProfileTab({ profile, onChange, onSave, saving, saved }) {
  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
        填寫商家資訊後，AI 將根據這些內容生成更精準的回覆建議。
      </p>
      <div style={GROUP}><label style={LABEL}>店名 *</label>
        <input name="shopName" value={profile.shopName} onChange={onChange} placeholder="例：阿明麵包坊" style={FIELD} /></div>
      <div style={GROUP}><label style={LABEL}>行業類型</label>
        <input name="industry" value={profile.industry} onChange={onChange} placeholder="例：烘焙、餐飲、服飾" style={FIELD} /></div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}><label style={LABEL}>營業時間</label>
          <input name="businessHours" value={profile.businessHours} onChange={onChange} placeholder="例：週一至週六 10:00–20:00" style={FIELD} /></div>
        <div style={{ flex: 1 }}><label style={LABEL}>地址</label>
          <input name="address" value={profile.address} onChange={onChange} placeholder="例：台北市信義區..." style={FIELD} /></div>
      </div>
      <div style={GROUP}><label style={LABEL}>商品／服務說明</label>
        <textarea name="products" value={profile.products} onChange={onChange}
          placeholder={'例：\n- 手工麵包（每日現烤）\n- 客製化蛋糕（需提前3天預訂）'} rows={4} style={FIELD} /></div>
      <div style={GROUP}><label style={LABEL}>常見問題 Q&A</label>
        <textarea name="faq" value={profile.faq} onChange={onChange}
          placeholder={'例：\nQ: 可以客製化嗎？\nA: 可以，請提前3天告知需求'} rows={4} style={FIELD} /></div>
      <div style={GROUP}><label style={LABEL}>回覆風格備注</label>
        <input name="toneNote" value={profile.toneNote} onChange={onChange} placeholder="例：親切友善、多用表情符號" style={FIELD} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
        {saved && <span style={{ color: '#4CAF50', fontSize: '13px', alignSelf: 'center' }}>✓ 已儲存</span>}
        <button onClick={onSave} disabled={saving} style={{
          padding: '8px 20px', borderRadius: '6px', border: 'none',
          background: saving ? '#b0bec5' : '#00B900', color: '#fff',
          fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer'
        }}>{saving ? '儲存中...' : '儲存'}</button>
      </div>
    </div>
  );
}

// ─── Tab 2: 關鍵字觸發 ───────────────────────────────────────────────────────
function KeywordTab() {
  const [keywords, setKeywords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ trigger: '', reply: '', isActive: true, order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadKeywords(); }, []);

  async function loadKeywords() {
    const res = await fetch(`${API_BASE}/api/keywords`);
    setKeywords(await res.json());
  }

  function openNew() { setEditing(null); setForm({ trigger: '', reply: '', isActive: true, order: keywords.length }); setShowForm(true); }
  function openEdit(kw) { setEditing(kw); setForm({ trigger: kw.trigger, reply: kw.reply, isActive: kw.isActive, order: kw.order }); setShowForm(true); }

  async function handleSave() {
    if (!form.trigger.trim() || !form.reply.trim()) { alert('觸發詞和回覆內容為必填'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/api/keywords/${editing._id}` : `${API_BASE}/api/keywords`;
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('操作失敗');
      await loadKeywords();
      setShowForm(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除？')) return;
    await fetch(`${API_BASE}/api/keywords/${id}`, { method: 'DELETE' });
    await loadKeywords();
  }

  async function toggleActive(kw) {
    await fetch(`${API_BASE}/api/keywords/${kw._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...kw, isActive: !kw.isActive })
    });
    await loadKeywords();
  }

  if (showForm) return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
        設定語意觸發詞，當客人訊息語意上符合觸發主題時，AI 將自動發送預設回覆。
      </p>
      <div style={GROUP}><label style={LABEL}>觸發主題 *</label>
        <input value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))}
          placeholder="例：營業時間、停車、退換貨..." style={FIELD} />
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>不需完全相同，GPT 會做語意匹配（如「幾點開」→「營業時間」）</div>
      </div>
      <div style={GROUP}><label style={LABEL}>自動回覆內容 *</label>
        <textarea value={form.reply} onChange={e => setForm(p => ({ ...p, reply: e.target.value }))}
          rows={4} placeholder="例：我們的營業時間是週一到週六 10:00–20:00，國定假日公休。" style={FIELD} /></div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', cursor: 'pointer' }}>返回</button>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#2196F3', color: '#fff', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '12px' }}>
        當客人訊息語意上符合觸發主題時，系統自動發送預設回覆，無需人工介入。
      </p>
      {keywords.length === 0 && <div style={{ textAlign: 'center', color: '#bbb', padding: '24px', fontSize: '14px' }}>尚無關鍵字，點擊下方新增</div>}
      {keywords.map(kw => (
        <div key={kw._id} style={{ padding: '12px 14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #f0f0f0', backgroundColor: kw.isActive ? '#fafafa' : '#f5f5f5', opacity: kw.isActive ? 1 : 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>{kw.trigger}</span>
                <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '10px', backgroundColor: kw.isActive ? '#e8f5e9' : '#f5f5f5', color: kw.isActive ? '#388e3c' : '#aaa' }}>
                  {kw.isActive ? '啟用' : '停用'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#777', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{kw.reply}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => toggleActive(kw)} style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>{kw.isActive ? '停用' : '啟用'}</button>
              <button onClick={() => openEdit(kw)} style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>編輯</button>
              <button onClick={() => handleDelete(kw._id)} style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #ffcdd2', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#e53935' }}>刪除</button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={openNew} style={{ width: '100%', marginTop: '4px', padding: '10px', borderRadius: '8px', border: '2px dashed #e0e0e0', background: '#fff', color: '#2196F3', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
        + 新增關鍵字觸發
      </button>
    </div>
  );
}

// ─── Tab 3: 自動回覆設定 ─────────────────────────────────────────────────────
function AutoReplyTab({ profile, onChange, onSave, saving, saved }) {
  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '20px' }}>
        啟用後，若客人傳訊後設定時間內管理員未回覆，AI 會自動發送親切版回覆建議。<br />
        計時器在每則訊息後重置，確保分段訊息全部被讀取後再回覆。
      </p>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '10px', border: '2px solid', borderColor: profile.autoReply ? '#00B900' : '#e0e0e0', backgroundColor: profile.autoReply ? '#f1fff1' : '#fafafa', marginBottom: '20px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#333' }}>AI 自動回覆</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
            {profile.autoReply ? '已啟用 — 將在設定時間後自動回覆' : '已停用'}
          </div>
        </div>
        <div onClick={() => onChange({ target: { name: 'autoReply', value: !profile.autoReply } })}
          style={{ width: '48px', height: '26px', borderRadius: '13px', backgroundColor: profile.autoReply ? '#00B900' : '#ccc', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' }}>
          <div style={{ position: 'absolute', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', top: '3px', left: profile.autoReply ? '25px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
      </div>

      {profile.autoReply && (
        <div style={GROUP}>
          <label style={LABEL}>等待時間（秒）</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <input type="number" name="autoReplyDelay" value={profile.autoReplyDelay}
              onChange={onChange} min={10} max={600} style={{ ...FIELD, width: '100px', marginTop: 0 }} />
            <span style={{ fontSize: '13px', color: '#888' }}>
              秒（{Math.round(profile.autoReplyDelay / 60 * 10) / 10} 分鐘）
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>建議 60 秒，讓客人可以分段傳完所有訊息</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
        {saved && <span style={{ color: '#4CAF50', fontSize: '13px', alignSelf: 'center' }}>✓ 已儲存</span>}
        <button onClick={onSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#00B900', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({
    shopName: '', industry: '', products: '', businessHours: '', address: '',
    faq: '', toneNote: '', autoReply: false, autoReplyDelay: 60
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`).then(r => r.json()).then(data => {
      setProfile({
        shopName: data.shopName || '', industry: data.industry || '',
        products: data.products || '', businessHours: data.businessHours || '',
        address: data.address || '', faq: data.faq || '', toneNote: data.toneNote || '',
        autoReply: data.autoReply || false, autoReplyDelay: data.autoReplyDelay || 60
      });
    }).catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error('儲存失敗');
      setSaved(true);
    } catch (err) { alert(`儲存失敗：${err.message}`); }
    finally { setSaving(false); }
  }

  const TABS = [
    { key: 'profile', label: '商家知識庫' },
    { key: 'keywords', label: '關鍵字觸發' },
    { key: 'autoReply', label: '自動回覆' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '580px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>⚙ 系統設定</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: tab === t.key ? '700' : '400',
              color: tab === t.key ? '#2196F3' : '#777',
              borderBottom: tab === t.key ? '2px solid #2196F3' : '2px solid transparent',
              transition: 'all 0.15s'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {tab === 'profile' && <ProfileTab profile={profile} onChange={handleChange} onSave={handleSave} saving={saving} saved={saved} />}
          {tab === 'keywords' && <KeywordTab />}
          {tab === 'autoReply' && <AutoReplyTab profile={profile} onChange={handleChange} onSave={handleSave} saving={saving} saved={saved} />}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
