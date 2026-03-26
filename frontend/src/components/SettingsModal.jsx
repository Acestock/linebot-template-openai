import React, { useState, useEffect } from 'react';
import API_BASE from '../config';

function SettingsModal({ onClose }) {
  const [form, setForm] = useState({
    shopName: '', industry: '', products: '',
    businessHours: '', address: '', faq: '', toneNote: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        setForm({
          shopName: data.shopName || '',
          industry: data.industry || '',
          products: data.products || '',
          businessHours: data.businessHours || '',
          address: data.address || '',
          faq: data.faq || '',
          toneNote: data.toneNote || ''
        });
      })
      .catch(() => {});
  }, []);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('儲存失敗');
      setSaved(true);
    } catch (err) {
      alert(`儲存失敗：${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    lineHeight: '1.5',
    outline: 'none',
    marginTop: '4px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#555',
    marginBottom: '2px'
  };

  const fieldGroupStyle = { marginBottom: '14px' };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '560px', maxWidth: '95vw',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>商家知識庫設定</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999', lineHeight: 1
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
            填寫商家資訊後，AI 將根據這些內容生成更精準的回覆建議。
          </p>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>店名 *</label>
            <input name="shopName" value={form.shopName} onChange={handleChange}
              placeholder="例：阿明麵包坊" style={fieldStyle} />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>行業類型</label>
            <input name="industry" value={form.industry} onChange={handleChange}
              placeholder="例：烘焙、餐飲、服飾、美容..." style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>營業時間</label>
              <input name="businessHours" value={form.businessHours} onChange={handleChange}
                placeholder="例：週一至週六 10:00–20:00" style={fieldStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>地址</label>
              <input name="address" value={form.address} onChange={handleChange}
                placeholder="例：台北市信義區..." style={fieldStyle} />
            </div>
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>商品／服務說明</label>
            <textarea name="products" value={form.products} onChange={handleChange}
              placeholder={'例：\n- 手工麵包（每日現烤）\n- 客製化蛋糕（需提前3天預訂）\n- 下午茶套餐 $180起'}
              rows={4} style={fieldStyle} />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>常見問題 Q&A</label>
            <textarea name="faq" value={form.faq} onChange={handleChange}
              placeholder={'例：\nQ: 可以客製化嗎？\nA: 可以，請提前3天告知需求\n\nQ: 有停車場嗎？\nA: 附近有收費停車場'}
              rows={4} style={fieldStyle} />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>回覆風格備注</label>
            <input name="toneNote" value={form.toneNote} onChange={handleChange}
              placeholder="例：親切友善、多用表情符號、結尾加謝謝" style={fieldStyle} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px'
        }}>
          {saved && <span style={{ color: '#4CAF50', fontSize: '13px' }}>✓ 已儲存</span>}
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: '6px', border: '1px solid #e0e0e0',
            background: '#fff', color: '#666', fontSize: '14px', cursor: 'pointer'
          }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 18px', borderRadius: '6px', border: 'none',
            background: saving ? '#b0bec5' : '#00B900', color: '#fff',
            fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer'
          }}>
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
