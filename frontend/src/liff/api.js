// LIFF API helpers
const BASE = '/api/liff';

let _sessionToken = null;

export function setSessionToken(t) { _sessionToken = t; }
export function getSessionToken()  { return _sessionToken; }

function authHeaders() {
  return _sessionToken
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${_sessionToken}` }
    : { 'Content-Type': 'application/json' };
}

export async function liffAuth(accessToken) {
  const r = await fetch(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken })
  });
  if (!r.ok) throw new Error('Auth failed');
  return r.json();
}

export async function fetchVenues() {
  const r = await fetch(`${BASE}/venues`);
  if (!r.ok) throw new Error('Failed to load venues');
  return r.json();
}

export async function fetchVenue(id) {
  const r = await fetch(`${BASE}/venues/${id}`);
  if (!r.ok) throw new Error('Failed to load venue');
  return r.json();
}

export async function fetchAvailability(venueId, date) {
  const r = await fetch(`${BASE}/venues/${venueId}/availability?date=${date}`);
  if (!r.ok) throw new Error('Failed to check availability');
  return r.json();
}

export async function createReservation(data) {
  const r = await fetch(`${BASE}/reservations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || '預約失敗');
  return json;
}

export async function fetchMyReservations() {
  const r = await fetch(`${BASE}/reservations`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Failed to load reservations');
  return r.json();
}

export async function cancelReservation(id) {
  const r = await fetch(`${BASE}/reservations/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || '取消失敗');
  return json;
}

export async function fetchReservationQr(id) {
  const r = await fetch(`${BASE}/reservations/${id}/qr`, { headers: authHeaders() });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || '無法取得 QR Code');
  return json;
}

export async function checkoutReservation(id) {
  const r = await fetch(`${BASE}/reservations/${id}/checkout`, {
    method: 'POST',
    headers: authHeaders()
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || '出場失敗');
  return json;
}

export async function initiatePayment(id, couponId) {
  const r = await fetch(`${BASE}/reservations/${id}/payment`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ couponId: couponId || undefined })
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || '付款啟動失敗');
  return json;
}

export async function fetchTasks() {
  const r = await fetch(`${BASE}/tasks`, { headers: authHeaders() });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || '載入任務失敗');
  return json;
}

export async function acceptTask(taskId) {
  const r = await fetch(`${BASE}/tasks/${taskId}/accept`, {
    method: 'POST',
    headers: authHeaders()
  });
  let json;
  try { json = await r.json(); } catch (_) { throw new Error('操作失敗，請重試'); }
  if (!r.ok) throw new Error(json?.error || '操作失敗');
  return json;
}

export async function submitTask(taskId, data) {
  const r = await fetch(`${BASE}/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  let json;
  try { json = await r.json(); } catch (_) { throw new Error('請求失敗，請重試'); }
  if (!r.ok) throw new Error(json?.error || '提交失敗');
  return json;
}

export async function fetchMyCoupons() {
  const r = await fetch(`${BASE}/coupons`, { headers: authHeaders() });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || '載入折扣券失敗');
  return json;
}

export function submitEcpayForm(action, fields) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}
