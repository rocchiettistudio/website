'use strict';

const { redis, requireAuth, newSlug, readJson } = require('./_lib');
const { normalize, summary } = require('./_quote');

const INDEX = 'quotes:index';           // sorted set: score = createdAt, member = id
const KEY = function (id) { return 'quote:' + id; };
const MAX_LIST = 200;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'GET')    return await get(req, res);
    if (req.method === 'POST')   return await save(req, res);
    if (req.method === 'DELETE') return await remove(req, res);
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('quotes endpoint failed:', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
};

/* GET /api/quotes           → list of summaries, newest first
   GET /api/quotes?id=abc    → one full quote                       */
async function get(req, res) {
  const id = cleanId(req.query.id);

  if (id) {
    const quote = await load(id);
    if (!quote) return res.status(404).json({ error: 'not found' });
    return res.status(200).json({ quote: quote });
  }

  const ids = (await redis('ZRANGE', INDEX, 0, MAX_LIST - 1, 'REV')) || [];
  if (!ids.length) return res.status(200).json({ quotes: [] });

  const raw = await redis('MGET', ...ids.map(KEY));
  const quotes = [];
  const orphans = [];

  ids.forEach(function (quoteId, i) {
    const parsed = parse(raw[i]);
    if (parsed) { parsed.id = quoteId; quotes.push(summary(parsed)); }
    else { orphans.push(quoteId); }
  });

  // An index entry whose document is gone would otherwise linger forever.
  if (orphans.length) {
    try { await redis('ZREM', INDEX, ...orphans); } catch (err) { console.error('index cleanup failed:', err.message); }
  }

  return res.status(200).json({ quotes: quotes });
}

/* POST /api/quotes  { id?, ...fields }  → creates or updates, returns the stored quote */
async function save(req, res) {
  const body = await readJson(req);
  const id = cleanId(body.id);

  const previous = id ? await load(id) : null;
  if (id && !previous) return res.status(404).json({ error: 'not found' });

  const quote = normalize(body, previous);
  quote.id = previous ? previous.id : newSlug();

  await redis('SET', KEY(quote.id), JSON.stringify(quote));
  await redis('ZADD', INDEX, quote.createdAt, quote.id);

  return res.status(200).json({ quote: quote });
}

/* DELETE /api/quotes?id=abc */
async function remove(req, res) {
  const id = cleanId(req.query.id);
  if (!id) return res.status(400).json({ error: 'missing id' });

  await redis('DEL', KEY(id));
  await redis('ZREM', INDEX, id);

  return res.status(200).json({ ok: true });
}

async function load(id) {
  const quote = parse(await redis('GET', KEY(id)));
  if (quote) quote.id = id;
  return quote;
}

function parse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

/** Ids are our own base64url slugs — anything else never reaches Redis. */
function cleanId(value) {
  const id = String(value == null ? '' : value);
  return /^[A-Za-z0-9_-]{6,32}$/.test(id) ? id : '';
}
