import React, { useState, useEffect, useCallback } from 'react';
import API_BASE, { authFetch } from '../config';

const TABS = ['場地管理', '時段方案', '公告管理', '預約列表', '系統設定'];
const SLOT_OPTIONS = [
  { key: 'morning',   label: '早上 (07–12)' },
  { key: 'afternoon', label: '下午 (12–18)' },
  { key: 'evening',   label: '晚上 (18–02)' }
];
const STATUS_LABELS = { confirmed: '已確認', checked_in: '已入場', completed: '已完成', cancelled: '已取消' };
const STATUS_COLORS = { confirmed: '#1976d2', checked_in: '#2e7d32', completed: '#555', cancelled: '#c62828' };

// ── Shared small components ────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '16px', outline: 'none' };
const textareaStyle = { ...inputStyle, resize: 'vertical', fontFamily: 'inherit' };
const btn = (bg, color = '#fff') => ({ padding: '7px 16px', borderRadius: '8px', border: 'none', background: bg, color, fontSize: '13px', fontWeight: '600', cursor: 'pointer' });

// ── Blocked Slots section (包場管理) ─────────────────────────────────────────
const SLOT_OPTIONS_BLOCK = [
  { key: 'morning', label: '早上 (07–12)' },
  { key: 'afternoon', label: '下午 (12–18)' },
  { key: 'evening', label: '晚上 (18–02)' }
];

function BlockedSlotsSection({ venues }) {
  const [blocks, setBlocks]         = useState([]);
  const [selVenue, setSelVenue]     = useState('');
  const [date, setDate]             = useState('');
  const [slots, setSlots]           = useState([]);
  const [eventName, setEventName]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [filterVenue, setFilterVenue] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const loadBlocks = useCallback(() => {
    const qs = filterVenue ? `?venueId=${filterVenue}` : '';
    authFetch(`${API_BASE}/api/blocked-slots${qs}`).then(r => r.json())
      .then(d => setBlocks(Array.isArray(d) ? d : [])).catch(() => {});
  }, [filterVenue]);
  useEffect(loadBlocks, [loadBlocks]);

  function toggleSlot(key) {
    setSlots(s => s.includes(key) ? s.filter(x => x !== key) : [...s, key]);
  }

  async function handleAdd() {
    if (!selVenue || !date || !slots.length) return alert('請選擇場地、日期和時段');
    setSaving(true);
    try {
      await authFetch(`${API_BASE}/api/blocked-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: selVenue, date, slots, eventName })
      });
      setDate(''); setSlots([]); setEventName('');
      loadBlocks();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此包場紀錄？')) return;
    await authFetch(`${API_BASE}/api/blocked-slots/${id}`, { method: 'DELETE' });
    loadBlocks();
  }

  const slotLabel = k => SLOT_OPTIONS_BLOCK.find(s => s.key === k)?.label || k;

  return (
    <div style={{ marginTop: '24px', borderTop: '2px solid #f0f0f0', paddingTop: '20px' }}>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '14px', color: '#333' }}>包場管理（全時段預約）</div>

      {/* Add form */}
      <div style={{ background: '#f9f9f9', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
        <Field label="場地">
          <select style={inputStyle} value={selVenue} onChange={e => setSelVenue(e.target.value)}>
            <option value="">請選擇場地</option>
            {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="日期">
          <input type="date" style={inputStyle} value={date} min={today} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="時段（可複選）">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {SLOT_OPTIONS_BLOCK.map(s => (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={slots.includes(s.key)} onChange={() => toggleSlot(s.key)} />
                {s.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="活動名稱（選填）">
          <input style={inputStyle} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="例：VIP 包場、企業活動" />
        </Field>
        <button onClick={handleAdd} disabled={saving} style={{ ...btn('#111'), width: '100%', marginTop: '4px' }}>
          {saving ? '新增中...' : '＋ 新增包場'}
        </button>
      </div>

      {/* Existing blocks */}
      <Field label="篩選場地">
        <select style={inputStyle} value={filterVenue} onChange={e => setFilterVenue(e.target.value)}>
          <option value="">全部場地</option>
          {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
      </Field>

      {blocks.length === 0
        ? <div style={{ color: '#aaa', textAlign: 'center', padding: '16px' }}>尚無包場紀錄</div>
        : blocks.map(b => {
          const venueName = venues.find(v => v._id === (b.venueId?._id || b.venueId))?.name || '—';
          const dateStr   = new Date(b.date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' });
          return (
            <div key={b._id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{venueName} — {dateStr}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                  {(b.slots || []).map(slotLabel).join(' + ')}
                  {b.eventName ? ` · 活動：${b.eventName}` : ''}
                </div>
              </div>
              <button onClick={() => handleDelete(b._id)} style={btn('#ffebee', '#c62828')}>刪除</button>
            </div>
          );
        })
      }
    </div>
  );
}

// ── Tab 1: 場地管理 ──────────────────────────────────────────────────────────
function VenueTab() {
  const [venues, setVenues]   = useState([]);
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    authFetch(`${API_BASE}/api/venues`).then(r => r.json()).then(setVenues).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const emptyForm = { name: '', address: '', transportInfo: '', imageUrl: '', businessHours: '', facilities: '', rules: '', howToUse: '', color: '#2196F3', maxCapacityPerSlot: 10, isActive: true };

  async function save() {
    if (!form.name) return alert('請輸入場地名稱');
    setSaving(true);
    try {
      const method = form._id ? 'PATCH' : 'POST';
      const url = form._id ? `${API_BASE}/api/venues/${form._id}` : `${API_BASE}/api/venues`;
      await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setForm(null); load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('確定刪除此場地？')) return;
    await authFetch(`${API_BASE}/api/venues/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggleActive(v) {
    await authFetch(`${API_BASE}/api/venues/${v._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !v.isActive }) });
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button onClick={() => setForm(emptyForm)} style={btn('#111')}>＋ 新增場地</button>
      </div>

      {venues.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '24px' }}>尚無場地，點右上角新增</div>}

      {venues.map(v => (
        <div key={v._id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', borderLeft: `4px solid ${v.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{v.name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{v.address || '（未設地址）'} · 每時段上限 {v.maxCapacityPerSlot} 人</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={() => toggleActive(v)} style={btn(v.isActive ? '#e8f5e9' : '#fce4ec', v.isActive ? '#2e7d32' : '#c62828')}>{v.isActive ? '啟用' : '停用'}</button>
              <button onClick={() => setForm({ ...v })} style={btn('#f5f5f5', '#333')}>編輯</button>
              <button onClick={() => del(v._id)} style={btn('#ffebee', '#c62828')}>刪除</button>
            </div>
          </div>
        </div>
      ))}

      {/* Form modal */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '500px', maxWidth: '100%', maxHeight: 'calc(100dvh - 20px)', overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{form._id ? '編輯場地' : '新增場地'}</div>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <Field label="場地名稱 *"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="台大醫院重慶" /></Field>
            <Field label="地址"><input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></Field>
            <Field label="交通資訊"><input style={inputStyle} value={form.transportInfo} onChange={e => setForm(f => ({ ...f, transportInfo: e.target.value }))} placeholder="捷運XX站步行X分鐘" /></Field>
            <Field label="場地圖片 URL"><input style={inputStyle} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} /></Field>
            <Field label="營業時間"><textarea style={textareaStyle} rows={2} value={form.businessHours} onChange={e => setForm(f => ({ ...f, businessHours: e.target.value }))} /></Field>
            <Field label="設備與服務"><textarea style={textareaStyle} rows={3} value={form.facilities} onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))} /></Field>
            <Field label="使用規範"><textarea style={textareaStyle} rows={3} value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} /></Field>
            <Field label="使用方式"><textarea style={textareaStyle} rows={3} value={form.howToUse} onChange={e => setForm(f => ({ ...f, howToUse: e.target.value }))} /></Field>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Field label="邊框顏色"><input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: '60px', height: '36px', padding: '2px', border: '1px solid #e0e0e0', borderRadius: '6px' }} /></Field>
              <Field label="每時段座位上限">
                <input type="number" min="1" style={{ ...inputStyle, width: '100px' }} value={form.maxCapacityPerSlot} onChange={e => setForm(f => ({ ...f, maxCapacityPerSlot: +e.target.value }))} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setForm(null)} style={btn('#f5f5f5', '#333')}>取消</button>
              <button onClick={save} disabled={saving} style={btn('#111')}>{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </div>
        </div>
      )}

      <BlockedSlotsSection venues={venues} />
    </div>
  );
}

// ── Tab 2: 時段方案 ──────────────────────────────────────────────────────────
function PlansTab() {
  const [venues, setVenues]   = useState([]);
  const [selVenue, setSelVenue] = useState('');
  const [plans, setPlans]     = useState([]);
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/venues`).then(r => r.json()).then(v => { setVenues(v); if (v.length) setSelVenue(v[0]._id); }).catch(() => {});
  }, []);

  const loadPlans = useCallback(() => {
    if (!selVenue) return;
    authFetch(`${API_BASE}/api/venues/${selVenue}/plans`).then(r => r.json()).then(setPlans).catch(() => {});
  }, [selVenue]);
  useEffect(loadPlans, [loadPlans]);

  const emptyForm = { name: '', type: 'single', slots: [], price: '', icon: '', startHour: 0, endHour: 24, isActive: true };

  async function save() {
    if (!form.name || !form.price) return alert('請填寫方案名稱和價格');
    if (!form.slots.length) return alert('請選擇時段');
    setSaving(true);
    try {
      const method = form._id ? 'PATCH' : 'POST';
      const url = form._id
        ? `${API_BASE}/api/venues/${selVenue}/plans/${form._id}`
        : `${API_BASE}/api/venues/${selVenue}/plans`;
      await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: +form.price }) });
      setForm(null); loadPlans();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function del(planId) {
    if (!confirm('確定刪除此方案？')) return;
    await authFetch(`${API_BASE}/api/venues/${selVenue}/plans/${planId}`, { method: 'DELETE' });
    loadPlans();
  }

  function toggleSlot(key) {
    setForm(f => ({ ...f, slots: f.slots.includes(key) ? f.slots.filter(s => s !== key) : [...f.slots, key] }));
  }

  return (
    <div>
      <Field label="選擇場地">
        <select style={inputStyle} value={selVenue} onChange={e => setSelVenue(e.target.value)}>
          {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button onClick={() => setForm(emptyForm)} style={btn('#111')} disabled={!selVenue}>＋ 新增方案</button>
      </div>

      {plans.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '24px' }}>此場地尚無方案</div>}

      {plans.map(p => (
        <div key={p._id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.icon} {p.name}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{p.type === 'single' ? '單時段' : '多時段'} · {(p.slots || []).join('+') } · ${p.price}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setForm({ ...p })} style={btn('#f5f5f5', '#333')}>編輯</button>
            <button onClick={() => del(p._id)} style={btn('#ffebee', '#c62828')}>刪除</button>
          </div>
        </div>
      ))}

      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '440px', maxWidth: '100%', maxHeight: 'calc(100dvh - 20px)', overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{form._id ? '編輯方案' : '新增方案'}</div>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <Field label="方案名稱 *"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="早上 07-12" /></Field>
            <Field label="圖示（Emoji）"><input style={{ ...inputStyle, width: '80px' }} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🌅" /></Field>
            <Field label="方案類型">
              <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, slots: [] }))}>
                <option value="single">單時段</option>
                <option value="multi">多時段</option>
              </select>
            </Field>
            <Field label="包含時段">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {SLOT_OPTIONS.map(s => (
                  <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type={form.type === 'single' ? 'radio' : 'checkbox'}
                      checked={form.slots.includes(s.key)}
                      onChange={() => {
                        if (form.type === 'single') setForm(f => ({ ...f, slots: [s.key] }));
                        else toggleSlot(s.key);
                      }}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="價格 *"><input type="number" min="0" style={inputStyle} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></Field>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setForm(null)} style={btn('#f5f5f5', '#333')}>取消</button>
              <button onClick={save} disabled={saving} style={btn('#111')}>{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: 公告管理 ──────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [items, setItems]   = useState([]);
  const [form, setForm]     = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => authFetch(`${API_BASE}/api/announcements`).then(r => r.json()).then(setItems).catch(() => {});
  useEffect(load, []);

  const emptyForm = { title: '', content: '', isActive: true, expiresAt: '' };

  async function save() {
    if (!form.title) return alert('請填寫公告標題');
    setSaving(true);
    try {
      const body = { ...form, expiresAt: form.expiresAt || null };
      const method = form._id ? 'PATCH' : 'POST';
      const url = form._id ? `${API_BASE}/api/announcements/${form._id}` : `${API_BASE}/api/announcements`;
      await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setForm(null); load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('確定刪除？')) return;
    await authFetch(`${API_BASE}/api/announcements/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggleActive(a) {
    await authFetch(`${API_BASE}/api/announcements/${a._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !a.isActive }) });
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button onClick={() => setForm(emptyForm)} style={btn('#111')}>＋ 新增公告</button>
      </div>
      {items.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '24px' }}>尚無公告</div>}
      {items.map(a => (
        <div key={a._id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{a.title}</div>
            {a.content && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{a.content.slice(0, 50)}</div>}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => toggleActive(a)} style={btn(a.isActive ? '#e8f5e9' : '#fce4ec', a.isActive ? '#2e7d32' : '#c62828')}>{a.isActive ? '啟用' : '停用'}</button>
            <button onClick={() => setForm({ ...a, expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : '' })} style={btn('#f5f5f5', '#333')}>編輯</button>
            <button onClick={() => del(a._id)} style={btn('#ffebee', '#c62828')}>刪除</button>
          </div>
        </div>
      ))}

      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '440px', maxWidth: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{form._id ? '編輯公告' : '新增公告'}</div>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <Field label="標題 *"><input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></Field>
            <Field label="內容"><textarea style={textareaStyle} rows={3} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} /></Field>
            <Field label="到期日（留空表示不過期）"><input type="date" style={inputStyle} value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></Field>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setForm(null)} style={btn('#f5f5f5', '#333')}>取消</button>
              <button onClick={save} disabled={saving} style={btn('#111')}>{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: 預約列表 ──────────────────────────────────────────────────────────
const SLOT_LABELS_ADMIN = { morning: '早上', afternoon: '下午', evening: '晚上' };

function fmtDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ReservationsTab() {
  const [venues, setVenues]             = useState([]);
  const [items, setItems]               = useState([]);
  const [filterVenue, setFilterVenue]   = useState('');
  const [filterDate, setFilterDate]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [updating, setUpdating]         = useState(null);
  const [expandedId, setExpandedId]     = useState(null);

  useEffect(() => {
    authFetch(`${API_BASE}/api/venues`).then(r => r.json()).then(d => setVenues(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const loadReservations = useCallback(() => {
    const params = new URLSearchParams();
    if (filterVenue)  params.set('venue', filterVenue);
    if (filterDate)   params.set('date', filterDate);
    if (filterStatus) params.set('status', filterStatus);
    if (search)       params.set('search', search);
    params.set('page', page);
    authFetch(`${API_BASE}/api/reservations?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.items) {
          setItems(data.items);
          setTotalPages(data.pages || 1);
          setTotal(data.total || 0);
        } else {
          setItems(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {});
  }, [filterVenue, filterDate, filterStatus, search, page]);

  useEffect(loadReservations, [loadReservations]);

  function handleFilterChange(setter) {
    return (e) => { setter(e.target.value); setPage(1); };
  }

  async function updateStatus(id, status) {
    setUpdating(id);
    await authFetch(`${API_BASE}/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setUpdating(null);
    loadReservations();
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="搜尋姓名..."
          value={search} onChange={handleFilterChange(setSearch)}
          style={{ ...inputStyle, flex: '1', minWidth: '100px' }}
        />
        <select style={{ ...inputStyle, flex: '1', minWidth: '110px' }} value={filterVenue} onChange={handleFilterChange(setFilterVenue)}>
          <option value="">所有場地</option>
          {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
        <input type="date" style={{ ...inputStyle, flex: '1', minWidth: '120px' }} value={filterDate} onChange={handleFilterChange(setFilterDate)} />
        <select style={{ ...inputStyle, flex: '1', minWidth: '90px' }} value={filterStatus} onChange={handleFilterChange(setFilterStatus)}>
          <option value="">所有狀態</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {total > 0 && (
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>共 {total} 筆，第 {page}/{totalPages} 頁</div>
      )}

      {items.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '24px' }}>沒有符合的預約紀錄</div>}

      {items.map(r => {
        const dateStr = new Date(r.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
        const slotsStr = (r.slots || []).map(s => SLOT_LABELS_ADMIN[s] || s).join(' + ');
        const st = r.status;
        const isExpanded = expandedId === r._id;

        return (
          <div key={r._id} style={{ border: '1px solid #eee', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
            {/* Collapsed header — always visible */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : r._id)}
              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              {/* Avatar */}
              {r.pictureUrl ? (
                <img src={r.pictureUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0e0e0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#999' }}>
                  {(r.displayName || '?')[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.displayName || r.lineUserId}</div>
                <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.venueName} · {dateStr} · {r.planName || slotsStr}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {r.unpaidExit && (
                  <span style={{ background: '#fff3e0', color: '#e65100', padding: '3px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    未付款離場
                  </span>
                )}
                <span style={{ background: `${STATUS_COLORS[st]}22`, color: STATUS_COLORS[st], padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                  {STATUS_LABELS[st]}
                </span>
                <span style={{ color: '#bbb', fontSize: '12px' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: '0 14px 12px', borderTop: '1px solid #f5f5f5', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', margin: '10px 0', fontSize: '13px' }}>
                  <DetailRow label="費用"     value={r.totalPrice > 0 ? `$${r.totalPrice}` : '免費'} />
                  <DetailRow label="付款狀態"  value={
                    r.paymentStatus === 'paid'   ? '已付款' :
                    r.paymentStatus === 'free'   ? '免費'   :
                    r.unpaidExit               ? '未付款（已離場）' : '待付款'
                  } />
                  <DetailRow label="建立時間"  value={fmtDT(r.createdAt)} />
                  <DetailRow label="預計入場"  value={fmtDT(r.expectedCheckIn)} />
                  <DetailRow label="預計離場"  value={fmtDT(r.expectedCheckOut)} />
                  {r.note && <DetailRow label="備注" value={r.note} full />}
                  <DetailRow label="LINE ID"  value={r.lineUserId} small />
                </div>
                {st !== 'cancelled' && st !== 'completed' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {st === 'confirmed'  && <button type="button" onClick={() => updateStatus(r._id, 'checked_in')} disabled={updating === r._id} style={btn('#e3f2fd', '#1976d2')}>確認入場</button>}
                    {st === 'checked_in' && <button type="button" onClick={() => updateStatus(r._id, 'completed')}  disabled={updating === r._id} style={btn('#e8f5e9', '#2e7d32')}>完成</button>}
                    <button type="button" onClick={() => updateStatus(r._id, 'cancelled')} disabled={updating === r._id} style={btn('#ffebee', '#c62828')}>取消</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button type="button" onClick={() => setPage(p => p - 1)} disabled={page <= 1}
            style={{ padding: '5px 14px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: page <= 1 ? 'default' : 'pointer', color: page <= 1 ? '#ccc' : '#333' }}>
            ‹ 上一頁
          </button>
          <span style={{ fontSize: '13px', color: '#666' }}>第 {page} / {totalPages} 頁</span>
          <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
            style={{ padding: '5px 14px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: page >= totalPages ? 'default' : 'pointer', color: page >= totalPages ? '#ccc' : '#333' }}>
            下一頁 ›
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, full, small }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <span style={{ color: '#aaa', fontSize: small ? '11px' : '12px' }}>{label}：</span>
      <span style={{ color: '#444', fontSize: small ? '11px' : '12px', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ── Tab 5: 系統設定 ──────────────────────────────────────────────────────────
function SystemSettingsTab() {
  const [liffTitle, setLiffTitle] = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(d => { setLiffTitle(d.liffTitle || ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await authFetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liffTitle })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('儲存失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>載入中...</div>;

  return (
    <form onSubmit={handleSave}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
          LIFF 頁面標題（顯示於 LINE 瀏覽器頂部）
        </label>
        <input
          value={liffTitle}
          onChange={e => setLiffTitle(e.target.value)}
          placeholder="例：OO 運動場地預約系統"
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
        />
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
          若留空則顯示預設：「預約入場系統」
        </div>
      </div>
      <button type="submit" disabled={saving} style={{
        background: '#111', color: '#fff', border: 'none', borderRadius: '8px',
        padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
      }}>
        {saving ? '儲存中...' : '儲存設定'}
      </button>
      {saved && (
        <span style={{ marginLeft: '12px', color: '#2e7d32', fontSize: '13px' }}>
          ✓ 已儲存，重新整理 LIFF 頁面後生效
        </span>
      )}
    </form>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function LiffAdminModal({ onClose }) {
  const [tab, setTab] = useState(0);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
      <style>{`.liff-tabs::-webkit-scrollbar{display:none}`}</style>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '620px', maxWidth: '100%', maxHeight: 'calc(100dvh - 20px)', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>預約管理</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>LIFF 預約系統設定</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Tabs */}
        <div className="liff-tabs" style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
          {TABS.map((t, i) => (
            <button type="button" key={t} onClick={() => setTab(i)} style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: tab === i ? '700' : '400',
              color: tab === i ? '#111' : '#888',
              borderBottom: tab === i ? '2px solid #111' : '2px solid transparent',
              whiteSpace: 'nowrap', flexShrink: 0
            }}>{t}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', flex: 1 }}>
          {tab === 0 && <VenueTab />}
          {tab === 1 && <PlansTab />}
          {tab === 2 && <AnnouncementsTab />}
          {tab === 3 && <ReservationsTab />}
          {tab === 4 && <SystemSettingsTab />}
        </div>
      </div>
    </div>
  );
}
