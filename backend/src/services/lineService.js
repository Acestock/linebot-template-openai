const line = require('@line/bot-sdk');

function getClient() {
  return new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
  });
}

async function getUserProfile(userId) {
  try {
    const client = getClient();
    return await client.getProfile(userId);
  } catch (err) {
    console.error('[LINE] Failed to get user profile:', err.message);
    return { displayName: 'Unknown' };
  }
}

// Push message to user (no replyToken needed - use this in admin send endpoint)
// replyToken expires in 5 minutes; agents will almost always exceed that window
async function pushMessage(lineUserId, text) {
  const client = getClient();
  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: 'text', text }]
  });
}

module.exports = { getUserProfile, pushMessage };
