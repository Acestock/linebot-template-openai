import React, { useState, useEffect } from 'react';
import liff from '@line/liff';
import { liffAuth, setSessionToken } from './api';
import VenueListPage   from './pages/VenueListPage';
import VenueDetailPage from './pages/VenueDetailPage';
import ReserveFlowPage from './pages/ReserveFlowPage';
import MyBookingsPage  from './pages/MyBookingsPage';

// LIFF ID must be set in environment variable VITE_LIFF_ID
const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

export default function LiffApp() {
  const [page, setPage]     = useState({ name: 'list', params: {} });
  const [user, setUser]     = useState(null);
  const [initError, setInitError] = useState('');
  const [initing, setIniting]     = useState(true);

  useEffect(() => {
    fetch('/api/liff/config')
      .then(r => r.json())
      .then(cfg => { if (cfg.liffTitle) document.title = cfg.liffTitle; })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function init() {
      try {
        if (!LIFF_ID) {
          // Dev mode: skip LIFF init, use mock user
          setUser({ displayName: 'Dev User', pictureUrl: '', userId: 'dev-user' });
          setIniting(false);
          return;
        }
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        const accessToken = liff.getAccessToken();
        const profile     = liff.getDecodedIDToken
          ? { displayName: liff.getDecodedIDToken()?.name, pictureUrl: liff.getDecodedIDToken()?.picture, userId: liff.getDecodedIDToken()?.sub }
          : await liff.getProfile();

        try {
          const { sessionToken } = await liffAuth(accessToken);
          setSessionToken(sessionToken);
        } catch (e) {
          console.warn('[LIFF] Auth failed, LIFF API calls may fail', e.message);
        }
        setUser(profile);
      } catch (err) {
        setInitError(err.message || 'LIFF init failed');
      } finally {
        setIniting(false);
      }
    }
    init();
  }, []);

  function navigate(name, params = {}) {
    setPage({ name, params });
  }

  if (initing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#fff' }}>
        <div style={{ textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div>載入中...</div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: '32px', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ color: '#c62828', marginBottom: '8px' }}>LIFF 初始化失敗</div>
          <div style={{ color: '#888', fontSize: '13px' }}>{initError}</div>
        </div>
      </div>
    );
  }

  const showBack  = page.name !== 'list';
  const showMyBtn = page.name !== 'my' && !!user;

  function handleBack() {
    if (page.name === 'my')     return navigate('list');
    if (page.name === 'detail') return navigate('list');
    if (page.name === 'reserve') return navigate('detail', { venueId: page.params.venue?._id });
    navigate('list');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f7f7f7', fontFamily: "'Noto Sans TC', 'PingFang TC', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #eee',
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showBack && (
            <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>‹</button>
          )}
          <div style={{ fontWeight: '800', fontSize: '17px', letterSpacing: '-0.3px' }}>
            {page.name === 'list'    ? '預約入場'   : ''}
            {page.name === 'detail'  ? '場地詳情'   : ''}
            {page.name === 'reserve' ? (page.params.mode === 'walkin' ? '立即入場' : '預約入場') : ''}
            {page.name === 'my'     ? '我的預約'   : ''}
          </div>
        </div>
        {showMyBtn && (
          <button
            onClick={() => navigate('my')}
            style={{ background: 'none', border: '1px solid #ddd', borderRadius: '20px', padding: '5px 14px', fontSize: '13px', cursor: 'pointer', color: '#555' }}
          >
            我的預約
          </button>
        )}
      </div>

      {/* Page content */}
      {page.name === 'list' && (
        <VenueListPage
          onSelect={(venueId) => navigate('detail', { venueId })}
          onMyBookings={() => navigate('my')}
        />
      )}
      {page.name === 'detail' && (
        <VenueDetailPage
          venueId={page.params.venueId}
          onReserve={(venue) => navigate('reserve', { venue, mode: 'advance' })}
          onWalkIn={(venue)  => navigate('reserve', { venue, mode: 'walkin' })}
        />
      )}
      {page.name === 'reserve' && (
        <ReserveFlowPage
          venue={page.params.venue}
          mode={page.params.mode}
          onBack={handleBack}
          onDone={() => navigate('list')}
        />
      )}
      {page.name === 'my' && (
        <MyBookingsPage onBack={() => navigate('list')} />
      )}
    </div>
  );
}
