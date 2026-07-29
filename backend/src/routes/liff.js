const express = require('express');
const https = require('https');
const crypto = require('crypto');
const Venue = require('../models/Venue');
const VenuePlan = require('../models/VenuePlan');
const Reservation = require('../models/Reservation');
const Announcement = require('../models/Announcement');

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
  const slots = ['morning', 'afternoon', 'evening'];
  const result = {};
  for (const slot of slots) {
    const count = await Reservation.countDocuments({
      venueId, date: { $gte: dateStart, $lt: dateEnd },
      slots: slot,
      status: { $in: ['confirmed', 'checked_in'] }
    });
    result[slot] = { remaining: Math.max(0, maxCapacity - count), total: maxCapacity };
  }
  return result;
}

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
// Returns active venues with today + tomorrow slot availability
router.get('/venues', async (req, res) => {
  try {
    const venues = await Venue.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todayStr    = today.toISOString().slice(0, 10);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const result = await Promise.all(venues.map(async (v) => {
      const [todayAvail, tomorrowAvail] = await Promise.all([
        getSlotAvailability(v._id, v.maxCapacityPerSlot, todayStr),
        getSlotAvailability(v._id, v.maxCapacityPerSlot, tomorrowStr)
      ]);
      return { ...v, availability: { today: todayAvail, tomorrow: tomorrowAvail } };
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
      status:          'confirmed'
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

// ── Stubs: payment, QR, checkin ───────────────────────────────────────────────
router.post('/reservations/:id/payment', (req, res) => {
  res.status(501).json({ message: '金流接口預留，尚未實作' });
});
router.get('/reservations/:id/qr', (req, res) => {
  res.status(501).json({ message: 'QR Code 生成接口預留，尚未實作' });
});
router.post('/checkin', (req, res) => {
  res.status(501).json({ message: '掃碼進場接口預留，尚未實作' });
});

module.exports = router;
