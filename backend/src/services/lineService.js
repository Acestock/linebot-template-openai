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

// Push plain text message to user
async function pushMessage(lineUserId, text) {
  const client = getClient();
  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: 'text', text }]
  });
}

// Build LINE Flex Message bubble from a ProductCard document
function buildFlexBubble(card) {
  const bodyContents = [
    { type: 'text', text: card.title, weight: 'bold', size: 'xl', wrap: true }
  ];

  if (card.subtitle) {
    bodyContents.push({
      type: 'text', text: card.subtitle,
      color: '#666666', size: 'sm', wrap: true, margin: 'sm'
    });
  }

  if (card.priceItems && card.priceItems.length > 0) {
    bodyContents.push({ type: 'separator', margin: 'lg', color: '#f0f0f0' });
    bodyContents.push({
      type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm',
      contents: card.priceItems.map(item => ({
        type: 'box', layout: 'horizontal',
        contents: [
          { type: 'text', text: item.name,  color: '#555555', size: 'sm', flex: 3, wrap: true },
          { type: 'text', text: item.price, color: '#111111', size: 'sm', flex: 2, align: 'end' }
        ]
      }))
    });
  }

  const bubble = {
    type: 'bubble',
    body: { type: 'box', layout: 'vertical', contents: bodyContents }
  };

  if (card.imageUrl) {
    bubble.hero = {
      type: 'image', url: card.imageUrl,
      size: 'full', aspectRatio: '20:13', aspectMode: 'cover'
    };
  }

  if (card.buttonUrl && card.buttonText) {
    bubble.footer = {
      type: 'box', layout: 'vertical', spacing: 'sm',
      contents: [{
        type: 'button', style: 'primary', color: '#00B900',
        action: { type: 'uri', label: card.buttonText, uri: card.buttonUrl }
      }]
    };
  }

  return bubble;
}

// Push Flex Message card to user
async function pushFlexCard(lineUserId, card) {
  const client = getClient();
  await client.pushMessage({
    to: lineUserId,
    messages: [{
      type: 'flex',
      altText: card.title,
      contents: buildFlexBubble(card)
    }]
  });
}

module.exports = { getUserProfile, pushMessage, pushFlexCard };
