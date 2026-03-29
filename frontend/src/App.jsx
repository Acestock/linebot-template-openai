import React, { useState, useEffect, useCallback } from 'react';
import ChatList from './components/ChatList';
import ChatDetail from './components/ChatDetail';
import ReplyPicker from './components/ReplyPicker';
import SendPanel from './components/SendPanel';
import SettingsModal from './components/SettingsModal';
import StickyNotes from './components/StickyNotes';
import API_BASE from './config';

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

function App() {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [draftReply, setDraftReply] = useState('');
  const [aiReplies, setAiReplies] = useState([]);
  const [suggestIntent, setSuggestIntent] = useState('none');
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [stats, setStats] = useState({ pending: 0, replied: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [labels, setLabels] = useState([]);
  const [customerLabels, setCustomerLabels] = useState({});

  const selectedConv = conversations.find((c) => c.lineUserId === selectedUserId) || null;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations`);
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchLabels = useCallback(async () => {
    try {
      const [labelsRes, clRes] = await Promise.all([
        fetch(`${API_BASE}/api/labels`),
        fetch(`${API_BASE}/api/customers/labels`)
      ]);
      setLabels(await labelsRes.json());
      setCustomerLabels(await clRes.json());
    } catch {}
  }, []);

  const fetchSuggest = useCallback(async (lineUserId) => {
    setAiReplies([]);
    setSuggestIntent('none');
    setLoadingSuggest(true);
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(lineUserId)}/suggest`, {
        method: 'POST'
      });
      const data = await res.json();
      setAiReplies(data.aiReplies || []);
      setSuggestIntent(data.intent || 'none');
    } catch (err) {
      console.error('Failed to fetch AI suggestions:', err);
    } finally {
      setLoadingSuggest(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchStats();
    fetchLabels();

    let es = null;

    function connectSSE() {
      if (es) es.close();
      es = new EventSource(`${API_BASE}/api/sse`);
      es.addEventListener('new-message', () => {
        fetchConversations();
        fetchStats();
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
        // Reconnect SSE if it dropped while in background
        if (es.readyState === EventSource.CLOSED) {
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
      es.close();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchConversations, fetchStats, fetchLabels]);

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
      <div style={{ height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile Header */}
        <div style={{ height: '48px', backgroundColor: '#00B900', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 12px', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
          {mobileView === 'chat' ? (
            <>
              <button onClick={handleBackToList} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: '4px 8px 4px 0', lineHeight: 1 }}>←</button>
              <span style={{ fontWeight: 'bold', fontSize: '15px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedConv?.displayName || selectedConv?.lineUserId || '對話'}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 'bold', fontSize: '15px', flex: 1 }}>LINE AI 後台</span>
              <span style={{ fontSize: '12px', opacity: 0.9, marginRight: '10px' }}>
                待{stats.pending} 已{stats.replied}
              </span>
            </>
          )}
          <button onClick={() => setShowSettings(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '4px 8px' }}>⚙</button>
        </div>

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        {/* Mobile Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileView === 'list' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ChatList conversations={conversations} selectedUserId={selectedUserId} onSelect={handleSelect} customerLabels={customerLabels} mobile />
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ChatDetail conversation={selectedConv} labels={labels} customerLabels={customerLabels} onLabelsChange={handleLabelsChange} onAutoReplyChange={handleAutoReplyChange} />
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
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>LINE AI 聊天輔助系統</span>
        <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>今日待回覆：{stats.pending} | 已回覆：{stats.replied}</span>
          <button onClick={() => setShowSettings(true)} title="系統設定"
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>⚙</button>
        </span>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Main layout */}
      <div style={{ display: 'flex', marginTop: '48px', width: '100%' }}>
        <ChatList conversations={conversations} selectedUserId={selectedUserId} onSelect={handleSelect} customerLabels={customerLabels} />
        <div style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - 48px)' }}>
          <ChatDetail conversation={selectedConv} labels={labels} customerLabels={customerLabels} onLabelsChange={handleLabelsChange} onAutoReplyChange={handleAutoReplyChange} />
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
