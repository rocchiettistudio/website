'use strict';

const crypto = require('crypto');

/* ─────────────────────────────────────────────────────────────
   Upstash Redis over its REST API — no dependency, no build step.
   Accepts both the Vercel-KV and the Upstash env var names.
   ───────────────────────────────────────────────────────────── */
const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...command) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis is not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing)');
  }
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Redis ' + res.status + ': ' + text.slice(0, 200));
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Redis: bad JSON response'); }
  if (data && data.error) throw new Error('Redis: ' + data.error);
  return data ? data.result : null;
}

/* ─────────────────────────────────────────────────────────────
   Session cookie: base64url(payload).hmacSHA256(payload)
   ───────────────────────────────────────────────────────────── */
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const COOKIE = 'rs_session';
const SESSION_DAYS = 7;

function sign(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

/* Secure is always on in production. Only the local dev server opts out, because
   some browsers refuse a Secure cookie over plain http://localhost. */
const SECURE = process.env.ALLOW_INSECURE_COOKIE === '1' ? '' : '; Secure';

function createSessionCookie() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 86400000 })).toString('base64url');
  const token = payload + '.' + sign(payload);
  return COOKIE + '=' + token + '; Path=/; HttpOnly' + SECURE + '; SameSite=Lax; Max-Age=' + SESSION_DAYS * 86400;
}

function clearSessionCookie() {
  return COOKIE + '=; Path=/; HttpOnly' + SECURE + '; SameSite=Lax; Max-Age=0';
}

function verifySession(token) {
  if (!token || !SESSION_SECRET) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const mac = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (mac.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(mac, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch { return false; }
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function isAuthed(req) {
  return verifySession(readCookie(req, COOKIE));
}

/** Guards an admin endpoint. Returns false and answers 401 when not signed in. */
function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

/** Constant-time password check that tolerates different lengths. */
function passwordMatches(given) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function newSlug() {
  return crypto.randomBytes(9).toString('base64url'); // 12 url-safe chars
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Escapes, then turns blank lines into paragraphs and single newlines into <br>. */
function escapeRich(value) {
  const text = escapeHtml(value).trim();
  if (!text) return '';
  return text.split(/\n{2,}/).map(function (block) {
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).join('');
}

function money(amount, currency) {
  const n = Number(amount) || 0;
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  const hasCents = Math.abs(n % 1) > 0.005;
  return symbol + n.toLocaleString('en-GB', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

/** Reads a JSON body whether or not the platform already parsed it. */
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : (fwd || '')).split(',')[0].trim() || 'unknown';
}

module.exports = {
  redis, createSessionCookie, clearSessionCookie, verifySession, readCookie,
  isAuthed, requireAuth, passwordMatches, newSlug, escapeHtml, escapeRich,
  money, readJson, clientIp,
};
