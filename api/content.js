'use strict';

/* The dashboard's side of the homepage copy: read every field, save the ones
   that were changed, reset the ones that should go back to the original. */

const { redis, requireAuth, readJson } = require('./_lib');
const { SCHEMA, groups } = require('./_schema');
const { STORE_KEY, loadValues: load } = require('./_content');
const MAX_FIELD = 6000;          // characters, per field
const MAX_TOTAL = 120000;        // characters, all fields together

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'GET')    return res.status(200).json({ groups: groups(), values: await load() });
    if (req.method === 'POST')   return await save(req, res);
    if (req.method === 'DELETE') return await reset(req, res);
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('content endpoint failed:', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
};

/* POST { values: { key: text } } — merges into what is already saved. */
async function save(req, res) {
  const body = await readJson(req);
  const incoming = body && body.values;
  if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error: 'missing values' });

  const values = await load();

  for (const key of Object.keys(incoming)) {
    const slot = SCHEMA[key];
    if (!slot) continue;                                   // unknown field: ignore

    const text = String(incoming[key] == null ? '' : incoming[key]).slice(0, MAX_FIELD);

    const problem = check(key, text);
    if (problem) return res.status(400).json({ error: problem, key: key });

    /* Storing a value identical to the original would freeze today's copy into
       the database, so an unchanged field is stored as no override at all. */
    if (!text.trim() || same(text, slot.default)) delete values[key];
    else values[key] = text;
  }

  const payload = JSON.stringify(values);
  if (payload.length > MAX_TOTAL) return res.status(413).json({ error: 'That is too much text to store.' });

  await redis('SET', STORE_KEY, payload);
  return res.status(200).json({ values: values });
}

/* DELETE           → back to the original page
   DELETE ?key=abc  → that one field back to its original */
async function reset(req, res) {
  const key = String((req.query && req.query.key) || '');

  if (!key) {
    await redis('DEL', STORE_KEY);
    return res.status(200).json({ values: {} });
  }
  if (!SCHEMA[key]) return res.status(400).json({ error: 'unknown field' });

  const values = await load();
  delete values[key];
  await redis('SET', STORE_KEY, JSON.stringify(values));
  return res.status(200).json({ values: values });
}

/** Compares ignoring the whitespace an editor cannot see. */
function same(a, b) {
  const tidy = function (v) {
    return String(v == null ? '' : v).split(/\r?\n/).map(function (l) { return l.trim(); })
      .join('\n').replace(/\n{2,}/g, '\n').trim();
  };
  return tidy(a) === tidy(b);
}

/** The only fields that can be wrong rather than merely ugly. */
function check(key, text) {
  const value = text.trim();
  if (!value) return null;

  if (key === 'settings.bookingUrl' && !/^https?:\/\//i.test(value)) {
    return 'The booking link has to start with http:// or https://';
  }
  if (key === 'settings.contactEmail' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    return 'That does not look like an email address.';
  }
  return null;
}
