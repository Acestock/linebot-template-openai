import React, { useState, useEffect } from 'react';
import API_BASE, { authFetch } from '../config';

const FIELD = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
  borderRadius: '6px', border: '1px solid #e0e0e0',
  fontSize: '14px', lineHeight: '1.5', outline: 'none', marginTop: '4px'
};
const LABEL = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '2px' };
const GROUP = { marginBottom: '14px' };

// ─── Tab 1: 商家知識庫 ───────────────────────────────────────────────────────
function ProfileTab({ profile, onChange, onSave, saving, saved }) {
  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
        填寫商家資訊後，AI 將根據這些內容生成更精準的回覆建議。
      </p>
      <div style={GROUP}><label style={LABEL}>店名 *</label>
        <input name="shopName" value={profile.shopName} onChange={onChange} placeholder="例：阿明麵包坊" style={FIELD} /></div>
      <div style={GROUP}><label style={LABEL}>行業類型</label>
        <input name="industry" value={profile.industry} onChange={onChange} placeholder="例：烘焙、餐飲、服飾" style={FIELD} /></div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}><label style={LABEL}>營業時間</label>
          <input name="businessHours" value={profile.businessHours} onChange={onChange} placeholder="例：週一至週六 10:00–20:00" style={FIELD} /></div>
        <div style={{ flex: 1 }}><label style={LABEL}>地址</label>
          <input name="address" value={profile.address} onChange={onChange} placeholder="例：台北市信義區..." style={FIELD} /></div>
      </div>
      <div style={GROUP}><label style={LABEL}>商品／服務說明</label>
        <textarea name="products" value={profile.products} onChange={onChange}
          placeholder={'例：\n- 手工麵包（每日現烤）\n- 客製化蛋糕（需提前3天預訂）'} rows={4} style={FIELD} /></div>
      <div style={GROUP}><label style={LABEL}>常見問題 Q&A</label>
        <textarea name="faq" value={profile.faq} onChange={onChange}
          placeholder={'例：\nQ: 可以客製化嗎？\nA: 可以，請提前3天告知需求'} rows={4} style={FIELD} /></div>
      <div style={GROUP}><label style={LABEL}>回覆風格備注</label>
        <input name="toneNote" value={profile.toneNote} onChange={onChange} placeholder="例：親切友善、多用表情符號" style={FIELD} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
        {saved && <span style={{ color: '#4CAF50', fontSize: '13px', alignSelf: 'center' }}>✓ 已儲存</span>}
        <button onClick={onSave} disabled={saving} style={{
          padding: '8px 20px', borderRadius: '6px', border: 'none',
          background: saving ? '#b0bec5' : '#00B900', color: '#fff',
          fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer'
        }}>{saving ? '儲存中...' : '儲存'}</button>
      </div>
    </div>
  );
}

// ─── Tab 2: 關鍵字觸發 ───────────────────────────────────────────────────────
function KeywordTab() {
  const [keywords, setKeywords] = useState([]);
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ trigger: '', replyType: 'text', reply: '', cardIds: [], isActive: true, order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadKeywords(); loadCards(); }, []);

  async function loadKeywords() {
    const res = await authFetch(`${API_BASE}/api/keywords`);
    setKeywords(await res.json());
  }
  async function loadCards() {
    const res = await authFetch(`${API_BASE}/api/cards`);
    setCards(await res.json());
  }

  function openNew() {
    setEditing(null);
    setForm({ trigger: '', replyType: 'text', reply: '', cardIds: [], isActive: true, order: keywords.length });
    setShowForm(true);
  }
  function openEdit(kw) {
    setEditing(kw);
    setForm({ trigger: kw.trigger, replyType: kw.replyType || 'text', reply: kw.reply || '', cardIds: kw.cardIds || [], isActive: kw.isActive, order: kw.order });
    setShowForm(true);
  }

  function toggleCardSelection(cardId) {
    setForm(p => {
      const ids = p.cardIds.includes(cardId)
        ? p.cardIds.filter(id => id !== cardId)
        : [...p.cardIds, cardId];
      return { ...p, cardIds: ids };
    });
  }

  async function handleSave() {
    if (!form.trigger.trim()) { alert('觸發詞為必填'); return; }
    if (form.replyType === 'card' && form.cardIds.length === 0) { alert('請至少選擇一張卡片'); return; }
    if (form.replyType === 'text' && !form.reply.trim()) { alert('回覆內容為必填'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/api/keywords/${editing._id}` : `${API_BASE}/api/keywords`;
      const res = await authFetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('操作失敗');
      await loadKeywords();
      setShowForm(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除？')) return;
    await authFetch(`${API_BASE}/api/keywords/${id}`, { method: 'DELETE' });
    await loadKeywords();
  }

  async function toggleActive(kw) {
    await authFetch(`${API_BASE}/api/keywords/${kw._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...kw, isActive: !kw.isActive })
    });
    await loadKeywords();
  }

  const cardMap = Object.fromEntries(cards.map(c => [c._id, c]));

  if (showForm) return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
        設定語意觸發詞，當客人訊息符合觸發主題時，AI 自動發送文字回覆或商品卡片。
      </p>
      <div style={GROUP}><label style={LABEL}>觸發主題 *</label>
        <input value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))}
          placeholder="例：菜單、報價、營業時間..." style={FIELD} />
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>語意匹配，不需完全相同（如「幾點開」→「營業時間」）</div>
      </div>

      <div style={GROUP}>
        <label style={LABEL}>回覆方式</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          {[{ value: 'text', label: '✏️ 文字回覆' }, { value: 'card', label: '🃏 商品卡片' }].map(opt => (
            <button key={opt.value} onClick={() => setForm(p => ({ ...p, replyType: opt.value }))}
              style={{ padding: '7px 18px', borderRadius: '8px', border: '2px solid', cursor: 'pointer', fontSize: '13px',
                fontWeight: form.replyType === opt.value ? '700' : '400',
                borderColor: form.replyType === opt.value ? '#2196F3' : '#e0e0e0',
                background: form.replyType === opt.value ? '#e3f2fd' : '#fff',
                color: form.replyType === opt.value ? '#1565c0' : '#666' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {form.replyType === 'text' ? (
        <div style={GROUP}><label style={LABEL}>自動回覆內容 *</label>
          <textarea value={form.reply} onChange={e => setForm(p => ({ ...p, reply: e.target.value }))}
            rows={4} placeholder="例：我們的營業時間是週一到週六 10:00–20:00，國定假日公休。" style={FIELD} />
        </div>
      ) : (
        <div style={GROUP}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={LABEL}>選擇要發送的卡片（可複選）*</label>
            {form.cardIds.length > 0 && (
              <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '10px', background: '#1565c0', color: '#fff', fontWeight: '600' }}>
                已選 {form.cardIds.length} 張
              </span>
            )}
          </div>
          {cards.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#e53935', padding: '12px', background: '#fff3f3', borderRadius: '8px' }}>
              尚未建立任何商品卡片，請先至「商品卡片」分頁新增。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cards.map(card => {
                const selected = form.cardIds.includes(card._id);
                return (
                  <div key={card._id} onClick={() => toggleCardSelection(card._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                      borderRadius: '10px', border: `2px solid ${selected ? '#2196F3' : '#e8edf2'}`,
                      background: selected ? '#e3f2fd' : '#fafbfc', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, border: `2px solid ${selected ? '#2196F3' : '#cdd5de'}`,
                      background: selected ? '#2196F3' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selected && <span style={{ color: '#fff', fontSize: '13px', lineHeight: 1 }}>✓</span>}
                    </div>
                    {card.imageUrl && (
                      <img src={card.imageUrl} alt="" onError={e => e.target.style.display='none'}
                        style={{ width: '40px', height: '30px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: selected ? '#1565c0' : '#333' }}>{card.title}</div>
                      {card.subtitle && <div style={{ fontSize: '12px', color: '#888', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.subtitle}</div>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa', flexShrink: 0 }}>{card.priceItems?.length || 0} 項</div>
                  </div>
                );
              })}
              <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                選擇多張卡片時，LINE 將以左右滑動的輪播（Carousel）方式呈現。
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', cursor: 'pointer' }}>返回</button>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#2196F3', color: '#fff', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '12px' }}>
        當客人訊息語意上符合觸發主題時，系統自動發送文字回覆或商品卡片，無需人工介入。
      </p>
      {keywords.length === 0 && <div style={{ textAlign: 'center', color: '#bbb', padding: '24px', fontSize: '14px' }}>尚無關鍵字，點擊下方新增</div>}
      {keywords.map(kw => {
        const kwCardIds = kw.cardIds || [];
        return (
          <div key={kw._id} style={{ padding: '12px 14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #eef2f7', backgroundColor: kw.isActive ? '#fafbfc' : '#f5f5f5', opacity: kw.isActive ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#222' }}>{kw.trigger}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    backgroundColor: kw.replyType === 'card' ? '#e3f2fd' : '#f3e5f5',
                    color: kw.replyType === 'card' ? '#1565c0' : '#7b1fa2', fontWeight: '600' }}>
                    {kw.replyType === 'card' ? '🃏 卡片' : '✏️ 文字'}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    backgroundColor: kw.isActive ? '#e8f5e9' : '#f5f5f5',
                    color: kw.isActive ? '#2e7d32' : '#aaa', fontWeight: '600' }}>
                    {kw.isActive ? '啟用' : '停用'}
                  </span>
                </div>
                {kw.replyType === 'card' ? (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {kwCardIds.length === 0
                      ? <span style={{ fontSize: '12px', color: '#e53935' }}>（卡片已刪除）</span>
                      : kwCardIds.map(id => (
                          <span key={id} style={{ fontSize: '12px', padding: '2px 9px', borderRadius: '8px',
                            background: '#dbeafe', color: '#1e40af', fontWeight: '500' }}>
                            {cardMap[id]?.title || '（已刪除）'}
                          </span>
                        ))
                    }
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#666', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{kw.reply}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => toggleActive(kw)} style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>{kw.isActive ? '停用' : '啟用'}</button>
                <button onClick={() => openEdit(kw)} style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>編輯</button>
                <button onClick={() => handleDelete(kw._id)} style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #ffcdd2', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#e53935' }}>刪除</button>
              </div>
            </div>
          </div>
        );
      })}
      <button onClick={openNew} style={{ width: '100%', marginTop: '4px', padding: '10px', borderRadius: '8px', border: '2px dashed #d0d9e6', background: '#fff', color: '#2196F3', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
        + 新增關鍵字觸發
      </button>
    </div>
  );
}

// ─── LINE Flex Message 預覽元件 ───────────────────────────────────────────────
function LineCardPreview({ card }) {
  const hasPrices = card.priceItems && card.priceItems.length > 0;
  const hasButton = card.buttonText && card.buttonUrl;
  const headerBg  = card.headerBgColor || '#ffffff';
  const titleCol  = card.titleColor    || '#111111';
  const subCol    = card.subtitleColor || '#888888';
  const btnCol    = card.buttonColor   || '#00B900';

  return (
    <div style={{ width: '220px', borderRadius: '14px', overflow: 'hidden',
      boxShadow: '0 4px 18px rgba(0,0,0,0.18)', background: '#fff', flexShrink: 0 }}>
      {/* Hero image */}
      {card.imageUrl && (
        <div style={{ width: '100%', paddingTop: '65%', position: 'relative', background: '#e8ecf0' }}>
          <img src={card.imageUrl} alt="" onError={e => { e.target.style.display='none'; }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      {/* Header: title + subtitle with custom background */}
      <div style={{ padding: '14px 14px 12px', background: headerBg }}>
        <div style={{ fontWeight: '700', fontSize: '16px', color: titleCol, lineHeight: '1.3', wordBreak: 'break-word' }}>
          {card.title || <span style={{ opacity: 0.3 }}>卡片標題</span>}
        </div>
        {card.subtitle && (
          <div style={{ fontSize: '12px', color: subCol, marginTop: '5px', lineHeight: '1.4', wordBreak: 'break-word' }}>{card.subtitle}</div>
        )}
      </div>
      {/* Body: price items */}
      {hasPrices && (
        <div style={{ padding: '10px 14px', background: '#fff' }}>
          <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: '8px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {card.priceItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#555', flex: 1, wordBreak: 'break-word' }}>{item.name}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#111', flexShrink: 0 }}>{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Footer: button */}
      {hasButton && (
        <div style={{ padding: hasPrices ? '0 10px 10px' : '0 10px 10px', background: '#fff' }}>
          {!hasPrices && <div style={{ height: '4px' }} />}
          <div style={{ background: btnCol, color: '#fff', textAlign: 'center',
            padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', letterSpacing: '0.3px' }}>
            {card.buttonText}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: 商品卡片管理 ─────────────────────────────────────────────────────
function CardTab() {
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const EMPTY_FORM = { title: '', subtitle: '', imageUrl: '', priceItems: [], buttonText: '', buttonUrl: '',
    headerBgColor: '#ffffff', titleColor: '#111111', subtitleColor: '#888888', buttonColor: '#00B900', isActive: true };
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [priceInput, setPriceInput] = useState({ name: '', price: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    const res = await authFetch(`${API_BASE}/api/cards`);
    setCards(await res.json());
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, buttonText: '了解更多' });
    setPriceInput({ name: '', price: '' });
    setShowForm(true);
  }
  function openEdit(card) {
    setEditing(card);
    setForm({
      title: card.title, subtitle: card.subtitle || '', imageUrl: card.imageUrl || '',
      priceItems: card.priceItems || [], buttonText: card.buttonText || '', buttonUrl: card.buttonUrl || '',
      headerBgColor: card.headerBgColor || '#ffffff', titleColor: card.titleColor || '#111111',
      subtitleColor: card.subtitleColor || '#888888', buttonColor: card.buttonColor || '#00B900',
      isActive: card.isActive
    });
    setPriceInput({ name: '', price: '' });
    setShowForm(true);
  }

  function addPriceItem() {
    if (!priceInput.name.trim() || !priceInput.price.trim()) return;
    setForm(p => ({ ...p, priceItems: [...p.priceItems, { name: priceInput.name.trim(), price: priceInput.price.trim() }] }));
    setPriceInput({ name: '', price: '' });
  }
  function removePriceItem(idx) {
    setForm(p => ({ ...p, priceItems: p.priceItems.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.title.trim()) { alert('卡片標題為必填'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/api/cards/${editing._id}` : `${API_BASE}/api/cards`;
      const res = await authFetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('操作失敗');
      await load(); setShowForm(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除？使用此卡片的關鍵字觸發將自動改為文字模式。')) return;
    await authFetch(`${API_BASE}/api/cards/${id}`, { method: 'DELETE' });
    await load();
  }

  const FIELD_SM = { ...FIELD, padding: '6px 10px' };

  if (showForm) return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
        填寫後右側預覽即時更新，呈現客人在 LINE 上看到的樣子。
      </p>

      {/* Two-column: form left, LINE preview right */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Form fields */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={GROUP}><label style={LABEL}>卡片標題 *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="例：精選蛋糕組合" style={FIELD} />
          </div>
          <div style={GROUP}><label style={LABEL}>副標題／說明</label>
            <input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
              placeholder="例：新鮮食材每日現做" style={FIELD} />
          </div>
          <div style={GROUP}><label style={LABEL}>圖片網址</label>
            <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
              placeholder="https://...（建議 20:13）" style={FIELD} />
          </div>

          <div style={GROUP}>
            <label style={LABEL}>價目表</label>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', marginTop: '6px' }}>
              {form.priceItems.length > 0 && (
                <div>
                  {form.priceItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', gap: '8px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
                      <span style={{ flex: 3, fontSize: '13px', color: '#333' }}>{item.name}</span>
                      <span style={{ flex: 2, fontSize: '13px', color: '#333', textAlign: 'right' }}>{item.price}</span>
                      <button onClick={() => removePriceItem(i)} style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: '15px', padding: '0 2px', flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', padding: '7px 10px', backgroundColor: '#fff' }}>
                <input value={priceInput.name} onChange={e => setPriceInput(p => ({ ...p, name: e.target.value }))}
                  placeholder="項目名稱" style={{ ...FIELD_SM, flex: 3, marginTop: 0 }}
                  onKeyDown={e => e.key === 'Enter' && addPriceItem()} />
                <input value={priceInput.price} onChange={e => setPriceInput(p => ({ ...p, price: e.target.value }))}
                  placeholder="$200" style={{ ...FIELD_SM, flex: 2, marginTop: 0 }}
                  onKeyDown={e => e.key === 'Enter' && addPriceItem()} />
                <button onClick={addPriceItem} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#2196F3', color: '#fff', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, fontSize: '12px' }}>＋</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}><label style={LABEL}>按鈕文字</label>
              <input value={form.buttonText} onChange={e => setForm(p => ({ ...p, buttonText: e.target.value }))}
                placeholder="了解更多" style={FIELD} />
            </div>
            <div style={{ flex: 2 }}><label style={LABEL}>按鈕連結</label>
              <input value={form.buttonUrl} onChange={e => setForm(p => ({ ...p, buttonUrl: e.target.value }))}
                placeholder="https://..." style={FIELD} />
            </div>
          </div>

          {/* Color customization */}
          <div style={{ background: '#f7f9fc', borderRadius: '10px', padding: '12px 14px', marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#555', marginBottom: '10px', letterSpacing: '0.3px' }}>🎨 配色設定</div>
            {[
              { key: 'headerBgColor', label: '標題區背景色' },
              { key: 'titleColor',    label: '標題文字色' },
              { key: 'subtitleColor', label: '副標題文字色' },
              { key: 'buttonColor',   label: '按鈕顏色' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', width: '90px', flexShrink: 0 }}>{label}</span>
                <input type="color" value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#999', fontFamily: 'monospace' }}>{form[key]}</span>
                <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: form[key], border: '1px solid #e0e0e0' }} />
              </div>
            ))}
          </div>
        </div>

        {/* LINE-style live preview */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ fontSize: '11px', color: '#aaa', fontWeight: '600', letterSpacing: '0.5px' }}>LINE 預覽</div>
          <LineCardPreview card={form} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', cursor: 'pointer' }}>返回</button>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#2196F3', color: '#fff', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '14px' }}>
        以下為客人在 LINE 上看到的實際樣貌。可在關鍵字觸發時自動發送。
      </p>
      {cards.length === 0 && (
        <div style={{ textAlign: 'center', color: '#bbb', padding: '32px 16px', fontSize: '14px',
          background: '#f7f9fc', borderRadius: '12px', border: '2px dashed #dce3f0' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🃏</div>
          <div>尚無卡片，點擊下方新增第一張</div>
        </div>
      )}
      {/* Horizontal scrollable LINE-preview row */}
      {cards.length > 0 && (
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '12px',
          scrollbarWidth: 'thin', scrollbarColor: '#d0d9e6 transparent' }}>
          {cards.map(card => (
            <div key={card._id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <LineCardPreview card={card} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => openEdit(card)} style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid #d0d9e6', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#444', fontWeight: '500' }}>編輯</button>
                <button onClick={() => handleDelete(card._id)} style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid #ffd0d0', background: '#fff9f9', fontSize: '12px', cursor: 'pointer', color: '#d32f2f', fontWeight: '500' }}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={openNew} style={{ width: '100%', marginTop: '4px', padding: '11px', borderRadius: '10px', border: '2px dashed #cdd8ee', background: 'linear-gradient(135deg,#f8f9fb,#eef3ff)', color: '#2563eb', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
        + 新增商品卡片
      </button>
    </div>
  );
}

// ─── Tab 4: 自動回覆設定 ─────────────────────────────────────────────────────
function AutoReplyTab({ profile, onChange, onSave, saving, saved }) {
  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '20px' }}>
        啟用後，若客人傳訊後設定時間內管理員未回覆，AI 會自動發送親切版回覆建議。<br />
        計時器在每則訊息後重置，確保分段訊息全部被讀取後再回覆。
      </p>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '10px', border: '2px solid', borderColor: profile.autoReply ? '#00B900' : '#e0e0e0', backgroundColor: profile.autoReply ? '#f1fff1' : '#fafafa', marginBottom: '20px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#333' }}>AI 自動回覆</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
            {profile.autoReply ? '已啟用 — 將在設定時間後自動回覆' : '已停用'}
          </div>
        </div>
        <div onClick={() => onChange({ target: { name: 'autoReply', value: !profile.autoReply } })}
          style={{ width: '48px', height: '26px', borderRadius: '13px', backgroundColor: profile.autoReply ? '#00B900' : '#ccc', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' }}>
          <div style={{ position: 'absolute', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', top: '3px', left: profile.autoReply ? '25px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
      </div>

      {profile.autoReply && (
        <div style={GROUP}>
          <label style={LABEL}>等待時間（秒）</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <input type="number" name="autoReplyDelay" value={profile.autoReplyDelay}
              onChange={onChange} min={10} max={600} style={{ ...FIELD, width: '100px', marginTop: 0 }} />
            <span style={{ fontSize: '13px', color: '#888' }}>
              秒（{Math.round(profile.autoReplyDelay / 60 * 10) / 10} 分鐘）
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>建議 60 秒，讓客人可以分段傳完所有訊息</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
        {saved && <span style={{ color: '#4CAF50', fontSize: '13px', alignSelf: 'center' }}>✓ 已儲存</span>}
        <button onClick={onSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#00B900', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 4: 標籤管理 ─────────────────────────────────────────────────────────
const PRESET_COLORS = ['#f44336','#e91e63','#9c27b0','#3f51b5','#2196F3','#009688','#4CAF50','#FF9800','#FF5722','#607d8b'];

function LabelTab() {
  const [labels, setLabels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#2196F3' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await authFetch(`${API_BASE}/api/labels`);
    setLabels(await res.json());
  }

  function openNew() { setEditing(null); setForm({ name: '', color: '#2196F3' }); setShowForm(true); }
  function openEdit(l) { setEditing(l); setForm({ name: l.name, color: l.color }); setShowForm(true); }

  async function handleSave() {
    if (!form.name.trim()) { alert('標籤名稱為必填'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/api/labels/${editing._id}` : `${API_BASE}/api/labels`;
      const res = await authFetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('操作失敗');
      await load(); setShowForm(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除？此標籤將從所有客戶移除。')) return;
    await authFetch(`${API_BASE}/api/labels/${id}`, { method: 'DELETE' });
    await load();
  }

  if (showForm) return (
    <div>
      <div style={GROUP}>
        <label style={LABEL}>標籤名稱 *</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="例：VIP、需跟進、已下單..." style={FIELD} />
      </div>
      <div style={GROUP}>
        <label style={LABEL}>顏色</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          {PRESET_COLORS.map(c => (
            <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{
              width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer',
              border: form.color === c ? '3px solid #333' : '2px solid transparent', flexShrink: 0
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
          <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            style={{ width: '36px', height: '36px', padding: '2px', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer' }} />
          <span style={{ fontSize: '13px', color: '#888' }}>或自訂顏色</span>
          <span style={{ fontSize: '13px', padding: '3px 12px', borderRadius: '12px', backgroundColor: form.color + '20', color: form.color, border: `1px solid ${form.color}50`, fontWeight: '500' }}>
            {form.name || '預覽'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', cursor: 'pointer' }}>返回</button>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#2196F3', color: '#fff', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '12px' }}>
        建立標籤後，可在客戶對話頁面為每位客戶手動貼標。
      </p>
      {labels.length === 0 && <div style={{ textAlign: 'center', color: '#bbb', padding: '24px', fontSize: '14px' }}>尚無標籤，點擊下方新增</div>}
      {labels.map(l => (
        <div key={l._id} style={{ padding: '10px 14px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: l.color, flexShrink: 0 }} />
          <span style={{ fontSize: '14px', color: '#333', flex: 1, fontWeight: '500' }}>{l.name}</span>
          <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '10px', backgroundColor: l.color + '20', color: l.color, border: `1px solid ${l.color}40` }}>{l.name}</span>
          <button onClick={() => openEdit(l)} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>編輯</button>
          <button onClick={() => handleDelete(l._id)} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #ffcdd2', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#e53935' }}>刪除</button>
        </div>
      ))}
      <button onClick={openNew} style={{ width: '100%', marginTop: '4px', padding: '10px', borderRadius: '8px', border: '2px dashed #e0e0e0', background: '#fff', color: '#2196F3', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
        + 新增標籤
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({
    shopName: '', industry: '', products: '', businessHours: '', address: '',
    faq: '', toneNote: '', autoReply: false, autoReplyDelay: 60
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/settings`).then(r => r.json()).then(data => {
      setProfile({
        shopName: data.shopName || '', industry: data.industry || '',
        products: data.products || '', businessHours: data.businessHours || '',
        address: data.address || '', faq: data.faq || '', toneNote: data.toneNote || '',
        autoReply: data.autoReply || false, autoReplyDelay: data.autoReplyDelay || 60
      });
    }).catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/api/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error('儲存失敗');
      setSaved(true);
    } catch (err) { alert(`儲存失敗：${err.message}`); }
    finally { setSaving(false); }
  }

  const TABS = [
    { key: 'profile',  label: '商家知識庫' },
    { key: 'cards',    label: '商品卡片' },
    { key: 'keywords', label: '關鍵字觸發' },
    { key: 'autoReply',label: '自動回覆' },
    { key: 'labels',   label: '標籤管理' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '580px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>⚙ 系統設定</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: tab === t.key ? '700' : '400',
              color: tab === t.key ? '#2196F3' : '#777',
              borderBottom: tab === t.key ? '2px solid #2196F3' : '2px solid transparent',
              transition: 'all 0.15s'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {tab === 'profile'   && <ProfileTab profile={profile} onChange={handleChange} onSave={handleSave} saving={saving} saved={saved} />}
          {tab === 'cards'     && <CardTab />}
          {tab === 'keywords'  && <KeywordTab />}
          {tab === 'autoReply' && <AutoReplyTab profile={profile} onChange={handleChange} onSave={handleSave} saving={saving} saved={saved} />}
          {tab === 'labels'    && <LabelTab />}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
