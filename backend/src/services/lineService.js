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
  const headerBgColor = card.headerBgColor || '#ffffff';
  const titleColor    = card.titleColor    || '#111111';
  const subtitleColor = card.subtitleColor || '#888888';
  const buttonColor   = card.buttonColor   || '#00B900';

  // Header section: title + subtitle with custom background
  const headerContents = [
    { type: 'text', text: card.title, weight: 'bold', size: 'xl', wrap: true, color: titleColor }
  ];
  if (card.subtitle) {
    headerContents.push({
      type: 'text', text: card.subtitle,
      size: 'sm', wrap: true, margin: 'sm', color: subtitleColor
    });
  }

  // Body section: price items only
  const bodyContents = [];
  if (card.priceItems && card.priceItems.length > 0) {
    bodyContents.push({
      type: 'box', layout: 'vertical', spacing: 'sm',
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
    styles: {
      header: { backgroundColor: headerBgColor },
      body:   { backgroundColor: '#ffffff' }
    },
    header: {
      type: 'box', layout: 'vertical',
      paddingAll: '16px',
      contents: headerContents
    }
  };

  if (card.imageUrl) {
    bubble.hero = {
      type: 'image', url: card.imageUrl,
      size: 'full', aspectRatio: '20:13', aspectMode: 'cover'
    };
  }

  if (bodyContents.length > 0) {
    bubble.body = { type: 'box', layout: 'vertical', contents: bodyContents };
  }

  if (card.buttonUrl && card.buttonText) {
    bubble.footer = {
      type: 'box', layout: 'vertical', spacing: 'sm',
      contents: [{
        type: 'button', style: 'primary', color: buttonColor,
        action: { type: 'uri', label: card.buttonText, uri: card.buttonUrl }
      }]
    };
  }

  return bubble;
}

// Push Flex Message card(s) to user — single bubble or carousel for multiple
async function pushFlexCard(lineUserId, cards) {
  const client = getClient();
  const cardArray = Array.isArray(cards) ? cards : [cards];
  const contents = cardArray.length === 1
    ? buildFlexBubble(cardArray[0])
    : { type: 'carousel', contents: cardArray.map(buildFlexBubble) };

  await client.pushMessage({
    to: lineUserId,
    messages: [{
      type: 'flex',
      altText: cardArray.map(c => c.title).join('、'),
      contents
    }]
  });
}

module.exports = { getUserProfile, pushMessage, pushFlexCard };
