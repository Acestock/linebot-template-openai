const line = require('@line/bot-sdk');
const https = require('https');

function getClient() {
  return new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
  });
}

// ─── LINE API helper (bypasses SDK for rich menu operations) ─────────────────

function lineApiJson(method, path, body = null) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const bodyStr = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.line.me',
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve({}); }
        } else {
          let msg = `LINE API ${res.statusCode}`;
          try {
            const parsed = JSON.parse(data);
            if (parsed.message) msg += `: ${parsed.message}`;
            else msg += `: ${data}`;
          } catch { msg += `: ${data}`; }
          reject(new Error(msg));
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Rich Menu ──────────────────────────────────────────────────────────────

const RICH_MENU_TEMPLATES = {
  grid3: {
    name: '三欄選單',
    desc: '橫向三等分，適合主要功能入口',
    size: { width: 2500, height: 843 },
    areas: [
      { bounds: { x: 0,    y: 0, width: 833,  height: 843 } },
      { bounds: { x: 833,  y: 0, width: 834,  height: 843 } },
      { bounds: { x: 1667, y: 0, width: 833,  height: 843 } }
    ]
  },
  grid6: {
    name: '六宮格',
    desc: '2 列 × 3 欄，功能最豐富',
    size: { width: 2500, height: 1686 },
    areas: [
      { bounds: { x: 0,    y: 0,    width: 833,  height: 843 } },
      { bounds: { x: 833,  y: 0,    width: 834,  height: 843 } },
      { bounds: { x: 1667, y: 0,    width: 833,  height: 843 } },
      { bounds: { x: 0,    y: 843,  width: 833,  height: 843 } },
      { bounds: { x: 833,  y: 843,  width: 834,  height: 843 } },
      { bounds: { x: 1667, y: 843,  width: 833,  height: 843 } }
    ]
  },
  large2: {
    name: '大圖 + 雙欄',
    desc: '左側大圖 + 右側兩個按鈕',
    size: { width: 2500, height: 843 },
    areas: [
      { bounds: { x: 0,    y: 0,   width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 0,   width: 1250, height: 422 } },
      { bounds: { x: 1250, y: 422, width: 1250, height: 421 } }
    ]
  },
  grid4: {
    name: '四宮格',
    desc: '2 列 × 2 欄，視覺清晰',
    size: { width: 2500, height: 1686 },
    areas: [
      { bounds: { x: 0,    y: 0,    width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 0,    width: 1250, height: 843 } },
      { bounds: { x: 0,    y: 843,  width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 843,  width: 1250, height: 843 } }
    ]
  }
};

function getRichMenuTemplates() {
  return Object.entries(RICH_MENU_TEMPLATES).map(([key, t]) => ({
    key, name: t.name, desc: t.desc,
    buttonCount: t.areas.length,
    size: t.size
  }));
}

async function createRichMenu({ templateKey, buttons, chatBarText }) {
  const tmpl = RICH_MENU_TEMPLATES[templateKey];
  if (!tmpl) throw new Error('Unknown template: ' + templateKey);

  const areas = tmpl.areas.map((area, i) => {
    const btn = buttons[i] || {};
    let action;
    if (btn.actionType === 'message') {
      action = { type: 'message', label: btn.label || `按鈕${i + 1}`, text: btn.text || btn.label || `按鈕${i + 1}` };
    } else if (btn.actionType === 'postback') {
      action = { type: 'postback', label: btn.label || `按鈕${i + 1}`, data: btn.data || 'action=none', displayText: btn.label || `按鈕${i + 1}` };
    } else {
      action = { type: 'uri', label: btn.label || `按鈕${i + 1}`, uri: btn.uri || 'https://line.me' };
    }
    return { bounds: area.bounds, action };
  });

  const richMenu = {
    size: tmpl.size,
    selected: true,
    name: chatBarText || '選單',
    chatBarText: chatBarText || '選單',
    areas
  };

  const result = await lineApiJson('POST', '/v2/bot/richmenu', richMenu);
  return result.richMenuId;
}

async function listRichMenus() {
  try {
    const result = await lineApiJson('GET', '/v2/bot/richmenu/list');
    return result.richmenus || [];
  } catch {
    return [];
  }
}

async function deleteRichMenuById(richMenuId) {
  await lineApiJson('DELETE', `/v2/bot/richmenu/${richMenuId}`);
}

async function setDefaultRichMenuById(richMenuId) {
  await lineApiJson('POST', `/v2/bot/user/all/richmenu/${richMenuId}`);
}

async function cancelDefaultRichMenuAll() {
  await lineApiJson('DELETE', '/v2/bot/user/all/richmenu');
}

async function getRichMenu(richMenuId) {
  return lineApiJson('GET', `/v2/bot/richmenu/${richMenuId}`);
}

async function getDefaultRichMenuId() {
  try {
    const result = await lineApiJson('GET', '/v2/bot/user/all/richmenu');
    return result.richMenuId || null;
  } catch {
    return null;
  }
}

async function createRichMenuRaw(definition) {
  const result = await lineApiJson('POST', '/v2/bot/richmenu', definition);
  return result.richMenuId;
}

// Upload image from a public URL → LINE rich menu image endpoint
async function uploadRichMenuImageFromUrl(richMenuId, imageUrl) {
  const imgData = await fetchUrlBuffer(imageUrl);
  const contentType = imgData.contentType || 'image/jpeg';
  return uploadRichMenuImageBuffer(richMenuId, imgData.buffer, contentType);
}

function fetchUrlBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrlBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      const contentType = res.headers['content-type'] || 'image/jpeg';
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function uploadRichMenuImageBuffer(richMenuId, buffer, contentType) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api-data.line.me',
      path: `/v2/bot/richmenu/${richMenuId}/content`,
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${token}`,
        'Content-Length': buffer.length
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error(`LINE image upload failed: ${res.statusCode} ${body}`));
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

// Fetch rich menu image buffer from LINE (requires auth)
function getRichMenuImageBuffer(richMenuId) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api-data.line.me',
      path: `/v2/bot/richmenu/${richMenuId}/content`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      if (res.statusCode === 404 || res.statusCode === 400) {
        reject(new Error('No image uploaded for this rich menu'));
        res.resume();
        return;
      }
      const chunks = [];
      const contentType = res.headers['content-type'] || 'image/jpeg';
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
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

// Push a pre-built LINE message object (flex, image, etc.)
async function pushLineMessage(lineUserId, messageObj) {
  const client = getClient();
  await client.pushMessage({
    to: lineUserId,
    messages: [messageObj]
  });
}

// Build LINE Flex Message bubble from a ProductCard document
function buildFlexBubble(card) {
  const headerBgColor    = card.headerBgColor    || '#ffffff';
  const titleColor       = card.titleColor       || '#111111';
  const subtitleColor    = card.subtitleColor    || '#888888';
  const buttonColor      = card.buttonColor      || '#00B900';
  const bodyBgColor      = card.bodyBgColor      || '#ffffff';
  const titleFontSize    = card.titleFontSize    || 'xl';
  const subtitleFontSize = card.subtitleFontSize || 'sm';
  const priceNameSize    = card.priceNameFontSize || 'sm';
  const priceSize        = card.priceFontSize    || 'sm';
  const titleAlign       = card.titleAlign       || 'center';
  const subtitleAlign    = card.subtitleAlign    || 'center';
  const priceAlign       = card.priceAlign       || 'start';
  const showDivider      = card.showDivider !== false;

  // Header section: title + subtitle
  const headerContents = [
    { type: 'text', text: card.title, weight: 'bold', size: titleFontSize, wrap: true, color: titleColor, align: titleAlign }
  ];
  if (card.subtitle) {
    headerContents.push({
      type: 'text', text: card.subtitle,
      size: subtitleFontSize, wrap: true, margin: 'sm', color: subtitleColor, align: subtitleAlign
    });
  }

  // Body section: optional divider + price items
  const bodyContents = [];
  if (card.priceItems && card.priceItems.length > 0) {
    if (showDivider) bodyContents.push({ type: 'separator', margin: 'none' });

    const priceRows = priceAlign === 'center'
      ? card.priceItems.map(item => ({
          type: 'box', layout: 'vertical', alignItems: 'center', margin: 'sm',
          contents: [
            { type: 'text', text: item.name,  color: '#555555', size: priceNameSize, align: 'center', wrap: true },
            { type: 'text', text: item.price, color: '#111111', size: priceSize, align: 'center', weight: 'bold', margin: 'xs' }
          ]
        }))
      : card.priceItems.map(item => ({
          type: 'box', layout: 'horizontal',
          contents: [
            { type: 'text', text: item.name,  color: '#555555', size: priceNameSize, flex: 3, wrap: true },
            { type: 'text', text: item.price, color: '#111111', size: priceSize,     flex: 2, align: 'end', weight: 'bold' }
          ]
        }));

    bodyContents.push({ type: 'box', layout: 'vertical', spacing: 'sm', contents: priceRows });
  }

  const bubble = {
    type: 'bubble',
    styles: {
      header: { backgroundColor: headerBgColor },
      body:   { backgroundColor: bodyBgColor }
    },
    header: {
      type: 'box', layout: 'vertical', paddingAll: '16px',
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
    bubble.body = { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '14px', contents: bodyContents };
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

// Build and push an order card (Flex Message) to customer
function buildOrderFlexMessage(items, shopName) {
  const rows = items.map(item => ({
    type: 'box', layout: 'horizontal', paddingTop: '8px',
    contents: [
      {
        type: 'box', layout: 'vertical', flex: 3,
        contents: [
          { type: 'text', text: item.name, size: 'sm', color: '#222222', wrap: true, weight: 'bold' },
          ...(item.description ? [{ type: 'text', text: item.description, size: 'xs', color: '#888888', wrap: true }] : [])
        ]
      },
      {
        type: 'box', layout: 'vertical', flex: 2, alignItems: 'flex-end',
        contents: [
          { type: 'text', text: item.price, size: 'sm', color: '#00B900', weight: 'bold', align: 'end' },
          ...(item.unit ? [{ type: 'text', text: `/ ${item.unit}`, size: 'xs', color: '#aaaaaa', align: 'end' }] : [])
        ]
      }
    ]
  }));

  // Insert dividers between rows
  const bodyContents = [];
  rows.forEach((row, i) => {
    bodyContents.push(row);
    if (i < rows.length - 1) bodyContents.push({ type: 'separator', margin: 'sm' });
  });

  return {
    type: 'bubble',
    styles: { header: { backgroundColor: '#00B900' } },
    header: {
      type: 'box', layout: 'vertical', paddingAll: '14px',
      contents: [
        { type: 'text', text: '📋 訂購單', color: '#ffffff', size: 'lg', weight: 'bold' },
        { type: 'text', text: shopName || '歡迎選購', color: '#d0f5d0', size: 'xs', margin: 'xs' }
      ]
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: '14px',
      contents: [
        ...bodyContents,
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '請點擊下方按鈕確認您有意願下單，我們將與您確認細節。', size: 'xs', color: '#888888', wrap: true, margin: 'lg' }
      ]
    },
    footer: {
      type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
      contents: [{
        type: 'button', style: 'primary', color: '#00B900', height: 'sm',
        action: { type: 'postback', label: '✓ 確認下單', data: 'action=order_confirm', displayText: '我想下單' }
      }]
    }
  };
}

async function pushOrderCard(lineUserId, items, shopName) {
  const client = getClient();
  const bubble = buildOrderFlexMessage(items, shopName);
  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: 'flex', altText: `📋 ${shopName || '店家'} 訂購單 — 點擊查看品項`, contents: bubble }]
  });
}

module.exports = {
  getUserProfile, pushMessage, pushLineMessage, pushFlexCard, pushOrderCard,
  getRichMenuTemplates, createRichMenu, createRichMenuRaw, listRichMenus,
  deleteRichMenuById, setDefaultRichMenuById, cancelDefaultRichMenuAll,
  getRichMenu, getDefaultRichMenuId,
  uploadRichMenuImageFromUrl, getRichMenuImageBuffer
};
