import React, { useState, useEffect, useRef } from 'react';
import { fetchTasks, submitTask, fetchMyCoupons, acceptTask } from '../api';

async function compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}

function StatusBadge({ status }) {
  const map = {
    pending:  { label: '等待審核', color: '#e65100', bg: '#fff3e0' },
    approved: { label: '已核准',   color: '#2e7d32', bg: '#e8f5e9' },
    rejected: { label: '未通過',   color: '#c62828', bg: '#ffebee' }
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
      {s.label}
    </span>
  );
}

function CouponStatusBadge({ status }) {
  const map = {
    valid:   { label: '可使用', color: '#1976d2', bg: '#e3f2fd' },
    used:    { label: '已使用', color: '#888',    bg: '#f5f5f5' },
    expired: { label: '已過期', color: '#c62828', bg: '#ffebee' }
  };
  const s = map[status] || map.valid;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
      {s.label}
    </span>
  );
}

function TaskCard({ task, expanded, onToggle, checkedInReservationId, myUserId, onSubmitted, onAccepted }) {
  const [photoPreview, setPhotoPreview] = useState('');
  const [note, setNote]                 = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [accepting, setAccepting]       = useState(false);
  const fileRef = useRef();

  const sub = task.mySubmission;
  const canInteract = !!checkedInReservationId;
  const isMine = !!myUserId && task.acceptedBy === myUserId;
  const isTaken = !!task.acceptedBy && !isMine;

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoPreview(compressed);
    } catch (_) {
      setPhotoPreview('');
    }
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      await acceptTask(task._id);
      onAccepted(task._id);
    } catch (e) {
      alert(e.message);
    } finally {
      setAccepting(false);
    }
  }

  async function handleSubmit() {
    if (!photoPreview) { alert('請先拍照或選取圖片'); return; }
    setSubmitting(true);
    try {
      await submitTask(task._id, { photoBase64: photoPreview, note, reservationId: checkedInReservationId });
      alert('任務已提交！請等待審核結果。');
      onSubmitted();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 1px 5px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', flex: 1, marginRight: '8px' }}>{task.title}</div>
          <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
            +${task.rewardAmount} 折扣券
          </span>
        </div>
        {task.description && (
          <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
            {expanded ? task.description : task.description.slice(0, 60) + (task.description.length > 60 ? '...' : '')}
          </div>
        )}
        {isTaken && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>此任務已被他人承接</div>
        )}
        {isMine && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#2e7d32', fontWeight: '600' }}>✓ 已承接</div>
        )}
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#aaa', textAlign: 'right' }}>
          {expanded ? '收起 ▲' : '查看詳情 ▼'}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '14px 16px' }}>
          {task.expiresAt && (
            <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '10px' }}>
              截止時間：{new Date(task.expiresAt).toLocaleString('zh-TW')}
            </div>
          )}

          {sub ? (
            <div style={{ background: '#f9f9f9', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '14px', color: '#444' }}>
                {sub.status === 'pending' && '您已提交此任務，'}
                {sub.status === 'approved' && '任務審核通過！'}
                {sub.status === 'rejected' && `任務未通過${sub.adminNote ? `（${sub.adminNote}）` : ''}`}
              </div>
              <StatusBadge status={sub.status} />
            </div>
          ) : isTaken ? (
            <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '12px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
              此任務已被他人承接
            </div>
          ) : !canInteract ? (
            <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '12px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
              需在場內才能承接任務
            </div>
          ) : !isMine ? (
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '10px', background: accepting ? '#ccc' : '#E67E22', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: accepting ? 'not-allowed' : 'pointer' }}>
              {accepting ? '處理中...' : '接受任務'}
            </button>
          ) : (
            <div>
              <div style={{ fontSize: '13px', color: '#444', marginBottom: '10px', fontWeight: '600' }}>提交任務完成照片</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              {photoPreview ? (
                <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                  <img src={photoPreview} alt="預覽" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
                    style={{ display: 'block', margin: '6px auto 0', fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                    重新拍照
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current && fileRef.current.click()}
                  style={{ width: '100%', padding: '12px', border: '2px dashed #ddd', borderRadius: '10px', background: '#fafafa', color: '#666', fontSize: '14px', cursor: 'pointer', marginBottom: '10px' }}>
                  📷 拍照 / 選取圖片
                </button>
              )}
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="備注（選填）"
                rows={2}
                style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', resize: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !photoPreview}
                style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '10px', background: submitting || !photoPreview ? '#ccc' : '#E67E22', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting || !photoPreview ? 'not-allowed' : 'pointer' }}>
                {submitting ? '提交中...' : '提交任務'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MyCoupons({ coupons }) {
  if (!coupons.length) return null;
  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px', color: '#333' }}>我的折扣券</div>
      {coupons.map(c => (
        <div key={c._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#222', marginBottom: '2px' }}>{c.taskTitle || '任務折扣券'}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              折抵 <span style={{ color: '#1976d2', fontWeight: '700' }}>${c.discountAmount}</span>
              {c.expiresAt && ` · 至 ${new Date(c.expiresAt).toLocaleDateString('zh-TW')}`}
            </div>
          </div>
          <CouponStatusBadge status={c.status} />
        </div>
      ))}
    </div>
  );
}

export default function TasksTab() {
  const [tasks, setTasks]             = useState([]);
  const [coupons, setCoupons]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);
  const [checkedInId, setCheckedInId] = useState(null);
  const [myUserId, setMyUserId]       = useState('');

  async function load() {
    setLoading(true);
    try {
      const [tasksData, couponsData] = await Promise.all([fetchTasks(), fetchMyCoupons()]);
      setTasks(tasksData.tasks || []);
      setCheckedInId(tasksData.checkedInReservationId || null);
      setMyUserId(tasksData.myLineUserId || '');
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
    } catch (e) {
      console.error('TasksTab load error:', e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleTaskAccepted(taskId) {
    setTasks(prev => prev.map(t =>
      t._id === taskId ? { ...t, acceptedBy: myUserId, acceptorName: '你' } : t
    ));
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>載入中...</div>;
  }

  return (
    <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
      {!checkedInId && (
        <div style={{ background: '#fff8e1', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#f57f17', lineHeight: '1.5' }}>
          💡 您目前不在場內。進場後即可承接並提交限時任務。
        </div>
      )}

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>目前沒有開放中的任務</div>
      ) : (
        tasks.map(task => (
          <TaskCard
            key={task._id}
            task={task}
            expanded={expandedId === task._id}
            onToggle={() => setExpandedId(expandedId === task._id ? null : task._id)}
            checkedInReservationId={checkedInId}
            myUserId={myUserId}
            onSubmitted={load}
            onAccepted={handleTaskAccepted}
          />
        ))
      )}

      <MyCoupons coupons={coupons} />
    </div>
  );
}
