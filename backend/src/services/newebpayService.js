const crypto = require('crypto');

// NewebPay MPG v2.0 payment gateway integration
// Docs: https://www.newebpay.com/website/Page/content/download_api

const getCfg = () => ({
  MerchantID: process.env.NEWEBPAY_MERCHANT_ID || '',
  HashKey:    process.env.NEWEBPAY_HASH_KEY    || '',
  HashIV:     process.env.NEWEBPAY_HASH_IV     || '',
  apiUrl: process.env.NEWEBPAY_TEST === 'false'
    ? 'https://core.newebpay.com/MPG/mpg_gateway'
    : 'https://ccore.newebpay.com/MPG/mpg_gateway'
});

// AES-256-CBC encrypt → hex output (PKCS7 padding)
function aesEncrypt(plaintext, key, iv) {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'utf8'),
    Buffer.from(iv, 'utf8')
  );
  return cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
}

// AES-256-CBC decrypt from hex (zero-pad tolerant)
function aesDecrypt(hex, key, iv) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'utf8'),
    Buffer.from(iv, 'utf8')
  );
  decipher.setAutoPadding(false);
  const buf = Buffer.concat([
    decipher.update(Buffer.from(hex, 'hex')),
    decipher.final()
  ]);
  // Trim PKCS7 / zero padding and stray control chars
  return buf.toString('utf8').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+$/g, '').trim();
}

// SHA-256 of "HashKey=KEY&tradeInfo&HashIV=IV", uppercase hex
function genTradeSha(tradeInfo, key, iv) {
  const str = `HashKey=${key}&${tradeInfo}&HashIV=${iv}`;
  return crypto.createHash('sha256').update(str).digest('hex').toUpperCase();
}

/**
 * Build the form POST params for NewebPay MPG.
 * Returns { params, apiUrl, tradeNo } — same shape as ecpayService.
 * Mutates reservation.paymentRef with the MerchantOrderNo.
 */
function createOrderParams(reservation) {
  const cfg = getCfg();
  if (!cfg.MerchantID || !cfg.HashKey || !cfg.HashIV) {
    throw new Error('NEWEBPAY_MERCHANT_ID / NEWEBPAY_HASH_KEY / NEWEBPAY_HASH_IV 未設定');
  }
  if (cfg.HashKey.length !== 32 || cfg.HashIV.length !== 16) {
    throw new Error('NEWEBPAY_HASH_KEY 須為 32 字元，NEWEBPAY_HASH_IV 須為 16 字元');
  }

  const appUrl   = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const liffId   = process.env.LIFF_ID || '';
  const timeStamp = Math.floor(Date.now() / 1000);

  // MerchantOrderNo: max 30 alphanumeric; use unix seconds (10) + last 16 of _id (hex)
  const tradeNo = (String(timeStamp) + String(reservation._id).slice(-16))
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 30);

  const itemDesc = [reservation.venueName, reservation.planName]
    .filter(Boolean).join(' ').slice(0, 50) || '場地預約';

  const clientBackURL = `${appUrl}/newebpay/result?reservationId=${reservation._id}${liffId ? `&liffId=${liffId}` : ''}`;

  // TradeInfo is a URL-encoded query string, then AES-256-CBC encrypted
  const tradeParams = new URLSearchParams({
    MerchantID:      cfg.MerchantID,
    RespondType:     'JSON',
    TimeStamp:       String(timeStamp),
    Version:         '2.0',
    MerchantOrderNo: tradeNo,
    Amt:             String(Math.max(1, Math.round(reservation.totalPrice))),
    ItemDesc:        itemDesc,
    TradeLimit:      '900',          // 15-minute payment window
    ReturnURL:       clientBackURL,                      // user browser redirect after payment
    NotifyURL:       `${appUrl}/api/newebpay/notify`,   // async server-to-server notification
    LoginType:       '0',
    CREDIT:          '1',
  }).toString();

  const tradeInfo = aesEncrypt(tradeParams, cfg.HashKey, cfg.HashIV);
  const tradeSha  = genTradeSha(tradeInfo, cfg.HashKey, cfg.HashIV);

  const params = {
    MerchantID: cfg.MerchantID,
    TradeInfo:  tradeInfo,
    TradeSha:   tradeSha,
    Version:    '2.0',
  };

  return { params, apiUrl: cfg.apiUrl, tradeNo };
}

/**
 * Verify TradeSha and decrypt TradeInfo from a NewebPay notify POST body.
 * Returns { valid: false } on failure, or { valid: true, tradeData } on success.
 */
function verifyAndDecrypt(body) {
  const cfg = getCfg();
  const { TradeInfo, TradeSha } = body;
  if (!TradeInfo || !TradeSha) return { valid: false };

  const expected = genTradeSha(TradeInfo, cfg.HashKey, cfg.HashIV);
  if (expected !== TradeSha) {
    console.warn('[NewebPay] TradeSha mismatch', { expected, received: TradeSha });
    return { valid: false };
  }

  let tradeData;
  try {
    const raw = aesDecrypt(TradeInfo, cfg.HashKey, cfg.HashIV);
    tradeData = JSON.parse(raw);
  } catch (e) {
    console.warn('[NewebPay] Decrypt/parse failed:', e.message);
    return { valid: false };
  }

  return { valid: true, tradeData };
}

module.exports = { createOrderParams, verifyAndDecrypt };
