import React, { useState, useEffect } from 'react';
import API_BASE, { authFetch } from '../config';

const FIELD = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px',
  borderRadius: '8px', border: '1px solid #e0e0e0',
  fontSize: '16px', lineHeight: '1.5', outline: 'none', marginTop: '4px'
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
      <div style={{ ...GROUP, padding: '10px 12px', backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #c5dcf5' }}>
        <span style={{ fontSize: '13px', color: '#1565c0' }}>💡 常見問題 Q&A 已移至「<strong>FAQ 知識庫</strong>」分頁，可新增結構化問答對，讓 AI 回覆更精準。</span>
      </div>
      <div style={GROUP}><label style={LABEL}>回覆風格備注</label>
        <input name="toneNote" value={profile.toneNote} onChange={onChange} placeholder="例：親切友善、多用表情符號" style={FIELD} /></div>

      <div style={{ ...GROUP, padding: '12px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffe082' }}>
        <label style={{ ...LABEL, color: '#e65100' }}>⚡ 緊急訊息通知 LINE（管理員 User ID）</label>
        <input name="adminLineUserId" value={profile.adminLineUserId} onChange={onChange}
          placeholder="例：U1a2b3c4d5e6f7g8h9..." style={{ ...FIELD, marginTop: '6px' }} />
        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
          填入後，當客戶發送「急迫」或「情緒激動」訊息時，系統將主動推播通知給此 LINE 帳號。
          <br />取得方式：可請客戶傳訊給 Bot，後台聊天列表即可看到其 User ID。
        </div>
      </div>

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

// ─── Tab 8: AI 使用量統計 ─────────────────────────────────────────────────────
function AIStatsTab() {
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStats(); }, [days]);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/ai-usage?days=${days}`);
      setStats(await res.json());
    } catch {}
    setLoading(false);
  }

  const TYPE_LABELS = { analyze: '訊息分析', generate: '回覆建議', summarize: '對話摘要' };
  const TYPE_COLORS = { analyze: '#2196F3', generate: '#4CAF50', summarize: '#FF9800' };

  function fmtCost(usd) {
    const twd = usd * 32; // approx exchange rate
    return `$${usd.toFixed(4)} USD（約 NT$${twd.toFixed(1)}）`;
  }

  return (
    <div>
      <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>
        追蹤 OpenAI API 使用量與估計費用。費用以 GPT-4o / GPT-4o-mini 官方定價換算。
      </p>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: '6px 14px', borderRadius: '20px', border: '1.5px solid',
            borderColor: days === d ? '#2196F3' : '#e0e0e0',
            background: days === d ? '#e3f2fd' : '#fff',
            color: days === d ? '#1565c0' : '#666',
            fontSize: '13px', fontWeight: days === d ? '700' : '400', cursor: 'pointer'
          }}>最近 {d} 天</button>
        ))}
        <button onClick={loadStats} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontSize: '13px', cursor: 'pointer' }}>
          🔄 刷新
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '32px', color: '#aaa' }}>載入中...</div>}

      {!loading && stats && (
        <>
          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: '呼叫次數', value: stats.totalCalls, unit: '次', color: '#2196F3' },
              { label: '總 Token 數', value: stats.totalTokens.toLocaleString(), unit: 'tokens', color: '#9C27B0' },
              { label: `近 ${days} 天費用`, value: fmtCost(stats.totalCost), unit: '', color: '#FF5722', small: true }
            ].map(c => (
              <div key={c.label} style={{ border: `2px solid ${c.color}33`, borderRadius: '10px', padding: '12px', backgroundColor: c.color + '08', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: c.small ? '13px' : '30px', fontWeight: 'bold', color: c.color, lineHeight: 1.2 }}>{c.value}</div>
                {c.unit && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{c.unit}</div>}
              </div>
            ))}
          </div>

          {/* All-time cost */}
          <div style={{ padding: '10px 14px', backgroundColor: '#f3e5f5', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6a1b9a', fontWeight: '600' }}>累計總費用（自開始記錄）</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#6a1b9a' }}>{fmtCost(stats.allTimeCost || 0)}</span>
          </div>

          {/* By type breakdown */}
          {Object.keys(stats.byType || {}).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>按類型分析</div>
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: TYPE_COLORS[type] || '#ccc', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ flex: 1, fontSize: '13px', color: '#333' }}>{TYPE_LABELS[type] || type}</span>
                  <span style={{ fontSize: '12px', color: '#777' }}>{data.calls} 次</span>
                  <span style={{ fontSize: '12px', color: '#777' }}>{data.tokens.toLocaleString()} tokens</span>
                  <span style={{ fontSize: '12px', color: '#888', minWidth: '100px', textAlign: 'right' }}>{fmtCost(data.costUSD)}</span>
                </div>
              ))}
            </div>
          )}

          {stats.totalCalls === 0 && (
            <div style={{ textAlign: 'center', color: '#bbb', padding: '24px', fontSize: '14px' }}>
              此期間尚無 AI 呼叫記錄
            </div>
          )}
        </>
      )}
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
// Font size px mapping for preview (LINE sizes → CSS px)
const SIZE_PX = { xs: 10, sm: 11, md: 12, lg: 13, xl: 15, xxl: 18 };
const ALIGN_CSS = { start: 'left', center: 'center', end: 'right' };

// 5 built-in card templates
const CARD_TEMPLATES = {
  classic: {
    name: '經典', desc: '白底居中',
    headerBgColor: '#ffffff', titleColor: '#111111', subtitleColor: '#888888', buttonColor: '#00B900', bodyBgColor: '#ffffff',
    titleFontSize: 'xl', subtitleFontSize: 'sm', priceNameFontSize: 'sm', priceFontSize: 'sm',
    titleAlign: 'center', subtitleAlign: 'center', priceAlign: 'start', showDivider: true
  },
  minimal: {
    name: '極簡', desc: '灰底靠左',
    headerBgColor: '#f5f5f5', titleColor: '#222222', subtitleColor: '#777777', buttonColor: '#424242', bodyBgColor: '#ffffff',
    titleFontSize: 'lg', subtitleFontSize: 'xs', priceNameFontSize: 'sm', priceFontSize: 'sm',
    titleAlign: 'start', subtitleAlign: 'start', priceAlign: 'start', showDivider: false
  },
  bold: {
    name: '粗體', desc: '深色大字',
    headerBgColor: '#1a237e', titleColor: '#ffffff', subtitleColor: '#9fa8da', buttonColor: '#3949ab', bodyBgColor: '#ffffff',
    titleFontSize: 'xxl', subtitleFontSize: 'md', priceNameFontSize: 'sm', priceFontSize: 'lg',
    titleAlign: 'center', subtitleAlign: 'center', priceAlign: 'center', showDivider: true
  },
  priceFocus: {
    name: '價格焦點', desc: '大字顯價格',
    headerBgColor: '#fff8e1', titleColor: '#e65100', subtitleColor: '#999999', buttonColor: '#f57c00', bodyBgColor: '#ffffff',
    titleFontSize: 'lg', subtitleFontSize: 'xs', priceNameFontSize: 'xs', priceFontSize: 'xxl',
    titleAlign: 'center', subtitleAlign: 'center', priceAlign: 'center', showDivider: false
  },
  elegant: {
    name: '優雅', desc: '紫色精緻風',
    headerBgColor: '#f3e5f5', titleColor: '#4a148c', subtitleColor: '#7b1fa2', buttonColor: '#7b1fa2', bodyBgColor: '#fdf6ff',
    titleFontSize: 'xl', subtitleFontSize: 'sm', priceNameFontSize: 'sm', priceFontSize: 'md',
    titleAlign: 'start', subtitleAlign: 'start', priceAlign: 'start', showDivider: true
  }
};

function LineCardPreview({ card }) {
  const hasPrices = card.priceItems && card.priceItems.length > 0;
  const hasButton = card.buttonText && card.buttonUrl;
  const headerBg  = card.headerBgColor || '#ffffff';
  const bodyBg    = card.bodyBgColor   || '#ffffff';
  const titleCol  = card.titleColor    || '#111111';
  const subCol    = card.subtitleColor || '#888888';
  const btnCol    = card.buttonColor   || '#00B900';
  const titlePx   = SIZE_PX[card.titleFontSize    || 'xl']  || 15;
  const subPx     = SIZE_PX[card.subtitleFontSize  || 'sm']  || 11;
  const priceNPx  = SIZE_PX[card.priceNameFontSize || 'sm']  || 11;
  const pricePx   = SIZE_PX[card.priceFontSize     || 'sm']  || 11;
  const titleAl   = ALIGN_CSS[card.titleAlign    || 'center'];
  const subAl     = ALIGN_CSS[card.subtitleAlign || 'center'];
  const priceAl   = card.priceAlign || 'start';
  const divider   = card.showDivider !== false;

  return (
    <div style={{ width: '220px', borderRadius: '14px', overflow: 'hidden',
      boxShadow: '0 4px 18px rgba(0,0,0,0.18)', background: '#fff', flexShrink: 0 }}>
      {card.imageUrl && (
        <div style={{ width: '100%', paddingTop: '65%', position: 'relative', background: '#e8ecf0' }}>
          <img src={card.imageUrl} alt="" onError={e => { e.target.style.display='none'; }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: '14px 14px 12px', background: headerBg }}>
        <div style={{ fontWeight: '700', fontSize: titlePx, color: titleCol, lineHeight: '1.3', wordBreak: 'break-word', textAlign: titleAl }}>
          {card.title || <span style={{ opacity: 0.3 }}>卡片標題</span>}
        </div>
        {card.subtitle && (
          <div style={{ fontSize: subPx, color: subCol, marginTop: '5px', lineHeight: '1.4', wordBreak: 'break-word', textAlign: subAl }}>{card.subtitle}</div>
        )}
      </div>
      {hasPrices && (
        <div style={{ padding: '10px 14px', background: bodyBg }}>
          {divider && <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: '8px' }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {card.priceItems.map((item, i) => (
              priceAl === 'center'
                ? <div key={i} style={{ textAlign: 'center', padding: '2px 0' }}>
                    <div style={{ fontSize: priceNPx, color: '#555' }}>{item.name}</div>
                    <div style={{ fontSize: pricePx, fontWeight: '700', color: '#111' }}>{item.price}</div>
                  </div>
                : <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: priceNPx, color: '#555', flex: 1, wordBreak: 'break-word' }}>{item.name}</span>
                    <span style={{ fontSize: pricePx, fontWeight: '700', color: '#111', flexShrink: 0 }}>{item.price}</span>
                  </div>
            ))}
          </div>
        </div>
      )}
      {hasButton && (
        <div style={{ padding: '0 10px 10px', background: bodyBg }}>
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
  const EMPTY_FORM = {
    title: '', subtitle: '', imageUrl: '', priceItems: [], buttonText: '', buttonUrl: '',
    headerBgColor: '#ffffff', titleColor: '#111111', subtitleColor: '#888888',
    buttonColor: '#00B900', bodyBgColor: '#ffffff',
    template: 'classic',
    titleFontSize: 'xl', subtitleFontSize: 'sm', priceNameFontSize: 'sm', priceFontSize: 'sm',
    titleAlign: 'center', subtitleAlign: 'center', priceAlign: 'start',
    showDivider: true, isActive: true
  };
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
      bodyBgColor: card.bodyBgColor || '#ffffff',
      template: card.template || 'classic',
      titleFontSize: card.titleFontSize || 'xl', subtitleFontSize: card.subtitleFontSize || 'sm',
      priceNameFontSize: card.priceNameFontSize || 'sm', priceFontSize: card.priceFontSize || 'sm',
      titleAlign: card.titleAlign || 'center', subtitleAlign: card.subtitleAlign || 'center',
      priceAlign: card.priceAlign || 'start', showDivider: card.showDivider !== false,
      isActive: card.isActive
    });
    setPriceInput({ name: '', price: '' });
    setShowForm(true);
  }

  function applyTemplate(key) {
    const t = CARD_TEMPLATES[key];
    if (!t) return;
    setForm(p => ({
      ...p, template: key,
      headerBgColor: t.headerBgColor, titleColor: t.titleColor,
      subtitleColor: t.subtitleColor, buttonColor: t.buttonColor, bodyBgColor: t.bodyBgColor,
      titleFontSize: t.titleFontSize, subtitleFontSize: t.subtitleFontSize,
      priceNameFontSize: t.priceNameFontSize, priceFontSize: t.priceFontSize,
      titleAlign: t.titleAlign, subtitleAlign: t.subtitleAlign,
      priceAlign: t.priceAlign, showDivider: t.showDivider
    }));
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

          {/* Template selector */}
          <div style={{ background: '#f7f9fc', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#555', marginBottom: '10px' }}>🎨 排版範本（點擊套用）</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {Object.entries(CARD_TEMPLATES).map(([key, t]) => (
                <div key={key} onClick={() => applyTemplate(key)}
                  style={{ flexShrink: 0, width: '80px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                    border: form.template === key ? '2px solid #2196F3' : '2px solid #e0e0e0',
                    boxShadow: form.template === key ? '0 0 0 2px #bbdefb' : 'none', transition: '0.15s' }}>
                  <div style={{ background: t.headerBgColor, padding: '7px 6px' }}>
                    <div style={{ fontSize: `${SIZE_PX[t.titleFontSize] - 2}px`, fontWeight: '700', color: t.titleColor, textAlign: ALIGN_CSS[t.titleAlign], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>標題</div>
                    <div style={{ fontSize: '9px', color: t.subtitleColor, textAlign: ALIGN_CSS[t.subtitleAlign] }}>副標題</div>
                  </div>
                  <div style={{ background: t.bodyBgColor, padding: '4px 6px' }}>
                    <div style={{ fontSize: `${SIZE_PX[t.priceFontSize]}px`, color: '#333', textAlign: ALIGN_CSS[t.priceAlign], fontWeight: '600' }}>$100</div>
                  </div>
                  <div style={{ background: t.buttonColor, padding: '3px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#fff' }}>按鈕</div>
                  </div>
                  <div style={{ padding: '3px', textAlign: 'center', background: form.template === key ? '#e3f2fd' : '#f5f5f5' }}>
                    <span style={{ fontSize: '10px', color: form.template === key ? '#1565C0' : '#888', fontWeight: form.template === key ? '700' : '400' }}>{t.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Color customization */}
          <div style={{ background: '#f7f9fc', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#555', marginBottom: '10px', letterSpacing: '0.3px' }}>🖌 配色設定</div>
            {[
              { key: 'headerBgColor', label: '標題區背景色' },
              { key: 'titleColor',    label: '標題文字色' },
              { key: 'subtitleColor', label: '副標題文字色' },
              { key: 'buttonColor',   label: '按鈕顏色' },
              { key: 'bodyBgColor',   label: '內容區背景色' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', width: '90px', flexShrink: 0 }}>{label}</span>
                <input type="color" value={form[key] || '#ffffff'}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value, template: 'custom' }))}
                  style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#999', fontFamily: 'monospace' }}>{form[key]}</span>
                <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: form[key], border: '1px solid #e0e0e0' }} />
              </div>
            ))}
          </div>

          {/* Typography & layout */}
          <div style={{ background: '#f7f9fc', borderRadius: '10px', padding: '12px 14px', marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#555', marginBottom: '10px' }}>✏️ 文字大小 &amp; 對齊</div>
            {[
              { label: '標題', sizeKey: 'titleFontSize', alignKey: 'titleAlign' },
              { label: '副標題', sizeKey: 'subtitleFontSize', alignKey: 'subtitleAlign' },
              { label: '價格名稱', sizeKey: 'priceNameFontSize', alignKey: null },
              { label: '價格數字', sizeKey: 'priceFontSize', alignKey: 'priceAlign' },
            ].map(({ label, sizeKey, alignKey }) => (
              <div key={sizeKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', width: '58px', flexShrink: 0 }}>{label}</span>
                <select value={form[sizeKey]} onChange={e => setForm(p => ({ ...p, [sizeKey]: e.target.value, template: 'custom' }))}
                  style={{ padding: '4px 6px', borderRadius: '5px', border: '1px solid #e0e0e0', fontSize: '12px', background: '#fff' }}>
                  {['xs','sm','md','lg','xl','xxl'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {alignKey && (
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[['start','◀'], ['center','■'], ['end','▶']].map(([val, icon]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, [alignKey]: val, template: 'custom' }))}
                        style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid #e0e0e0', fontSize: '11px', cursor: 'pointer', background: form[alignKey] === val ? '#2196F3' : '#fff', color: form[alignKey] === val ? '#fff' : '#666' }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: '#666', width: '58px', flexShrink: 0 }}>分隔線</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                <input type="checkbox" checked={!!form.showDivider}
                  onChange={e => setForm(p => ({ ...p, showDivider: e.target.checked, template: 'custom' }))} />
                顯示標題與品項間的分隔線
              </label>
            </div>
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

      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
        <label style={LABEL}>管理員 LINE User ID（接收訂單通知）</label>
        <input name="adminLineUserId" value={profile.adminLineUserId} onChange={onChange}
          placeholder="例：U1234567890abcdef..." style={{ ...FIELD, marginTop: '4px' }} />
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
          填入後，客戶確認下單時將自動發送 LINE 通知給您。可從 LINE 官方帳號的 Webhook 紀錄取得您的 User ID。
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        {saved && <span style={{ color: '#4CAF50', fontSize: '13px', alignSelf: 'center' }}>✓ 已儲存</span>}
        <button onClick={onSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#00B900', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 4: 標籤管理 ─────────────────────────────────────────────────────────
// ─── Tab 5: 訂購設定 ─────────────────────────────────────────────────────────
function OrderItemsTab() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: '', order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    try {
      const res = await authFetch(`${API_BASE}/api/order-items`);
      setItems(await res.json());
    } catch {}
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', description: '', price: '', unit: '', order: items.length });
    setShowForm(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, description: item.description || '', price: item.price, unit: item.unit || '', order: item.order });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price.trim()) { alert('品項名稱和價格為必填'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/api/order-items/${editing._id}` : `${API_BASE}/api/order-items`;
      const res = await authFetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('操作失敗');
      await loadItems();
      setShowForm(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此品項？')) return;
    await authFetch(`${API_BASE}/api/order-items/${id}`, { method: 'DELETE' });
    await loadItems();
  }

  async function toggleActive(item) {
    await authFetch(`${API_BASE}/api/order-items/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, isActive: !item.isActive })
    });
    await loadItems();
  }

  if (showForm) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999', padding: 0 }}>←</button>
          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{editing ? '編輯品項' : '新增品項'}</span>
        </div>
        <div style={GROUP}><label style={LABEL}>品項名稱 *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="例：美式咖啡、有機蘋果" style={FIELD} /></div>
        <div style={GROUP}><label style={LABEL}>說明（可選）</label>
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="例：手沖、冷萃可選" style={FIELD} /></div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}><label style={LABEL}>價格 *</label>
            <input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="例：$60、150元、報價" style={{ ...FIELD, marginTop: '4px' }} /></div>
          <div style={{ flex: 1 }}><label style={LABEL}>單位（可選）</label>
            <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="例：杯、份、盒、kg" style={{ ...FIELD, marginTop: '4px' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={() => setShowForm(false)} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontSize: '14px', cursor: 'pointer' }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#00B900', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
        設定訂購品項後，可從客戶對話頁面發送「訂購單」給客戶，客戶點擊確認後自動通知您。<br />
        價格欄位可填 $60、150元、面議等任意格式。
      </p>
      {items.length === 0 && (
        <div style={{ textAlign: 'center', color: '#bbb', padding: '24px', fontSize: '14px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #e0e0e0' }}>
          尚無品項，點擊下方新增
        </div>
      )}
      {items.map(item => (
        <div key={item._id} style={{
          padding: '10px 14px', marginBottom: '8px', borderRadius: '8px',
          border: `1px solid ${item.isActive ? '#e0e0e0' : '#f5f5f5'}`,
          backgroundColor: item.isActive ? '#fff' : '#fafafa', opacity: item.isActive ? 1 : 0.6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                {item.name}
                {item.unit && <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '6px' }}>/ {item.unit}</span>}
              </div>
              {item.description && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{item.description}</div>}
            </div>
            <div style={{ fontSize: '14px', color: '#00B900', fontWeight: 'bold', flexShrink: 0 }}>{item.price}</div>
            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
              <button onClick={() => toggleActive(item)} style={{ padding: '3px 8px', borderRadius: '10px', border: 'none', fontSize: '11px', cursor: 'pointer', backgroundColor: item.isActive ? '#e8f5e9' : '#f5f5f5', color: item.isActive ? '#2e7d32' : '#999' }}>
                {item.isActive ? '啟用' : '停用'}
              </button>
              <button onClick={() => openEdit(item)} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>編輯</button>
              <button onClick={() => handleDelete(item._id)} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #ffcdd2', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#e53935' }}>刪除</button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={openNew} style={{ width: '100%', marginTop: '4px', padding: '10px', borderRadius: '8px', border: '2px dashed #e0e0e0', background: '#fff', color: '#00B900', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
        + 新增品項
      </button>
    </div>
  );
}

// ─── Tab 6: FAQ 知識庫 ───────────────────────────────────────────────────────
function FAQTab() {
  const [faqs, setFaqs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFaqs(); }, []);

  async function loadFaqs() {
    try {
      const res = await authFetch(`${API_BASE}/api/faqs`);
      setFaqs(await res.json());
    } catch {}
  }

  function openNew() {
    setEditing(null);
    setForm({ question: '', answer: '', order: faqs.length });
    setShowForm(true);
  }

  function openEdit(faq) {
    setEditing(faq);
    setForm({ question: faq.question, answer: faq.answer, order: faq.order });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) { alert('問題和回答皆為必填'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/api/faqs/${editing._id}` : `${API_BASE}/api/faqs`;
      const res = await authFetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('操作失敗');
      await loadFaqs();
      setShowForm(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此問答？')) return;
    try {
      await authFetch(`${API_BASE}/api/faqs/${id}`, { method: 'DELETE' });
      await loadFaqs();
    } catch (err) { alert('刪除失敗'); }
  }

  async function toggleActive(faq) {
    try {
      await authFetch(`${API_BASE}/api/faqs/${faq._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...faq, isActive: !faq.isActive })
      });
      await loadFaqs();
    } catch {}
  }

  if (showForm) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999', padding: 0 }}>←</button>
          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{editing ? '編輯問答' : '新增問答'}</span>
        </div>
        <div style={GROUP}>
          <label style={LABEL}>問題 *</label>
          <textarea value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
            placeholder="例：你們幾點開門？" rows={2} style={FIELD} />
        </div>
        <div style={GROUP}>
          <label style={LABEL}>回答 *</label>
          <textarea value={form.answer} onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
            placeholder="例：週一至週五 10:00–20:00，週末 11:00–19:00" rows={4} style={FIELD} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={() => setShowForm(false)} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontSize: '14px', cursor: 'pointer' }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: saving ? '#b0bec5' : '#00B900', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: '#888', marginTop: 0, marginBottom: '16px' }}>
        新增結構化問答對，AI 回覆時會優先參考這些 Q&A，比純文字知識庫更精準。
      </p>
      {faqs.length === 0 && (
        <div style={{ textAlign: 'center', color: '#bbb', padding: '24px', fontSize: '14px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #e0e0e0' }}>
          尚無問答，點擊下方新增第一筆
        </div>
      )}
      {faqs.map((faq, i) => (
        <div key={faq._id} style={{
          padding: '12px 14px', marginBottom: '8px', borderRadius: '8px',
          border: `1px solid ${faq.isActive ? '#e0e0e0' : '#f5f5f5'}`,
          backgroundColor: faq.isActive ? '#fff' : '#fafafa',
          opacity: faq.isActive ? 1 : 0.6
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1565c0', marginBottom: '4px' }}>
                Q: {faq.question}
              </div>
              <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                A: {faq.answer}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
              <button onClick={() => toggleActive(faq)} style={{
                padding: '3px 8px', borderRadius: '10px', border: 'none', fontSize: '11px', cursor: 'pointer',
                backgroundColor: faq.isActive ? '#e8f5e9' : '#f5f5f5',
                color: faq.isActive ? '#2e7d32' : '#999'
              }}>{faq.isActive ? '啟用' : '停用'}</button>
              <button onClick={() => openEdit(faq)} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>編輯</button>
              <button onClick={() => handleDelete(faq._id)} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #ffcdd2', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#e53935' }}>刪除</button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={openNew} style={{ width: '100%', marginTop: '4px', padding: '10px', borderRadius: '8px', border: '2px dashed #e0e0e0', background: '#fff', color: '#00B900', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
        + 新增問答
      </button>
    </div>
  );
}

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
    faq: '', toneNote: '', autoReply: false, autoReplyDelay: 60, adminLineUserId: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/settings`).then(r => r.json()).then(data => {
      setProfile({
        shopName: data.shopName || '', industry: data.industry || '',
        products: data.products || '', businessHours: data.businessHours || '',
        address: data.address || '', faq: data.faq || '', toneNote: data.toneNote || '',
        autoReply: data.autoReply || false, autoReplyDelay: data.autoReplyDelay || 60,
        adminLineUserId: data.adminLineUserId || ''
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
    { key: 'profile',    label: '知識庫' },
    { key: 'faq',        label: 'FAQ' },
    { key: 'orderItems', label: '訂購品項' },
    { key: 'cards',      label: '商品卡片' },
    { key: 'keywords',   label: '關鍵字' },
    { key: 'autoReply',  label: '自動回覆' },
    { key: 'labels',     label: '標籤' },
    { key: 'aiStats',    label: '📊 AI 用量' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }} onClick={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: '14px', width: '640px', maxWidth: '100%', maxHeight: 'calc(100dvh - 20px)', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>⚙ 系統設定</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#bbb', lineHeight: 1, padding: '0 4px' }}>✕</button>
        </div>

        {/* Tabs — horizontally scrollable for mobile */}
        <style>{`.settings-tabs::-webkit-scrollbar { display: none; }`}</style>
        <div className="settings-tabs" style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flexShrink: 0, padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: tab === t.key ? '700' : '400',
              color: tab === t.key ? '#2196F3' : '#777',
              borderBottom: tab === t.key ? '2px solid #2196F3' : '2px solid transparent',
              whiteSpace: 'nowrap', transition: 'color 0.12s'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {tab === 'profile'    && <ProfileTab profile={profile} onChange={handleChange} onSave={handleSave} saving={saving} saved={saved} />}
          {tab === 'faq'        && <FAQTab />}
          {tab === 'orderItems' && <OrderItemsTab />}
          {tab === 'cards'      && <CardTab />}
          {tab === 'keywords'   && <KeywordTab />}
          {tab === 'autoReply'  && <AutoReplyTab profile={profile} onChange={handleChange} onSave={handleSave} saving={saving} saved={saved} />}
          {tab === 'labels'     && <LabelTab />}
          {tab === 'aiStats'    && <AIStatsTab />}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
