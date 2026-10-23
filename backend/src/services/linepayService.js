const crypto = require('crypto');
const https = require('https');

// LINE Pay Online API v3
// Docs: https://developers.line.biz/en/docs/line-pay/

const getCfg = () => ({
  channelId:     process.env.LINEPAY_CHANNEL_ID     || '',
  channelSecret: process.env.LINEPAY_CHANNEL_SECRET || '',
  hostname: process.env.LINEPAY_SANDBOX === 'false'
    ? 'api-pay.line.me'
    : 'sandbox-api-pay.line.me'
});

// HMAC-SHA256(ChannelSecret, ChannelSecret + URI + RequestBody + Nonce) → Base64
function genSignature(channelSecret, path, bodyStr, nonce) {
  const base = channelSecret + path + bodyStr + nonce;
  return crypto.createHmac('sha256', channelSecret).update(base, 'utf8').digest('base64');
}

function callLinePay(method, path, body) {
  const cfg = getCfg();
  if (!cfg.channelId || !cfg.channelSecret) {
    return Promise.reject(new Error('LINEPAY_CHANNEL_ID / LINEPAY_CHANNEL_SECRET 未設定'));
  }
  const nonce   = crypto.randomUUID();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = genSignature(cfg.channelSecret, path, bodyStr, nonce);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: cfg.hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': cfg.channelId,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('LINE Pay 回應格式錯誤: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * 發起 LINE Pay 付款請求。reservation.totalPrice 必須是「實際要收的金額」
 * （折扣後），呼叫前請先算好 effectivePrice 再傳進來。
 * 回傳 { transactionId, paymentUrl, orderId }。
 */
async function requestPayment(reservation) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const liffId = process.env.LIFF_ID || '';

  const orderId = (String(Date.now()) + String(reservation._id).slice(-16))
    .replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
  const amount   = Math.max(1, Math.round(reservation.totalPrice));
  const itemName = [reservation.venueName, reservation.planName].filter(Boolean).join(' ').slice(0, 50) || '場地預約';

  const confirmUrl = `${appUrl}/linepay/confirm?reservationId=${reservation._id}${liffId ? `&liffId=${liffId}` : ''}`;
  const cancelUrl  = `${appUrl}/linepay/cancel?reservationId=${reservation._id}${liffId ? `&liffId=${liffId}` : ''}`;

  const body = {
    amount,
    currency: 'TWD',
    orderId,
    packages: [{
      id: 'pkg1',
      amount,
      name: itemName,
      products: [{ name: itemName, quantity: 1, price: amount }]
    }],
    redirectUrls: { confirmUrl, cancelUrl }
  };

  const result = await callLinePay('POST', '/v3/payments/request', body);
  if (result.returnCode !== '0000' || !result.info?.paymentUrl?.web) {
    throw new Error(`LINE Pay 請求失敗：${result.returnCode} ${result.returnMessage || ''}`);
  }
  return {
    transactionId: String(result.info.transactionId),
    paymentUrl: result.info.paymentUrl.web,
    orderId
  };
}

/**
 * 跟 LINE Pay 確認付款。amount 必須跟 requestPayment 當初送出的金額完全一致。
 * 回傳 { valid, result }，valid=false 代表確認失敗（金額不符/交易無效等）。
 */
async function confirmPayment(transactionId, amount, currency = 'TWD') {
  const result = await callLinePay('POST', `/v3/payments/${transactionId}/confirm`, {
    amount: Math.max(1, Math.round(amount)),
    currency
  });
  return { valid: result.returnCode === '0000', result };
}

module.exports = { requestPayment, confirmPayment };
