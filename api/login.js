'use strict';
const { redis, createSessionCookie, passwordMatches, readJson, clientIp } = require('./_lib');

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 900; // 15 minutes

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return res.status(503).json({ error: 'Admin is not configured yet: set ADMIN_PASSWORD and SESSION_SECRET in Vercel.' });
  }

  const key = 'login:fail:' + clientIp(req);

  // Throttle brute force. If Redis is down we still let the password check run.
  try {
    const fails = Number(await redis('GET', key)) || 0;
    if (fails >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    }
  } catch (err) {
    console.error('login throttle read failed:', err.message);
  }

  const { password } = await readJson(req);

  if (!passwordMatches(password)) {
    try {
      await redis('INCR', key);
      await redis('EXPIRE', key, WINDOW_SECONDS);
    } catch (err) {
      console.error('login throttle write failed:', err.message);
    }
    return res.status(401).json({ error: 'Wrong password.' });
  }

  try { await redis('DEL', key); } catch (err) { console.error('login throttle clear failed:', err.message); }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};
