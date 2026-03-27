const OpenAI = require('openai');

const FALLBACK_REPLIES = ['', '', ''];

function buildBasePrompt(bp) {
  if (!bp || !bp.shopName) {
    return '你是一個專業的客服助理。';
  }
  const lines = [`你是「${bp.shopName}」的專業客服助理。`];
  if (bp.industry)      lines.push(`📌 行業：${bp.industry}`);
  if (bp.address)       lines.push(`📍 地址：${bp.address}`);
  if (bp.businessHours) lines.push(`🕐 營業時間：${bp.businessHours}`);
  if (bp.products)      lines.push(`📦 商品／服務：\n${bp.products}`);
  if (bp.faq)           lines.push(`❓ 常見問題：\n${bp.faq}`);
  if (bp.toneNote)      lines.push(`💬 回覆風格：${bp.toneNote}`);
  return lines.join('\n');
}

// Used by /api/conversations/:lineUserId/suggest  (returns string[])
async function generateReplies(userMessage, businessProfile) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const systemPrompt = buildBasePrompt(businessProfile) + `

根據以上店家資訊與用戶訊息，生成 3 條適合的回覆建議，每條風格略有不同（正式、親切、簡潔）。
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
    const parsed = JSON.parse(response.choices[0].message.content);
    if (Array.isArray(parsed.replies) && parsed.replies.length === 3) return parsed.replies;
    return FALLBACK_REPLIES;
  } catch (err) {
    console.error('[OpenAI] Error generating replies:', err.message);
    return FALLBACK_REPLIES;
  }
}

// Used by webhook — returns { replies, urgency, keywordMatch }
async function analyzeMessage(userMessage, businessProfile, keywords = []) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const basePrompt = buildBasePrompt(businessProfile);

  let keywordSection = '';
  if (keywords.length > 0) {
    const list = keywords.map((k, i) => `${i + 1}. 觸發主題：「${k.trigger}」→ 預設回覆：「${k.reply}」`).join('\n');
    keywordSection = `
【語意關鍵字匹配】
以下是預設的關鍵字觸發回覆。請判斷用戶訊息是否在語意上符合任何一個觸發主題（不需要文字完全一樣）：
${list}
若有匹配，在 keywordMatch 回傳 { "trigger": "...", "reply": "..." }；否則填 null。`;
  }

  const systemPrompt = `${basePrompt}
${keywordSection}

【情緒分析】
判斷用戶訊息的緊急程度，填入 urgency 欄位：
- "angry"：語氣憤怒、強烈不滿、情緒激動、抱怨
- "urgent"：有急迫需求、趕時間、反覆追問
- "normal"：一般詢問、平和語氣

【回覆建議】
根據店家資訊與用戶訊息，生成 3 條回覆建議（正式、親切、簡潔）。

只回傳 JSON，不要其他說明。格式：
{
  "replies": ["正式版回覆", "親切版回覆", "簡潔版回覆"],
  "urgency": "normal",
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
    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      replies: Array.isArray(parsed.replies) && parsed.replies.length === 3
        ? parsed.replies : FALLBACK_REPLIES,
      urgency: ['normal', 'urgent', 'angry'].includes(parsed.urgency) ? parsed.urgency : 'normal',
      keywordMatch: parsed.keywordMatch || null
    };
  } catch (err) {
    console.error('[OpenAI] Error analyzing message:', err.message);
    return { replies: FALLBACK_REPLIES, urgency: 'normal', keywordMatch: null };
  }
}

module.exports = { generateReplies, analyzeMessage };
