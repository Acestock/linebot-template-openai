const express = require('express');
const Reservation = require('../models/Reservation');
const StaffToken  = require('../models/StaffToken');

const router = express.Router();

// Build JSON response matching the vendor's actual API format (discovered from live test env)
function gateJson(result, readno, str1 = '', str2 = '', str3 = '') {
  const currtime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).replace('T', ' ');
  return {
    result,
    readno,
    cnt:         result === 1 ? 1 : 0,
    str1,
    str2,
    str3,
    str4:        '讀一本書 享一段自己',
    sndid:       result === 1 ? 1 : 0,
    cnttext:     '',
    opendelay:   '',
    sndfilename: '',
    sndtxt:      str1 || (result === 1 ? '允许通行' : '禁止通行'),
    currtime
  };
}

// ── GET|POST /api/gate/verify ─────────────────────────────────────────────────
// Called by the physical gate controller (HTTP client mode, no admin auth).
// Auth is implicit: the qrToken in `id` is unguessable (UUID).
// Gate may send GET (query string) or POST (form-urlencoded body);
// we merge both so either works.
//
// Params:
//   id       — QR content (our qrToken)
//   idtype   — 0=QR head, 1=serial (QR via RS232), 2=ID card, 99=heartbeat
//   sn       — gate device serial number
//   readno   — 1=entry reader, 2=exit reader
//   time     — gate's timestamp
router.all('/verify', async (req, res) => {
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'close');

  // Merge query string + POST body so both request methods work
  const params  = { ...req.query, ...req.body };
  const { id, idtype, sn, readno, time } = params;
  const idtypeN = parseInt(idtype, 10);
  const readnoN = parseInt(readno, 10);

  console.log(`[Gate] verify: sn=${sn}, idtype=${idtype}, readno=${readno}, id=${id?.slice(0, 8)}..., time=${time}`);

  // ① Heartbeat — gate polls to confirm our server is alive
  if (idtypeN === 99) {
    return res.json(gateJson(1, readnoN || 1));
  }

  // ② Handle QR codes: idtype=0 (QR head) and idtype=1 (QR via serial port)
  if (idtypeN !== 0 && idtypeN !== 1) {
    console.warn(`[Gate] Unsupported idtype=${idtype}`);
    return res.json(gateJson(0, readnoN, '不支援此類型'));
  }

  if (!id) {
    return res.json(gateJson(0, readnoN, '無效 QR 碼'));
  }

  try {
    const r = await Reservation.findOne({ qrToken: id });

    if (!r) {
      // Check if it's a staff door token
      const st = await StaffToken.findOne({ token: id });
      if (st) {
        if (st.expiresAt < new Date()) {
          console.warn(`[Gate] Staff token expired: ${id.slice(0, 8)}`);
          return res.json(gateJson(0, readnoN, '員工 QR 已過期', '請重新產生'));
        }
        console.log(`[Gate] Staff token OK: ${st.venueName} label=${st.label} readno=${readnoN}`);
        return res.json(gateJson(1, readnoN, '入場通行', st.venueName || '', st.label || '工作人員'));
      }
      console.warn(`[Gate] Unknown qrToken: ${id}`);
      return res.json(gateJson(0, readnoN, '票券無效', '請聯繫工作人員'));
    }

    const name  = r.displayName || '訪客';
    const venue = r.venueName   || '';

    // ── Entry (readno=2) ──────────────────────────────────────────────────────
    if (readnoN === 2) {
      if (r.status === 'confirmed') {
        r.status = 'checked_in';
        if (!r.expectedCheckIn) r.expectedCheckIn = new Date();
        await r.save();
        console.log(`[Gate] Entry: ${r._id} (${r.displayName}) confirmed→checked_in`);
        return res.json(gateJson(1, 2, '歡迎入場', venue, name));
      }

      if (r.status === 'checked_in') {
        // Re-entry after middle exit (中離)
        console.log(`[Gate] Re-entry: ${r._id} (${r.displayName})`);
        return res.json(gateJson(1, 2, '歡迎回來', venue, name));
      }

      if (r.status === 'completed') {
        return res.json(gateJson(0, 2, '此票已結束', '請重新預約'));
      }

      if (r.status === 'cancelled') {
        console.warn(`[Gate] Entry blocked (cancelled): ${r._id} (${r.displayName})`);
        return res.json(gateJson(0, 2, '預約已取消', '請重新預約'));
      }

      return res.json(gateJson(0, 2, '無法入場', '請聯繫工作人員'));
    }

    // ── Exit (readno=1) ───────────────────────────────────────────────────────
    // Exit scan only opens the gate; status stays checked_in so user can re-enter
    // (middle exit / 中離). Final archiving is handled by cron after payment.
    if (readnoN === 1) {
      if (r.status === 'checked_in') {
        // Open gate for all cases (middle exit / 中離 allowed).
        // Status stays checked_in so user can re-enter freely.
        // Cron archives to completed 10 min after payment is confirmed.
        console.log(`[Gate] Exit: ${r._id} (${r.displayName}) mode=${r.mode} payStatus=${r.paymentStatus}`);
        return res.json(gateJson(1, 1, '請慢走', venue, name));
      }

      if (r.status === 'completed') {
        // Post-payment grace still active or already done — still open, never trap
        console.log(`[Gate] Exit (completed): ${r._id}`);
        return res.json(gateJson(1, 1, '感謝使用', venue));
      }

      if (r.status === 'confirmed') {
        console.warn(`[Gate] Exit blocked (not checked in yet): ${r._id} (${r.displayName})`);
        return res.json(gateJson(0, 1, '尚未入場', '請先掃碼入場'));
      }

      console.warn(`[Gate] Exit blocked (status=${r.status}): ${r._id}`);
      return res.json(gateJson(0, 1, '無法出場', '請聯繫工作人員'));
    }

    console.warn(`[Gate] Unknown readno=${readno}`);
    return res.json(gateJson(0, readnoN, '未知指令'));

  } catch (err) {
    console.error('[Gate] Error:', err.message);
    return res.json(gateJson(0, readnoN, '系統錯誤'));
  }
});

// ── POST /api/gate/scan ──────────────────────────────────────────────────────
// 微光互聯 M350 QR Code Scanner 進場端點（僅負責進場；出場改用實體按鈕直接解鎖，不經過此 API）。
// body 已由 app.js 的路徑專屬 express.text() 轉成純文字字串，相容兩種上傳格式：
//   Format A（實機測試觀察到的格式）：body 直接就是 QR 內容
//   Format B（原廠標準格式）：vgdecoderesult=xxx&&devicenumber=xxx
// 回應規則：M350 不看 JSON，只認 text/plain 的 code=0000（成功，觸發硬體開門行為）或其他碼（失敗）。
function parseM350Body(rawBody) {
  const body = String(rawBody || '').trim();
  const prefix = 'vgdecoderesult=';
  if (body.toLowerCase().startsWith(prefix)) {
    const sep = '&&devicenumber=';
    const sepIdx = body.lastIndexOf(sep);
    const decode = (s) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; } };
    if (sepIdx !== -1) {
      return {
        qrCode:       decode(body.slice(prefix.length, sepIdx)),
        deviceNumber: decode(body.slice(sepIdx + sep.length))
      };
    }
    return { qrCode: decode(body.slice(prefix.length)), deviceNumber: '' };
  }
  // Format A：整段 body 就是 QR 內容
  return { qrCode: body, deviceNumber: '' };
}

router.post('/scan', async (req, res) => {
  res.setHeader('X-Accel-Buffering', 'no');
  res.type('text/plain');

  const { qrCode, deviceNumber } = parseM350Body(req.body);
  console.log(`[Gate][M350] scan: device=${deviceNumber || '-'} ip=${req.ip} qr=${qrCode.slice(0, 16)}${qrCode.length > 16 ? '...' : ''}`);

  if (!qrCode) return res.send('code=0001');

  try {
    const r = await Reservation.findOne({ qrToken: qrCode });

    if (!r) {
      const st = await StaffToken.findOne({ token: qrCode });
      if (st) {
        if (st.expiresAt < new Date()) {
          console.warn(`[Gate][M350] Staff token expired: ${qrCode.slice(0, 8)}`);
          return res.send('code=0001');
        }
        console.log(`[Gate][M350] Staff token OK: ${st.venueName}`);
        return res.send('code=0000');
      }
      console.warn(`[Gate][M350] Unknown qrToken: ${qrCode.slice(0, 16)}`);
      return res.send('code=0001');
    }

    if (r.status === 'confirmed') {
      r.status = 'checked_in';
      if (!r.expectedCheckIn) r.expectedCheckIn = new Date();
      await r.save();
      console.log(`[Gate][M350] Entry: ${r._id} (${r.displayName}) confirmed→checked_in`);
      return res.send('code=0000');
    }

    if (r.status === 'checked_in') {
      console.log(`[Gate][M350] Re-entry (already checked_in): ${r._id} (${r.displayName})`);
      return res.send('code=0000');
    }

    if (r.status === 'completed') {
      console.warn(`[Gate][M350] Blocked (completed): ${r._id}`);
      return res.send('code=0001');
    }

    console.warn(`[Gate][M350] Blocked (status=${r.status}): ${r._id}`);
    return res.send('code=0001');

  } catch (err) {
    console.error('[Gate][M350] Error:', err.message);
    return res.send('code=0001');
  }
});

module.exports = router;
