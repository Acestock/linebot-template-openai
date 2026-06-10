import React, { useState, useEffect } from 'react';
import API_BASE, { authFetch } from '../config';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_CN   = ['日', '一', '二', '三', '四', '五', '六'];
const DAY_FULL = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const MONTH_CN = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const TYPE_LABEL = { event: '一般行程', blocked: '封鎖（不可預約）' };
const TYPE_COLOR = { event: '#2196F3', blocked: '#e53935' };

const DEFAULT_WH = {
  mon: { enabled: false, start: '09:00', end: '18:00' },
  tue: { enabled: false, start: '09:00', end: '18:00' },
  wed: { enabled: false, start: '09:00', end: '18:00' },
  thu: { enabled: false, start: '09:00', end: '18:00' },
  fri: { enabled: false, start: '09:00', end: '18:00' },
  sat: { enabled: false, start: '09:00', end: '18:00' },
  sun: { enabled: false, start: '09:00', end: '18:00' },
};

function toLocalDatetimeInput(date) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(date) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// ─── Event Form ───────────────────────────────────────────────────────────────
function EventForm({ initial, onSave, onCancel, saving }) {
  const now = new Date();
  const [form, setForm] = useState(initial || {
    title: '', description: '',
    startDateTime: toLocalDatetimeInput(now),
    endDateTime: toLocalDatetimeInput(new Date(now.getTime() + 60 * 60 * 1000)),
    isAllDay: false, type: 'event', color: '#2196F3',
    notifyLineUserId: '', notifyMinutesBefore: 0
  });

  useEffect(() => {
    if (initial) setForm({
      ...initial,
      startDateTime: initial.isAllDay ? toDateInput(initial.startDateTime) : toLocalDatetimeInput(initial.startDateTime),
      endDateTime:   initial.isAllDay ? toDateInput(initial.endDateTime)   : toLocalDatetimeInput(initial.endDateTime),
    });
  }, [initial]);

  const field = { width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', outline: 'none', marginTop: '3px' };

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>標題 *</label>
        <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="行程標題" style={field} />
      </div>

      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" id="allDay" checked={form.isAllDay}
          onChange={e => setForm(p => ({ ...p, isAllDay: e.target.checked }))} />
        <label htmlFor="allDay" style={{ fontSize: '13px', cursor: 'pointer' }}>全天</label>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>開始時間 *</label>
          <input type={form.isAllDay ? 'date' : 'datetime-local'} value={form.startDateTime}
            onChange={e => setForm(p => ({ ...p, startDateTime: e.target.value }))} style={field} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>結束時間 *</label>
          <input type={form.isAllDay ? 'date' : 'datetime-local'} value={form.endDateTime}
            onChange={e => setForm(p => ({ ...p, endDateTime: e.target.value }))} style={field} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>類型</label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={field}>
            <option value="event">一般行程</option>
            <option value="blocked">封鎖（不可預約）</option>
          </select>
        </div>
        <div style={{ flex: 0 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>顏色</label>
          <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            style={{ ...field, width: '52px', padding: '2px', marginTop: '3px', cursor: 'pointer' }} />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>備注</label>
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          rows={2} style={{ ...field, resize: 'vertical' }} placeholder="行程說明（選填）" />
      </div>

      <div style={{ background: '#f0f7ff', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1976D2', marginBottom: '8px' }}>📲 行前 LINE 通知</div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>通知對象 LINE User ID</label>
          <input value={form.notifyLineUserId} onChange={e => setForm(p => ({ ...p, notifyLineUserId: e.target.value }))}
            placeholder="留空則不發送通知" style={field} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>提前幾分鐘通知</label>
          <select value={form.notifyMinutesBefore} onChange={e => setForm(p => ({ ...p, notifyMinutesBefore: Number(e.target.value) }))} style={field}>
            <option value={0}>不通知</option>
            <option value={15}>15 分鐘前</option>
            <option value={30}>30 分鐘前</option>
            <option value={60}>1 小時前</option>
            <option value={120}>2 小時前</option>
            <option value={1440}>1 天前</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#666' }}>取消</button>
        <button onClick={() => onSave(form)} disabled={saving} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#2196F3', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );
}

// ─── Working Hours Tab ─────────────────────────────────────────────────────────
function WorkingHoursTab() {
  const [wh, setWh] = useState(DEFAULT_WH);
  const [apptEnabled, setApptEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/calendar/working-hours`)
      .then(r => r.json())
      .then(data => {
        if (data.workingHours && Object.keys(data.workingHours).length > 0) {
          setWh({ ...DEFAULT_WH, ...data.workingHours });
        }
        setApptEnabled(!!data.appointmentReplyEnabled);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await authFetch(`${API_BASE}/api/calendar/working-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHours: wh, appointmentReplyEnabled: apptEnabled })
      });
    } catch {}
    setSaving(false);
  }

  function toggle(day, field, value) {
    setWh(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
      {/* AI toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e8f5e9', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#2e7d32' }}>🤖 預約時間 AI 回覆</div>
          <div style={{ fontSize: '12px', color: '#66bb6a', marginTop: '2px' }}>開啟後，客戶詢問預約時 AI 會依照行事曆回覆可用時段</div>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
          <input type="checkbox" checked={apptEnabled} onChange={e => setApptEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '24px', cursor: 'pointer', transition: '0.2s',
            backgroundColor: apptEnabled ? '#4CAF50' : '#ccc'
          }}>
            <span style={{
              position: 'absolute', left: apptEnabled ? '22px' : '2px', top: '2px',
              width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
              transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }} />
          </span>
        </label>
      </div>

      {/* Weekly schedule */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#555', marginBottom: '10px' }}>每週固定上班時間</div>
      {DAY_KEYS.map((key, i) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '10px 12px', borderRadius: '8px', background: wh[key]?.enabled ? '#f0f7ff' : '#fafafa', border: `1px solid ${wh[key]?.enabled ? '#bbdefb' : '#f0f0f0'}` }}>
          <input type="checkbox" id={`wh-${key}`} checked={!!wh[key]?.enabled}
            onChange={e => toggle(key, 'enabled', e.target.checked)} />
          <label htmlFor={`wh-${key}`} style={{ width: '32px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: wh[key]?.enabled ? '#1976D2' : '#aaa' }}>
            {DAY_FULL[i === 0 ? 6 : i - 1]}
          </label>
          {wh[key]?.enabled ? (
            <>
              <input type="time" value={wh[key]?.start || '09:00'}
                onChange={e => toggle(key, 'start', e.target.value)}
                style={{ border: '1px solid #e0e0e0', borderRadius: '5px', padding: '4px 6px', fontSize: '13px', outline: 'none' }} />
              <span style={{ color: '#999', fontSize: '12px' }}>至</span>
              <input type="time" value={wh[key]?.end || '18:00'}
                onChange={e => toggle(key, 'end', e.target.value)}
                style={{ border: '1px solid #e0e0e0', borderRadius: '5px', padding: '4px 6px', fontSize: '13px', outline: 'none' }} />
            </>
          ) : (
            <span style={{ color: '#ccc', fontSize: '12px' }}>休息</span>
          )}
        </div>
      ))}

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: saving ? '#b0bec5' : '#2196F3', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
        {saving ? '儲存中...' : '儲存上班時間設定'}
      </button>
    </div>
  );
}

// ─── Main Calendar Modal ───────────────────────────────────────────────────────
function CalendarModal({ onClose }) {
  const today = new Date();
  const [activeTab, setActiveTab] = useState('calendar');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-based
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEvents(); }, [currentYear, currentMonth]);

  async function fetchEvents() {
    const start = new Date(currentYear, currentMonth, 1).toISOString();
    const end   = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
    try {
      const res = await authFetch(`${API_BASE}/api/calendar/events?start=${start}&end=${end}`);
      setEvents(await res.json());
    } catch {}
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsOnDay(day) {
    if (!day) return [];
    return events.filter(e => {
      const d = new Date(e.startDateTime);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
    });
  }

  function isToday(day) {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  }

  function handleDayClick(day) {
    if (!day) return;
    setSelectedDate(day);
    setShowForm(false);
    setEditingEvent(null);
  }

  function openNewForm() {
    const base = new Date(currentYear, currentMonth, selectedDate || today.getDate(), 9, 0);
    setEditingEvent({
      title: '', description: '',
      startDateTime: toLocalDatetimeInput(base),
      endDateTime: toLocalDatetimeInput(new Date(base.getTime() + 60 * 60 * 1000)),
      isAllDay: false, type: 'event', color: '#2196F3',
      notifyLineUserId: '', notifyMinutesBefore: 0
    });
    setShowForm(true);
  }

  async function handleSave(form) {
    if (!form.title.trim()) { alert('請填寫標題'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime:   new Date(form.endDateTime).toISOString()
      };
      if (editingEvent?._id) {
        await authFetch(`${API_BASE}/api/calendar/events/${editingEvent._id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      } else {
        await authFetch(`${API_BASE}/api/calendar/events`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      }
      await fetchEvents();
      setShowForm(false);
      setEditingEvent(null);
    } catch (err) { alert('儲存失敗：' + err.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此行程？')) return;
    try {
      await authFetch(`${API_BASE}/api/calendar/events/${id}`, { method: 'DELETE' });
      await fetchEvents();
      setShowForm(false);
    } catch {}
  }

  const selectedEvents = selectedDate ? eventsOnDay(selectedDate) : [];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: '14px', width: '680px', maxWidth: '98vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>📅 行事曆管理</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
          {[['calendar', '📅 行事曆'], ['working-hours', '🕐 上班時間設定']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px',
              borderBottom: activeTab === key ? '2px solid #2196F3' : '2px solid transparent',
              color: activeTab === key ? '#2196F3' : '#888', fontWeight: activeTab === key ? '700' : '400'
            }}>{label}</button>
          ))}
        </div>

        {activeTab === 'working-hours' ? <WorkingHoursTab /> : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Calendar grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px', overflow: 'hidden' }}>
              {/* Month navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#555', padding: '4px 8px' }}>‹</button>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>{currentYear} 年 {MONTH_CN[currentMonth]}</span>
                <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#555', padding: '4px 8px' }}>›</button>
              </div>

              {/* Weekday header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                {DAY_CN.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', fontWeight: '600', padding: '4px 0' }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', flex: 1 }}>
                {cells.map((day, i) => {
                  const dayEvents = eventsOnDay(day);
                  const isSelected = day === selectedDate;
                  return (
                    <div key={i} onClick={() => handleDayClick(day)}
                      style={{
                        minHeight: '52px', borderRadius: '6px', padding: '4px',
                        cursor: day ? 'pointer' : 'default',
                        backgroundColor: isSelected ? '#e3f2fd' : isToday(day) ? '#fff8e1' : '#fff',
                        border: isSelected ? '1.5px solid #2196F3' : isToday(day) ? '1.5px solid #FFC107' : '1px solid #f0f0f0',
                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                      }}>
                      {day && (
                        <>
                          <span style={{
                            fontSize: '12px', fontWeight: isToday(day) ? '700' : '400',
                            color: isToday(day) ? '#F57F17' : isSelected ? '#1565C0' : '#333',
                            lineHeight: 1.4
                          }}>{day}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center', marginTop: '2px' }}>
                            {dayEvents.slice(0, 3).map((e, j) => (
                              <div key={j} style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: e.color || TYPE_COLOR[e.type] }} />
                            ))}
                            {dayEvents.length > 3 && <div style={{ fontSize: '9px', color: '#aaa' }}>+{dayEvents.length - 3}</div>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side panel: selected date events or event form */}
            <div style={{ width: '240px', borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {showForm ? (
                <>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '700', color: '#333' }}>
                    {editingEvent?._id ? '編輯行程' : '新增行程'}
                  </div>
                  <EventForm initial={editingEvent} saving={saving}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditingEvent(null); }} />
                </>
              ) : (
                <>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#333' }}>
                      {selectedDate ? `${currentMonth + 1}/${selectedDate}` : '選擇日期'}
                    </span>
                    {selectedDate && (
                      <button onClick={openNewForm} style={{ background: '#2196F3', border: 'none', color: '#fff', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', padding: '3px 10px' }}>
                        + 新增
                      </button>
                    )}
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {!selectedDate && (
                      <div style={{ textAlign: 'center', color: '#ccc', marginTop: '30px', fontSize: '12px' }}>點擊日期查看行程</div>
                    )}
                    {selectedDate && selectedEvents.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#ccc', marginTop: '30px', fontSize: '12px' }}>
                        無行程<br />
                        <button onClick={openNewForm} style={{ marginTop: '8px', background: 'none', border: '1px dashed #ccc', color: '#aaa', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', padding: '4px 10px' }}>
                          + 新增行程
                        </button>
                      </div>
                    )}
                    {selectedEvents.map(e => (
                      <div key={e._id} style={{ marginBottom: '8px', borderRadius: '8px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: e.color || TYPE_COLOR[e.type], padding: '6px 10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{e.title}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)' }}>
                            {e.isAllDay ? '全天' : (
                              `${new Date(e.startDateTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} – ${new Date(e.endDateTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
                            )}
                          </div>
                        </div>
                        {(e.description || e.type === 'blocked') && (
                          <div style={{ padding: '5px 10px', backgroundColor: '#fafafa' }}>
                            {e.type === 'blocked' && <div style={{ fontSize: '10px', color: '#e53935', fontWeight: '600' }}>🚫 已封鎖（不可預約）</div>}
                            {e.description && <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{e.description}</div>}
                          </div>
                        )}
                        {e.notifyMinutesBefore > 0 && e.notifyLineUserId && (
                          <div style={{ padding: '3px 10px', backgroundColor: '#f0f7ff', fontSize: '10px', color: '#1976D2' }}>
                            🔔 提前 {e.notifyMinutesBefore >= 60 ? `${e.notifyMinutesBefore / 60}小時` : `${e.notifyMinutesBefore}分鐘`} 通知
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '4px', padding: '5px 8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setEditingEvent(e); setShowForm(true); }} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '11px', cursor: 'pointer', color: '#555' }}>編輯</button>
                          <button onClick={() => handleDelete(e._id)} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #ffcdd2', background: '#fff', fontSize: '11px', cursor: 'pointer', color: '#e53935' }}>刪除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarModal;
