import React, { useState, useEffect, useCallback } from 'react';
import ChatList from './components/ChatList';
import ChatDetail from './components/ChatDetail';
import ReplyPicker from './components/ReplyPicker';
import SendPanel from './components/SendPanel';
import SettingsModal from './components/SettingsModal';
import BroadcastModal from './components/BroadcastModal';
import OrdersModal from './components/OrdersModal';
import CalendarModal from './components/CalendarModal';
import RichMenuModal from './components/RichMenuModal';
import LiffAdminModal from './components/LiffAdminModal';
import StickyNotes from './components/StickyNotes';
import LoginScreen from './components/LoginScreen';
import API_BASE, { authFetch } from './config';

const FALLBACK_POLL_INTERVAL = 30000;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function DeskBtn({ onClick, title, children, badge = 0 }) {
  return (
    <button onClick={onClick} title={title} style={{
      position: 'relative', background: 'rgba(255,255,255,0.15)', border: 'none',
      borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer',
      padding: '5px 10px', lineHeight: 1, whiteSpace: 'nowrap',
      display: 'flex', alignItems: 'center', gap: '4px'
    }}>
      {children}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: '-5px', right: '-5px',
          backgroundColor: '#f44336', color: '#fff', borderRadius: '8px',
          fontSize: '10px', padding: '0 4px', minWidth: '14px', textAlign: 'center', lineHeight: '14px'
        }}>{badge}</span>
      )}
    </button>
  );
}

function MobileIconBtn({ onClick, children, badge = 0 }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', background: 'rgba(255,255,255,0.18)', border: 'none',
      borderRadius: '8px', color: '#fff', fontSize: '18px', cursor: 'pointer',
      padding: '6px', lineHeight: 1, minWidth: '36px', minHeight: '36px',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {children}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: '-3px', right: '-3px',
          backgroundColor: '#f44336', color: '#fff', borderRadius: '8px',
          fontSize: '10px', padding: '0 4px', minWidth: '14px', textAlign: 'center', lineHeight: '14px'
        }}>{badge}</span>
      )}
    </button>
  );
}

function App() {
  const isMobile = useIsMobile();
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [draftReply, setDraftReply] = useState('');
  const [aiReplies, setAiReplies] = useState([]);
  const [suggestIntent, setSuggestIntent] = useState('none');
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [stats, setStats] = useState({ pending: 0, replied: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRichMenu, setShowRichMenu] = useState(false);
  const [showLiffAdmin, setShowLiffAdmin] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [labels, setLabels] = useState([]);
  const [customerLabels, setCustomerLabels] = useState({});

  function handleLogout() {
    localStorage.removeItem('adminToken');
    setToken('');
  }

  // Handle 401 from any API call — log out and show login screen
  function handle401(res) {
    if (res.status === 401) {
      handleLogout();
      return true;
    }
    return false;
  }

  const selectedConv = conversations.find((c) => c.lineUserId === selectedUserId) || null;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/conversations`);
      if (handle401(res)) return;
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/stats`);
      if (handle401(res)) return;
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLabels = useCallback(async () => {
    try {
      const [labelsRes, clRes] = await Promise.all([
        authFetch(`${API_BASE}/api/labels`),
        authFetch(`${API_BASE}/api/customers/labels`)
      ]);
      if (handle401(labelsRes) || handle401(clRes)) return;
      setLabels(await labelsRes.json());
      setCustomerLabels(await clRes.json());
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuggest = useCallback(async (lineUserId) => {
    setAiReplies([]);
    setSuggestIntent('none');
    setLoadingSuggest(true);
    try {
      const res = await authFetch(
        `${API_BASE}/api/conversations/${encodeURIComponent(lineUserId)}/suggest`,
        { method: 'POST' }
      );
      if (handle401(res)) return;
      const data = await res.json();
      setAiReplies(data.aiReplies || []);
      setSuggestIntent(data.intent || 'none');
    } catch (err) {
      console.error('Failed to fetch AI suggestions:', err);
    } finally {
      setLoadingSuggest(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return; // Don't connect if not logged in

    fetchConversations();
    fetchStats();
    fetchLabels();

    let es = null;

    function connectSSE() {
      if (es) es.close();
      // EventSource doesn't support custom headers — pass token as query param
      es = new EventSource(`${API_BASE}/api/sse?token=${encodeURIComponent(token)}`);
      es.addEventListener('new-message', () => {
        fetchConversations();
        fetchStats();
      });
      es.addEventListener('new-order', () => {
        setNewOrderCount(n => n + 1);
      });
      es.onerror = () => {
        // Let EventSource auto-reconnect; we also reconnect on visibility
      };
    }

    connectSSE();

    // When user returns to the tab/app (mobile background → foreground)
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetchConversations();
        fetchStats();
        // Bug 1 fix: guard against es being replaced or null
        if (es && es.readyState === EventSource.CLOSED) {
          connectSSE();
        }
      }
    }

    // When network comes back online
    function handleOnline() {
      fetchConversations();
      fetchStats();
      connectSSE();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    const interval = setInterval(() => {
      fetchConversations();
      fetchStats();
    }, FALLBACK_POLL_INTERVAL);

    return () => {
      if (es) es.close();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [token, fetchConversations, fetchStats, fetchLabels]);

  // Show login screen if not authenticated
  if (!token) {
    return <LoginScreen onLogin={(newToken) => setToken(newToken)} />;
  }

  function handleSelect(lineUserId) {
    setSelectedUserId(lineUserId);
    setDraftReply('');
    setAiReplies([]);
    if (isMobile) setMobileView('chat');
    const conv = conversations.find((c) => c.lineUserId === lineUserId);
    if (conv && conv.pendingCount > 0) fetchSuggest(lineUserId);
  }

  function handleBackToList() {
    setMobileView('list');
  }

  function handleReplyPick(reply) {
    setDraftReply(reply);
  }

  function handleSent() {
    setConversations((prev) =>
      prev.map((c) =>
        c.lineUserId === selectedUserId
          ? { ...c, pendingCount: 0, status: 'replied', pendingMessages: [], urgency: 'normal' }
          : c
      )
    );
    setAiReplies([]);
    if (isMobile) setMobileView('list');
    fetchStats();
  }

  function handleSkipped() {
    setConversations((prev) =>
      prev.map((c) =>
        c.lineUserId === selectedUserId
          ? { ...c, pendingCount: 0, status: 'failed', pendingMessages: [], urgency: 'normal' }
          : c
      )
    );
    setAiReplies([]);
    if (isMobile) setMobileView('list');
    fetchStats();
  }

  function handleLabelsChange(lineUserId, newLabels) {
    setCustomerLabels(prev => ({ ...prev, [lineUserId]: newLabels }));
  }

  function handleAutoReplyChange(lineUserId, enabled) {
    setConversations(prev => prev.map(c =>
      c.lineUserId === lineUserId ? { ...c, autoReplyEnabled: enabled } : c
    ));
  }

  // ─── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ height: '100dvh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile Header */}
        <div style={{ height: '48px', backgroundColor: '#00B900', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 12px', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
          {mobileView === 'chat' ? (
            <>
              <button onClick={handleBackToList} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px 10px 4px 0', lineHeight: 1, minWidth: '36px' }}>←</button>
              <span style={{ fontWeight: 'bold', fontSize: '15px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedConv?.displayName || selectedConv?.lineUserId || '對話'}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 'bold', fontSize: '15px', flex: 1 }}>LINE 後台</span>
              <span style={{ fontSize: '11px', opacity: 0.85, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '2px 8px', marginRight: '4px', whiteSpace: 'nowrap' }}>
                待{stats.pending} 已{stats.replied}
              </span>
            </>
          )}
          {/* Mobile icon-only action buttons */}
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <MobileIconBtn onClick={() => { setShowOrders(true); setNewOrderCount(0); }} badge={newOrderCount}>📦</MobileIconBtn>
            <MobileIconBtn onClick={() => setShowCalendar(true)}>📅</MobileIconBtn>
            <MobileIconBtn onClick={() => setShowLiffAdmin(true)}>🏠</MobileIconBtn>
            <MobileIconBtn onClick={() => setShowRichMenu(true)}>📋</MobileIconBtn>
            <MobileIconBtn onClick={() => setShowBroadcast(true)}>📢</MobileIconBtn>
            <MobileIconBtn onClick={() => setShowSettings(true)}>⚙</MobileIconBtn>
          </div>
        </div>

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
        {showOrders && <OrdersModal onClose={() => setShowOrders(false)} />}
        {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} />}
        {showRichMenu && <RichMenuModal onClose={() => setShowRichMenu(false)} />}
        {showLiffAdmin && <LiffAdminModal onClose={() => setShowLiffAdmin(false)} />}

        {/* Mobile Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileView === 'list' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ChatList conversations={conversations} selectedUserId={selectedUserId} onSelect={handleSelect} customerLabels={customerLabels} mobile />
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ChatDetail conversation={selectedConv} labels={labels} customerLabels={customerLabels} onLabelsChange={handleLabelsChange} onAutoReplyChange={handleAutoReplyChange} onRefresh={fetchConversations} />
              {selectedConv && (
                <>
                  <ReplyPicker aiReplies={aiReplies} loading={loadingSuggest} selectedReply={draftReply} onSelect={handleReplyPick} intent={suggestIntent} />
                  <SendPanel conversation={selectedConv} draftReply={draftReply} onDraftChange={setDraftReply} onSent={handleSent} onSkipped={handleSkipped} />
                </>
              )}
            </div>
          )}
        </div>
        <StickyNotes />
      </div>
    );
  }

  // ─── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '48px',
        backgroundColor: '#00B900', color: '#fff',
        display: 'flex', alignItems: 'center', padding: '0 20px',
        zIndex: 100, boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>LINE 後台</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Stats badge */}
          <span style={{ fontSize: '12px', opacity: 0.85, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '3px 10px', marginRight: '6px', whiteSpace: 'nowrap' }}>
            待 {stats.pending} · 已 {stats.replied}
          </span>
          {/* Primary actions */}
          <DeskBtn onClick={() => { setShowOrders(true); setNewOrderCount(0); }} title="訂單管理" badge={newOrderCount}>📦 訂單</DeskBtn>
          <DeskBtn onClick={() => setShowCalendar(true)} title="行事曆">📅 行事曆</DeskBtn>
          <DeskBtn onClick={() => setShowLiffAdmin(true)} title="預約管理">🏠 預約管理</DeskBtn>
          <DeskBtn onClick={() => setShowRichMenu(true)} title="圖文選單">📋 圖文選單</DeskBtn>
          <DeskBtn onClick={() => setShowBroadcast(true)} title="群發訊息">📢 群發</DeskBtn>
          {/* Divider */}
          <span style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />
          <DeskBtn onClick={() => setShowSettings(true)} title="系統設定">⚙ 設定</DeskBtn>
          <DeskBtn onClick={handleLogout} title="登出">登出</DeskBtn>
        </span>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
      {showOrders && <OrdersModal onClose={() => setShowOrders(false)} />}
      {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} />}
      {showRichMenu && <RichMenuModal onClose={() => setShowRichMenu(false)} />}
      {showLiffAdmin && <LiffAdminModal onClose={() => setShowLiffAdmin(false)} />}

      {/* Main layout */}
      <div style={{ display: 'flex', marginTop: '48px', width: '100%' }}>
        <ChatList conversations={conversations} selectedUserId={selectedUserId} onSelect={handleSelect} customerLabels={customerLabels} />
        <div style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - 48px)' }}>
          <ChatDetail conversation={selectedConv} labels={labels} customerLabels={customerLabels} onLabelsChange={handleLabelsChange} onAutoReplyChange={handleAutoReplyChange} onRefresh={fetchConversations} />
          {selectedConv && (
            <>
              <ReplyPicker aiReplies={aiReplies} loading={loadingSuggest} selectedReply={draftReply} onSelect={handleReplyPick} intent={suggestIntent} />
              <SendPanel conversation={selectedConv} draftReply={draftReply} onDraftChange={setDraftReply} onSent={handleSent} onSkipped={handleSkipped} />
            </>
          )}
          {!selectedConv && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: '#bbb', fontSize: '16px' }}>
              ← 請從左側選擇一位客戶
            </div>
          )}
        </div>
      </div>
      <StickyNotes />
    </div>
  );
}

export default App;
