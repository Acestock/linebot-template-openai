import React, { useState, useEffect } from 'react';
import { fetchVenues } from '../api';

const SLOT_LABELS = { morning: '早上', afternoon: '下午', evening: '晚上' };

function hasAvailableSlot(avail) {
  return Object.values(avail || {}).some(s => s.remaining > 0);
}

function VenueCard({ venue, tab, onClick }) {
  const avail = tab === 'today' ? venue.availability?.today : venue.availability?.tomorrow;
  const available = hasAvailableSlot(avail);
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: '12px', padding: '16px 16px 16px 20px',
        marginBottom: '10px', cursor: 'pointer',
        borderLeft: `4px solid ${venue.color || '#2196F3'}`,
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}
    >
      <div>
        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{venue.name}</div>
        <div style={{ fontSize: '13px', color: '#888' }}>{tab === 'today' ? '今日' : '明日'}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        {available ? (
          <span style={{
            background: '#e6f4ea', color: '#2e7d32', borderRadius: '20px',
            padding: '3px 12px', fontSize: '13px', fontWeight: '600'
          }}>尚有座位</span>
        ) : (
          <span style={{
            background: '#fce8e8', color: '#c62828', borderRadius: '20px',
            padding: '3px 12px', fontSize: '13px', fontWeight: '600'
          }}>已額滿</span>
        )}
        <div style={{ display: 'flex', gap: '4px' }}>
          {Object.entries(avail || {}).map(([slot, info]) => (
            <span key={slot} style={{
              fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
              background: info.remaining > 0 ? '#f1f8e9' : '#f5f5f5',
              color: info.remaining > 0 ? '#558b2f' : '#bbb'
            }}>{SLOT_LABELS[slot]}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VenueListPage({ onSelect, onMyBookings }) {
  const [venues, setVenues] = useState([]);
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);

  const today    = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    fetchVenues().then(setVenues).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
      {/* Date tabs */}
      <div style={{ display: 'flex', marginBottom: '16px', gap: '8px' }}>
        {[{ key: 'today', label: fmt(today) + ' 今日' }, { key: 'tomorrow', label: fmt(tomorrow) + ' 明日' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
              fontSize: '15px', fontWeight: tab === t.key ? '700' : '400',
              background: tab === t.key ? '#111' : '#f5f5f5',
              color: tab === t.key ? '#fff' : '#555',
              cursor: 'pointer'
            }}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>載入中...</div>
      ) : venues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>目前沒有可預約的場地</div>
      ) : venues.map(v => (
        <VenueCard key={v._id} venue={v} tab={tab} onClick={() => onSelect(v._id, tab)} />
      ))}
    </div>
  );
}
