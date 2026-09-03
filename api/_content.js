'use strict';

/* ─────────────────────────────────────────────────────────────────────────
   The editable copy of the homepage.

   index.html stays the single source of truth for the design: every editable
   piece is marked there with a data-cms="<key>" attribute, and this module
   swaps the inside of those elements for whatever the admin saved.

   Nothing is stored until it is edited. A key with no saved value leaves the
   markup in index.html completely untouched, so the page a visitor gets is
   byte for byte the one in the repo until someone changes that field.

   The admin writes plain text, never HTML. Two conventions survive:
     *like this*   emphasis — the brush highlight in a title, bold elsewhere
     |             separates the columns of a list, a table or a price
   Everything else is escaped, so no markup typed into the dashboard can
   reach the page.
   ───────────────────────────────────────────────────────────────────────── */

/* Everything here is written into element content, never into an attribute,
   so an apostrophe needs no escaping — and leaving it alone keeps the output
   identical to the hand-written markup in index.html. */
function escapeText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── inline text → html ──────────────────────────────────────────────── */

/** Escapes, then turns *emphasis* into `wrap`, and newlines into <br>. */
function inline(value, wrap) {
  const parts = escapeText(value).split(/\*([^*]+)\*/g);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    out += i % 2 ? wrap(parts[i]) : parts[i];
  }
  return out.replace(/\r?\n/g, '<br>');
}

const BRUSH = function (t) { return '<span class="hl font-brush font-normal text-brown text-[1.12em]">' + t + '</span>'; };
const strongIn = function (cls) { return function (t) { return '<span class="' + cls + '">' + t + '</span>'; }; };

/** Splits a multi-line value into trimmed, non-empty lines. */
function lines(value) {
  return String(value == null ? '' : value).split(/\r?\n/).map(function (l) { return l.trim(); })
    .filter(function (l) { return l.length; });
}

/** Splits one line on "|" into trimmed cells. */
function cells(line) {
  return String(line).split('|').map(function (c) { return c.trim(); });
}

/* ── the renderers, one per field type ───────────────────────────────── */

const RENDER = {
  /* A heading. *emphasis* becomes the brush highlight. */
  title: function (value) {
    return inline(value, BRUSH);
  },

  /* A line or paragraph of copy. *emphasis* becomes bold. */
  text: function (value, slot) {
    return inline(value, strongIn(slot.strong || 'font-semibold text-ink'));
  },

  /* A bulleted feature list — one feature per line. */
  list: function (value, slot) {
    const bullet = slot.bullet || 'text-brown';
    return lines(value).map(function (line) {
      return '<li class="flex gap-3"><span class="' + bullet + '">✳</span><span>' +
        inline(line, strongIn(slot.strong || 'font-semibold text-ink')) + '</span></li>';
    }).join('');
  },

  /* A priced list — "Name | €290" per line. */
  pricelist: function (value) {
    return lines(value).map(function (line) {
      const c = cells(line);
      return '<li class="flex items-center justify-between gap-6 px-5 py-4">' +
        '<span class="text-[15.5px]">' + escapeText(c[0] || '') + '</span>' +
        '<span class="shrink-0 font-semibold">' + escapeText(c[1] || '') + '</span></li>';
    }).join('');
  },

  /* The row of terms under a package — "*2* revisions | *50%* upfront". */
  inlineList: function (value, slot) {
    const wrap = strongIn(slot.strong || 'font-semibold text-ink');
    return cells(String(value == null ? '' : value)).filter(function (c) { return c.length; })
      .map(function (c) { return '<span>' + inline(c, wrap) + '</span>'; }).join('');
  },

  /* A headline price with an optional smaller suffix — "€290 | / month". */
  price: function (value, slot) {
    const c = cells(String(value == null ? '' : value));
    return escapeText(c[0] || '') + (c[1]
      ? '<span class="' + (slot.suffix || 'text-[16px] font-semibold text-ink/60') + '">' + escapeText(' ' + c[1]) + '</span>'
      : '');
  },

  /* The comparison table. One row per line, cells split on "|".
     A row starting with "+" is the highlighted one; *emphasis* in the first
     cell becomes the little pill. */
  table: function (value) {
    const rows = lines(value);
    return rows.map(function (line, i) {
      const featured = line.charAt(0) === '+';
      const c = cells(featured ? line.slice(1) : line);
      const last = i === rows.length - 1;
      const trClass = featured ? 'border-b border-ink/10 bg-peri2/60' : (last ? '' : 'border-b border-ink/10');
      const pill = strongIn('ml-1.5 align-middle rounded-full bg-lemon px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.12em]');
      return '<tr' + (trClass ? ' class="' + trClass + '"' : '') + '>' +
        '<td class="px-6 py-4 font-semibold">' + inline(c[0] || '', pill) + '</td>' +
        '<td class="px-6 py-4' + (featured ? ' font-semibold' : '') + '">' + escapeText(c[1] || '') + '</td>' +
        '<td class="px-6 py-4 text-ink/70">' + escapeText(c[2] || '') + '</td>' +
        '<td class="px-6 py-4 text-ink/70">' + escapeText(c[3] || '') + '</td>' +
      '</tr>';
    }).join('');
  },
};


/* ── finding a slot in the page ──────────────────────────────────────── */

/**
 * Locates the element carrying data-cms="key" and returns the offsets of its
 * inner HTML. Depth-aware, so a slot may contain nested tags of its own kind.
 * Returns null when the key is not in the page.
 */
function findSlot(html, key) {
  const attr = 'data-cms="' + key + '"';
  const at = html.indexOf(attr);
  if (at < 0) return null;

  const tagStart = html.lastIndexOf('<', at);
  if (tagStart < 0) return null;
  const named = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(html.slice(tagStart, at));
  if (!named) return null;
  const tag = named[1];

  const openEnd = html.indexOf('>', at);
  if (openEnd < 0) return null;

  const scan = new RegExp('<' + tag + '(?=[\\s/>])|</' + tag + '\\s*>', 'gi');
  scan.lastIndex = openEnd + 1;
  let depth = 1;
  let match;
  while ((match = scan.exec(html))) {
    if (match[0].charAt(1) === '/') {
      depth--;
      if (depth === 0) return { start: openEnd + 1, end: match.index };
    } else {
      depth++;
    }
  }
  return null;                      // unbalanced markup: leave the page alone
}

/** The current inner HTML of a slot, or null. */
function readSlot(html, key) {
  const at = findSlot(html, key);
  return at ? html.slice(at.start, at.end) : null;
}

/**
 * Rewrites every slot the admin has actually saved. Keys with no saved value,
 * keys missing from the schema and keys missing from the page are skipped, so
 * anything unexpected leaves the original markup in place rather than blanking
 * a section of the site.
 */
function applyContent(html, values, schema) {
  if (!values) return html;

  Object.keys(schema).forEach(function (key) {
    const slot = schema[key];
    const value = values[key];
    if (value == null || value === '') return;
    if (slot.type === 'setting') return;            // injected as script, not markup

    const render = RENDER[slot.type];
    if (!render) return;

    const at = findSlot(html, key);
    if (!at) return;

    html = html.slice(0, at.start) + render(value, slot) + html.slice(at.end);
  });

  return html;
}

/* ── stored values ───────────────────────────────────────────────────── */

const { redis } = require('./_lib');

const STORE_KEY = 'site:content';

/**
 * Everything the admin has saved. Never throws: an unreachable database or a
 * damaged document reads as "nothing has been edited", so the site falls back
 * to the copy in index.html instead of failing to render.
 */
async function loadValues() {
  let raw;
  try {
    raw = await redis('GET', STORE_KEY);
  } catch (err) {
    console.error('content read failed:', err.message);
    return {};
  }
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = { STORE_KEY, loadValues, escapeText, inline, lines, cells, RENDER, BRUSH, strongIn, findSlot, readSlot, applyContent };

