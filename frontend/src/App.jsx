import React, { useState, useEffect, useCallback } from 'react';
import ChatList from './components/ChatList';
import ChatDetail from './components/ChatDetail';
import ReplyPicker from './components/ReplyPicker';
import SendPanel from './components/SendPanel';
import SettingsModal from './components/SettingsModal';
import API_BASE from './config';

const POLL_INTERVAL = 10000;

function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [draftReply, setDraftReply] = useState('');
  const [aiReplies, setAiReplies] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [stats, setStats] = useState({ pending: 0, replied: 0 });
  const [showSettings, setShowSettings] = useState(false);

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

  const fetchSuggest = useCallback(async (lineUserId) => {
    setAiReplies([]);
    setLoadingSuggest(true);
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(lineUserId)}/suggest`, {
        method: 'POST'
      });
      const data = await res.json();
      setAiReplies(data.aiReplies || []);
    } catch (err) {
      console.error('Failed to fetch AI suggestions:', err);
    } finally {
      setLoadingSuggest(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchStats();
    const interval = setInterval(() => {
      fetchConversations();
      fetchStats();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchStats]);

  function handleSelect(lineUserId) {
    setSelectedUserId(lineUserId);
    setDraftReply('');
    setAiReplies([]);
    const conv = conversations.find((c) => c.lineUserId === lineUserId);
    if (conv && conv.pendingCount > 0) {
      fetchSuggest(lineUserId);
    }
  }

  function handleReplyPick(reply) {
    setDraftReply(reply);
  }

  function handleSent() {
    // Mark conversation as replied locally while waiting for next poll
    setConversations((prev) =>
      prev.map((c) =>
        c.lineUserId === selectedUserId
          ? { ...c, pendingCount: 0, status: 'replied', pendingMessages: [] }
          : c
      )
    );
    setAiReplies([]);
    fetchStats();
  }

  function handleSkipped() {
    setConversations((prev) =>
      prev.map((c) =>
        c.lineUserId === selectedUserId
          ? { ...c, pendingCount: 0, status: 'failed', pendingMessages: [] }
          : c
      )
    );
    setAiReplies([]);
    fetchStats();
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
      {/* Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        backgroundColor: '#00B900',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>LINE AI 聊天輔助系統</span>
        <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>今日待回覆：{stats.pending} | 已回覆：{stats.replied}</span>
          <button
            onClick={() => setShowSettings(true)}
            title="商家知識庫設定"
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1
            }}
          >⚙</button>
        </span>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Main layout below header */}
      <div style={{ display: 'flex', marginTop: '48px', width: '100%' }}>
        {/* Left panel */}
        <ChatList
          conversations={conversations}
          selectedUserId={selectedUserId}
          onSelect={handleSelect}
        />

        {/* Right panel */}
        <div style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - 48px)' }}>
          <ChatDetail conversation={selectedConv} />
          {selectedConv && (
            <>
              <ReplyPicker
                aiReplies={aiReplies}
                loading={loadingSuggest}
                selectedReply={draftReply}
                onSelect={handleReplyPick}
              />
              <SendPanel
                conversation={selectedConv}
                draftReply={draftReply}
                onDraftChange={setDraftReply}
                onSent={handleSent}
                onSkipped={handleSkipped}
              />
            </>
          )}
          {!selectedConv && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: '#bbb', fontSize: '16px' }}>
              ← 請從左側選擇一位客戶
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
