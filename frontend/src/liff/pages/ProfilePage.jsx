import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { fetchMyReservations as _fetchMyReservations, cancelReservation, fetchReservationQr, checkoutReservation, initiatePayment, submitEcpayForm } from '../api';

const STATUS_MAP = {
  confirmed:  { label: '已確認', color: '#1976d2', bg: '#e3f2fd' },
  checked_in: { label: '進場中', color: '#2e7d32', bg: '#e8f5e9' },
  completed:  { label: '已完成', color: '#555',    bg: '#f5f5f5' },
  cancelled:  { label: '已取消', color: '#c62828', bg: '#ffebee' }
};

const SLOT_LABELS = { morning: '早上', afternoon: '下午', evening: '晚上' };

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
  });
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: '#222', fontWeight: '500', maxWidth: '65%', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ── Booking detail view (shared between tabs, readOnly hides action buttons) ───
function DetailView({ r, onBack, onCancelled, onCompleted, readOnly }) {
  const [cancelling, setCancelling]     = useState(false);
  const [checkingOut, setCheckingOut]   = useState(false);
  const [paying, setPaying]             = useState(false);
  const [qrImg, setQrImg]               = useState('');
  const [qrLoading, setQrLoading]       = useState(false);
  const [qrValidUntil, setQrValidUntil] = useState(null);
  const [localStatus, setLocalStatus]   = useState(r.status);
  const [localPayStatus, setLocalPayStatus] = useState(r.paymentStatus || 'unpaid');
  const canQr = !readOnly && (localStatus === 'confirmed' || localStatus === 'checked_in');
  const needsPayment = !readOnly && localStatus === 'checked_in' && r.totalPrice > 0 && localPayStatus !== 'paid';

  async function handleShowQr() {
    setQrLoading(true);
    try {
      const data = await fetchReservationQr(r._id);
      setQrValidUntil(data.validUntil);
      const img = await QRCode.toDataURL(data.qrToken, { width: 220, margin: 2 });
      setQrImg(img);
    } catch (e) { alert(e.message); }
    finally { setQrLoading(false); }
  }

  async function handleCancel() {
    if (!confirm('確定要取消此預約嗎？')) return;
    setCancelling(true);
    try {
      await cancelReservation(r._id);
      setLocalStatus('cancelled');
      onCancelled?.(r._id);
    } catch (e) { alert(e.message); }
    finally { setCancelling(false); }
  }

  async function handleCheckout() {
    if (needsPayment) {
      alert('請先完成付款才能出場');
      return;
    }
    if (!confirm('確認完成使用並出場？出場後此時段容量將自動釋放。')) return;
    setCheckingOut(true);
    try {
      await checkoutReservation(r._id);
      setLocalStatus('completed');
      onCompleted?.(r._id);
    } catch (e) { alert(e.message); }
    finally { setCheckingOut(false); }
  }

  async function handlePay() {
    if (!confirm('確認前往付款？將跳轉至綠界付款頁面。')) return;
    setPaying(true);
    try {
      const data = await initiatePayment(r._id);
      if (data.skip) {
        // Free reservation — already checked out on backend
        setLocalStatus('completed');
        setLocalPayStatus('free');
        onCompleted?.(r._id);
        return;
      }
      // Submit form to ECPay (redirects browser)
      const { form: { action, fields } } = data;
      submitEcpayForm(action, fields);
    } catch (e) {
      alert(e.message);
      setPaying(false);
    }
  }

  const st = STATUS_MAP[localStatus] || STATUS_MAP.confirmed;
  const slotsStr = (r.slots || []).map(s => SLOT_LABELS[s] || s).join(' + ');

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px', color: '#444' }}>
          ← 返回
        </button>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>預約詳情</div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>{r.venueName}</div>
          <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
            {st.label}
          </span>
        </div>
        <InfoRow label="日期"     value={fmtDate(r.date)} />
        <InfoRow label="時段"     value={slotsStr || '—'} />
        {r.planName && <InfoRow label="方案" value={r.planName} />}
        {r.totalPrice > 0 && <InfoRow label="費用" value={`$${r.totalPrice}`} />}
        <InfoRow label="預計入場" value={fmt(r.expectedCheckIn)} />
        <InfoRow label="預計離場" value={fmt(r.expectedCheckOut)} />
        {r.note && <InfoRow label="備注"  value={r.note} />}
      </div>

      {/* QR section */}
      {localStatus === 'cancelled' ? (
        <div style={{ background: '#ffebee', borderRadius: '10px', padding: '16px', textAlign: 'center', color: '#c62828', fontSize: '14px' }}>
          此預約已取消，無法顯示 QR Code
        </div>
      ) : canQr ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          {qrImg ? (
            <>
              <img src={qrImg} alt="QR Code" style={{ width: '220px', height: '220px' }} />
              {qrValidUntil && r.expectedCheckIn && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', lineHeight: '1.6' }}>
                  入場有效時間<br />
                  <span style={{ color: '#444', fontWeight: '600' }}>
                    {new Date(new Date(r.expectedCheckIn).getTime() - 10 * 60 * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    {' ～ '}
                    {new Date(qrValidUntil).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </>
          ) : (
            <button type="button" onClick={handleShowQr} disabled={qrLoading}
              style={{ background: '#00b900', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              {qrLoading ? '產生中...' : localStatus === 'checked_in' ? '顯示 QR（離場 / 再入場）' : '顯示入場 QR'}
            </button>
          )}
        </div>
      ) : null}

      {/* Payment button — shown when checked_in + has charge + not yet paid */}
      {needsPayment && (
        <button type="button" onClick={handlePay} disabled={paying}
          style={{ width: '100%', marginTop: '16px', padding: '14px', border: 'none', borderRadius: '10px', background: paying ? '#ccc' : '#e65100', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: paying ? 'not-allowed' : 'pointer' }}>
          {paying ? '跳轉付款中...' : `付款並出場（$${r.totalPrice}）`}
        </button>
      )}

      {/* Checkout button — only show for free reservations or after payment */}
      {!readOnly && localStatus === 'checked_in' && !needsPayment && (
        <button type="button" onClick={handleCheckout} disabled={checkingOut}
          style={{ width: '100%', marginTop: '16px', padding: '13px', border: 'none', borderRadius: '10px', background: '#e53935', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
          {checkingOut ? '處理中...' : '確認出場（結束使用）'}
        </button>
      )}

      {!readOnly && localStatus === 'confirmed' && (
        <button type="button" onClick={handleCancel} disabled={cancelling}
          style={{ width: '100%', marginTop: '16px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '10px', background: '#fff', fontSize: '14px', color: '#666', cursor: 'pointer' }}>
          {cancelling ? '取消中...' : '取消此預約'}
        </button>
      )}
    </div>
  );
}

// ── Booking list card ─────────────────────────────────────────────────────────
function BookingCard({ r, onClick }) {
  const st = STATUS_MAP[r.status] || STATUS_MAP.confirmed;
  const dateStr = new Date(r.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
  const slotsStr = (r.slots || []).map(s => SLOT_LABELS[s] || s).join(' + ');
  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', boxShadow: '0 1px 5px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: '700', fontSize: '15px' }}>{r.venueName}</div>
        <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{st.label}</span>
      </div>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>{dateStr} · {r.planName || slotsStr}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#c0392b' }}>{r.totalPrice > 0 ? `$${r.totalPrice}` : ''}</div>
        <div style={{ fontSize: '12px', color: '#aaa' }}>點擊查看詳情 ›</div>
      </div>
    </div>
  );
}

// ── Sub-tab: 當前預約 ──────────────────────────────────────────────────────────
function ActiveBookingsTab({ list, loading, onStatusChanged }) {
  const [selected, setSelected] = useState(null);
  const active = list.filter(r => r.status === 'confirmed' || r.status === 'checked_in');

  if (selected) {
    const fresh = list.find(r => r._id === selected._id) || selected;
    return (
      <DetailView
        r={fresh}
        onBack={() => setSelected(null)}
        onCancelled={id => { onStatusChanged(id, 'cancelled'); setSelected(null); }}
        onCompleted={id => { onStatusChanged(id, 'completed'); setSelected(null); }}
        readOnly={false}
      />
    );
  }

  return (
    <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>載入中...</div>
      ) : active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>目前沒有進行中的預約</div>
      ) : active.map(r => <BookingCard key={r._id} r={r} onClick={() => setSelected(r)} />)}
    </div>
  );
}

// ── Sub-tab: 預約紀錄 ──────────────────────────────────────────────────────────
function HistoryTab({ list, loading }) {
  const [selected, setSelected] = useState(null);
  const history = list.filter(r => r.status === 'completed' || r.status === 'cancelled');

  if (selected) {
    return (
      <DetailView
        r={selected}
        onBack={() => setSelected(null)}
        readOnly={true}
      />
    );
  }

  return (
    <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>載入中...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>尚無歷史紀錄</div>
      ) : history.map(r => <BookingCard key={r._id} r={r} onClick={() => setSelected(r)} />)}
    </div>
  );
}

// ── Sub-tab: 個人資料 ──────────────────────────────────────────────────────────
function PersonalInfoTab({ user }) {
  return (
    <div style={{ padding: '24px 16px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
        {user?.pictureUrl ? (
          <img src={user.pictureUrl} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }} />
        ) : (
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '12px' }}>
            {(user?.displayName || '?')[0]}
          </div>
        )}
        <div style={{ fontSize: '18px', fontWeight: '700' }}>{user?.displayName || '—'}</div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <InfoRow label="LINE 名稱" value={user?.displayName || '—'} />
        <InfoRow label="LINE User ID" value={user?.userId || '—'} />
      </div>
    </div>
  );
}

// ── Main ProfilePage ─────────────────────────────────────────────────────────
const SUB_TABS = ['當前預約', '預約紀錄', '個人資料'];

export default function ProfilePage({ user }) {
  const [subTab, setSubTab] = useState(0);
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    _fetchMyReservations()
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleStatusChanged(id, newStatus) {
    setList(l => l.map(r => r._id === id ? { ...r, status: newStatus } : r));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee', background: '#fff', flexShrink: 0 }}>
        {SUB_TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(i)}
            style={{
              flex: 1, padding: '12px 4px', border: 'none', background: 'none',
              fontSize: '14px', fontWeight: subTab === i ? '700' : '400',
              color: subTab === i ? '#111' : '#888',
              borderBottom: subTab === i ? '2px solid #111' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >{t}</button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 0 && <ActiveBookingsTab list={list} loading={loading} onStatusChanged={handleStatusChanged} />}
      {subTab === 1 && <HistoryTab list={list} loading={loading} />}
      {subTab === 2 && <PersonalInfoTab user={user} />}
    </div>
  );
}
