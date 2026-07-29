import React, { useState, useEffect, useCallback } from 'react';
import API_BASE, { authFetch } from '../config';

const TABS = ['場地管理', '時段方案', '公告管理', '預約列表'];
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
function ReservationsTab() {
  const [venues, setVenues]   = useState([]);
  const [items, setItems]     = useState([]);
  const [filterVenue, setFilterVenue]   = useState('');
  const [filterDate, setFilterDate]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    authFetch(`${API_BASE}/api/venues`).then(r => r.json()).then(setVenues).catch(() => {});
  }, []);

  const loadReservations = useCallback(() => {
    const params = new URLSearchParams();
    if (filterVenue)  params.set('venue', filterVenue);
    if (filterDate)   params.set('date', filterDate);
    if (filterStatus) params.set('status', filterStatus);
    authFetch(`${API_BASE}/api/reservations?${params}`).then(r => r.json()).then(setItems).catch(() => {});
  }, [filterVenue, filterDate, filterStatus]);

  useEffect(loadReservations, [loadReservations]);

  async function updateStatus(id, status) {
    setUpdating(id);
    await authFetch(`${API_BASE}/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setUpdating(null);
    loadReservations();
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <select style={{ ...inputStyle, flex: '1', minWidth: '120px' }} value={filterVenue} onChange={e => setFilterVenue(e.target.value)}>
          <option value="">所有場地</option>
          {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
        <input type="date" style={{ ...inputStyle, flex: '1', minWidth: '120px' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        <select style={{ ...inputStyle, flex: '1', minWidth: '100px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">所有狀態</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {items.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '24px' }}>沒有符合的預約紀錄</div>}

      {items.map(r => {
        const dateStr = new Date(r.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
        const st = r.status;
        return (
          <div key={r._id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.displayName || r.lineUserId}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{r.venueName} · {dateStr} · {r.planName || (r.slots || []).join('+')}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>${r.totalPrice}</div>
              </div>
              <span style={{ background: `${STATUS_COLORS[st]}22`, color: STATUS_COLORS[st], padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                {STATUS_LABELS[st]}
              </span>
            </div>
            {st !== 'cancelled' && st !== 'completed' && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {st === 'confirmed'  && <button onClick={() => updateStatus(r._id, 'checked_in')} disabled={updating === r._id} style={btn('#e3f2fd', '#1976d2')}>確認入場</button>}
                {st === 'checked_in' && <button onClick={() => updateStatus(r._id, 'completed')}  disabled={updating === r._id} style={btn('#e8f5e9', '#2e7d32')}>完成</button>}
                <button onClick={() => updateStatus(r._id, 'cancelled')} disabled={updating === r._id} style={btn('#ffebee', '#c62828')}>取消</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
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
            <button key={t} onClick={() => setTab(i)} style={{
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
        </div>
      </div>
    </div>
  );
}
