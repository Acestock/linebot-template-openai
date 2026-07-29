import React, { useState, useEffect } from 'react';
import { fetchVenue, fetchAvailability, createReservation, getSessionToken } from '../api';

const SLOTS = [
  { key: 'morning',   label: '早上', range: '07:00–12:00', icon: '🌅' },
  { key: 'afternoon', label: '下午', range: '12:00–18:00', icon: '☀️' },
  { key: 'evening',   label: '晚上', range: '18:00–02:00', icon: '🌙' }
];

function getCurrentSlot() {
  const h = new Date().getHours();
  if (h >= 7  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function StepBar({ step, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '20px' }}>
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: i < step ? '#111' : i === step ? '#111' : '#e0e0e0',
            color: i <= step ? '#fff' : '#999',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '700', flexShrink: 0
          }}>
            {i < step ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ flex: 1, height: '2px', background: i < step ? '#111' : '#e0e0e0', maxWidth: '60px' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ReserveFlowPage({ venue: initialVenue, mode, onBack, onDone }) {
  const isWalkIn = mode === 'walkin';
  const totalSteps = isWalkIn ? 1 : 3;

  const [step, setStep]         = useState(0);
  const [venue, setVenue]       = useState(initialVenue);
  const [date, setDate]         = useState(toDateStr(new Date()));
  const [selectedSlots, setSelectedSlots] = useState(isWalkIn ? [getCurrentSlot()] : []);
  const [selectedPlan, setSelectedPlan]   = useState(null);
  const [avail, setAvail]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  // Load full venue details (plans)
  useEffect(() => {
    if (!venue?.plans) {
      fetchVenue(initialVenue._id).then(setVenue).catch(() => {});
    }
  }, []);

  // Load availability when date changes
  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    fetchAvailability(venue._id, date)
      .then(r => setAvail(r.slots))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, venue]);

  const plans = venue?.plans || [];
  const today = toDateStr(new Date());
  const maxDate = toDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  function toggleSlot(key) {
    setSelectedSlots(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
    setSelectedPlan(null);
  }

  function selectPlan(plan) {
    setSelectedPlan(plan);
    setSelectedSlots(plan.slots || []);
  }

  // Derive total price
  let totalPrice = 0;
  let planName = '';
  if (selectedPlan) {
    totalPrice = selectedPlan.price;
    planName = selectedPlan.name;
  } else if (selectedSlots.length === 1) {
    const matchPlan = plans.find(p => p.type === 'single' && p.slots?.[0] === selectedSlots[0]);
    if (matchPlan) { totalPrice = matchPlan.price; planName = matchPlan.name; }
  }

  // Check-in/out times
  const slotTimes = {
    morning:   { checkIn: '07:00', checkOut: '12:00' },
    afternoon: { checkIn: '12:00', checkOut: '18:00' },
    evening:   { checkIn: '18:00', checkOut: '02:00' }
  };
  const sortedSlots = ['morning', 'afternoon', 'evening'].filter(s => selectedSlots.includes(s));
  const firstSlot = sortedSlots[0];
  const lastSlot  = sortedSlots[sortedSlots.length - 1];
  const checkIn   = firstSlot ? `${date}T${slotTimes[firstSlot].checkIn}:00+08:00` : null;
  const checkOut  = lastSlot  ? `${date}T${slotTimes[lastSlot].checkOut}:00+08:00` : null;

  async function handleSubmit() {
    if (!getSessionToken()) { setError('請先登入 LINE'); return; }
    if (!selectedSlots.length) { setError('請選擇時段'); return; }
    setSubmitting(true); setError('');
    try {
      await createReservation({
        venueId: venue._id,
        planId: selectedPlan?._id,
        date, slots: selectedSlots,
        expectedCheckIn: checkIn, expectedCheckOut: checkOut,
        mode
      });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
        <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>預約成功！</div>
        <div style={{ color: '#555', marginBottom: '8px' }}>{venue.name}</div>
        <div style={{ color: '#555', marginBottom: '24px' }}>{date} · {planName || sortedSlots.map(s => SLOTS.find(x => x.key === s)?.label).join('+')} · ${totalPrice}</div>
        <button onClick={onDone} style={{ padding: '14px 40px', borderRadius: '10px', border: 'none', background: '#111', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
          返回首頁
        </button>
      </div>
    );
  }

  // Walk-in: single confirm screen
  if (isWalkIn) {
    const curSlot = SLOTS.find(s => s.key === selectedSlots[0]);
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <StepBar step={0} total={1} />
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#111' }}>${totalPrice || '—'}</div>
          <div style={{ fontSize: '16px', color: '#555', marginTop: '4px' }}>{planName || curSlot?.label + ' 時段'}</div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>{venue.name} · 今日</div>
        </div>
        <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <Row label="選擇時段" value={`${curSlot?.icon} ${curSlot?.label} (${curSlot?.range})`} />
          <Row label="入場時間" value={curSlot?.range.split('–')[0]} />
          <Row label="離場時間" value={curSlot?.range.split('–')[1]} />
        </div>
        <Notice />
        {error && <div style={{ color: '#c62828', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', background: submitting ? '#ccc' : '#111', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? '處理中...' : '確認立即入場'}
        </button>
      </div>
    );
  }

  // Advance reservation: 3-step flow
  const stepLabels = ['選擇日期', '選擇時段', '確認訂單'];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
      <StepBar step={step} total={3} />

      {/* Step 0: Select date */}
      {step === 0 && (
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>選擇入場日期</div>
          <input
            type="date" value={date} min={today} max={maxDate}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: '1.5px solid #ddd', fontSize: '16px' }}
          />
          <button onClick={() => setStep(1)} style={nextBtnStyle}>下一步</button>
        </div>
      )}

      {/* Step 1: Select slot/plan */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>選擇時段方案 — {date}</div>
          {loading ? <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>載入中...</div> : (
            <>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '8px' }}>單時段方案</div>
              {SLOTS.map(s => {
                const slotAvail = avail?.[s.key];
                const full = slotAvail && slotAvail.remaining <= 0;
                const plan = plans.find(p => p.type === 'single' && p.slots?.[0] === s.key);
                const selected = selectedPlan?._id === plan?._id;
                return plan ? (
                  <div key={s.key}
                    onClick={() => !full && selectPlan(plan)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', borderRadius: '10px', marginBottom: '8px',
                      border: `1.5px solid ${selected ? '#111' : '#e0e0e0'}`,
                      background: full ? '#f9f9f9' : selected ? '#f0f0f0' : '#fff',
                      cursor: full ? 'not-allowed' : 'pointer', opacity: full ? 0.5 : 1
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{s.icon} {plan.name || `${s.label} (${s.range})`}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {slotAvail && <span style={{ fontSize: '12px', color: full ? '#c62828' : '#2e7d32' }}>{full ? '已額滿' : `剩 ${slotAvail.remaining}`}</span>}
                      <span style={{ fontWeight: '700' }}>${plan.price}</span>
                    </div>
                  </div>
                ) : null;
              })}

              {plans.filter(p => p.type === 'multi').length > 0 && (
                <>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', margin: '14px 0 8px' }}>多時段方案</div>
                  {plans.filter(p => p.type === 'multi').map(plan => {
                    const selected = selectedPlan?._id === plan._id;
                    const full = plan.slots?.some(s => avail?.[s]?.remaining <= 0);
                    return (
                      <div key={plan._id}
                        onClick={() => !full && selectPlan(plan)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', borderRadius: '10px', marginBottom: '8px',
                          border: `1.5px solid ${selected ? '#111' : '#e0e0e0'}`,
                          background: full ? '#f9f9f9' : selected ? '#f0f0f0' : '#fff',
                          cursor: full ? 'not-allowed' : 'pointer', opacity: full ? 0.5 : 1
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>{plan.name}</span>
                        <span style={{ fontWeight: '700' }}>${plan.price}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button onClick={() => setStep(0)} style={backBtnStyle}>返回</button>
            <button onClick={() => selectedPlan && setStep(2)} disabled={!selectedPlan} style={{ ...nextBtnStyle, flex: 1, margin: 0, opacity: selectedPlan ? 1 : 0.4 }}>下一步</button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#c0392b' }}>${totalPrice}</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{planName}</div>
            <div style={{ fontSize: '14px', color: '#888', marginTop: '2px' }}>
              {new Date(date + 'T12:00:00').toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' })} · {venue.name}
            </div>
          </div>
          <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <Row label="預約入場" value={`${slotTimes[firstSlot]?.checkIn} （最晚入場 ${slotTimes[firstSlot]?.checkIn.replace('00', '59')}）`} />
            <Row label="預計離場" value={slotTimes[lastSlot]?.checkOut} />
          </div>
          <Notice />
          {error && <div style={{ color: '#c62828', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={() => setStep(1)} style={backBtnStyle}>返回</button>
            <button onClick={handleSubmit} disabled={submitting} style={{ ...nextBtnStyle, flex: 1, margin: 0, background: submitting ? '#ccc' : '#111' }}>
              {submitting ? '處理中...' : '完成預約'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function Notice() {
  return (
    <div style={{ background: '#f8f8f8', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>預約提醒：</div>
      {['請依預約時段準時入場，逾時將取消預約。', '預約後恕無法變更時段，請確認後再預約。', '費用依時段方案收取，非依進出場時間計費。'].map((t, i) => (
        <div key={i} style={{ fontSize: '13px', color: '#555', marginBottom: '3px' }}>• {t}</div>
      ))}
    </div>
  );
}

const nextBtnStyle = {
  display: 'block', width: '100%', marginTop: '16px', padding: '15px',
  borderRadius: '10px', border: 'none', background: '#111',
  color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer'
};
const backBtnStyle = {
  padding: '15px 20px', borderRadius: '10px', border: '1.5px solid #ddd',
  background: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: '#333'
};
