import React, { useState, useEffect } from 'react';
import API_BASE, { authFetch } from '../config';

const STATUS_LABEL = { new: '新訂單', processing: '處理中', completed: '已完成', cancelled: '已取消' };
const STATUS_COLOR = { new: '#2196F3', processing: '#FF9800', completed: '#4CAF50', cancelled: '#9e9e9e' };
const STATUS_BG    = { new: '#e3f2fd', processing: '#fff8e1', completed: '#e8f5e9', cancelled: '#f5f5f5' };

function OrderCard({ order, onUpdate }) {
  const [editNote, setEditNote] = useState(false);
  const [note, setNote] = useState(order.note || '');
  const [saving, setSaving] = useState(false);

  async function updateStatus(status) {
    const updated = await authFetch(`${API_BASE}/api/orders/${order._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(r => r.json());
    onUpdate(updated);
  }

  async function saveNote() {
    setSaving(true);
    const updated = await authFetch(`${API_BASE}/api/orders/${order._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    }).then(r => r.json());
    onUpdate(updated);
    setEditNote(false);
    setSaving(false);
  }

  async function deleteOrder() {
    if (!confirm('確定刪除此訂單？')) return;
    await authFetch(`${API_BASE}/api/orders/${order._id}`, { method: 'DELETE' });
    onUpdate(null); // signal deletion
  }

  const statusActions = {
    new:        [['processing', '開始處理'], ['cancelled', '取消']],
    processing: [['completed', '完成'], ['cancelled', '取消']],
    completed:  [],
    cancelled:  []
  };

  return (
    <div style={{
      borderRadius: '10px', border: '1px solid #e8e8e8',
      marginBottom: '12px', overflow: 'hidden', backgroundColor: '#fff'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', backgroundColor: STATUS_BG[order.status],
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
      }}>
        <div>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#222' }}>
            {order.displayName || order.lineUserId}
          </span>
          <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
            {new Date(order.createdAt).toLocaleString('zh-TW')}
          </span>
        </div>
        <span style={{
          padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600',
          backgroundColor: STATUS_COLOR[order.status] + '20',
          color: STATUS_COLOR[order.status],
          border: `1px solid ${STATUS_COLOR[order.status]}40`
        }}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Items */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>品項（供參考，需與客戶確認數量）</div>
        {(order.items || []).length === 0 ? (
          <div style={{ fontSize: '13px', color: '#bbb' }}>無品項記錄</div>
        ) : (
          (order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#444', padding: '2px 0' }}>
              <span>{item.name}{item.unit ? ` (${item.unit})` : ''}</span>
              <span style={{ color: '#00B900', fontWeight: '600' }}>{item.price}</span>
            </div>
          ))
        )}
      </div>

      {/* Note */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #f5f5f5' }}>
        {editNote ? (
          <div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', resize: 'vertical', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button onClick={() => { setEditNote(false); setNote(order.note || ''); }} style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#666' }}>取消</button>
              <button onClick={saveNote} disabled={saving} style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', background: '#2196F3', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                {saving ? '儲存中' : '儲存'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ flex: 1, fontSize: '13px', color: note ? '#444' : '#bbb' }}>
              {note || '無備注，點擊新增'}
            </div>
            <button onClick={() => setEditNote(true)} style={{ flexShrink: 0, padding: '2px 8px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '11px', cursor: 'pointer', color: '#888' }}>備注</button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 14px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button onClick={deleteOrder} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #ffcdd2', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#e53935' }}>刪除</button>
        {(statusActions[order.status] || []).map(([s, label]) => (
          <button key={s} onClick={() => updateStatus(s)} style={{
            padding: '4px 12px', borderRadius: '5px', border: 'none', fontSize: '12px', cursor: 'pointer',
            backgroundColor: STATUS_COLOR[s], color: '#fff', fontWeight: '600'
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function OrdersModal({ onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    authFetch(`${API_BASE}/api/orders`)
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleUpdate(updated, id) {
    if (updated === null) {
      setOrders(prev => prev.filter(o => o._id !== id));
    } else {
      setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const counts = { all: orders.length, new: 0, processing: 0, completed: 0, cancelled: 0 };
  orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });

  const FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'new', label: '新訂單' },
    { key: 'processing', label: '處理中' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '480px', maxWidth: '95vw', backgroundColor: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>訂單管理</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>共 {orders.length} 筆</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa', overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0,
              fontSize: '13px', whiteSpace: 'nowrap',
              borderBottom: filter === f.key ? '2px solid #00B900' : '2px solid transparent',
              color: filter === f.key ? '#00B900' : '#888', fontWeight: filter === f.key ? '700' : '400'
            }}>
              {f.label}
              {counts[f.key] > 0 && (
                <span style={{ marginLeft: '4px', fontSize: '11px', backgroundColor: filter === f.key ? '#00B900' : '#e0e0e0', color: filter === f.key ? '#fff' : '#666', borderRadius: '8px', padding: '0 5px' }}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {loading && <div style={{ textAlign: 'center', color: '#bbb', marginTop: '40px' }}>載入中...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#bbb', marginTop: '40px', fontSize: '14px' }}>
              {filter === 'all' ? '尚無訂單' : `沒有「${FILTERS.find(f => f.key === filter)?.label}」的訂單`}
            </div>
          )}
          {filtered.map(order => (
            <OrderCard key={order._id} order={order} onUpdate={(updated) => handleUpdate(updated, order._id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default OrdersModal;
