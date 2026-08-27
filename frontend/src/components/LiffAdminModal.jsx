import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import API_BASE, { authFetch } from '../config';

const TABS = ['場地管理', '時段方案', '公告管理', '預約列表', '系統設定', '任務管理', '營業分析'];
const SLOT_OPTIONS = [
  { key: 'morning',   label: '早上 (07–12)' },
  { key: 'afternoon', label: '下午 (12–18)' },
  { key: 'evening',   label: '晚上 (18–02)' }
];
const SLOT_CN = { morning: '早上', afternoon: '下午', evening: '晚上' };
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
  const [buttonName, setButtonName] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [capacity, setCapacity]     = useState('');
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
        body: JSON.stringify({ venueId: selVenue, date, slots, eventName, buttonName, accessPassword, capacity: capacity === '' ? 0 : +capacity })
      });
      setDate(''); setSlots([]); setEventName(''); setButtonName(''); setAccessPassword(''); setCapacity('');
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
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '14px', color: '#333' }}>包場管理</div>

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
        <Field label="包場人數（留空或 0 = 封鎖整個時段；填數字 = 只佔用指定座位數）">
          <input
            type="number" min="0" style={{ ...inputStyle, width: '120px' }}
            value={capacity} onChange={e => setCapacity(e.target.value)}
            placeholder="留空=全包"
          />
        </Field>
        <Field label="活動名稱（選填）">
          <input style={inputStyle} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="例：VIP 包場、企業活動" />
        </Field>
        <Field label="前台按鈕文字（填入後，當天前台會出現此活動按鈕）">
          <input style={inputStyle} value={buttonName} onChange={e => setButtonName(e.target.value)} placeholder="例：讀享年會・入場" />
        </Field>
        <Field label="入場密碼（填入後，使用者需輸入密碼才能取得 QR Code）">
          <input style={inputStyle} value={accessPassword} onChange={e => setAccessPassword(e.target.value)} placeholder="例：duxiang2024" />
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
                  {b.capacity > 0 ? ` · 佔 ${b.capacity} 位` : ' · 全時段封鎖'}
                  {b.eventName ? ` · ${b.eventName}` : ''}
                  {b.buttonName ? ` · 按鈕：${b.buttonName}` : ''}
                  {b.accessPassword ? ` · 🔑 已設密碼` : ''}
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

  const emptyForm = { name: '', address: '', transportInfo: '', imageUrl: '', imageUrls: [], businessHours: '', facilities: '', rules: '', howToUse: '', color: '#2196F3', maxCapacityPerSlot: 10, isActive: true, strategy: 1, s2OpenHour: 7, s2CloseHour: 22, shortSession: { enabled: false, minHourPrice: 40, ratio1h: 0.25, ratio2h: 0.60, ratio3h: 0.80, maxCapacityBlock: 2 } };

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
            <Field label="場地圖片（可多張，輪播顯示）">
              {(form.imageUrls || []).map((url, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={url}
                    onChange={e => {
                      const urls = [...(form.imageUrls || [])];
                      urls[i] = e.target.value;
                      setForm(f => ({ ...f, imageUrls: urls }));
                    }}
                    placeholder="https://..."
                  />
                  <button
                    onClick={() => setForm(f => ({ ...f, imageUrls: (f.imageUrls || []).filter((_, j) => j !== i) }))}
                    style={{ ...btn('#ffebee', '#c62828'), padding: '8px 12px', flexShrink: 0 }}
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, imageUrls: [...(f.imageUrls || []), ''] }))}
                style={{ ...btn('#f5f5f5', '#333'), width: '100%', marginTop: '4px' }}
              >＋ 新增圖片網址</button>
            </Field>
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
            {/* Strategy selector */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#555', marginBottom: '10px' }}>預約策略</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ v: 1, label: '策略一：時段制（早午晚）' }, { v: 2, label: '策略二：自由時段制（每 30 分鐘）' }].map(o => (
                  <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', flex: 1 }}>
                    <input type="radio" name="strategy" checked={(form.strategy ?? 1) === o.v}
                      onChange={() => setForm(f => ({ ...f, strategy: o.v }))} />
                    {o.label}
                  </label>
                ))}
              </div>
              {(form.strategy ?? 1) === 2 && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                  <Field label="開館時間（整點）">
                    <input type="number" min="0" max="23" style={{ ...inputStyle, width: '80px' }}
                      value={form.s2OpenHour ?? 7}
                      onChange={e => setForm(f => ({ ...f, s2OpenHour: +e.target.value }))} />
                  </Field>
                  <Field label="閉館時間（整點，>24=次日）">
                    <input type="number" min="1" max="30" style={{ ...inputStyle, width: '80px' }}
                      value={form.s2CloseHour ?? 22}
                      onChange={e => setForm(f => ({ ...f, s2CloseHour: +e.target.value }))} />
                  </Field>
                </div>
              )}
            </div>

            {/* Short-session settings */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#555', marginBottom: '10px' }}>計時入場設定</div>
              <Field label="">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.shortSession?.enabled} onChange={e => setForm(f => ({ ...f, shortSession: { ...(f.shortSession || {}), enabled: e.target.checked } }))} />
                  啟用計時入場（立即入場改為按時計費）
                </label>
              </Field>
              {form.shortSession?.enabled && (
                <>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Field label="1hr 比例（%）">
                      <input type="number" min="1" max="100" style={{ ...inputStyle, width: '90px' }}
                        value={Math.round((form.shortSession?.ratio1h || 0.25) * 100)}
                        onChange={e => setForm(f => ({ ...f, shortSession: { ...(f.shortSession || {}), ratio1h: +e.target.value / 100 } }))} />
                    </Field>
                    <Field label="2hr 比例（%）">
                      <input type="number" min="1" max="100" style={{ ...inputStyle, width: '90px' }}
                        value={Math.round((form.shortSession?.ratio2h || 0.60) * 100)}
                        onChange={e => setForm(f => ({ ...f, shortSession: { ...(f.shortSession || {}), ratio2h: +e.target.value / 100 } }))} />
                    </Field>
                    <Field label="3hr 比例（%）">
                      <input type="number" min="1" max="100" style={{ ...inputStyle, width: '90px' }}
                        value={Math.round((form.shortSession?.ratio3h || 0.80) * 100)}
                        onChange={e => setForm(f => ({ ...f, shortSession: { ...(f.shortSession || {}), ratio3h: +e.target.value / 100 } }))} />
                    </Field>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Field label="最低 1hr 價格（$）">
                      <input type="number" min="0" style={{ ...inputStyle, width: '100px' }}
                        value={form.shortSession?.minHourPrice ?? 40}
                        onChange={e => setForm(f => ({ ...f, shortSession: { ...(f.shortSession || {}), minHourPrice: +e.target.value } }))} />
                    </Field>
                    <Field label="封鎖門檻（剩 ≤ N 位暫停計時）">
                      <input type="number" min="0" style={{ ...inputStyle, width: '80px' }}
                        value={form.shortSession?.maxCapacityBlock ?? 2}
                        onChange={e => setForm(f => ({ ...f, shortSession: { ...(f.shortSession || {}), maxCapacityBlock: +e.target.value } }))} />
                    </Field>
                  </div>
                </>
              )}
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

// ── DurationPlans section (for strategy-2 venues) ────────────────────────────
function DurationPlansSection({ venueId }) {
  const [dPlans, setDPlans] = useState([]);
  const [dForm,  setDForm]  = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    authFetch(`${API_BASE}/api/venues/${venueId}/duration-plans`).then(r => r.json()).then(setDPlans).catch(() => {});
  }, [venueId]);
  useEffect(load, [load]);

  const emptyDForm = { name: '', durationMinutes: 90, price: '', onSale: false, salePrice: '', order: 0 };

  async function dSave() {
    if (!dForm.name || dForm.price === '') return alert('請填寫方案名稱和價格');
    setSaving(true);
    try {
      const method = dForm._id ? 'PATCH' : 'POST';
      const url    = dForm._id
        ? `${API_BASE}/api/venues/${venueId}/duration-plans/${dForm._id}`
        : `${API_BASE}/api/venues/${venueId}/duration-plans`;
      await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dForm, durationMinutes: +dForm.durationMinutes, price: +dForm.price, salePrice: dForm.onSale ? +dForm.salePrice : 0 }) });
      setDForm(null); load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function dDel(planId) {
    if (!confirm('確定刪除此方案？')) return;
    await authFetch(`${API_BASE}/api/venues/${venueId}/duration-plans/${planId}`, { method: 'DELETE' });
    load();
  }

  const PRESETS = [{ v: 90, label: '90 分鐘' }, { v: 180, label: '3 小時' }, { v: 360, label: '6 小時' }, { v: 0, label: '整天' }];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#555' }}>策略二方案（時長定價）</div>
        <button onClick={() => setDForm(emptyDForm)} style={btn('#111', '#fff')}>＋ 新增</button>
      </div>
      {dPlans.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '16px', fontSize: '13px' }}>尚無方案</div>}
      {dPlans.map(p => (
        <div key={p._id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.name}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {p.durationMinutes === 0 ? '整天' : `${p.durationMinutes} 分鐘`} · ${p.price}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setDForm({ ...p, price: String(p.price) })} style={btn('#f5f5f5', '#333')}>編輯</button>
            <button onClick={() => dDel(p._id)} style={btn('#ffebee', '#c62828')}>刪除</button>
          </div>
        </div>
      ))}
      {dForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '380px', maxWidth: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{dForm._id ? '編輯' : '新增'}時長方案</div>
              <button onClick={() => setDForm(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <Field label="方案名稱 *"><input style={inputStyle} value={dForm.name} onChange={e => setDForm(f => ({ ...f, name: e.target.value }))} placeholder="90 分鐘 / 3 小時 / 整天" /></Field>
            <Field label="使用時長（分鐘，0 = 整天至閉館）">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {PRESETS.map(p => (
                  <button key={p.v} onClick={() => setDForm(f => ({ ...f, durationMinutes: p.v }))}
                    style={{ ...btn(dForm.durationMinutes === p.v ? '#111' : '#f0f0f0', dForm.durationMinutes === p.v ? '#fff' : '#555'), padding: '6px 12px' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <input type="number" min="0" style={{ ...inputStyle, width: '120px' }}
                value={dForm.durationMinutes} onChange={e => setDForm(f => ({ ...f, durationMinutes: +e.target.value }))} />
            </Field>
            <Field label="原價 *"><input type="number" min="0" style={inputStyle} value={dForm.price} onChange={e => setDForm(f => ({ ...f, price: e.target.value }))} /></Field>
            <Field label="特價設定">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: dForm.onSale ? '8px' : 0 }}>
                <input type="checkbox" checked={!!dForm.onSale} onChange={e => setDForm(f => ({ ...f, onSale: e.target.checked }))} />
                開啟特價
              </label>
              {dForm.onSale && (
                <input type="number" min="0" style={inputStyle} placeholder="特價金額" value={dForm.salePrice} onChange={e => setDForm(f => ({ ...f, salePrice: e.target.value }))} />
              )}
            </Field>
            <Field label="排序（數字越小越前）"><input type="number" style={{ ...inputStyle, width: '80px' }} value={dForm.order} onChange={e => setDForm(f => ({ ...f, order: +e.target.value }))} /></Field>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button onClick={() => setDForm(null)} style={btn('#f5f5f5', '#333')}>取消</button>
              <button onClick={dSave} disabled={saving} style={btn('#111')}>{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: 時段方案 ──────────────────────────────────────────────────────────
function PlansTab() {
  const [venues,   setVenues]   = useState([]);
  const [selVenue, setSelVenue] = useState('');
  const [plans,    setPlans]    = useState([]);
  const [form,     setForm]     = useState(null);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/venues`).then(r => r.json()).then(v => { setVenues(v); if (v.length) setSelVenue(v[0]._id); }).catch(() => {});
  }, []);

  const loadPlans = useCallback(() => {
    if (!selVenue) return;
    authFetch(`${API_BASE}/api/venues/${selVenue}/plans`).then(r => r.json()).then(setPlans).catch(() => {});
  }, [selVenue]);
  useEffect(loadPlans, [loadPlans]);

  const emptyForm = { name: '', type: 'single', slots: [], price: '', onSale: false, salePrice: '', icon: '', startHour: 0, endHour: 24, isActive: true };

  async function save() {
    if (!form.name || !form.price) return alert('請填寫方案名稱和價格');
    if (!form.slots.length) return alert('請選擇時段');
    setSaving(true);
    try {
      const method = form._id ? 'PATCH' : 'POST';
      const url = form._id
        ? `${API_BASE}/api/venues/${selVenue}/plans/${form._id}`
        : `${API_BASE}/api/venues/${selVenue}/plans`;
      await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: +form.price, salePrice: form.onSale ? +form.salePrice : 0 }) });
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

  const selVenueObj = venues.find(v => v._id === selVenue);
  const isS2 = (selVenueObj?.strategy ?? 1) === 2;

  return (
    <div>
      <Field label="選擇場地">
        <select style={inputStyle} value={selVenue} onChange={e => setSelVenue(e.target.value)}>
          {venues.map(v => <option key={v._id} value={v._id}>{v.name}（策略{v.strategy ?? 1}）</option>)}
        </select>
      </Field>

      {/* Strategy 2: show DurationPlans section */}
      {isS2 && selVenue && (
        <DurationPlansSection venueId={selVenue} />
      )}

      {/* Strategy 1: show legacy VenuePlans */}
      {!isS2 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={() => setForm(emptyForm)} style={btn('#111')} disabled={!selVenue}>＋ 新增方案</button>
          </div>
          {plans.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '24px' }}>此場地尚無方案</div>}
        </>
      )}

      {!isS2 && plans.map(p => (
        <div key={p._id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.icon} {p.name}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{p.type === 'single' ? '單時段' : '多時段'} · {(p.slots || []).map(s => SLOT_CN[s] || s).join('+')} · ${p.price}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setForm({ ...p })} style={btn('#f5f5f5', '#333')}>編輯</button>
            <button onClick={() => del(p._id)} style={btn('#ffebee', '#c62828')}>刪除</button>
          </div>
        </div>
      ))}

      {!isS2 && form && (
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
            <Field label="原價 *"><input type="number" min="0" style={inputStyle} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></Field>
            <Field label="特價設定">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: form.onSale ? '8px' : 0 }}>
                <input type="checkbox" checked={!!form.onSale} onChange={e => setForm(f => ({ ...f, onSale: e.target.checked }))} />
                開啟特價
              </label>
              {form.onSale && (
                <input type="number" min="0" style={inputStyle} placeholder="特價金額" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} />
              )}
            </Field>
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

  async function clearUnpaidExit(id) {
    setUpdating(id);
    await authFetch(`${API_BASE}/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unpaidExit: false })
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
                {r.unpaidExit && r.paymentStatus !== 'paid' && (
                  <span style={{ background: '#ffebee', color: '#c62828', padding: '3px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    未成功結帳
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
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {st !== 'cancelled' && st !== 'completed' && (
                    <>
                      {st === 'confirmed'  && <button type="button" onClick={() => updateStatus(r._id, 'checked_in')} disabled={updating === r._id} style={btn('#e3f2fd', '#1976d2')}>確認入場</button>}
                      {st === 'checked_in' && <button type="button" onClick={() => updateStatus(r._id, 'completed')}  disabled={updating === r._id} style={btn('#e8f5e9', '#2e7d32')}>完成</button>}
                      <button type="button" onClick={() => updateStatus(r._id, 'cancelled')} disabled={updating === r._id} style={btn('#ffebee', '#c62828')}>取消</button>
                    </>
                  )}
                  {r.unpaidExit && r.paymentStatus !== 'paid' && (
                    <button type="button" onClick={() => clearUnpaidExit(r._id)} disabled={updating === r._id} style={btn('#f3e5f5', '#7b1fa2')}>清除未結帳標記</button>
                  )}
                </div>
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
  const [liffTitle,      setLiffTitle]      = useState('');
  const [brandColor,     setBrandColor]     = useState('#C9A882');
  const [brandTextColor, setBrandTextColor] = useState('#3E2723');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(d => {
        setLiffTitle(d.liffTitle || '');
        setBrandColor(d.brandColor || '#C9A882');
        setBrandTextColor(d.brandTextColor || '#3E2723');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await authFetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liffTitle, brandColor, brandTextColor })
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

  const previewStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
    background: brandColor, color: brandTextColor, marginTop: '8px'
  };

  return (
    <form onSubmit={handleSave}>
      {/* LIFF title */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
          LIFF 頁面標題（顯示於 LINE 瀏覽器頂部）
        </label>
        <input
          value={liffTitle}
          onChange={e => setLiffTitle(e.target.value)}
          placeholder="例：讀享・預約入場系統"
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
        />
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>若留空則顯示預設：「預約入場系統」</div>
      </div>

      {/* Brand color */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
          主題按鈕顏色（奶茶色等）
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="color"
            value={brandColor}
            onChange={e => setBrandColor(e.target.value)}
            style={{ width: '48px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
          />
          <input
            value={brandColor}
            onChange={e => setBrandColor(e.target.value)}
            placeholder="#C9A882"
            style={{ flex: 1, boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace' }}
          />
        </div>
      </div>

      {/* Brand text color */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
          按鈕文字顏色（深咖啡色等）
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="color"
            value={brandTextColor}
            onChange={e => setBrandTextColor(e.target.value)}
            style={{ width: '48px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
          />
          <input
            value={brandTextColor}
            onChange={e => setBrandTextColor(e.target.value)}
            placeholder="#3E2723"
            style={{ flex: 1, boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace' }}
          />
        </div>
        {/* Live preview */}
        <div>
          <span style={previewStyle}>預約入場</span>
          <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '12px' }}>即時預覽</span>
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

// ── Tab 7: 營業額分析 ─────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: 'week',  label: '本週' },
  { key: 'month', label: '本月' },
  { key: 'year',  label: '本年' }
];

function RevenueBarChart({ rows, period }) {
  if (!rows || rows.length === 0) {
    return <div style={{ textAlign: 'center', color: '#aaa', padding: '40px 0', fontSize: '13px' }}>尚無收入紀錄</div>;
  }

  const maxRevenue = Math.max(...rows.map(r => r.revenue), 1);
  const chartH = 120, barArea = 80, padTop = 10, padBot = 30;
  const count = rows.length;
  const vbW = Math.max(count * 28, 300);
  const barW = Math.max(Math.min(vbW / count * 0.55, 22), 6);
  const gap   = vbW / count;

  function fmtLabel(p) {
    if (period === 'year') {
      const [, m] = p.split('-');
      return ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'][parseInt(m, 10) - 1] || p;
    }
    const d = new Date(p + 'T00:00:00');
    if (period === 'week') return ['日','一','二','三','四','五','六'][d.getDay()];
    return String(d.getDate());
  }

  return (
    <svg viewBox={`0 0 ${vbW} ${chartH}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {rows.map((r, i) => {
        const barH = r.revenue > 0 ? Math.max((r.revenue / maxRevenue) * barArea, 3) : 0;
        const x    = i * gap + gap / 2;
        const y    = padTop + barArea - barH;
        return (
          <g key={r.period}>
            {r.revenue > 0 && (
              <text x={x} y={y - 3} textAnchor="middle" fontSize="8" fill="#888">
                ${r.revenue >= 1000 ? (r.revenue / 1000).toFixed(1) + 'k' : r.revenue}
              </text>
            )}
            <rect x={x - barW / 2} y={y} width={barW} height={barH} rx="3" fill="#C9A882" opacity="0.85" />
            <text x={x} y={padTop + barArea + padBot - 16} textAnchor="middle" fontSize="9" fill="#999">
              {fmtLabel(r.period)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AnalyticsTab() {
  const [period,  setPeriod]  = useState('month');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [metric,  setMetric]  = useState('revenue'); // 'revenue' | 'visitors'

  const load = useCallback(() => {
    setLoading(true);
    authFetch(`${API_BASE}/api/analytics?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);
  useEffect(load, [load]);

  const fmtMoney = n => `$${Number(n).toLocaleString()}`;

  function periodLabel(p, period) {
    if (period === 'year') {
      const [, m] = p.split('-');
      return `${parseInt(m, 10)} 月`;
    }
    const d = new Date(p + 'T00:00:00');
    const day = ['日','一','二','三','四','五','六'][d.getDay()];
    if (period === 'week') return `${p.slice(5)} (${day})`;
    return p.slice(5).replace('-', '/') + ` (${day})`;
  }

  const chartRows = data?.rows?.map(r => ({
    ...r,
    value: metric === 'revenue' ? r.revenue : r.visitors
  })) || [];

  const maxChartVal = Math.max(...chartRows.map(r => r.value), 1);

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {PERIOD_OPTIONS.map(o => (
          <button
            key={o.key}
            onClick={() => setPeriod(o.key)}
            style={{
              padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '13px',
              background: period === o.key ? '#111' : '#f0f0f0',
              color:      period === o.key ? '#fff' : '#555'
            }}
          >{o.label}</button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#888' }}>重整</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>載入中...</div>}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: '總營業額', value: fmtMoney(data.summary.totalRevenue), sub: `${data.summary.totalPaidCount} 筆付款`, color: '#1b5e20', bg: '#e8f5e9' },
              { label: '總入場人次', value: `${data.summary.totalVisitors} 人`, sub: '已入場 + 已完成', color: '#1565c0', bg: '#e3f2fd' },
              { label: '客單價', value: data.summary.totalVisitors > 0 ? fmtMoney(data.summary.avgRevenuePerVisitor) : '—', sub: '平均每人次', color: '#6a1b9a', bg: '#f3e5f5' }
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: c.color, fontWeight: '600', marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: c.color }}>{c.value}</div>
                <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Metric toggle */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>圖表</span>
            {[{ key: 'revenue', label: '營業額' }, { key: 'visitors', label: '人次' }].map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)} style={{
                padding: '4px 12px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600',
                background: metric === m.key ? '#C9A882' : '#f0f0f0',
                color:      metric === m.key ? '#fff' : '#777'
              }}>{m.label}</button>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px 8px 4px', marginBottom: '16px', overflowX: 'auto' }}>
            <div style={{ minWidth: `${Math.max(chartRows.length * 28, 300)}px` }}>
              {metric === 'revenue'
                ? <RevenueBarChart rows={data.rows} period={period} />
                : (
                  <svg viewBox={`0 0 ${Math.max(chartRows.length * 28, 300)} 120`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
                    {chartRows.map((r, i) => {
                      const vbW = Math.max(chartRows.length * 28, 300);
                      const gap = vbW / chartRows.length;
                      const barW = Math.max(Math.min(gap * 0.55, 22), 6);
                      const barH = r.value > 0 ? Math.max((r.value / maxChartVal) * 80, 3) : 0;
                      const x = i * gap + gap / 2;
                      const y = 90 - barH;
                      return (
                        <g key={r.period}>
                          {r.value > 0 && <text x={x} y={y - 3} textAnchor="middle" fontSize="8" fill="#888">{r.value}</text>}
                          <rect x={x - barW / 2} y={y} width={barW} height={barH} rx="3" fill="#1565c0" opacity="0.75" />
                          <text x={x} y={104} textAnchor="middle" fontSize="9" fill="#999">
                            {period === 'year'
                              ? `${parseInt(r.period.split('-')[1], 10)}月`
                              : period === 'week'
                                ? ['日','一','二','三','四','五','六'][new Date(r.period + 'T00:00:00').getDay()]
                                : String(new Date(r.period + 'T00:00:00').getDate())}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )
              }
            </div>
          </div>

          {/* Venue breakdown */}
          {data.byVenue.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>各場地收入</div>
              <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden' }}>
                {data.byVenue.map((v, i) => (
                  <div key={v.venueName} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 14px',
                    borderBottom: i < data.byVenue.length - 1 ? '1px solid #f5f5f5' : 'none',
                    background: i % 2 === 0 ? '#fff' : '#fafafa'
                  }}>
                    <span style={{ fontSize: '13px', color: '#333' }}>{v.venueName}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#1b5e20' }}>{fmtMoney(v.revenue)}</span>
                      <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '8px' }}>{v.count} 筆</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detail table */}
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>
              {period === 'year' ? '月別明細' : '日別明細'}
            </div>
            {data.rows.length === 0
              ? <div style={{ textAlign: 'center', color: '#aaa', padding: '16px', fontSize: '13px' }}>本期無資料</div>
              : (
                <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '8px 14px', background: '#fafafa', borderBottom: '1px solid #eee' }}>
                    {['日期', '營業額', '入場人次', '付款筆數'].map(h => (
                      <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: '#888' }}>{h}</div>
                    ))}
                  </div>
                  {[...data.rows].reverse().map((r, i) => (
                    <div key={r.period} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      padding: '9px 14px',
                      borderBottom: i < data.rows.length - 1 ? '1px solid #f5f5f5' : 'none',
                      background: i % 2 === 0 ? '#fff' : '#fafafa'
                    }}>
                      <div style={{ fontSize: '12px', color: '#444' }}>{periodLabel(r.period, period)}</div>
                      <div style={{ fontSize: '13px', fontWeight: r.revenue > 0 ? '700' : '400', color: r.revenue > 0 ? '#1b5e20' : '#ccc' }}>
                        {r.revenue > 0 ? fmtMoney(r.revenue) : '—'}
                      </div>
                      <div style={{ fontSize: '13px', color: r.visitors > 0 ? '#333' : '#ccc' }}>
                        {r.visitors > 0 ? `${r.visitors} 人` : '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: r.paidCount > 0 ? '#555' : '#ccc' }}>
                        {r.paidCount > 0 ? `${r.paidCount} 筆` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </>
      )}
    </div>
  );
}

// ── Staff Door Modal ──────────────────────────────────────────────────────────
function StaffDoorModal({ onClose }) {
  const [venues,    setVenues]    = useState([]);
  const [venueId,   setVenueId]   = useState('');
  const [qrImg,     setQrImg]     = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [secsLeft,  setSecsLeft]  = useState(0);
  const [loading,   setLoading]   = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    authFetch(`${API_BASE}/api/venues`).then(r => r.json())
      .then(vs => { setVenues(vs); if (vs.length) setVenueId(vs[0]._id); })
      .catch(() => {});
  }, []);

  // countdown
  useEffect(() => {
    if (!expiresAt) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const s = Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000));
      setSecsLeft(s);
      if (s === 0) clearInterval(timerRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [expiresAt]);

  async function generate() {
    if (!venueId) return alert('請選擇場地');
    setLoading(true);
    setQrImg('');
    setExpiresAt(null);
    try {
      const venue = venues.find(v => v._id === venueId);
      const res   = await authFetch(`${API_BASE}/api/staff-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId, venueName: venue?.name || '' })
      });
      const data = await res.json();
      const img  = await QRCode.toDataURL(data.token, { width: 240, margin: 2, color: { dark: '#111', light: '#fff' } });
      setQrImg(img);
      setExpiresAt(data.expiresAt);
      setSecsLeft(Math.round((new Date(data.expiresAt) - Date.now()) / 1000));
    } catch (e) {
      alert('產生失敗：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const venueName = venues.find(v => v._id === venueId)?.name || '';
  const expired   = secsLeft === 0 && !!expiresAt;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '340px', maxWidth: '100%', padding: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontWeight: '800', fontSize: '16px' }}>員工開門 QR</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Venue selector */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>選擇場地</label>
          <select
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '15px' }}
            value={venueId} onChange={e => setVenueId(e.target.value)}
          >
            {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#111', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginBottom: '20px' }}
        >
          {loading ? '產生中...' : expired ? '🔄 重新產生 QR' : qrImg ? '🔄 重新產生' : '🚪 產生開門 QR'}
        </button>

        {/* QR display */}
        {qrImg && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              {venueName}・工作人員專用
            </div>
            <div style={{
              display: 'inline-block', padding: '12px', borderRadius: '12px',
              border: expired ? '3px solid #ffcdd2' : '3px solid #c8e6c9',
              opacity: expired ? 0.4 : 1, transition: 'opacity 0.3s'
            }}>
              <img src={qrImg} alt="Staff QR" style={{ width: '200px', height: '200px', display: 'block' }} />
            </div>

            {/* Countdown */}
            <div style={{ marginTop: '12px' }}>
              {expired ? (
                <div style={{ fontSize: '13px', color: '#e53935', fontWeight: '700' }}>⚠ QR 已過期，請重新產生</div>
              ) : (
                <div style={{ fontSize: '22px', fontWeight: '800', color: secsLeft <= 60 ? '#e53935' : '#2e7d32', fontVariantNumeric: 'tabular-nums' }}>
                  {mm}:{ss}
                  <span style={{ fontSize: '12px', fontWeight: '400', color: '#aaa', marginLeft: '6px' }}>剩餘有效時間</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '8px' }}>
              閘門掃描此 QR 即可開門・5 分鐘內有效
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tasks Admin Tab ───────────────────────────────────────────────────────────
function TasksAdminTab() {
  const [venues, setVenues]         = useState([]);
  const [tasks, setTasks]           = useState([]);
  const [expandedSubs, setExpandedSubs] = useState(null); // taskId being reviewed
  const [submissions, setSubmissions]   = useState([]);
  const [subsLoading, setSubsLoading]   = useState(false);
  const [form, setForm] = useState({ venueId: '', title: '', description: '', rewardAmount: '', expiresAt: '' });
  const [creating, setCreating]     = useState(false);
  const [lightbox, setLightbox]     = useState(null); // base64 image URL for full-view

  useEffect(() => {
    authFetch(`${API_BASE}/api/venues`)
      .then(r => r.json()).then(d => setVenues(Array.isArray(d) ? d : [])).catch(() => {});
    loadTasks();
  }, []);

  async function loadTasks() {
    const data = await authFetch(`${API_BASE}/api/tasks`).then(r => r.json()).catch(() => []);
    setTasks(Array.isArray(data) ? data : []);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.venueId || !form.title || !form.rewardAmount) {
      alert('請填寫場地、任務名稱與獎勵金額'); return;
    }
    setCreating(true);
    try {
      const body = {
        venueId: form.venueId,
        title: form.title,
        description: form.description,
        rewardAmount: Number(form.rewardAmount),
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {})
      };
      const res = await authFetch(`${API_BASE}/api/tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '建立失敗');
      alert(`任務已建立，已廣播給 ${data.broadcastCount} 位在場用戶`);
      setForm({ venueId: '', title: '', description: '', rewardAmount: '', expiresAt: '' });
      loadTasks();
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  }

  async function handleCloseTask(id) {
    if (!confirm('確定關閉此任務？')) return;
    await authFetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'closed' })
    });
    loadTasks();
  }

  async function handleViewSubmissions(taskId) {
    if (expandedSubs === taskId) { setExpandedSubs(null); return; }
    setExpandedSubs(taskId);
    setSubsLoading(true);
    try {
      const data = await authFetch(`${API_BASE}/api/tasks/${taskId}/submissions`).then(r => r.json());
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (_) { setSubmissions([]); }
    finally { setSubsLoading(false); }
  }

  async function handleReview(taskId, subId, status) {
    const adminNote = status === 'rejected' ? (prompt('輸入拒絕原因（選填）') || '') : '';
    await authFetch(`${API_BASE}/api/tasks/${taskId}/submissions/${subId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote })
    });
    // Refresh submissions
    const data = await authFetch(`${API_BASE}/api/tasks/${taskId}/submissions`).then(r => r.json()).catch(() => []);
    setSubmissions(Array.isArray(data) ? data : []);
  }

  const sectionStyle = { background: '#f8f8f8', borderRadius: '10px', padding: '16px', marginBottom: '20px' };
  const labelStyle   = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px' };
  const inputStyle   = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '13px', marginBottom: '10px' };

  const STATUS_BADGE = {
    pending:  { label: '待審核', color: '#e65100', bg: '#fff3e0' },
    approved: { label: '已核准', color: '#2e7d32', bg: '#e8f5e9' },
    rejected: { label: '已拒絕', color: '#c62828', bg: '#ffebee' }
  };
  const TASK_STATUS_BADGE = {
    open:      { label: '進行中', color: '#1976d2', bg: '#e3f2fd' },
    closed:    { label: '已關閉', color: '#555',    bg: '#f5f5f5' },
    cancelled: { label: '已取消', color: '#c62828', bg: '#ffebee' }
  };

  return (
    <div>
      {/* Create task form */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>建立限時任務</div>
        <form onSubmit={handleCreate}>
          <label style={labelStyle}>場地 *</label>
          <select value={form.venueId} onChange={e => setForm(f => ({ ...f, venueId: e.target.value }))} style={inputStyle}>
            <option value="">請選擇場地</option>
            {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>

          <label style={labelStyle}>任務名稱 *</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例：協助掃地、補換咖啡包" style={inputStyle} />

          <label style={labelStyle}>任務說明</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="任務詳細說明（選填）" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />

          <label style={labelStyle}>獎勵金額（元）*</label>
          <input type="number" min="1" value={form.rewardAmount} onChange={e => setForm(f => ({ ...f, rewardAmount: e.target.value }))} placeholder="例：100" style={inputStyle} />

          <label style={labelStyle}>截止時間（選填）</label>
          <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} style={inputStyle} />

          <button type="submit" disabled={creating} style={{ background: creating ? '#ccc' : '#E67E22', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', cursor: creating ? 'not-allowed' : 'pointer' }}>
            {creating ? '建立中...' : '🎯 建立並廣播'}
          </button>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>建立後將立即發送 LINE 通知給目前在場中的用戶</div>
        </form>
      </div>

      {/* Task list */}
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>任務清單</div>
      {tasks.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: '30px', fontSize: '13px' }}>尚無任務</div>
      ) : tasks.map(task => {
        const tb = TASK_STATUS_BADGE[task.status] || TASK_STATUS_BADGE.open;
        return (
          <div key={task._id} style={{ border: '1px solid #eee', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{task.title}</span>
                  <span style={{ background: tb.bg, color: tb.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>{tb.label}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>{task.venueName} · 獎勵 ${task.rewardAmount}</div>
                {task.expiresAt && <div style={{ fontSize: '11px', color: '#e65100', marginTop: '2px' }}>截止：{new Date(task.expiresAt).toLocaleString('zh-TW')}</div>}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button type="button" onClick={() => handleViewSubmissions(task._id)}
                  style={{ fontSize: '12px', padding: '5px 10px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#444' }}>
                  {expandedSubs === task._id ? '收起' : '查看提交'}
                </button>
                {task.status === 'open' && (
                  <button type="button" onClick={() => handleCloseTask(task._id)}
                    style={{ fontSize: '12px', padding: '5px 10px', border: 'none', borderRadius: '6px', background: '#f5f5f5', cursor: 'pointer', color: '#666' }}>
                    關閉
                  </button>
                )}
              </div>
            </div>

            {/* Submissions expanded */}
            {expandedSubs === task._id && (
              <div style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa', padding: '12px 14px' }}>
                {subsLoading ? (
                  <div style={{ textAlign: 'center', color: '#aaa', padding: '16px' }}>載入中...</div>
                ) : submissions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#aaa', padding: '16px', fontSize: '13px' }}>尚無提交</div>
                ) : submissions.map(sub => {
                  const sb = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
                  return (
                    <div key={sub._id} style={{ background: '#fff', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{sub.displayName || '（用戶）'}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{new Date(sub.createdAt).toLocaleString('zh-TW')}</div>
                          {sub.note && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>備注：{sub.note}</div>}
                          {sub.adminNote && <div style={{ fontSize: '12px', color: '#e65100', marginTop: '2px' }}>管理員說明：{sub.adminNote}</div>}
                        </div>
                        <span style={{ background: sb.bg, color: sb.color, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>{sb.label}</span>
                      </div>
                      {sub.photoBase64 && (
                        <img
                          src={sub.photoBase64}
                          alt="任務照片"
                          onClick={() => setLightbox(sub.photoBase64)}
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', marginBottom: '8px' }}
                        />
                      )}
                      {sub.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" onClick={() => handleReview(task._id, sub._id, 'approved')}
                            style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '6px', background: '#2e7d32', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            ✓ 核准
                          </button>
                          <button type="button" onClick={() => handleReview(task._id, sub._id, 'rejected')}
                            style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '6px', background: '#c62828', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            ✕ 拒絕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Lightbox for full photo */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={lightbox} alt="任務照片" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function LiffAdminModal({ onClose }) {
  const [tab, setTab] = useState(0);
  const [staffDoorOpen, setStaffDoorOpen] = useState(false);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setStaffDoorOpen(true)}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #333', background: '#111', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >🚪 開門</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
          </div>
        </div>

        {staffDoorOpen && <StaffDoorModal onClose={() => setStaffDoorOpen(false)} />}

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
          {tab === 5 && <TasksAdminTab />}
          {tab === 6 && <AnalyticsTab />}
        </div>
      </div>
    </div>
  );
}
