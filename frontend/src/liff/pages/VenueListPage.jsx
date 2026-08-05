import React, { useState, useEffect, useRef } from 'react';
import { fetchVenues } from '../api';

const SLOT_LABELS = { morning: '早上', afternoon: '下午', evening: '晚上' };

function toDateStr(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDays(count) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    return {
      key: toDateStr(d),
      label: i === 0 ? `${d.getMonth() + 1}/${d.getDate()} 今日`
           : i === 1 ? `${d.getMonth() + 1}/${d.getDate()} 明日`
           : `${d.getMonth() + 1}/${d.getDate()} ${['日','一','二','三','四','五','六'][d.getDay()]}`
    };
  });
}

function hasAvailableSlot(avail) {
  return Object.values(avail || {}).some(s => s.remaining > 0);
}

function VenueCard({ venue, dateKey, onClick }) {
  const avail = venue.availability?.[dateKey] || {};
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
        <div style={{ fontSize: '13px', color: '#888' }}>{dateKey}</div>
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
          {Object.entries(avail).map(([slot, info]) => (
            <span key={slot} style={{
              fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
              background: info.remaining > 0 ? '#f1f8e9' : '#f5f5f5',
              color: info.remaining > 0 ? '#558b2f' : '#bbb'
            }}>
              {info.blocked ? info.eventName || '活動' : SLOT_LABELS[slot]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VenueListPage({ onSelect }) {
  const [venues, setVenues] = useState([]);
  const [tab, setTab]       = useState(0);
  const [loading, setLoading] = useState(true);
  const tabBarRef = useRef(null);

  const days = getDays(5);

  useEffect(() => {
    fetchVenues().then(setVenues).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 0', display: 'flex', flexDirection: 'column' }}>
      {/* Date tabs — scrollable */}
      <div
        ref={tabBarRef}
        style={{ display: 'flex', marginBottom: '16px', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}
      >
        {days.map((d, i) => (
          <button
            key={d.key}
            onClick={() => setTab(i)}
            style={{
              flexShrink: 0, padding: '9px 14px', borderRadius: '10px', border: 'none',
              fontSize: '13px', fontWeight: tab === i ? '700' : '400',
              background: tab === i ? '#111' : '#f5f5f5',
              color: tab === i ? '#fff' : '#555',
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >{d.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>載入中...</div>
      ) : venues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>目前沒有可預約的場地</div>
      ) : venues.map(v => (
        <VenueCard key={v._id} venue={v} dateKey={days[tab].key} onClick={() => onSelect(v._id)} />
      ))}

      {/* Brand tagline — stretches to fill remaining space and self-centers */}
      {!loading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', padding: '24px 16px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '14px' }}>
            <div style={{ flex: 1, maxWidth: '48px', height: '1px', background: 'linear-gradient(to right, transparent, var(--brand-border))' }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-color)' }} />
            <div style={{ flex: 1, maxWidth: '48px', height: '1px', background: 'linear-gradient(to left, transparent, var(--brand-border))' }} />
          </div>
          <div style={{
            fontFamily: "'Noto Serif TC', 'Noto Serif', Georgia, serif",
            fontSize: '15px',
            color: 'var(--brand-text)',
            letterSpacing: '0.15em',
            lineHeight: '1.9',
            fontWeight: '400',
            opacity: 0.7,
          }}>
            讀一本書，享一段自己
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginTop: '14px' }}>
            <div style={{ flex: 1, maxWidth: '48px', height: '1px', background: 'linear-gradient(to right, transparent, var(--brand-border))' }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-color)' }} />
            <div style={{ flex: 1, maxWidth: '48px', height: '1px', background: 'linear-gradient(to left, transparent, var(--brand-border))' }} />
          </div>
        </div>
      )}
    </div>
  );
}
