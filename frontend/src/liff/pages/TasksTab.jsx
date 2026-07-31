import React, { useState, useEffect, useRef } from 'react';
import { fetchTasks, submitTask, fetchMyCoupons } from '../api';

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

function TaskCard({ task, expanded, onToggle, checkedInReservationId, onSubmitted }) {
  const [photoFile, setPhotoFile]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [note, setNote]                 = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const fileRef = useRef();

  const sub = task.mySubmission;
  const canSubmit = !sub && !!checkedInReservationId;

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
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

          {/* Submission status */}
          {sub ? (
            <div style={{ background: '#f9f9f9', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '14px', color: '#444' }}>
                {sub.status === 'pending' && '您已提交此任務，'}
                {sub.status === 'approved' && '任務審核通過！'}
                {sub.status === 'rejected' && `任務未通過${sub.adminNote ? `（${sub.adminNote}）` : ''}`}
              </div>
              <StatusBadge status={sub.status} />
            </div>
          ) : canSubmit ? (
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
                    onClick={() => { setPhotoPreview(''); setPhotoFile(null); if (fileRef.current) fileRef.current.value = ''; }}
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
          ) : (
            <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '12px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
              需在場內才能提交任務
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
  const [tasks, setTasks]         = useState([]);
  const [coupons, setCoupons]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [checkedInId, setCheckedInId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [tasksData, couponsData] = await Promise.all([fetchTasks(), fetchMyCoupons()]);
      setTasks(tasksData.tasks || []);
      setCheckedInId(tasksData.checkedInReservationId || null);
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
    } catch (e) {
      console.error('TasksTab load error:', e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>載入中...</div>;
  }

  return (
    <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
      {!checkedInId && (
        <div style={{ background: '#fff8e1', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#f57f17', lineHeight: '1.5' }}>
          💡 您目前不在場內。進場後即可接受並提交限時任務。
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
            onSubmitted={load}
          />
        ))
      )}

      <MyCoupons coupons={coupons} />
    </div>
  );
}
