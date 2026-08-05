import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { fetchMyReservations as _fetchMyReservations, cancelReservation, fetchReservationQr, checkoutReservation, initiatePayment, submitPaymentForm, fetchMyCoupons, fetchShortSessionPrice } from '../api';
import TasksTab from './TasksTab';

const STATUS_MAP = {
  confirmed:       { label: '已確認',    color: '#1976d2', bg: '#e3f2fd' },
  checked_in:      { label: '進場中',    color: '#2e7d32', bg: '#e8f5e9' },
  completed:       { label: '已完成',    color: '#555',    bg: '#f5f5f5' },
  cancelled:       { label: '已取消',    color: '#c62828', bg: '#ffebee' },
  unpaid_exit:     { label: '未付款離場', color: '#e65100', bg: '#fff3e0' },
  unpaid_checkout: { label: '未成功結帳', color: '#c62828', bg: '#ffebee' }
};

function getStatusInfo(status, unpaidExit) {
  if (status === 'completed' && unpaidExit) return STATUS_MAP.unpaid_checkout;
  if (status === 'completed' && unpaidExit === false) return STATUS_MAP.completed;
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
  const [coupons, setCoupons]                   = useState([]);
  const [selectedCoupon, setSelectedCoupon]     = useState(null);
  const [shortQuote, setShortQuote]             = useState(null);
  const [shortQuoteLoading, setShortQuoteLoading] = useState(false);
  const [showShortConfirm, setShowShortConfirm] = useState(false);

  const isShortSession = r.mode === 'walkin_short';
  const isUnpaidCheckout = localStatus === 'completed' && r.unpaidExit && localPayStatus !== 'paid';
  const canQr = !readOnly && !isShortSession && (localStatus === 'confirmed' || localStatus === 'checked_in');
  const needsPayment = !readOnly && (
    ((localStatus === 'checked_in' || isUnpaidCheckout) && r.totalPrice > 0 && localPayStatus !== 'paid') ||
    (isShortSession && localStatus === 'checked_in' && localPayStatus !== 'paid')
  );

  useEffect(() => {
    if (needsPayment) {
      fetchMyCoupons().then(data => setCoupons(Array.isArray(data) ? data : [])).catch(() => {});
    }
  }, [needsPayment]);

  const effectivePrice = selectedCoupon
    ? Math.max(0, r.totalPrice - selectedCoupon.discountAmount)
    : r.totalPrice;

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

  async function handlePay(skipConfirm = false) {
    if (!skipConfirm) {
      const payLabel = selectedCoupon
        ? `使用折扣券折抵 $${selectedCoupon.discountAmount}，實付 $${effectivePrice}，確認前往付款？`
        : '確認前往付款？將跳轉至藍新金流付款頁面。';
      if (!confirm(payLabel)) return;
    }
    setPaying(true);
    try {
      const data = await initiatePayment(r._id, selectedCoupon?._id);
      if (data.skip) {
        setLocalStatus('completed');
        setLocalPayStatus('paid');
        onCompleted?.(r._id, { unpaidExit: false });
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

  async function handleShortSessionCheckout() {
    setShortQuoteLoading(true);
    try {
      const q = await fetchShortSessionPrice(r._id);
      setShortQuote(q);
      setShowShortConfirm(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setShortQuoteLoading(false);
    }
  }

  function payBtnLabel() {
    if (paying) return '跳轉付款中...';
    if (isShortSession) return shortQuoteLoading ? '計算中...' : '結帳出場（確認費用）';
    const actionText = isUnpaidCheckout ? '補付款' : '付款並出場';
    if (selectedCoupon) {
      return effectivePrice === 0
        ? `折扣券全額折抵（原 $${r.totalPrice}）`
        : `${actionText}（$${r.totalPrice} - $${selectedCoupon.discountAmount} = $${effectivePrice}）`;
    }
    return `${actionText}（$${r.totalPrice}）`;
  }

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

      {/* Unpaid checkout notice */}
      {r.unpaidExit && localPayStatus !== 'paid' && (
        <div style={{ background: '#ffebee', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px', border: '1px solid #ef9a9a', lineHeight: '1.6' }}>
          <div style={{ color: '#c62828', fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>未成功結帳</div>
          <div style={{ color: '#b71c1c', fontSize: '13px' }}>此時段未完成付款。請點下方「補付款」完成結帳，否則將無法進行新預約。</div>
        </div>
      )}

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

      {/* Coupon selection — shown when payment is needed */}
      {needsPayment && coupons.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', marginBottom: '10px' }}>選擇折扣券（可選）</div>
          {coupons.map(c => (
            <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
              <input
                type="radio"
                name="coupon"
                checked={selectedCoupon?._id === c._id}
                onChange={() => setSelectedCoupon(c)}
                style={{ accentColor: '#1976d2', width: '16px', height: '16px' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{c.taskTitle || '折扣券'}</div>
                <div style={{ fontSize: '12px', color: '#1976d2', fontWeight: '700' }}>折抵 ${c.discountAmount}</div>
              </div>
            </label>
          ))}
          {selectedCoupon && (
            <button type="button" onClick={() => setSelectedCoupon(null)}
              style={{ marginTop: '8px', fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              取消選擇
            </button>
          )}
        </div>
      )}

      {/* Short-session: 計時中 badge */}
      {isShortSession && localStatus === 'checked_in' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e3f2fd', color: '#1565c0', borderRadius: '20px', padding: '5px 12px', fontSize: '13px', fontWeight: '600', marginTop: '12px' }}>
          ⏱ 計時中｜入場：{fmt(r.expectedCheckIn)}
        </div>
      )}

      {/* Payment button — shown when checked_in + has charge + not yet paid */}
      {needsPayment && (
        <button type="button"
          onClick={isShortSession ? handleShortSessionCheckout : handlePay}
          disabled={paying || shortQuoteLoading}
          style={{ width: '100%', marginTop: '16px', padding: '14px', border: 'none', borderRadius: '10px', background: (paying || shortQuoteLoading) ? '#ccc' : '#e65100', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: (paying || shortQuoteLoading) ? 'not-allowed' : 'pointer', lineHeight: '1.4' }}>
          {payBtnLabel()}
        </button>
      )}

      {/* Short-session checkout confirmation modal */}
      {showShortConfirm && shortQuote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '320px', maxWidth: '100%' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>計時結帳確認</div>
            <div style={{ background: '#f8f8f8', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                <span style={{ color: '#888' }}>已使用時間</span>
                <span>{Math.floor((shortQuote.actualMinutes || 0) / 60)}時{(shortQuote.actualMinutes || 0) % 60}分</span>
              </div>
              {shortQuote.billedHours && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                  <span style={{ color: '#888' }}>計費時數</span>
                  <span>{shortQuote.billedHours} 小時</span>
                </div>
              )}
              {shortQuote.isOverThreeHours && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                  <span style={{ color: '#888' }}>計費方式</span>
                  <span style={{ color: '#7b1fa2' }}>固定方案最低組合</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <span>應付金額</span>
                <span style={{ color: '#e65100' }}>${shortQuote.price}</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px', textAlign: 'center' }}>實際費用將在付款時以當下計算為準</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowShortConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', fontSize: '14px', cursor: 'pointer', color: '#333' }}>取消</button>
              <button onClick={() => { setShowShortConfirm(false); handlePay(true); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#e65100', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>確認付款</button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout button — only show for free/paid non-short reservations */}
      {!readOnly && localStatus === 'checked_in' && !needsPayment && !isShortSession && (
        <button type="button" onClick={handleCheckout} disabled={checkingOut}
          style={{ width: '100%', marginTop: '16px', padding: '13px', border: 'none', borderRadius: '10px', background: '#e53935', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
          {checkingOut ? '處理中...' : '確認出場（結束使用）'}
        </button>
      )}

      {!readOnly && localStatus === 'confirmed' && !isShortSession && (
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
  const st = getStatusInfo(r.status, r.unpaidExit);
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
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#c0392b' }}>
          {r.mode === 'walkin_short' && r.status === 'checked_in' ? <span style={{ color: '#1565c0' }}>⏱ 計時中</span> : r.totalPrice > 0 ? `$${r.totalPrice}` : ''}
        </div>
        <div style={{ fontSize: '12px', color: '#aaa' }}>點擊查看詳情 ›</div>
      </div>
    </div>
  );
}

// ── Sub-tab: 當前預約 ──────────────────────────────────────────────────────────
function ActiveBookingsTab({ list, loading, onStatusChanged }) {
  const [selected, setSelected] = useState(null);
  const active = list.filter(r =>
    r.status === 'confirmed' || r.status === 'checked_in' ||
    (r.status === 'completed' && r.unpaidExit && r.paymentStatus !== 'paid')
  );
  const hasLock = list.some(r => r.unpaidExit && r.paymentStatus !== 'paid');

  if (selected) {
    const fresh = list.find(r => r._id === selected._id) || selected;
    return (
      <DetailView
        r={fresh}
        onBack={() => setSelected(null)}
        onCancelled={id => { onStatusChanged(id, 'cancelled'); setSelected(null); }}
        onCompleted={(id, extras) => { onStatusChanged(id, 'completed', extras); setSelected(null); }}
        readOnly={false}
      />
    );
  }

  return (
    <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
      {hasLock && (
        <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', color: '#c62828', fontSize: '13px', lineHeight: '1.6' }}>
          ⚠️ 您有未完成付款的紀錄，暫時無法進行新預約。請點擊下方紀錄完成補付款，或聯絡工作人員。
        </div>
      )}
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
  const history = list.filter(r =>
    (r.status === 'completed' && (!r.unpaidExit || r.paymentStatus === 'paid')) ||
    r.status === 'cancelled'
  );

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
const SUB_TABS = ['當前預約', '任務', '預約紀錄', '個人資料'];

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

  function handleStatusChanged(id, newStatus, extras = {}) {
    setList(l => l.map(r => r._id === id ? { ...r, status: newStatus, ...extras } : r));
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
              flex: 1, padding: '12px 2px', border: 'none', background: 'none',
              fontSize: '13px', fontWeight: subTab === i ? '700' : '400',
              color: subTab === i ? '#111' : '#888',
              borderBottom: subTab === i ? '2px solid #111' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >{t}</button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 0 && <ActiveBookingsTab list={list} loading={loading} onStatusChanged={handleStatusChanged} />}
      {subTab === 1 && <TasksTab />}
      {subTab === 2 && <HistoryTab list={list} loading={loading} />}
      {subTab === 3 && <PersonalInfoTab user={user} />}
    </div>
  );
}
