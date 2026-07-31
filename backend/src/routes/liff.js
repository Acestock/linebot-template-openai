const express = require('express');
const https = require('https');
const crypto = require('crypto');
const Venue = require('../models/Venue');
const VenuePlan = require('../models/VenuePlan');
const Reservation = require('../models/Reservation');
const Announcement = require('../models/Announcement');
const BusinessProfile = require('../models/BusinessProfile');
const BlockedSlot = require('../models/BlockedSlot');
const { createOrderParams } = require('../services/ecpayService');

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
    res.json({ liffTitle: profile?.liffTitle || '預約入場系統' });
  } catch (err) {
    res.json({ liffTitle: '預約入場系統' });
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
    for (const slot of slots) {
      if (avail[slot] && avail[slot].remaining <= 0)
        return res.status(409).json({ error: `${slot} 時段已額滿` });
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
    if (planId) {
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
      expectedCheckIn:  expectedCheckIn ? new Date(expectedCheckIn) : undefined,
      expectedCheckOut: expectedCheckOut ? new Date(expectedCheckOut) : undefined,
      note:            note || '',
      status:          'confirmed',
      paymentStatus:   totalPrice > 0 ? 'unpaid' : 'free',
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

// ── POST /api/liff/reservations/:id/payment ───────────────────────────────────
// Initiate ECPay payment; returns form data for client to submit
router.post('/reservations/:id/payment', liffAuth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.lineUserId !== req.liffUser.lineUserId)
      return res.status(403).json({ error: 'Forbidden' });
    if (r.status !== 'checked_in')
      return res.status(400).json({ error: '只有進場中的預約才能付款' });
    if (r.paymentStatus === 'paid')
      return res.status(400).json({ error: '此預約已完成付款' });

    // Free reservation — skip payment, auto checkout
    if (r.totalPrice <= 0) {
      r.paymentStatus = 'free';
      r.status = 'completed';
      await r.save();
      return res.json({ skip: true });
    }

    const { params, apiUrl, tradeNo } = createOrderParams(r);
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
    const validFrom  = r.expectedCheckIn
      ? new Date(r.expectedCheckIn.getTime() - 10 * 60 * 1000)
      : null;
    const validUntil = r.expectedCheckIn
      ? new Date(r.expectedCheckIn.getTime() + 30 * 60 * 1000)
      : null;
    res.json({ qrToken: r.qrToken, validFrom, validUntil, status: r.status });
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

module.exports = router;
