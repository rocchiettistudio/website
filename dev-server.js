#!/usr/bin/env node
'use strict';

/* ─────────────────────────────────────────────────────────────────────────
   Local development server — NEVER deployed (see .vercelignore).

   Runs the site the way Vercel does (static files + /api functions +
   the /q/:slug rewrite) and stands in for Upstash with a small
   file-backed store, so you can try the whole quote flow with no
   accounts, no keys and nothing to install.

       node dev-server.js
       → http://localhost:7788        the packages page
       → http://localhost:7788/admin  the dashboard

   Password: whatever ADMIN_PASSWORD is set to, or "dev" by default.
       ADMIN_PASSWORD=something-else node dev-server.js

   Quotes you make here are written to .dev-data.json next to this file
   and never touch the real Upstash database.
   ───────────────────────────────────────────────────────────────────────── */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 7788;
const DATA_FILE = path.join(ROOT, '.dev-data.json');

/* ── env, as Vercel would provide it ─────────────────────────────────── */
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dev';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'local-development-only-secret';
process.env.ALLOW_INSECURE_COOKIE = '1';          // plain http://localhost
process.env.KV_REST_API_URL = 'http://127.0.0.1:' + (PORT + 1);
process.env.KV_REST_API_TOKEN = 'local-dev-token';

/* ── a tiny stand-in for Upstash, speaking the same REST dialect ──────── */
const store = new Map();     // key   -> string
const zsets = new Map();     // key   -> Map(member -> score)

function load() {
  if (!fs.existsSync(DATA_FILE)) return;
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    Object.entries(saved.store || {}).forEach(([k, v]) => store.set(k, v));
    Object.entries(saved.zsets || {}).forEach(([k, v]) => zsets.set(k, new Map(Object.entries(v))));
  } catch (err) {
    console.warn('could not read ' + path.basename(DATA_FILE) + ':', err.message);
  }
}

function persist() {
  const zsetsOut = {};
  zsets.forEach((v, k) => { zsetsOut[k] = Object.fromEntries(v); });
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ store: Object.fromEntries(store), zsets: zsetsOut }, null, 2));
  } catch (err) {
    console.warn('could not write ' + path.basename(DATA_FILE) + ':', err.message);
  }
}

function redisExec(command) {
  const [name, ...args] = command;
  const op = String(name).toUpperCase();
  const writes = ['SET', 'DEL', 'INCR', 'ZADD', 'ZREM'];

  let result;
  switch (op) {
    case 'GET':  result = store.has(args[0]) ? store.get(args[0]) : null; break;
    case 'SET':  store.set(args[0], String(args[1])); result = 'OK'; break;
    case 'DEL':  result = store.delete(args[0]) ? 1 : 0; break;
    case 'INCR': { const n = (Number(store.get(args[0])) || 0) + 1; store.set(args[0], String(n)); result = n; break; }
    case 'EXPIRE': result = 1; break;               // login throttling only; not worth simulating
    case 'MGET': result = args.map((k) => (store.has(k) ? store.get(k) : null)); break;
    case 'ZADD': {
      const z = zsets.get(args[0]) || new Map();
      z.set(String(args[2]), Number(args[1]));
      zsets.set(args[0], z);
      result = 1; break;
    }
    case 'ZREM': {
      const z = zsets.get(args[0]);
      result = 0;
      if (z) args.slice(1).forEach((m) => { if (z.delete(String(m))) result++; });
      break;
    }
    case 'ZRANGE': {
      const z = zsets.get(args[0]);
      if (!z) { result = []; break; }
      const rev = args.some((a) => String(a).toUpperCase() === 'REV');
      const entries = [...z.entries()].sort((a, b) => a[1] - b[1]);
      if (rev) entries.reverse();
      const start = Number(args[1]) || 0;
      const stop = Number(args[2]);
      result = entries.slice(start, stop < 0 ? entries.length + stop + 1 : stop + 1).map((e) => e[0]);
      break;
    }
    default: throw new Error('dev store does not implement ' + op);
  }

  if (writes.includes(op)) persist();
  return result;
}

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    try {
      res.end(JSON.stringify({ result: redisExec(JSON.parse(body)) }));
    } catch (err) {
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}).listen(PORT + 1, '127.0.0.1');

/* ── the site itself ─────────────────────────────────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

/** Gives a plain Node response the few helpers Vercel's runtime adds. */
function asVercelResponse(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (payload) => { res.end(payload); return res; };
  return res;
}

async function runFunction(name, req, res, query) {
  const file = path.join(ROOT, 'api', name + '.js');
  if (name.startsWith('_') || !fs.existsSync(file)) {
    return asVercelResponse(res).status(404).json({ error: 'no such function' });
  }
  delete require.cache[require.resolve(file)];      // pick up edits without restarting
  const handler = require(file);

  req.query = query;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (raw) { try { req.body = JSON.parse(raw); } catch { req.body = raw; } }
  }
  await handler(req, asVercelResponse(res));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  const query = Object.fromEntries(url.searchParams.entries());

  try {
    if (pathname.startsWith('/api/')) return await runFunction(pathname.slice(5), req, res, query);

    const quote = pathname.match(/^\/q\/([A-Za-z0-9_-]+)$/);      // the vercel.json rewrite
    if (quote) return await runFunction('quote', req, res, Object.assign({ slug: quote[1] }, query));

    let file = pathname === '/' ? '/index.html' : pathname;
    if (!path.extname(file)) file += '.html';                     // cleanUrls
    const abs = path.join(ROOT, path.normalize(file));
    if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 — not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(abs));
  } catch (err) {
    console.error(req.method + ' ' + pathname + ' failed:', err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 — ' + err.message);
  }
}).listen(PORT, () => {
  load();
  const quotes = (zsets.get('quotes:index') || new Map()).size;
  console.log('');
  console.log('  Rocchietti Studio — dev server');
  console.log('  ------------------------------------------------');
  console.log('  packages   http://localhost:' + PORT + '/');
  console.log('  admin      http://localhost:' + PORT + '/admin');
  console.log('  password   ' + process.env.ADMIN_PASSWORD);
  console.log('  data       .dev-data.json' + (quotes ? '  (' + quotes + ' quote' + (quotes === 1 ? '' : 's') + ' loaded)' : '  (empty)'));
  console.log('  ------------------------------------------------');
  console.log('  Ctrl+C to stop.');
  console.log('');
});
