const line = require('@line/bot-sdk');

function getClient() {
  return new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
  });
}

async function sendReply(replyToken, text) {
  const client = getClient();
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }]
  });
}

module.exports = { sendReply };
