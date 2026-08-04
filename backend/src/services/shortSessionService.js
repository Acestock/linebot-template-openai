// Short-session (計時) pricing algorithms
// All times are in minutes-from-midnight, with evening slots continuing past midnight
// e.g. 02:00 = 2*60 + 1440 = 1560 (treated as 26:00)

const SLOT_RANGES = {
  morning:   { start: 420,  end: 720  },  // 07:00–12:00
  afternoon: { start: 720,  end: 1080 },  // 12:00–18:00
  evening:   { start: 1080, end: 1560 }   // 18:00–02:00(next day=26:00)
};
const SLOT_ORDER = ['morning', 'afternoon', 'evening'];

function ceilToTen(n) {
  return Math.ceil(n / 10) * 10;
}

// Convert a Date to minutes-from-midnight; hours < 7 are treated as "next-day" (add 1440)
function timeToMinutes(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const raw = h * 60 + m;
  return h < 7 ? raw + 1440 : raw;
}

// Apply 10-minute grace: 70min→1hr, 130min→2hr, 190min→3hr
function billedHours(actualMinutes) {
  if (actualMinutes <= 70)  return 1;
  if (actualMinutes <= 130) return 2;
  return 3;
}

// Calculate short-session price for actual usage duration
// singlePlans: array of VenuePlan objects with type==='single'
// config: venue.shortSession
function calcShortSessionPrice(singlePlans, checkInMinute, actualMinutes, config) {
  const bh = billedHours(actualMinutes);
  const billedMins = bh * 60;
  const exitMinute = checkInMinute + billedMins;
  const ratio = config[`ratio${bh}h`];

  let rawPrice = 0;
  for (const slot of SLOT_ORDER) {
    const range = SLOT_RANGES[slot];
    const overlapStart = Math.max(checkInMinute, range.start);
    const overlapEnd   = Math.min(exitMinute, range.end);
    if (overlapEnd <= overlapStart) continue;
    const plan = singlePlans.find(p => p.slots && p.slots[0] === slot);
    if (!plan) continue;
    rawPrice += plan.price * ratio * ((overlapEnd - overlapStart) / billedMins);
  }

  let price = ceilToTen(rawPrice);
  if (bh === 1) price = Math.max(config.minHourPrice || 40, price);
  return { price, billedHours: bh, exitMinute };
}

// Build preview tiers for 1hr / 2hr / 3hr
function calcPreviewTiers(singlePlans, checkInMinute, config) {
  return [1, 2, 3].map(h => {
    const billedMins = h * 60;
    const exitMinute = checkInMinute + billedMins;
    const ratio = config[`ratio${h}h`];

    let rawPrice = 0;
    for (const slot of SLOT_ORDER) {
      const range = SLOT_RANGES[slot];
      const overlapStart = Math.max(checkInMinute, range.start);
      const overlapEnd   = Math.min(exitMinute, range.end);
      if (overlapEnd <= overlapStart) continue;
      const plan = singlePlans.find(p => p.slots && p.slots[0] === slot);
      if (!plan) continue;
      rawPrice += plan.price * ratio * ((overlapEnd - overlapStart) / billedMins);
    }

    let price = ceilToTen(rawPrice);
    if (h === 1) price = Math.max(config.minHourPrice || 40, price);
    return { hours: h, price, exitMinute };
  });
}

// Get the contiguous coverage range for a set of plans
// Returns null if coverage is disconnected (e.g. morning + evening without afternoon)
function getCoverageRange(plans) {
  const coveredSlots = new Set();
  for (const p of plans) {
    for (const s of (p.slots || [])) coveredSlots.add(s);
  }
  if (coveredSlots.size === 0) return null;

  // Check connectivity — slots must be contiguous
  const slotIdx = SLOT_ORDER.reduce((acc, s, i) => { acc[s] = i; return acc; }, {});
  const indices = [...coveredSlots].map(s => slotIdx[s]).sort((a, b) => a - b);
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return null; // gap found
  }

  let minStart = Infinity, maxEnd = -Infinity;
  for (const slot of coveredSlots) {
    minStart = Math.min(minStart, SLOT_RANGES[slot].start);
    maxEnd   = Math.max(maxEnd,   SLOT_RANGES[slot].end);
  }
  return { start: minStart, end: maxEnd };
}

// Find the cheapest combination of fixed plans (with optional short-session prefix/suffix)
// that covers [startMinute, endMinute]
function findCheapestCoverage(allPlans, startMinute, endMinute, config) {
  const singlePlans = allPlans.filter(p => p.type === 'single' && p.isActive !== false);
  const n = allPlans.length;
  let bestCost = Infinity;
  let bestValidUntil = null;

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = allPlans.filter((_, i) => mask & (1 << i));
    const plansCost = subset.reduce((s, p) => s + p.price, 0);
    const coverage = getCoverageRange(subset);
    if (!coverage) continue;

    const gapStart = coverage.start - startMinute;  // >0: coverage starts after usage start
    const gapEnd   = endMinute - coverage.end;       // >0: usage ends after coverage ends

    const cases = [];

    // Pure fixed plans
    if (gapStart <= 0 && gapEnd <= 0) {
      cases.push({ total: plansCost, validUntil: coverage.end });
    }

    // Short-session prefix + fixed plans
    if (gapStart > 0 && gapStart <= 190 && gapEnd <= 0) {
      const { price: pfx } = calcShortSessionPrice(singlePlans, startMinute, gapStart, config);
      cases.push({ total: plansCost + pfx, validUntil: coverage.end });
    }

    // Fixed plans + short-session suffix
    if (gapStart <= 0 && gapEnd > 0 && gapEnd <= 190) {
      const { price: sfx } = calcShortSessionPrice(singlePlans, coverage.end, gapEnd, config);
      cases.push({ total: plansCost + sfx, validUntil: coverage.end + gapEnd });
    }

    // Short-session prefix + fixed plans + short-session suffix
    if (gapStart > 0 && gapStart <= 190 && gapEnd > 0 && gapEnd <= 190) {
      const { price: pfx } = calcShortSessionPrice(singlePlans, startMinute, gapStart, config);
      const { price: sfx } = calcShortSessionPrice(singlePlans, coverage.end, gapEnd, config);
      cases.push({ total: plansCost + pfx + sfx, validUntil: coverage.end + gapEnd });
    }

    for (const c of cases) {
      if (c.total < bestCost) {
        bestCost = c.total;
        bestValidUntil = c.validUntil;
      }
    }
  }

  return { minCost: bestCost === Infinity ? null : bestCost, validUntil: bestValidUntil };
}

// Convert minutes-from-midnight back to "HH:MM" string
function minutesToTimeStr(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440; // normalize to 0–1439
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

module.exports = {
  timeToMinutes,
  billedHours,
  calcShortSessionPrice,
  calcPreviewTiers,
  findCheapestCoverage,
  minutesToTimeStr
};
