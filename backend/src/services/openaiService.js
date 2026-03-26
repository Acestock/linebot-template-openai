const OpenAI = require('openai');

const FALLBACK_REPLIES = ['', '', ''];

const systemPrompt = `
你是一個專業的客服助理。
根據用戶的訊息，生成 3 條適合的回覆建議。
每條回覆風格略有不同（正式、親切、簡潔）。
只回傳 JSON 格式，不要其他說明。
格式：{ "replies": ["回覆1", "回覆2", "回覆3"] }
`;

async function generateReplies(userMessage) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
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
