const express = require('express');
const Reservation = require('../models/Reservation');

const router = express.Router();

// Safely truncate string to maxBytes (UTF-8 aware, avoids splitting multi-byte chars)
function truncate(str, maxBytes = 16) {
  if (!str) return '';
  let result = '';
  let bytes = 0;
  for (const char of str) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    if (bytes + charBytes > maxBytes) break;
    result += char;
    bytes += charBytes;
  }
  return result;
}

// Format response in the gate controller's expected plain-text protocol.
// cnt=001 when allowed, cnt=000 when blocked (per vendor spec).
// sndstr must not be empty — firmware ignores responses with empty sndstr.
function fmt(result, readno, str1 = '', str2 = '', str3 = '', cnt = null) {
  const c = cnt ?? (result === 1 ? '001' : '000');
  // Use str1 content as voice announcement fallback if str3 is empty
  const snd = str1 || (result === 1 ? '欢迎' : '无效');
  return `result=${result};readno=${readno};cnt=${c};str1=${str1}str1end;str2=${str2}str2end;str3=${str3}str3end;sndstr=${snd}sndstrend;`;
}

// ── GET|POST /api/gate/verify ─────────────────────────────────────────────────
// Called by the physical gate controller (HTTP client mode, no admin auth).
// Auth is implicit: the qrToken in `id` is unguessable (UUID).
// Gate may send GET (query string) or POST (form-urlencoded body) depending on
// firmware; we merge both so either works.
//
// Params:
//   id       — QR content (our qrToken)
//   idtype   — 0=QR head, 1=serial (QR via RS232), 2=ID card, 99=heartbeat
//   sn       — gate device serial number
//   readno   — 1=entry reader, 2=exit reader
//   time     — gate's timestamp
router.all('/verify', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Railway/Nginx response buffering
  res.setHeader('Connection', 'close');      // signal end-of-body to embedded HTTP client

  // Merge query string + POST body so both request methods work
  const params = { ...req.query, ...req.body };
  const { id, idtype, sn, readno, time } = params;
  const idtypeN = parseInt(idtype, 10);
  const readnoN = parseInt(readno, 10);

  console.log(`[Gate] verify: sn=${sn}, idtype=${idtype}, readno=${readno}, id=${id?.slice(0, 8)}..., time=${time}`);

  // ① Heartbeat — gate polls to confirm our server is alive
  if (idtypeN === 99) {
    return res.send(fmt(1, 0));
  }

  // ② Handle QR codes: idtype=0 (QR head) and idtype=1 (QR via serial port)
  // Both carry the qrToken as `id`; treat identically.
  if (idtypeN !== 0 && idtypeN !== 1) {
    console.warn(`[Gate] Unsupported idtype=${idtype}`);
    return res.send(fmt(0, readnoN, '不支援此類型'));
  }

  if (!id) {
    return res.send(fmt(0, readnoN, '無效 QR 碼'));
  }

  try {
    const r = await Reservation.findOne({ qrToken: id });

    if (!r) {
      console.warn(`[Gate] Unknown qrToken: ${id}`);
      return res.send(fmt(0, readnoN, '票券無效', '請聯繫工作人員'));
    }

    const name  = truncate(r.displayName || '訪客', 16);
    const venue = truncate(r.venueName   || '',     16);

    // ── Entry (readno=1) ──────────────────────────────────────────────────────
    if (readnoN === 1) {
      if (r.status === 'confirmed') {
        r.status = 'checked_in';
        if (!r.expectedCheckIn) r.expectedCheckIn = new Date();
        await r.save();
        console.log(`[Gate] Entry: ${r._id} (${r.displayName}) confirmed→checked_in`);
        return res.send(fmt(1, 1, '歡迎入場', venue, name));
      }

      if (r.status === 'checked_in') {
        // Re-entry after stepping out briefly
        console.log(`[Gate] Re-entry: ${r._id} (${r.displayName})`);
        return res.send(fmt(1, 1, '歡迎回來', venue, name));
      }

      if (r.status === 'completed') {
        return res.send(fmt(0, 1, '此票已結束', '請重新預約'));
      }

      if (r.status === 'cancelled') {
        console.warn(`[Gate] Entry blocked (cancelled): ${r._id} (${r.displayName})`);
        return res.send(fmt(0, 1, '預約已取消', '請重新預約'));
      }

      return res.send(fmt(0, 1, '無法入場', '請聯繫工作人員'));
    }

    // ── Exit (readno=2) ───────────────────────────────────────────────────────
    if (readnoN === 2) {
      if (r.status === 'checked_in') {

        if (r.paymentStatus === 'paid') {
          // Paid — open gate; cron will archive to completed after 10-min grace
          console.log(`[Gate] Exit (paid): ${r._id} (${r.displayName})`);
          return res.send(fmt(1, 2, '感謝使用', venue, name));
        }

        if ((r.totalPrice === 0 || r.paymentStatus === 'free') && r.mode !== 'walkin_short') {
          // Free plan — open gate and complete immediately
          r.status = 'completed';
          await r.save();
          console.log(`[Gate] Exit (free): ${r._id} (${r.displayName})`);
          return res.send(fmt(1, 2, '感謝使用', venue, name));
        }

        // Unpaid walkin_short — block and prompt payment via LIFF
        if (r.mode === 'walkin_short') {
          console.warn(`[Gate] Exit blocked (unpaid walkin_short): ${r._id}`);
          return res.send(fmt(0, 2, '請先完成結帳', '開啟 LINE 結帳'));
        }

        // Unpaid regular booking — open but flag for follow-up
        r.unpaidExit = true;
        r.status = 'completed';
        await r.save();
        console.warn(`[Gate] Exit (unpaidExit): ${r._id} (${r.displayName})`);
        return res.send(fmt(1, 2, '注意未完成結帳', '請盡快付款'));
      }

      if (r.status === 'completed') {
        // Already completed — open gate, never trap people inside
        console.log(`[Gate] Exit (already completed): ${r._id}`);
        return res.send(fmt(1, 2, '感謝使用', venue));
      }

      if (r.status === 'confirmed') {
        console.warn(`[Gate] Exit blocked (not checked in yet): ${r._id} (${r.displayName})`);
        return res.send(fmt(0, 2, '尚未入場', '請先掃碼入場'));
      }

      console.warn(`[Gate] Exit blocked (status=${r.status}): ${r._id}`);
      return res.send(fmt(0, 2, '無法出場', '請聯繫工作人員'));
    }

    // Unknown readno
    console.warn(`[Gate] Unknown readno=${readno}`);
    return res.send(fmt(0, readnoN, '未知指令'));

  } catch (err) {
    console.error('[Gate] Error:', err.message);
    return res.send(fmt(0, readnoN, '系統錯誤'));
  }
});

module.exports = router;
