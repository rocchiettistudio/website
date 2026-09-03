#!/usr/bin/env node
'use strict';

/* ─────────────────────────────────────────────────────────────────────────
   Checks that api/_schema.js still describes index.html.

       node check-content.js

   Every field is rendered from its default and compared with the markup that
   is actually in the page. If you edit index.html by hand and forget to
   update the matching default, this fails and tells you which field — before
   the dashboard offers to overwrite your change with the old copy.

   Never deployed (see .vercelignore).
   ───────────────────────────────────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');

const { readSlot, findSlot, RENDER, applyContent } = require('./api/_content');
const { SCHEMA } = require('./api/_schema');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

/* Compares what a browser would render, not the bytes: whitespace between
   sibling elements and an escaped apostrophe are not differences. */
function norm(value) {
  return String(value)
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

let failures = 0;

Object.keys(SCHEMA).forEach(function (key) {
  const slot = SCHEMA[key];
  if (slot.type === 'setting') return;

  const inPage = readSlot(html, key);
  if (inPage === null) {
    failures++;
    console.error('✗ ' + key + ' — no data-cms="' + key + '" in index.html');
    return;
  }

  const rendered = RENDER[slot.type](slot.default, slot);
  if (norm(inPage) === norm(rendered)) return;

  failures++;
  console.error('\n✗ ' + key + ' (' + slot.type + ') — the default no longer matches the page');
  console.error('  index.html : ' + norm(inPage).slice(0, 200));
  console.error('  _schema.js : ' + norm(rendered).slice(0, 200));
});

/* Applying every default must leave everything outside the slots untouched. */
const values = {};
Object.keys(SCHEMA).forEach(function (key) { values[key] = SCHEMA[key].default; });

function blankSlots(page) {
  Object.keys(SCHEMA).forEach(function (key) {
    if (SCHEMA[key].type === 'setting') return;
    const at = findSlot(page, key);
    if (at) page = page.slice(0, at.start) + '«slot»' + page.slice(at.end);
  });
  return page;
}

if (blankSlots(applyContent(html, values, SCHEMA)) !== blankSlots(html)) {
  failures++;
  console.error('\n✗ applying content changed something outside a slot');
}

const total = Object.keys(SCHEMA).filter(function (k) { return SCHEMA[k].type !== 'setting'; }).length;
if (failures) {
  console.error('\n' + failures + ' problem(s) across ' + total + ' fields.');
  process.exit(1);
}
console.log(total + ' fields still match index.html, and nothing outside them changes.');
