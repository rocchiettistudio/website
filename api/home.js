'use strict';

/* Serves the homepage with whatever the dashboard has saved applied to it.
   vercel.json rewrites "/" here; index.html itself stays a complete, valid
   page, so every failure below degrades to the original copy rather than to
   an error. */

const fs = require('fs');
const path = require('path');

const { applyContent, loadValues } = require('./_content');
const { SCHEMA } = require('./_schema');

const TEMPLATE_FILE = 'index.html';

/* Where index.html can be found once the function is bundled. vercel.json
   asks for it with functions.includeFiles; the extra candidates cover the
   runtimes that lay the bundle out differently. */
const CANDIDATES = [
  path.join(process.cwd(), TEMPLATE_FILE),
  path.join(__dirname, '..', TEMPLATE_FILE),
  path.join(__dirname, TEMPLATE_FILE),
];

let cachedTemplate = null;

/** Reads index.html from the bundle, or over HTTP as a last resort. */
async function template(req) {
  if (cachedTemplate) return cachedTemplate;

  for (const file of CANDIDATES) {
    try {
      const html = fs.readFileSync(file, 'utf8');
      if (html) { cachedTemplate = html; return html; }
    } catch (err) { /* try the next one */ }
  }

  /* Nothing on disk. /_source is a rewrite to the very same static file, so
     this reads the page the CDN is already serving. It never hits this
     function again, so there is no loop. */
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) throw new Error('index.html not found in the bundle and no host to fetch it from');

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const res = await fetch(proto + '://' + host + '/_source');
  if (!res.ok) throw new Error('could not fetch /_source: ' + res.status);

  cachedTemplate = await res.text();
  return cachedTemplate;
}

module.exports = async function handler(req, res) {
  let html;
  try {
    html = await template(req);
  } catch (err) {
    console.error('homepage template unavailable:', err.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send('<!doctype html><meta charset="utf-8"><title>Rocchietti Studio</title>' +
      '<p style="font:16px system-ui;padding:40px">The page could not be loaded. Please try again in a moment.</p>');
  }

  /* From here on nothing may break the page: if the database is unreachable
     loadValues returns {} and the visitor simply gets the original copy. */
  let values = {};
  try { values = await loadValues(); } catch (err) { console.error('content unavailable:', err.message); }

  let page;
  try {
    page = applyContent(html, values, SCHEMA);
    page = injectSettings(page, values);
  } catch (err) {
    console.error('content could not be applied:', err.message);
    page = html;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  /* Edits go live within the minute; visitors are served from the CDN. */
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).send(page);
};

/** The booking link and the address reach the page as a tiny script, which
    the config block in index.html reads before falling back to its own. */
function injectSettings(page, values) {
  const site = {};
  if (values['settings.bookingUrl'])   site.bookingUrl   = String(values['settings.bookingUrl']).trim();
  if (values['settings.contactEmail']) site.contactEmail = String(values['settings.contactEmail']).trim();
  if (!Object.keys(site).length) return page;

  const json = JSON.stringify(site).replace(/</g, '\\u003c');
  return page.replace('</head>', '<script>window.__SITE=' + json + ';</script>\n</head>');
}
