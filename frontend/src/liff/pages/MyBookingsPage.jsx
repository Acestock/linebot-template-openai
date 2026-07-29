import React, { useState, useEffect } from 'react';
import { fetchMyReservations, cancelReservation } from '../api';

const STATUS_MAP = {
  confirmed:  { label: '已確認', color: '#1976d2', bg: '#e3f2fd' },
  checked_in: { label: '已入場', color: '#2e7d32', bg: '#e8f5e9' },
  completed:  { label: '已完成', color: '#555',    bg: '#f5f5f5' },
  cancelled:  { label: '已取消', color: '#c62828', bg: '#ffebee' }
};

const SLOT_LABELS = { morning: '早上', afternoon: '下午', evening: '晚上' };

export default function MyBookingsPage({ onBack }) {
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    fetchMyReservations().then(setList).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCancel(id) {
    if (!confirm('確定要取消此預約嗎？')) return;
    setCancelling(id);
    try {
      await cancelReservation(id);
      setList(l => l.map(r => r._id === id ? { ...r, status: 'cancelled' } : r));
    } catch (e) {
      alert(e.message);
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>載入中...</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>尚無預約紀錄</div>
      ) : list.map(r => {
        const st = STATUS_MAP[r.status] || STATUS_MAP.confirmed;
        const dateStr = new Date(r.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
        const slotsStr = (r.slots || []).map(s => SLOT_LABELS[s] || s).join(' + ');
        return (
          <div key={r._id} style={{
            background: '#fff', borderRadius: '12px', padding: '14px 16px',
            marginBottom: '10px', boxShadow: '0 1px 5px rgba(0,0,0,0.07)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{r.venueName}</div>
              <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                {st.label}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>{dateStr} · {r.planName || slotsStr}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#c0392b' }}>${r.totalPrice}</div>
              {r.status === 'confirmed' && (
                <button
                  onClick={() => handleCancel(r._id)}
                  disabled={cancelling === r._id}
                  style={{
                    padding: '5px 14px', borderRadius: '6px', border: '1px solid #e0e0e0',
                    background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#666'
                  }}
                >
                  {cancelling === r._id ? '取消中...' : '取消預約'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
