const express = require('express');
const https = require('https');
const crypto = require('crypto');
const Venue = require('../models/Venue');
const VenuePlan = require('../models/VenuePlan');
const Reservation = require('../models/Reservation');
const Announcement = require('../models/Announcement');
const BusinessProfile = require('../models/BusinessProfile');
const BlockedSlot = require('../models/BlockedSlot');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const Coupon = require('../models/Coupon');
const { createOrderParams: _ecpayCreateOrder }   = require('../services/ecpayService');
const { createOrderParams: _newebpayCreateOrder } = require('../services/newebpayService');
// Switch gateway via env: PAYMENT_GATEWAY=ecpay to fall back to ECPay (default: newebpay)
const createOrderParams = (reservation) =>
  (process.env.PAYMENT_GATEWAY || 'newebpay').toLowerCase() === 'ecpay'
    ? _ecpayCreateOrder(reservation)
    : _newebpayCreateOrder(reservation);
const { pushMessage } = require('../services/lineService');
const {
  timeToMinutes,
  billedHours,
  calcShortSessionPrice,
  calcPreviewTiers,
  findCheapestCoverage,
  minutesToTimeStr
} = require('../services/shortSessionService');

const router = express.Router();

// ── LIFF Session store (in-memory, 30min TTL) ─────────────────────────────────
const liffSessions = new Map(); // token → { lineUserId, displayName, pictureUrl, expiresAt }

function createLiffToken(userId, displayName, pictureUrl) {
  const token = crypto.randomBytes(24).toString('hex');
  liffSessions.set(token, {
    lineUserId: userId,
    displayName,
    pictureUrl,
    expiresAt: Date.now() + 30 * 60 * 1000
  });
  return token;
}

function liffAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.token;
  if (!token) return res.status(401).json({ error: 'LIFF token required' });
  const session = liffSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid LIFF token' });
  if (Date.now() > session.expiresAt) {
    liffSessions.delete(token);
    return res.status(401).json({ error: 'LIFF token expired' });
  }
  req.liffUser = session;
  next();
}

// Verify LINE access token with LINE API
function verifyLineToken(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.line.me',
      path: '/oauth2/v2.1/verify?access_token=' + encodeURIComponent(accessToken),
      method: 'GET'
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) resolve(parsed);
          else reject(new Error(parsed.error_description || 'Token verify failed'));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Get LINE user profile from access token
function getLineProfile(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.line.me',
      path: '/v2/profile',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) resolve(parsed);
          else reject(new Error('Get profile failed'));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Helper: get slot availability for a venue on a date ───────────────────────
async function getSlotAvailability(venueId, maxCapacity, dateStr) {
  const date = new Date(dateStr);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dateEnd   = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);
  const slotKeys = ['morning', 'afternoon', 'evening'];
  const result = {};

  // Check for active blocked slots on this date
  const blocks = await BlockedSlot.find({
    venueId, isActive: true,
    date: { $gte: dateStart, $lt: dateEnd }
  }).lean();

  for (const slot of slotKeys) {
    const block = blocks.find(b => b.slots.includes(slot));
    if (block) {
      result[slot] = { remaining: 0, total: maxCapacity, blocked: true, eventName: block.eventName };
      continue;
    }
    const count = await Reservation.countDocuments({
      venueId, date: { $gte: dateStart, $lt: dateEnd },
      slots: slot,
      status: { $in: ['confirmed', 'checked_in'] }
    });
    result[slot] = { remaining: Math.max(0, maxCapacity - count), total: maxCapacity };
  }
  return result;
}

// ── GET /api/liff/config ───────────────────────────────────────────────────────
// 公開端點：LIFF 初始化時取得系統設定（不需 auth）
router.get('/config', async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne().lean();
    res.json({
      liffTitle:      profile?.liffTitle      || '預約入場系統',
      brandColor:     profile?.brandColor     || '#C9A882',
      brandTextColor: profile?.brandTextColor || '#3E2723',
    });
  } catch (err) {
    res.json({ liffTitle: '預約入場系統', brandColor: '#C9A882', brandTextColor: '#3E2723' });
  }
});

// ── POST /api/liff/auth ────────────────────────────────────────────────────────
router.post('/auth', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' });
    // Verify token with LINE
    await verifyLineToken(accessToken);
    // Get profile
    const profile = await getLineProfile(accessToken);
    const sessionToken = createLiffToken(profile.userId, profile.displayName, profile.pictureUrl);
    res.json({
      sessionToken,
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl
    });
  } catch (err) {
    res.status(401).json({ error: err.message || 'Auth failed' });
  }
});

// ── GET /api/liff/venues ───────────────────────────────────────────────────────
// Returns active venues with 5-day slot availability (today + next 4 days)
router.get('/venues', async (req, res) => {
  try {
    const venues = await Venue.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 5 }, (_, i) =>
      new Date(today.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    );

    const result = await Promise.all(venues.map(async (v) => {
      const availByDay = await Promise.all(
        days.map(d => getSlotAvailability(v._id, v.maxCapacityPerSlot, d))
      );
      const availability = Object.fromEntries(days.map((d, i) => [d, availByDay[i]]));
      return { ...v, availability };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/venues/:id ───────────────────────────────────────────────────
router.get('/venues/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id).lean();
    if (!venue || !venue.isActive) return res.status(404).json({ error: 'Venue not found' });
    const plans = await VenuePlan.find({ venueId: req.params.id, isActive: true }).sort({ order: 1 }).lean();
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
    }).sort({ createdAt: -1 }).lean();
    res.json({ ...venue, plans, announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/venues/:id/availability?date=YYYY-MM-DD ─────────────────────
router.get('/venues/:id/availability', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id).lean();
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const avail = await getSlotAvailability(venue._id, venue.maxCapacityPerSlot, dateStr);
    res.json({ date: dateStr, slots: avail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/venues/:id/short-session-quote ──────────────────────────────
router.get('/venues/:id/short-session-quote', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id).lean();
    if (!venue || !venue.isActive) return res.status(404).json({ error: 'Venue not found' });
    if (!venue.shortSession?.enabled) return res.status(404).json({ error: '此場地未開放計時入場' });

    const config = venue.shortSession;
    const now = new Date();

    // All time calculations use Taiwan time (UTC+8)
    const taipei = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const dateStr = taipei.toISOString().slice(0, 10);
    const h = taipei.getUTCHours();
    const currentSlot = h >= 7 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening';

    const [avail, allPlans] = await Promise.all([
      getSlotAvailability(venue._id, venue.maxCapacityPerSlot, dateStr),
      VenuePlan.find({ venueId: venue._id, isActive: true }).lean()
    ]);

    const slotAvail = avail[currentSlot] || { remaining: 0 };
    const available = !slotAvail.blocked && slotAvail.remaining > (config.maxCapacityBlock || 2);

    const singlePlans = allPlans.filter(p => p.type === 'single');
    const checkInMinute = timeToMinutes(now);

    const tiers = calcPreviewTiers(singlePlans, checkInMinute, config);

    // Find cheapest over-3hr coverage: simulate entering just past the 190-min grace window
    const overResult = findCheapestCoverage(allPlans, checkInMinute, checkInMinute + 200, config);

    res.json({
      available,
      remaining: slotAvail.remaining,
      currentSlot,
      checkInMinute,
      tiers: tiers.map(t => ({
        hours: t.hours,
        price: t.price,
        exitMinute: t.exitMinute,
        exitTimeStr: minutesToTimeStr(t.exitMinute)
      })),
      overThreeHours: overResult.minCost !== null ? {
        minPrice: overResult.minCost,
        validUntil: overResult.validUntil,
        validUntilStr: minutesToTimeStr(overResult.validUntil)
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/liff/reservations ───────────────────────────────────────────────
router.post('/reservations', liffAuth, async (req, res) => {
  try {
    const { venueId, planId, date, slots, expectedCheckIn, expectedCheckOut, note, mode } = req.body;
    if (!venueId || !date || !slots || !slots.length)
      return res.status(400).json({ error: 'venueId, date, slots required' });

    const venue = await Venue.findById(venueId).lean();
    if (!venue || !venue.isActive) return res.status(404).json({ error: 'Venue not found' });

    // Check availability for each requested slot
    const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().slice(0, 10);
    const avail = await getSlotAvailability(venueId, venue.maxCapacityPerSlot, dateStr);

    // Short-session walk-in: validate config and capacity
    const isShortSession = mode === 'walkin_short';
    if (isShortSession) {
      if (!venue.shortSession?.enabled)
        return res.status(400).json({ error: '此場地未開放計時入場' });
      const cfg = venue.shortSession;
      const currentSlot = slots[0];
      const slotAvail = avail[currentSlot] || {};
      if (slotAvail.blocked)
        return res.status(409).json({ error: '此時段已包場，無法計時入場' });
      if ((slotAvail.remaining ?? 0) <= (cfg.maxCapacityBlock || 2))
        return res.status(409).json({ error: '目前人數已達上限，暫停計時入場' });
    } else {
      for (const slot of slots) {
        if (avail[slot] && avail[slot].remaining <= 0)
          return res.status(409).json({ error: `${slot} 時段已額滿` });
      }
    }

    // 未成功結帳鎖定：有 unpaidExit 記錄則不允許新預約
    const lineUserId = req.liffUser.lineUserId;
    const hasUnpaidExit = await Reservation.findOne({ lineUserId, unpaidExit: true });
    if (hasUnpaidExit) {
      return res.status(403).json({ error: '您有未完成付款的記錄，暫時無法預約。請先至預約紀錄完成補付款，或聯絡工作人員處理。' });
    }

    // 重複預約防呆：同一用戶 + 同場地 + 同日 + 時段有交集
    const dateStart = new Date(dateStr + 'T00:00:00+08:00');
    const dateEnd   = new Date(dateStr + 'T23:59:59+08:00');
    const dup = await Reservation.findOne({
      lineUserId: req.liffUser.lineUserId,
      venueId,
      date: { $gte: dateStart, $lte: dateEnd },
      slots: { $in: slots },
      status: { $in: ['confirmed', 'checked_in'] }
    });
    if (dup) return res.status(409).json({ error: '您已預約此場地的相同時段，請勿重複預約' });

    let planName = '';
    let totalPrice = 0;
    let initialStatus = 'confirmed';
    let checkInTime = expectedCheckIn ? new Date(expectedCheckIn) : undefined;
    let checkOutTime = expectedCheckOut ? new Date(expectedCheckOut) : undefined;

    if (isShortSession) {
      // Short-session: check in immediately, price calculated at checkout
      initialStatus = 'checked_in';
      checkInTime   = new Date();
      checkOutTime  = undefined;
      planName      = '計時入場';
    } else if (planId) {
      const plan = await VenuePlan.findById(planId).lean();
      if (plan) { planName = plan.name; totalPrice = plan.price; }
    }

    const reservation = await Reservation.create({
      lineUserId:      req.liffUser.lineUserId,
      displayName:     req.liffUser.displayName,
      pictureUrl:      req.liffUser.pictureUrl,
      venueId,
      venueName:       venue.name,
      date:            new Date(date),
      planId:          planId || undefined,
      planName,
      slots,
      totalPrice,
      expectedCheckIn:  checkInTime,
      expectedCheckOut: checkOutTime,
      note:            note || '',
      mode:            isShortSession ? 'walkin_short' : 'normal',
      status:          initialStatus,
      paymentStatus:   totalPrice > 0 ? 'unpaid' : (isShortSession ? 'unpaid' : 'free'),
      qrToken:         crypto.randomUUID()
    });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/reservations ────────────────────────────────────────────────
router.get('/reservations', liffAuth, async (req, res) => {
  try {
    const reservations = await Reservation.find({ lineUserId: req.liffUser.lineUserId })
      .sort({ date: -1, createdAt: -1 }).lean();
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/liff/reservations/:id ────────────────────────────────────────
router.delete('/reservations/:id', liffAuth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.lineUserId !== req.liffUser.lineUserId)
      return res.status(403).json({ error: 'Forbidden' });
    if (r.status === 'checked_in' || r.status === 'completed')
      return res.status(400).json({ error: '已入場或已完成的預約無法取消' });
    r.status = 'cancelled';
    await r.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/reservations/:id/short-session-price ───────────────────────
// Returns the estimated price for an active short-session walk-in based on current time
router.get('/reservations/:id/short-session-price', liffAuth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.lineUserId !== req.liffUser.lineUserId)
      return res.status(403).json({ error: 'Forbidden' });
    if (r.mode !== 'walkin_short')
      return res.status(400).json({ error: '此預約不是計時入場' });
    if (!r.expectedCheckIn)
      return res.status(400).json({ error: '尚未記錄入場時間' });

    const venue = await Venue.findById(r.venueId).lean();
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    const config = venue.shortSession || {};

    const allPlans = await VenuePlan.find({ venueId: r.venueId, isActive: true }).lean();
    const singlePlans = allPlans.filter(p => p.type === 'single');

    const now = new Date();
    const checkInMinute = timeToMinutes(new Date(r.expectedCheckIn));
    const nowMinute = timeToMinutes(now);
    const actualMinutes = Math.max(1, nowMinute - checkInMinute);
    const isOver = actualMinutes > 190;

    let price, bh;
    if (isOver) {
      const result = findCheapestCoverage(allPlans, checkInMinute, nowMinute, config);
      price = result.minCost || 0;
      bh = null;
    } else {
      const result = calcShortSessionPrice(singlePlans, checkInMinute, actualMinutes, config);
      price = result.price;
      bh = result.billedHours;
    }

    res.json({ actualMinutes, billedHours: bh, price, isOverThreeHours: isOver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/liff/reservations/:id/payment ───────────────────────────────────
// Initiate payment (NewebPay by default; set PAYMENT_GATEWAY=ecpay to use ECPay)
// Returns { form: { action, fields } } for the client to POST via hidden form
// Accepts optional body.couponId to apply a discount coupon
router.post('/reservations/:id/payment', liffAuth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.lineUserId !== req.liffUser.lineUserId)
      return res.status(403).json({ error: 'Forbidden' });
    if (r.status !== 'checked_in' && !(r.status === 'completed' && r.unpaidExit))
      return res.status(400).json({ error: '此預約狀態無法付款' });
    if (r.paymentStatus === 'paid')
      return res.status(400).json({ error: '此預約已完成付款' });

    // Short-session: always recalculate price at payment time (covers multi-attempt retries)
    if (r.mode === 'walkin_short') {
      const venue = await Venue.findById(r.venueId).lean();
      const config = (venue && venue.shortSession) || {};
      const allPlans = await VenuePlan.find({ venueId: r.venueId, isActive: true }).lean();
      const singlePlans = allPlans.filter(p => p.type === 'single');
      const checkInMinute = timeToMinutes(new Date(r.expectedCheckIn));
      const nowMinute = timeToMinutes(new Date());
      const actualMinutes = Math.max(1, nowMinute - checkInMinute);
      let price;
      if (actualMinutes > 190) {
        const result = findCheapestCoverage(allPlans, checkInMinute, nowMinute, config);
        price = result.minCost || config.minHourPrice || 40;
      } else {
        price = calcShortSessionPrice(singlePlans, checkInMinute, actualMinutes, config).price;
      }
      r.totalPrice = price;
      r.paymentStatus = 'unpaid';
      await r.save();
    }

    // Free reservation — skip payment, auto checkout
    if (r.totalPrice <= 0) {
      r.paymentStatus = 'free';
      r.status = 'completed';
      await r.save();
      return res.json({ skip: true });
    }

    // Apply coupon if provided
    const { couponId } = req.body;
    let effectivePrice = r.totalPrice;
    let coupon = null;
    if (couponId) {
      coupon = await Coupon.findOne({ _id: couponId, lineUserId: req.liffUser.lineUserId, status: 'valid' });
      if (coupon) {
        effectivePrice = Math.max(0, r.totalPrice - coupon.discountAmount);
        r.appliedCouponId = coupon._id;
        r.discountAmount = coupon.discountAmount;
        await r.save();

        if (effectivePrice === 0) {
          // Full discount — no ECPay needed
          coupon.status = 'used';
          coupon.usedAt = new Date();
          coupon.usedForReservationId = r._id;
          await coupon.save();
          r.paymentStatus = 'paid';
          r.status = 'completed';
          r.unpaidExit = false;
          await r.save();
          return res.json({ skip: true });
        }
      }
    }

    // Build payment order with effective price (may be discounted)
    const reservationForPayment = effectivePrice !== r.totalPrice
      ? { ...r.toObject(), totalPrice: effectivePrice }
      : r;
    const { params, apiUrl, tradeNo } = createOrderParams(reservationForPayment);
    r.paymentRef = tradeNo;
    await r.save();

    res.json({ form: { action: apiUrl, fields: params } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/reservations/:id/qr ─────────────────────────────────────────
router.get('/reservations/:id/qr', liffAuth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.lineUserId !== req.liffUser.lineUserId)
      return res.status(403).json({ error: 'Forbidden' });
    // walkin_short: QR stays valid for the whole session (no fixed window)
    const validFrom  = r.mode === 'walkin_short' || !r.expectedCheckIn ? null
      : new Date(r.expectedCheckIn.getTime() - 10 * 60 * 1000);
    const validUntil = r.mode === 'walkin_short' || !r.expectedCheckIn ? null
      : new Date(r.expectedCheckIn.getTime() + 30 * 60 * 1000);
    res.json({ qrToken: r.qrToken, validFrom, validUntil, status: r.status, mode: r.mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/liff/reservations/:id/checkout ──────────────────────────────────
router.post('/reservations/:id/checkout', liffAuth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.lineUserId !== req.liffUser.lineUserId)
      return res.status(403).json({ error: 'Forbidden' });
    if (r.status !== 'checked_in')
      return res.status(400).json({ error: '只有進場中的預約可以出場' });

    // Require payment when there is a non-zero charge
    if (r.totalPrice > 0 && r.paymentStatus !== 'paid') {
      return res.status(402).json({ error: '請先完成付款才能出場', requiresPayment: true });
    }

    r.status = 'completed';
    if (r.totalPrice <= 0) r.paymentStatus = 'free';
    await r.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/liff/checkin ─────────────────────────────────────────────────────
// 供門閘機台呼叫（不需 LIFF 用戶 auth）
// body: { qrToken, action?: 'enter'|'exit' }
router.post('/checkin', async (req, res) => {
  try {
    const { qrToken, action } = req.body;
    if (!qrToken) return res.status(400).json({ error: 'qrToken required' });
    const r = await Reservation.findOne({ qrToken });
    if (!r) return res.status(404).json({ error: '無效的 QR Code' });
    if (r.status === 'cancelled')
      return res.status(409).json({ error: '此預約已取消' });
    if (r.status === 'completed')
      return res.status(409).json({ error: '此預約已完成' });

    // 出場掃碼：checked_in → completed（未付款則標記 unpaidExit）
    if (action === 'exit') {
      if (r.status !== 'checked_in')
        return res.status(409).json({ error: '尚未入場，無法出場' });
      if (r.totalPrice > 0 && r.paymentStatus !== 'paid') {
        r.unpaidExit = true;
      }
      r.status = 'completed';
      await r.save();
      return res.json({ ok: true, status: 'completed', unpaidExit: r.unpaidExit, reservation: r });
    }

    // 入場或臨時再入場
    if (r.status === 'checked_in')
      return res.json({ ok: true, status: 'checked_in', reservation: r });
    if (r.status !== 'confirmed')
      return res.status(409).json({ error: '此預約狀態不允許進場' });
    const now = new Date();
    if (r.expectedCheckIn) {
      const validFrom  = new Date(r.expectedCheckIn.getTime() - 10 * 60 * 1000);
      const validUntil = new Date(r.expectedCheckIn.getTime() + 30 * 60 * 1000);
      if (now > validUntil) {
        r.status = 'cancelled';
        await r.save();
        return res.status(409).json({ error: '進場時間已過，預約已自動取消' });
      }
      if (now < validFrom)
        return res.status(409).json({ error: `進場時間尚未到，最早可於 ${validFrom.toLocaleTimeString('zh-TW')} 進場` });
    }
    r.status = 'checked_in';
    await r.save();
    res.json({ ok: true, status: 'checked_in', reservation: r });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/tasks ────────────────────────────────────────────────────────
router.get('/tasks', liffAuth, async (req, res) => {
  try {
    const lineUserId = req.liffUser.lineUserId;
    const tasks = await Task.find({ status: 'open' }).sort({ createdAt: -1 }).lean();

    // Find user's submissions for these tasks
    const taskIds = tasks.map(t => t._id);
    const submissions = await TaskSubmission.find({ taskId: { $in: taskIds }, lineUserId }).lean();
    const subMap = {};
    submissions.forEach(s => { subMap[s.taskId.toString()] = s; });

    const tasksWithSub = tasks.map(t => ({
      ...t,
      mySubmission: subMap[t._id.toString()] || null
    }));

    // Check if user has a currently checked-in reservation
    const checkedInRes = await Reservation.findOne({ lineUserId, status: 'checked_in' }).lean();

    res.json({
      tasks: tasksWithSub,
      checkedInReservationId: checkedInRes ? checkedInRes._id : null,
      myLineUserId: lineUserId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/liff/tasks/:id/accept ───────────────────────────────────────────
router.post('/tasks/:id/accept', liffAuth, async (req, res) => {
  try {
    const lineUserId = req.liffUser.lineUserId;

    // Verify user has a checked-in reservation
    const checkedIn = await Reservation.findOne({ lineUserId, status: 'checked_in' }).lean();
    if (!checkedIn) return res.status(403).json({ error: '只有在場中的用戶才能承接任務' });

    const task = await Task.findById(req.params.id);
    if (!task || task.status !== 'open') return res.status(404).json({ error: '任務不存在或已關閉' });

    // First-come-first-served locking
    if (task.acceptedBy && task.acceptedBy !== lineUserId) {
      return res.status(409).json({ error: '此任務已被他人承接' });
    }

    // Already accepted by this user — idempotent
    if (task.acceptedBy === lineUserId) {
      return res.json({ ok: true });
    }

    task.acceptedBy = lineUserId;
    task.acceptorName = req.liffUser.displayName;
    task.acceptedAt = new Date();
    await task.save();

    // Push LINE confirmation message
    try {
      await pushMessage(lineUserId, `✅ 您已成功接取任務「${task.title}」！\n請到預約系統的「任務」頁面查看詳情，並於截止前完成任務拍照上傳。`);
    } catch (e) {
      console.error('[liff] pushMessage after accept failed:', e.message);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/liff/tasks/:id/submit ───────────────────────────────────────────
router.post('/tasks/:id/submit', liffAuth, async (req, res) => {
  try {
    const { photoBase64, note, reservationId } = req.body;
    if (!photoBase64) return res.status(400).json({ error: '請上傳任務完成照片' });

    const lineUserId = req.liffUser.lineUserId;

    // Verify user has a checked-in reservation
    const checkedIn = await Reservation.findOne({ lineUserId, status: 'checked_in' }).lean();
    if (!checkedIn) return res.status(403).json({ error: '只有在場中的用戶才能提交任務' });

    const task = await Task.findById(req.params.id).lean();
    if (!task || task.status !== 'open') return res.status(404).json({ error: '任務不存在或已關閉' });

    // Verify submitter is the task acceptor
    if (task.acceptedBy && task.acceptedBy !== lineUserId) {
      return res.status(403).json({ error: '此任務由他人承接，無法提交' });
    }

    // Upsert submission (allow re-submission only if rejected)
    const existing = await TaskSubmission.findOne({ taskId: req.params.id, lineUserId });
    if (existing && existing.status === 'pending') {
      return res.status(409).json({ error: '您已提交此任務，等待審核中' });
    }
    if (existing && existing.status === 'approved') {
      return res.status(409).json({ error: '此任務已審核通過' });
    }

    const subData = {
      taskId: req.params.id,
      lineUserId,
      displayName: req.liffUser.displayName,
      pictureUrl: req.liffUser.pictureUrl,
      reservationId: reservationId || checkedIn._id,
      status: 'pending',
      photoBase64,
      note: note || ''
    };

    if (existing) {
      Object.assign(existing, subData);
      await existing.save();
      res.json({ ok: true, submission: existing });
    } else {
      const sub = await TaskSubmission.create(subData);
      res.json({ ok: true, submission: sub });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/liff/coupons ─────────────────────────────────────────────────────
router.get('/coupons', liffAuth, async (req, res) => {
  try {
    const coupons = await Coupon.find({ lineUserId: req.liffUser.lineUserId, status: 'valid' })
      .sort({ createdAt: -1 }).lean();
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
