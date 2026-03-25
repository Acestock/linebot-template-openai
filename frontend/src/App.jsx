import React, { useState, useEffect, useCallback } from 'react';
import ChatList from './components/ChatList';
import ChatDetail from './components/ChatDetail';
import ReplyPicker from './components/ReplyPicker';
import SendPanel from './components/SendPanel';

const POLL_INTERVAL = 10000;

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draftReply, setDraftReply] = useState('');
  const [stats, setStats] = useState({ pending: 0, replied: 0 });

  const selectedMessage = messages.find((m) => m._id === selectedId) || null;

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchStats();
    const interval = setInterval(() => {
      fetchMessages();
      fetchStats();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages, fetchStats]);

  function handleSelect(id) {
    setSelectedId(id);
    const msg = messages.find((m) => m._id === id);
    setDraftReply(msg?.selectedReply || '');
  }

  function handleReplyPick(reply) {
    setDraftReply(reply);
  }

  function updateMessageInList(updated) {
    setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    fetchStats();
  }

  function handleSent(updated) {
    updateMessageInList(updated);
  }

  function handleSkipped(updated) {
    updateMessageInList(updated);
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
        <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.9 }}>
          今日待回覆：{stats.pending} | 已回覆：{stats.replied}
        </span>
      </div>

      {/* Main layout below header */}
      <div style={{ display: 'flex', marginTop: '48px', width: '100%' }}>
        {/* Left panel */}
        <ChatList
          messages={messages}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        {/* Right panel */}
        <div style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - 48px)' }}>
          <ChatDetail message={selectedMessage} />
          {selectedMessage && (
            <>
              <ReplyPicker
                aiReplies={selectedMessage.aiReplies}
                selectedReply={draftReply}
                onSelect={handleReplyPick}
              />
              <SendPanel
                message={selectedMessage}
                draftReply={draftReply}
                onDraftChange={setDraftReply}
                onSent={handleSent}
                onSkipped={handleSkipped}
              />
            </>
          )}
          {!selectedMessage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: '#bbb', fontSize: '16px' }}>
              ← 請從左側選擇一則訊息
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
