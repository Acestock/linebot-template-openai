import React, { useState, useEffect } from 'react';
import { fetchVenue, fetchAvailability, createReservation, getSessionToken, fetchShortSessionQuote } from '../api';

const SLOTS = [
  { key: 'morning',   label: '早上', range: '07:00–12:00', icon: '🌅' },
  { key: 'afternoon', label: '下午', range: '12:00–18:00', icon: '☀️' },
  { key: 'evening',   label: '晚上', range: '18:00–02:00', icon: '🌙' }
];

const SLOT_LABEL = {
  morning:   '早上 07:00–12:00',
  afternoon: '下午 12:00–18:00',
  evening:   '晚上 18:00–02:00'
};

function getCurrentSlot() {
  const h = new Date().getHours();
  if (h >= 7  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

function toDateStr(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

// ── 計時入場流程 ───────────────────────────────────────────────────────────────
function WalkInShortFlow({ venue: initialVenue, onBack, onDone }) {
  const [venue, setVenue]       = useState(initialVenue);
  const [quote, setQuote]       = useState(null);
  const [quoteErr, setQuoteErr] = useState('');
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  useEffect(() => {
    if (!venue?._id) return;
    setLoading(true);
    fetchShortSessionQuote(venue._id)
      .then(data => { setQuote(data); setLoading(false); })
      .catch(e => { setQuoteErr(e.message); setLoading(false); });
  }, [venue?._id]);

  useEffect(() => {
    if (!venue?.plans) {
      fetchVenue(initialVenue._id).then(setVenue).catch(() => {});
    }
  }, []);

  async function handleConfirm() {
    if (!getSessionToken()) { setError('請先登入 LINE'); return; }
    setSubmitting(true); setError('');
    try {
      const h = new Date().getHours();
      const currentSlot = h >= 7 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening';
      await createReservation({
        venueId:  venue._id,
        date:     toDateStr(new Date()),
        slots:    [currentSlot],
        mode:     'walkin_short',
        expectedCheckIn: new Date().toISOString()
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
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏱</div>
        <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>計時開始！</div>
        <div style={{ color: '#555', marginBottom: '8px' }}>{venue.name}</div>
        <div style={{ color: '#888', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
          費用將依實際使用時間計算。<br />出場前請至「個人資料 → 我的預約」完成結帳付款。
        </div>
        <button onClick={onDone} style={{ padding: '14px 40px', borderRadius: '10px', border: 'none', background: '#111', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
          返回首頁
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>計時入場報價</div>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>{venue.name} · 今日入場，費用出場時結算</div>

      {loading ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>載入中...</div>
      ) : quoteErr ? (
        <div style={{ background: '#ffebee', borderRadius: '10px', padding: '14px', color: '#c62828', fontSize: '14px' }}>{quoteErr}</div>
      ) : !quote?.available ? (
        <div style={{ background: '#fff3e0', borderRadius: '12px', padding: '16px', border: '1px solid #ffcc80', marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#e65100', marginBottom: '4px' }}>目前暫停計時入場</div>
          <div style={{ fontSize: '13px', color: '#bf360c' }}>場內剩餘座位不足，請稍後再試或改為預約入場。</div>
        </div>
      ) : (
        <>
          {/* Pricing tiers */}
          <div style={{ marginBottom: '16px' }}>
            {(quote.tiers || []).map(t => (
              <div key={t.hours} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', background: '#f8f8f8', border: '1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{t.hours} 小時</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>出場時間：{t.exitTimeStr} 前</div>
                </div>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#111' }}>${t.price}</span>
              </div>
            ))}
          </div>

          {/* Over 3hr notice */}
          {quote.overThreeHours && (
            <div style={{ background: '#f3e5f5', border: '1px solid #ce93d8', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#7b1fa2', marginBottom: '4px' }}>超過 3 小時</div>
              <div style={{ fontSize: '13px', color: '#6a1b9a' }}>
                費用改採固定方案計算，最低 <strong>${quote.overThreeHours.minPrice}</strong>，可使用至 <strong>{quote.overThreeHours.validUntilStr}</strong>。
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ background: '#f8f8f8', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>計費說明</div>
            {['費用依實際使用時長計算，出場前完成付款。', '70 分鐘內按 1 小時計費，130 分鐘內按 2 小時，190 分鐘內按 3 小時。', '跨越不同時段時，依各時段分鐘比例加權計費。', '超過 3 小時將自動切換為固定方案最低組合。'].map((t, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>• {t}</div>
            ))}
          </div>

          {error && <div style={{ color: '#c62828', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onBack} style={backBtnStyle}>返回</button>
            <button onClick={handleConfirm} disabled={submitting} style={{ ...nextBtnStyle, flex: 1, marginTop: 0 }}>
              {submitting ? '處理中...' : '確認計時入場'}
            </button>
          </div>
        </>
      )}

      {!loading && !quote?.available && (
        <button onClick={onBack} style={{ ...backBtnStyle, display: 'block', width: '100%', marginTop: '16px' }}>返回</button>
      )}
    </div>
  );
}

// Thin router — no hooks here, so conditional return is safe
export default function ReserveFlowPage({ venue, mode, onBack, onDone }) {
  if (mode === 'walkin_short') {
    return <WalkInShortFlow venue={venue} onBack={onBack} onDone={onDone} />;
  }
  return <RegularReserveFlow venue={venue} mode={mode} onBack={onBack} onDone={onDone} />;
}

function RegularReserveFlow({ venue: initialVenue, mode, onBack, onDone }) {
  const isWalkIn = mode === 'walkin';
  const totalSteps = isWalkIn ? 2 : 3;

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

  // Walk-in: auto-select the current slot's single plan once plans are loaded
  useEffect(() => {
    if (!isWalkIn || !plans.length || selectedPlan) return;
    const cur = getCurrentSlot();
    const match = plans.find(p => p.type === 'single' && p.slots?.[0] === cur);
    if (match) selectPlan(match);
  }, [plans]);

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
  const currentSlotKey = isWalkIn ? getCurrentSlot() : null;
  const walkInPlans = isWalkIn
    ? plans.filter(p => p.isActive !== false && p.slots?.includes(currentSlotKey))
    : [];
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

  // Derive effective plan: user-selected, or auto-match for single-slot walkin
  const autoMatchPlan = !selectedPlan && selectedSlots.length === 1
    ? plans.find(p => p.type === 'single' && p.slots?.[0] === selectedSlots[0])
    : null;
  const effectivePlan = selectedPlan || autoMatchPlan;
  const totalPrice = effectivePlan ? effectivePlan.price : 0;
  const planName   = effectivePlan ? effectivePlan.name  : '';

  // Check-in/out times
  const slotTimes = {
    morning:   { checkIn: '07:00', checkOut: '12:00' },
    afternoon: { checkIn: '12:00', checkOut: '18:00' },
    evening:   { checkIn: '18:00', checkOut: '02:00' }
  };
  const sortedSlots = ['morning', 'afternoon', 'evening'].filter(s => selectedSlots.includes(s));
  const firstSlot = sortedSlots[0];
  const lastSlot  = sortedSlots[sortedSlots.length - 1];

  // When checkOut hour < checkIn hour, the slot crosses midnight → use next calendar day
  function resolveCheckoutDate(baseDate, firstKey, lastKey) {
    if (!firstKey || !lastKey) return baseDate;
    const inH  = parseInt(slotTimes[firstKey].checkIn.split(':')[0]);
    const outH = parseInt(slotTimes[lastKey].checkOut.split(':')[0]);
    if (outH >= inH) return baseDate;
    const [y, m, d] = baseDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }

  const crossesMidnight = firstSlot && lastSlot &&
    parseInt(slotTimes[lastSlot].checkOut.split(':')[0]) < parseInt(slotTimes[firstSlot].checkIn.split(':')[0]);
  const checkIn      = firstSlot ? `${date}T${slotTimes[firstSlot].checkIn}:00+08:00` : null;
  const checkOutDate = resolveCheckoutDate(date, firstSlot, lastSlot);
  const checkOut     = lastSlot  ? `${checkOutDate}T${slotTimes[lastSlot].checkOut}:00+08:00` : null;

  async function handleSubmit() {
    if (!getSessionToken()) { setError('請先登入 LINE'); return; }
    if (!selectedSlots.length) { setError('請選擇時段'); return; }
    setSubmitting(true); setError('');
    try {
      await createReservation({
        venueId: venue._id,
        planId: effectivePlan?._id,
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

  // Walk-in: step 0 = plan selection, step 1 = confirm
  if (isWalkIn) {
    // Step 0: plan selection
    if (step === 0) {
      return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          <StepBar step={0} total={2} />
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>選擇入場方案</div>
          {walkInPlans.length === 0 ? (
            <div style={{ color: '#aaa', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
              目前時段無可用方案<br />
              <span style={{ fontSize: '12px' }}>請聯絡場地人員</span>
            </div>
          ) : (
            walkInPlans.map(plan => {
              const sel = selectedPlan?._id === plan._id;
              return (
                <div key={plan._id}
                  onClick={() => selectPlan(plan)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px', borderRadius: '10px', marginBottom: '10px',
                    border: `1.5px solid ${sel ? '#111' : '#e0e0e0'}`,
                    background: sel ? '#f0f0f0' : '#fff',
                    cursor: 'pointer', transition: 'border-color 0.15s'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{plan.icon} {plan.name}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>
                      {plan.slots?.map(s => SLOT_LABEL[s]).join(' + ')}
                    </div>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '700' }}>${plan.price}</span>
                </div>
              );
            })
          )}
          <button
            onClick={() => setStep(1)}
            disabled={!selectedPlan}
            style={{ ...nextBtnStyle, opacity: selectedPlan ? 1 : 0.4 }}>
            下一步
          </button>
        </div>
      );
    }

    // Step 1: confirm
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <StepBar step={1} total={2} />
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#111' }}>${totalPrice || '—'}</div>
          <div style={{ fontSize: '16px', color: '#555', marginTop: '4px' }}>{planName}</div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>{venue.name} · 今日</div>
        </div>
        <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <Row label="時段" value={sortedSlots.map(s => SLOTS.find(x => x.key === s)?.label).join('+')} />
          <Row label="入場時間" value={slotTimes[firstSlot]?.checkIn} />
          <Row label="離場時間" value={`${crossesMidnight ? '次日 ' : ''}${slotTimes[lastSlot]?.checkOut}`} />
        </div>
        <Notice />
        {error && <div style={{ color: '#c62828', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setStep(0)} style={backBtnStyle}>返回</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ ...nextBtnStyle, flex: 1, marginTop: 0, background: submitting ? '#ccc' : '#111', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '處理中...' : '確認立即入場'}
          </button>
        </div>
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
                      {slotAvail && (
                        <span style={{ fontSize: '12px', color: full ? '#c62828' : '#2e7d32' }}>
                          {slotAvail.blocked
                            ? (slotAvail.eventName ? `活動：${slotAvail.eventName}` : '已包場')
                            : full ? '已額滿' : `剩 ${slotAvail.remaining}`}
                        </span>
                      )}
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
            <Row label="預計離場" value={`${crossesMidnight ? '次日 ' : ''}${slotTimes[lastSlot]?.checkOut}`} />
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
