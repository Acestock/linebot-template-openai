const OpenAI = require('openai');

const FALLBACK_REPLIES = ['', '', ''];

function buildSystemPrompt(bp) {
  if (!bp || !bp.shopName) {
    return `
你是一個專業的客服助理。
根據用戶的訊息，生成 3 條適合的回覆建議。
每條回覆風格略有不同（正式、親切、簡潔）。
只回傳 JSON 格式，不要其他說明。
格式：{ "replies": ["回覆1", "回覆2", "回覆3"] }
`.trim();
  }

  const lines = [`你是「${bp.shopName}」的專業客服助理。`];
  if (bp.industry)       lines.push(`📌 行業：${bp.industry}`);
  if (bp.address)        lines.push(`📍 地址：${bp.address}`);
  if (bp.businessHours)  lines.push(`🕐 營業時間：${bp.businessHours}`);
  if (bp.products)       lines.push(`📦 商品／服務：\n${bp.products}`);
  if (bp.faq)            lines.push(`❓ 常見問題：\n${bp.faq}`);
  if (bp.toneNote)       lines.push(`💬 回覆風格：${bp.toneNote}`);

  lines.push('');
  lines.push('根據以上店家資訊與用戶訊息，生成 3 條適合的回覆建議，每條風格略有不同（正式、親切、簡潔）。');
  lines.push('只回傳 JSON 格式，不要其他說明。');
  lines.push('格式：{ "replies": ["回覆1", "回覆2", "回覆3"] }');

  return lines.join('\n');
}

async function generateReplies(userMessage, businessProfile) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(businessProfile) },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed.replies) && parsed.replies.length === 3) {
      return parsed.replies;
    }
    return FALLBACK_REPLIES;
  } catch (err) {
    console.error('[OpenAI] Error generating replies:', err.message);
    return FALLBACK_REPLIES;
  }
}

module.exports = { generateReplies };
