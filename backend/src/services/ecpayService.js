const crypto = require('crypto');

// Default to test credentials; override with env vars for production
const getCfg = () => ({
  MerchantID: process.env.ECPAY_MERCHANT_ID || '2000132',
  HashKey:    process.env.ECPAY_HASH_KEY    || '5294y06JbISpM5x9',
  HashIV:     process.env.ECPAY_HASH_IV     || 'v77hoKGq4kWxNNIS',
  apiUrl: process.env.ECPAY_TEST === 'false'
    ? 'https://payment.ecpay.com.tw/Cashier/AioCheckout/V5'
    : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/V5'
});

// PHP-style urlencode: spaces→'+', encode !'()* too
function phpUrlencode(str) {
  return encodeURIComponent(str)
    .replace(/!/g,  '%21')
    .replace(/'/g,  '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2a')
    .replace(/~/g,  '%7e')
    .replace(/%20/g, '+');
}

function genCheckMacValue(params) {
  const cfg = getCfg();
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  const raw = `HashKey=${cfg.HashKey}&${sorted}&HashIV=${cfg.HashIV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

function verifyCheckMac(body) {
  const { CheckMacValue, ...rest } = body;
  if (!CheckMacValue) return false;
  return genCheckMacValue(rest) === CheckMacValue;
}

function createOrderParams(reservation) {
  const cfg = getCfg();
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;

  // MerchantTradeNo: ≤20 chars, alphanumeric only
  const tradeNo = ('R' + reservation._id.toString() + Date.now().toString(36))
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 20);

  // Keep item names simple to avoid encoding edge cases
  const itemName = [reservation.venueName, reservation.planName].filter(Boolean).join(' ').slice(0, 100) || '場地預約';

  const params = {
    MerchantID:        cfg.MerchantID,
    MerchantTradeNo:   tradeNo,
    MerchantTradeDate: dateStr,
    PaymentType:       'aio',
    TotalAmount:       String(Math.max(1, Math.round(reservation.totalPrice))),
    TradeDesc:         '場地預約費用',
    ItemName:          itemName,
    ReturnURL:         `${appUrl}/api/ecpay/callback`,
    ClientBackURL:     `${appUrl}/ecpay/result?reservationId=${reservation._id}${process.env.LIFF_ID ? '&liffId=' + process.env.LIFF_ID : ''}`,
    ChoosePayment:     'Credit',
    EncryptType:       '1',
  };

  params.CheckMacValue = genCheckMacValue(params);
  return { params, apiUrl: cfg.apiUrl, tradeNo };
}

function createHourOrderParams(purchase) {
  const cfg = getCfg();
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;

  const tradeNo = ('H' + purchase._id.toString() + Date.now().toString(36))
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 20);

  const params = {
    MerchantID:        cfg.MerchantID,
    MerchantTradeNo:   tradeNo,
    MerchantTradeDate: dateStr,
    PaymentType:       'aio',
    TotalAmount:       String(Math.max(1, Math.round(purchase.totalPrice))),
    TradeDesc:         '預購時數',
    ItemName:          (purchase.packageName || '預購時數').slice(0, 100),
    ReturnURL:         `${appUrl}/api/ecpay/callback`,
    ClientBackURL:     `${appUrl}/ecpay/result?hourPurchaseId=${purchase._id}${process.env.LIFF_ID ? '&liffId=' + process.env.LIFF_ID : ''}`,
    ChoosePayment:     'Credit',
    EncryptType:       '1',
  };

  params.CheckMacValue = genCheckMacValue(params);
  return { params, apiUrl: cfg.apiUrl, tradeNo };
}

module.exports = { createOrderParams, createHourOrderParams, verifyCheckMac };
