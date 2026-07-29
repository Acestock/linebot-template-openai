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
