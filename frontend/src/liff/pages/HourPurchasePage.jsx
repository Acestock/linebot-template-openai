import React, { useState, useEffect } from 'react';
import { fetchHourPackages, buyHourPackage, submitPaymentForm, fetchMyProfile, updateMyProfile } from '../api';

const cardStyle = {
  background: '#fff', borderRadius: '14px', padding: '18px 20px',
  marginBottom: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
  cursor: 'pointer', border: '2px solid transparent',
};
const cardSelectedStyle = { ...cardStyle, border: '2px solid #111' };

const btnPrimary = {
  display: 'block', width: '100%', padding: '14px',
  background: '#111', color: '#fff', border: 'none',
  borderRadius: '12px', fontSize: '16px', fontWeight: '700',
  cursor: 'pointer', marginTop: '24px',
};

export default function HourPurchasePage({ onBack }) {
  const [packages,  setPackages]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [buying,    setBuying]    = useState(false);
  const [error,     setError]     = useState('');
  const [myEmail, setMyEmail]           = useState(null); // null = 尚未載入
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailDraft, setEmailDraft]     = useState('');
  const [savingEmail, setSavingEmail]   = useState(false);
  const [emailError, setEmailError]     = useState('');

  useEffect(() => {
    fetchHourPackages()
      .then(pkgs => { setPackages(pkgs); if (pkgs.length > 0) setSelected(pkgs[0]._id); })
      .catch(() => setError('無法載入方案'))
      .finally(() => setLoading(false));
    fetchMyProfile().then(data => setMyEmail(data.email || '')).catch(() => setMyEmail(''));
  }, []);

  async function handleBuy() {
    if (!selected) return;
    if (!myEmail) { setEmailDraft(''); setEmailError(''); setShowEmailPrompt(true); return; }
    setBuying(true);
    setError('');
    try {
      const data = await buyHourPackage(selected);
      submitPaymentForm(data.form.action, data.form.fields);
    } catch (e) {
      setError(e.message);
      setBuying(false);
    }
  }

  async function saveEmailAndBuy() {
    const trimmed = emailDraft.trim();
    if (!trimmed) { setEmailError('請輸入 Email'); return; }
    setSavingEmail(true);
    setEmailError('');
    try {
      await updateMyProfile(trimmed);
      setMyEmail(trimmed);
      setShowEmailPrompt(false);
      handleBuy();
    } catch (e) {
      setEmailError(e.message);
    } finally {
      setSavingEmail(false);
    }
  }

  const selPkg = packages.find(p => p._id === selected);
  const hourlyRate = selPkg ? Math.ceil(selPkg.price / selPkg.hours) : 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '6px' }}>預購時數</div>
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
        購買後可於出場結帳時折抵，時數在有效期內皆可使用
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>載入中...</div>
      ) : packages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>目前沒有可購買的時數方案</div>
      ) : (
        <>
          {packages.map(pkg => {
            const rate = Math.ceil(pkg.price / pkg.hours);
            const isSel = selected === pkg._id;
            return (
              <div
                key={pkg._id}
                style={isSel ? cardSelectedStyle : cardStyle}
                onClick={() => setSelected(pkg._id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{pkg.name}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {pkg.hours} 小時・有效期 {pkg.validDays} 天
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                      約 ${rate} / 小時
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#111' }}>
                      ${pkg.price.toLocaleString()}
                    </div>
                    {isSel && (
                      <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: '600' }}>✓ 已選</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {selPkg && (
            <div style={{
              background: '#f5f5f5', borderRadius: '10px', padding: '14px 16px',
              marginTop: '8px', fontSize: '14px', color: '#555', lineHeight: 1.6
            }}>
              <div><strong>方案：</strong>{selPkg.name}</div>
              <div><strong>時數：</strong>{selPkg.hours} 小時（{selPkg.hours * 60} 分鐘）</div>
              <div><strong>總價：</strong>${selPkg.price.toLocaleString()}</div>
              <div><strong>有效期：</strong>購買後 {selPkg.validDays} 天內</div>
              <div><strong>平均：</strong>約 ${hourlyRate} / 小時</div>
            </div>
          )}

          {error && (
            <div style={{ color: '#c62828', fontSize: '14px', marginTop: '12px' }}>{error}</div>
          )}

          <button style={{ ...btnPrimary, opacity: buying ? 0.6 : 1 }} onClick={handleBuy} disabled={buying || !selected}>
            {buying ? '處理中...' : `確認購買 $${selPkg?.price?.toLocaleString() ?? ''}`}
          </button>
          <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '10px' }}>
            點擊後將跳轉至信用卡付款頁面
          </div>
        </>
      )}

      {/* First-time payment email prompt — saved to profile, auto-filled into NewebPay afterwards */}
      {showEmailPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '320px', width: '100%' }}>
            <p style={{ fontSize: '15px', color: '#222', marginBottom: '6px', lineHeight: '1.6', fontWeight: '700' }}>請留下付款信箱</p>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px', lineHeight: '1.6' }}>
              第一次付款需要填寫，之後系統會自動記住，付款時不用再輸入。
            </p>
            <input
              type="email" value={emailDraft} onChange={e => setEmailDraft(e.target.value)}
              placeholder="your@email.com" autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: '1.5px solid #ddd', fontSize: '15px', marginBottom: '8px' }}
            />
            {emailError && <div style={{ color: '#e53935', fontSize: '12px', marginBottom: '8px' }}>{emailError}</div>}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={() => { setShowEmailPrompt(false); setEmailError(''); }} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '10px', background: '#fff', fontSize: '15px', cursor: 'pointer', color: '#444' }}>取消</button>
              <button onClick={saveEmailAndBuy} disabled={savingEmail} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', background: '#111', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: savingEmail ? 'not-allowed' : 'pointer' }}>
                {savingEmail ? '儲存中...' : '確定並繼續'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
