const OpenAI = require('openai');
const AIUsageLog = require('../models/AIUsageLog');

const FALLBACK_REPLIES = ['', '', ''];

// GPT pricing per 1M tokens (USD): input / output
const PRICING = {
  'gpt-4o':      { input: 2.50,  output: 10.00 },
  'gpt-4o-mini': { input: 0.15,  output:  0.60 },
};

function logUsage(type, model, usage) {
  if (!usage) return;
  const p = PRICING[model] || PRICING['gpt-4o'];
  const cost = ((usage.prompt_tokens || 0) * p.input + (usage.completion_tokens || 0) * p.output) / 1_000_000;
  AIUsageLog.create({
    type, model,
    promptTokens:     usage.prompt_tokens     || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens:      usage.total_tokens      || 0,
    estimatedCostUSD: cost
  }).catch(() => {});
}

function buildBasePrompt(bp, faqs = []) {
  if (!bp || !bp.shopName) {
    return '你是一個專業的客服助理。';
  }
  const lines = [`你是「${bp.shopName}」的專業客服助理。`];
  if (bp.industry)      lines.push(`📌 行業：${bp.industry}`);
  if (bp.address)       lines.push(`📍 地址：${bp.address}`);
  if (bp.businessHours) lines.push(`🕐 營業時間：${bp.businessHours}`);
  if (bp.products)      lines.push(`📦 商品／服務：\n${bp.products}`);
  if (bp.toneNote)      lines.push(`💬 回覆風格：${bp.toneNote}`);
  // 結構化 FAQ 優先；若無則回退舊版純文字欄位
  if (faqs.length > 0) {
    const faqText = faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    lines.push(`❓ 常見問題（請優先參考以下 Q&A 回答）：\n${faqText}`);
  } else if (bp.faq) {
    lines.push(`❓ 常見問題：\n${bp.faq}`);
  }
  return lines.join('\n');
}

// Async: summarize a conversation and return concise summary string
async function summarizeConversation(messages, existingSummary = '', displayName = '') {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const transcript = messages
    .map(m => m.isProactive
      ? `客服：${m.selectedReply}`
      : `客戶：${m.userMessage}${m.selectedReply ? `\n客服：${m.selectedReply}` : ''}`)
    .join('\n');

  const systemPrompt = `你是對話記錄摘要助手。請根據以下對話，更新並生成一份精簡摘要（繁體中文，100 字以內）。
摘要應包含：客戶的主要需求、偏好、已確認的事項、尚未解決的問題。
${existingSummary ? `\n現有摘要（請在此基礎上更新）：\n${existingSummary}` : ''}
只回傳摘要文字，不要任何說明或標題。`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `客戶名稱：${displayName}\n\n對話記錄：\n${transcript}` }
      ],
      max_tokens: 200
    });
    logUsage('summarize', 'gpt-4o-mini', response.usage);
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('[OpenAI] Summary error:', err.message);
    return existingSummary;
  }
}

// Used by /api/conversations/:lineUserId/suggest  (returns string[])
// intent = 'purchase' → sales-closing replies; 'scheduling' → calendar-aware replies
async function generateReplies(userMessage, businessProfile, intent = 'none', faqs = [], conversationSummary = '', scheduleContext = '') {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const intentNote = intent === 'purchase'
    ? '\n⚠️ 此客戶已表現出明確的購買意圖。請生成 3 條偏向促成交易的回覆建議，內容應包含引導下單步驟、確認規格數量、付款方式說明，或讓客戶安心購買的保證話術。'
    : intent === 'scheduling'
      ? '\n⚠️ 此客戶詢問預約或時間安排。請根據下方【可預約時間資訊】生成 3 條回覆，具體說明可預約的時段，語氣自然親切。'
      : '\n根據以上店家資訊與用戶訊息，生成 3 條適合的回覆建議，每條風格略有不同（正式、親切、簡潔）。';

  const summarySection = conversationSummary
    ? `\n\n【此客戶對話背景摘要】\n${conversationSummary}\n`
    : '';

  const scheduleSection = scheduleContext ? `\n\n${scheduleContext}\n` : '';

  const systemPrompt = buildBasePrompt(businessProfile, faqs) + summarySection + scheduleSection + intentNote + `
注意：用戶訊息中若有「[訊息1]」「[訊息2]」等系統標記，代表客人分段傳送的多則訊息，請根據整體語意回覆，回覆中不要出現這些標記。
只回傳 JSON 格式，不要其他說明。
格式：{ "replies": ["回覆1", "回覆2", "回覆3"] }`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });
    logUsage('generate', 'gpt-4o', response.usage);
    const parsed = JSON.parse(response.choices[0].message.content);
    if (Array.isArray(parsed.replies) && parsed.replies.length === 3) return parsed.replies;
    return FALLBACK_REPLIES;
  } catch (err) {
    console.error('[OpenAI] Error generating replies:', err.message);
    return FALLBACK_REPLIES;
  }
}

// Used by webhook — returns { replies, urgency, intent, keywordMatch }
async function analyzeMessage(userMessage, businessProfile, keywords = [], faqs = [], conversationSummary = '') {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const basePrompt = buildBasePrompt(businessProfile, faqs);

  const summarySection = conversationSummary
    ? `\n\n【此客戶對話背景摘要】\n${conversationSummary}\n`
    : '';

  let keywordSection = '';
  if (keywords.length > 0) {
    const list = keywords.map((k, i) => {
      const replyPart = k.replyType === 'card'
        ? '（回覆方式：卡片訊息）'
        : `→ 預設回覆：「${k.reply}」`;
      return `${i + 1}. 觸發主題：「${k.trigger}」${replyPart}`;
    }).join('\n');
    keywordSection = `
【語意關鍵字匹配】
以下是預設的關鍵字觸發回覆。請判斷用戶訊息是否在語意上符合任何一個觸發主題（不需要文字完全一樣）：
${list}
若有匹配，在 keywordMatch 回傳 { "trigger": "...", "reply": "預設回覆文字，卡片類型填空字串" }；否則填 null。`;
  }

  const systemPrompt = `${basePrompt}${summarySection}
${keywordSection}

【情緒分析】
判斷用戶訊息的緊急程度，填入 urgency 欄位：
- "angry"：語氣憤怒、強烈不滿、情緒激動、抱怨
- "urgent"：有急迫需求、趕時間、反覆追問
- "normal"：一般詢問、平和語氣

【意圖偵測】
判斷用戶訊息的主要意圖，填入 intent 欄位：
- "purchase"：明確表示要買、要訂、詢問付款方式、確認數量規格準備下單、說「我要了」「幫我訂」「怎麼付款」等
- "scheduling"：詢問預約、約時間、幾時有空、能不能預約、想安排時間到店等
- "none"：一般詢問，無購買或預約意圖

【回覆建議】
根據店家資訊與用戶訊息，生成 3 條回覆建議（正式、親切、簡潔）。

只回傳 JSON，不要其他說明。格式：
{
  "replies": ["正式版回覆", "親切版回覆", "簡潔版回覆"],
  "urgency": "normal",
  "intent": "none",
  "keywordMatch": null
}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });
    logUsage('analyze', 'gpt-4o', response.usage);
    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      replies: Array.isArray(parsed.replies) && parsed.replies.length === 3
        ? parsed.replies : FALLBACK_REPLIES,
      urgency: ['normal', 'urgent', 'angry'].includes(parsed.urgency) ? parsed.urgency : 'normal',
      intent:  ['none', 'purchase', 'scheduling'].includes(parsed.intent) ? parsed.intent : 'none',
      keywordMatch: parsed.keywordMatch || null
    };
  } catch (err) {
    console.error('[OpenAI] Error analyzing message:', err.message);
    return { replies: FALLBACK_REPLIES, urgency: 'normal', intent: 'none', keywordMatch: null };
  }
}

module.exports = { generateReplies, analyzeMessage, summarizeConversation };
