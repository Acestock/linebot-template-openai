import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { fetchMyReservations, cancelReservation, fetchReservationQr, checkoutReservation, initiatePayment, submitPaymentForm } from '../api';

const STATUS_MAP = {
  confirmed:  { label: '已確認',   color: '#1976d2', bg: '#e3f2fd' },
  checked_in: { label: '進場中',   color: '#2e7d32', bg: '#e8f5e9' },
  completed:  { label: '已完成',   color: '#555',    bg: '#f5f5f5' },
  cancelled:  { label: '已取消',   color: '#c62828', bg: '#ffebee' },
  unpaid_exit:{ label: '未付款離場', color: '#e65100', bg: '#fff3e0' }
};

function getStatusInfo(status, unpaidExit) {
  if (status === 'completed' && unpaidExit) return STATUS_MAP.unpaid_exit;
  return STATUS_MAP[status] || STATUS_MAP.confirmed;
}

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

function canShowQr(r) {
  return r.status === 'confirmed' || r.status === 'checked_in';
}

// ── Detail View ───────────────────────────────────────────────────────────────
function DetailView({ r, onBack, onCancelled, onCompleted }) {
  const [cancelling, setCancelling]     = useState(false);
  const [checkingOut, setCheckingOut]   = useState(false);
  const [paying, setPaying]             = useState(false);
  const [qrImg, setQrImg]               = useState('');
  const [qrLoading, setQrLoading]       = useState(false);
  const [qrValidUntil, setQrValidUntil] = useState(null);
  const [localStatus, setLocalStatus]   = useState(r.status);
  const [localPayStatus, setLocalPayStatus] = useState(r.paymentStatus || 'unpaid');
  const canQr = canShowQr({ ...r, status: localStatus });
  const needsPayment = localStatus === 'checked_in' && r.totalPrice > 0 && localPayStatus !== 'paid';

  async function handleShowQr() {
    setQrLoading(true);
    try {
      const data = await fetchReservationQr(r._id);
      setQrValidUntil(data.validUntil);
      const img = await QRCode.toDataURL(data.qrToken, { width: 220, margin: 2 });
      setQrImg(img);
    } catch (e) {
      alert(e.message);
    } finally {
      setQrLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('確定要取消此預約嗎？')) return;
    setCancelling(true);
    try {
      await cancelReservation(r._id);
      setLocalStatus('cancelled');
      onCancelled(r._id);
    } catch (e) {
      alert(e.message);
    } finally {
      setCancelling(false);
    }
  }

  async function handleCheckout() {
    if (needsPayment) { alert('請先完成付款才能出場'); return; }
    if (!confirm('確認完成使用並出場？出場後此時段容量將自動釋放。')) return;
    setCheckingOut(true);
    try {
      await checkoutReservation(r._id);
      setLocalStatus('completed');
      onCompleted(r._id);
    } catch (e) {
      alert(e.message);
    } finally {
      setCheckingOut(false);
    }
  }

  async function handlePay() {
    if (!confirm('確認前往付款？將跳轉至藍新金流付款頁面。')) return;
    setPaying(true);
    try {
      const data = await initiatePayment(r._id);
      if (data.skip) {
        setLocalStatus('completed');
        setLocalPayStatus('free');
        onCompleted(r._id);
        return;
      }
      const { form: { action, fields } } = data;
      submitPaymentForm(action, fields);
    } catch (e) {
      alert(e.message);
      setPaying(false);
    }
  }

  const st = getStatusInfo(localStatus, r.unpaidExit);
  const slotsStr = (r.slots || []).map(s => SLOT_LABELS[s] || s).join(' + ');

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: '8px',
            padding: '6px 12px', cursor: 'pointer', fontSize: '14px', color: '#444'
          }}
        >
          ← 返回
        </button>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>預約詳情</div>
      </div>

      {/* card */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '16px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: '16px'
      }}>
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

      {/* Unpaid exit notice */}
      {r.unpaidExit && (
        <div style={{ background: '#fff3e0', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px', color: '#e65100', fontSize: '13px', lineHeight: '1.6' }}>
          此預約未完成付款即離場。如有疑問請聯絡工作人員。
        </div>
      )}

      {/* QR section */}
      {localStatus === 'cancelled' ? (
        <div style={{
          background: '#ffebee', borderRadius: '10px', padding: '16px',
          textAlign: 'center', color: '#c62828', fontSize: '14px'
        }}>
          此預約已取消，無法顯示 QR Code
        </div>
      ) : canQr ? (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '16px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)', textAlign: 'center'
        }}>
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
            <button
              type="button"
              onClick={handleShowQr}
              disabled={qrLoading}
              style={{
                background: '#00b900', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '12px 28px',
                fontSize: '15px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {qrLoading ? '產生中...' : localStatus === 'checked_in' ? '顯示 QR（離場 / 再入場）' : '顯示入場 QR'}
            </button>
          )}
        </div>
      ) : null}

      {/* Payment button — shown when checked_in + charged + not yet paid */}
      {needsPayment && (
        <button type="button" onClick={handlePay} disabled={paying}
          style={{
            width: '100%', marginTop: '16px', padding: '14px',
            border: 'none', borderRadius: '10px',
            background: paying ? '#ccc' : '#e65100', color: '#fff',
            fontSize: '15px', fontWeight: '700', cursor: paying ? 'not-allowed' : 'pointer'
          }}>
          {paying ? '跳轉付款中...' : `付款並出場（$${r.totalPrice}）`}
        </button>
      )}

      {/* checkout button — only when checked_in AND free / already paid */}
      {localStatus === 'checked_in' && !needsPayment && (
        <button type="button" onClick={handleCheckout} disabled={checkingOut}
          style={{
            width: '100%', marginTop: '16px', padding: '13px',
            border: 'none', borderRadius: '10px',
            background: '#e53935', color: '#fff',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer'
          }}>
          {checkingOut ? '處理中...' : '確認出場（結束使用）'}
        </button>
      )}

      {/* cancel button — only when confirmed */}
      {localStatus === 'confirmed' && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          style={{
            width: '100%', marginTop: '16px', padding: '12px',
            border: '1px solid #e0e0e0', borderRadius: '10px',
            background: '#fff', fontSize: '14px', color: '#666', cursor: 'pointer'
          }}
        >
          {cancelling ? '取消中...' : '取消此預約'}
        </button>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: '#222', fontWeight: '500', maxWidth: '60%', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
export default function MyBookingsPage({ onBack }) {
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchMyReservations()
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleStatusChanged(id, newStatus) {
    setList(l => l.map(r => r._id === id ? { ...r, status: newStatus } : r));
  }

  if (selected) {
    const fresh = list.find(r => r._id === selected._id) || selected;
    return (
      <DetailView
        r={fresh}
        onBack={() => setSelected(null)}
        onCancelled={(id) => handleStatusChanged(id, 'cancelled')}
        onCompleted={(id) => handleStatusChanged(id, 'completed')}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>載入中...</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>尚無預約紀錄</div>
      ) : list.map(r => {
        const st = getStatusInfo(r.status, r.unpaidExit);
        const dateStr = new Date(r.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
        const slotsStr = (r.slots || []).map(s => SLOT_LABELS[s] || s).join(' + ');
        return (
          <div
            key={r._id}
            onClick={() => setSelected(r)}
            style={{
              background: '#fff', borderRadius: '12px', padding: '14px 16px',
              marginBottom: '10px', boxShadow: '0 1px 5px rgba(0,0,0,0.07)', cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{r.venueName}</div>
              <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                {st.label}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>{dateStr} · {r.planName || slotsStr}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#c0392b' }}>
                {r.totalPrice > 0 ? `$${r.totalPrice}` : ''}
              </div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>點擊查看詳情 ›</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
