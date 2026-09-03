'use strict';

/* Rocchietti Studio — quote admin.
   Talks to /api/session, /api/login, /api/logout and /api/quotes. */

const DEFAULTS = {
  eyebrow: 'Rocchietti Studio · Proposal',
  totalLabel: 'Total',
  paymentTerms: '50% to start, 50% on delivery',
  footerNote: '',
  cta: {
    heading: 'Shall we start?',
    body: 'Book a call and we go through it together, or just reply by email — whichever is easier.',
    bookLabel: 'Book a call',
    bookUrl: 'https://cal.com/sara-rocchietti-xlis94/30min',
    emailLabel: 'Send an email',
    email: 'rocchietti.studio@gmail.com',
  },
};

const $ = function (id) { return document.getElementById(id); };
const esc = function (v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

let current = null;   // the quote being edited
let dirty = false;

/* ── plumbing ─────────────────────────────────────────────── */

async function api(path, options) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options));
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (res.status === 401) { show('login'); throw new Error('Session expired — sign in again.'); }
  if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
  return data;
}

let toastTimer;
function toast(message, bad) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('bad', Boolean(bad));
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2600);
}

function show(view) {
  ['login', 'dash', 'editor'].forEach(function (name) {
    $('view-' + name).hidden = name !== view;
  });
  $('logout').hidden = view === 'login';
  window.scrollTo(0, 0);
}

function money(amount, currency) {
  const n = Number(amount) || 0;
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  const cents = Math.abs(n % 1) > 0.005;
  return symbol + n.toLocaleString('en-GB', {
    minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0,
  });
}

/* ── auth ─────────────────────────────────────────────────── */

$('login-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  $('login-error').hidden = true;
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
    $('password').value = '';
    await loadList();
  } catch (err) {
    $('login-error').textContent = err.message;
    $('login-error').hidden = false;
  }
});

$('logout').addEventListener('click', async function () {
  try { await api('/api/logout', { method: 'POST' }); } catch (e) { /* signing out anyway */ }
  current = null;
  show('login');
});

/* ── dashboard ────────────────────────────────────────────── */

async function loadList() {
  const { quotes } = await api('/api/quotes');
  const list = $('list');
  $('list-empty').hidden = quotes.length > 0;

  list.innerHTML = quotes.map(function (q) {
    const who = [q.client && q.client.name, q.client && q.client.company].filter(Boolean).join(' · ');
    const when = new Date(q.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return '' +
      '<div class="row-q">' +
        '<div class="row-main">' +
          '<p class="row-title">' + esc(q.title || 'Untitled quote') + '</p>' +
          '<p class="row-meta">' + (who ? esc(who) + ' · ' : '') + q.itemCount + ' service' + (q.itemCount === 1 ? '' : 's') + ' · updated ' + esc(when) + '</p>' +
        '</div>' +
        '<span class="pill ' + q.status + '">' + q.status + '</span>' +
        '<span class="row-total">' + esc(money(q.total, q.currency)) + '</span>' +
        '<div class="row-actions">' +
          '<button class="btn btn-sm" data-edit="' + esc(q.id) + '">Edit</button>' +
          (q.status === 'published'
            ? '<button class="btn btn-sm" data-copy="' + esc(q.id) + '">Copy link</button>' +
              '<a class="btn btn-sm" href="/q/' + esc(q.id) + '" target="_blank" rel="noopener">Open</a>'
            : '') +
        '</div>' +
      '</div>';
  }).join('');

  list.querySelectorAll('[data-edit]').forEach(function (btn) {
    btn.addEventListener('click', function () { openQuote(btn.dataset.edit); });
  });
  list.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () { copyLink(btn.dataset.copy); });
  });

  show('dash');
}

async function copyLink(id) {
  const url = location.origin + '/q/' + id;
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied');
  } catch (err) {
    window.prompt('Copy this link:', url);
  }
}

$('new-quote').addEventListener('click', function () {
  current = {
    id: null, status: 'draft', currency: 'EUR', pricingMode: 'sum', fixedTotal: 0,
    client: { name: '', company: '', email: '' },
    eyebrow: DEFAULTS.eyebrow, title: '', intro: '',
    items: [{ name: '', description: '', duration: '', price: 0 }],
    discount: { type: 'amount', value: 0, label: '' },
    totalLabel: DEFAULTS.totalLabel, paymentTerms: DEFAULTS.paymentTerms,
    notes: '', validUntil: '', footerNote: DEFAULTS.footerNote,
    cta: Object.assign({}, DEFAULTS.cta),
  };
  fillForm(current);
  show('editor');
});

$('back').addEventListener('click', async function () {
  if (dirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
  dirty = false;
  await loadList();
});

async function openQuote(id) {
  const { quote } = await api('/api/quotes?id=' + encodeURIComponent(id));
  current = quote;
  fillForm(quote);
  show('editor');
}

/* ── editor: form <-> object ──────────────────────────────── */

const FIELDS = {
  'f-client-name': ['client', 'name'], 'f-client-company': ['client', 'company'], 'f-client-email': ['client', 'email'],
  'f-eyebrow': ['eyebrow'], 'f-title': ['title'], 'f-intro': ['intro'],
  'f-currency': ['currency'], 'f-fixed-total': ['fixedTotal'], 'f-total-label': ['totalLabel'],
  'f-discount-type': ['discount', 'type'], 'f-discount-value': ['discount', 'value'], 'f-discount-label': ['discount', 'label'],
  'f-payment': ['paymentTerms'], 'f-notes': ['notes'], 'f-valid': ['validUntil'], 'f-footer-note': ['footerNote'],
  'f-cta-heading': ['cta', 'heading'], 'f-cta-body': ['cta', 'body'],
  'f-cta-book-label': ['cta', 'bookLabel'], 'f-cta-book-url': ['cta', 'bookUrl'],
  'f-cta-email-label': ['cta', 'emailLabel'], 'f-cta-email': ['cta', 'email'],
};

function fillForm(q) {
  Object.keys(FIELDS).forEach(function (id) {
    const path = FIELDS[id];
    const value = path.length === 2 ? (q[path[0]] || {})[path[1]] : q[path[0]];
    $(id).value = value == null ? '' : value;
  });

  $('mode-sum').checked = q.pricingMode !== 'total';
  $('mode-total').checked = q.pricingMode === 'total';
  renderItems(q.items && q.items.length ? q.items : [{ name: '', description: '', duration: '', price: 0 }]);
  syncMode();
  markStatus(q);
  dirty = false;
}

function readForm() {
  const q = {
    id: current && current.id, status: current ? current.status : 'draft',
    client: {}, discount: {}, cta: {},
    pricingMode: $('mode-total').checked ? 'total' : 'sum',
    items: readItems(),
  };
  Object.keys(FIELDS).forEach(function (id) {
    const path = FIELDS[id];
    if (path.length === 2) q[path[0]][path[1]] = $(id).value;
    else q[path[0]] = $(id).value;
  });
  return q;
}

/* ── editor: service rows ─────────────────────────────────── */

function renderItems(items) {
  $('items').innerHTML = items.map(itemHtml).join('');
  bindItems();
}

function itemHtml(item, index) {
  return '' +
  '<div class="item" data-item>' +
    '<div class="item-head">' +
      '<span class="item-num">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<div class="item-tools">' +
        '<button class="btn btn-sm btn-plain" type="button" data-move="-1" title="Move up">&uarr;</button>' +
        '<button class="btn btn-sm btn-plain" type="button" data-move="1" title="Move down">&darr;</button>' +
        '<button class="btn btn-sm btn-plain" type="button" data-remove title="Remove">Remove</button>' +
      '</div>' +
    '</div>' +
    '<div class="field"><label>Service</label><input data-f="name" value="' + esc(item.name) + '" placeholder="Logo &amp; visual identity"></div>' +
    '<div class="field"><label>Description</label><textarea data-f="description" placeholder="What the client actually gets.">' + esc(item.description) + '</textarea></div>' +
    '<div class="grid2">' +
      '<div class="field"><label>Timeline</label><input data-f="duration" value="' + esc(item.duration) + '" placeholder="2 weeks"></div>' +
      '<div class="field item-price-field"><label>Price</label><input data-f="price" type="number" min="0" step="1" value="' + esc(item.price || 0) + '"></div>' +
    '</div>' +
  '</div>';
}

function bindItems() {
  const nodes = Array.from(document.querySelectorAll('[data-item]'));

  nodes.forEach(function (node, index) {
    node.querySelector('[data-remove]').addEventListener('click', function () {
      const items = readItems();
      items.splice(index, 1);
      renderItems(items.length ? items : [{ name: '', description: '', duration: '', price: 0 }]);
      touched();
    });
    node.querySelectorAll('[data-move]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = index + Number(btn.dataset.move);
        const items = readItems();
        if (target < 0 || target >= items.length) return;
        const moved = items.splice(index, 1)[0];
        items.splice(target, 0, moved);
        renderItems(items);
        touched();
      });
    });
  });

  syncMode();
}

function readItems() {
  return Array.from(document.querySelectorAll('[data-item]')).map(function (node) {
    const read = function (name) {
      const el = node.querySelector('[data-f="' + name + '"]');
      return el ? el.value : '';
    };
    return { name: read('name'), description: read('description'), duration: read('duration'), price: Number(read('price')) || 0 };
  });
}

$('add-item').addEventListener('click', function () {
  const items = readItems();
  items.push({ name: '', description: '', duration: '', price: 0 });
  renderItems(items);
  touched();
});

/* ── editor: pricing mode + live total ────────────────────── */

function syncMode() {
  const totalMode = $('mode-total').checked;
  $('mode-sum-label').classList.toggle('on', !totalMode);
  $('mode-total-label').classList.toggle('on', totalMode);
  $('wrap-fixed-total').style.display = totalMode ? '' : 'none';
  document.querySelectorAll('.item-price-field').forEach(function (el) {
    el.style.display = totalMode ? 'none' : '';
  });
  updateTotals();
}

function updateTotals() {
  const q = readForm();
  const currency = q.currency;
  const itemsTotal = q.items.reduce(function (sum, item) { return sum + (Number(item.price) || 0); }, 0);
  const subtotal = q.pricingMode === 'total' ? (Number(q.fixedTotal) || 0) : itemsTotal;

  const value = Number(q.discount.value) || 0;
  const discount = value <= 0 ? 0
    : q.discount.type === 'percent' ? Math.min(subtotal, subtotal * Math.min(value, 100) / 100)
    : Math.min(subtotal, value);

  $('preview-subtotal').textContent = money(subtotal, currency);
  $('preview-subtotal-row').hidden = discount <= 0;
  $('preview-discount-row').hidden = discount <= 0;
  $('preview-discount-label').textContent = q.discount.label || 'Discount';
  $('preview-discount').textContent = '−' + money(discount, currency);
  $('preview-total-label').textContent = q.totalLabel || 'Total';
  $('preview-total').textContent = money(Math.max(0, subtotal - discount), currency);
}

document.querySelectorAll('input[name="pricing"]').forEach(function (radio) {
  radio.addEventListener('change', function () { syncMode(); touched(); });
});

document.addEventListener('input', function (event) {
  if (!$('view-editor') || $('view-editor').hidden) return;
  if (event.target.closest('#view-editor')) { touched(); updateTotals(); }
});

function touched() { dirty = true; }

/* ── editor: save / publish / delete ──────────────────────── */

function markStatus(q) {
  const published = q.status === 'published';
  $('editor-status').textContent = published ? 'Published' : 'Draft';
  $('editor-status').className = 'pill ' + (published ? 'published' : 'draft');
  $('publish').hidden = published;
  $('unpublish').hidden = !published;
  $('copy-link').hidden = !published;
  $('delete').hidden = !q.id;
  const link = $('editor-link');
  link.hidden = !published || !q.id;
  if (q.id) link.href = '/q/' + q.id;
}

async function persist(status, message) {
  const payload = readForm();
  if (status) payload.status = status;
  if (!payload.title.trim()) { toast('Give it a title first', true); $('f-title').focus(); return; }

  const buttons = [$('save'), $('publish'), $('unpublish')];
  buttons.forEach(function (b) { b.disabled = true; });
  try {
    const { quote } = await api('/api/quotes', { method: 'POST', body: JSON.stringify(payload) });
    current = quote;
    markStatus(quote);
    dirty = false;
    toast(message);
  } catch (err) {
    toast(err.message, true);
  } finally {
    buttons.forEach(function (b) { b.disabled = false; });
  }
}

$('save').addEventListener('click', function () { persist(null, 'Saved'); });
$('publish').addEventListener('click', function () { persist('published', 'Published — the link is live'); });
$('unpublish').addEventListener('click', function () { persist('draft', 'Unpublished — the link now 404s'); });
$('copy-link').addEventListener('click', function () { if (current && current.id) copyLink(current.id); });

$('delete').addEventListener('click', async function () {
  if (!current || !current.id) return;
  if (!window.confirm('Delete this quote for good? The client link stops working immediately.')) return;
  try {
    await api('/api/quotes?id=' + encodeURIComponent(current.id), { method: 'DELETE' });
    current = null;
    dirty = false;
    toast('Deleted');
    await loadList();
  } catch (err) {
    toast(err.message, true);
  }
});

window.addEventListener('beforeunload', function (event) {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

/* ── boot ─────────────────────────────────────────────────── */

(async function start() {
  try {
    const state = await api('/api/session');
    if (!state.configured) $('login-setup').hidden = false;
    if (state.authed) await loadList();
    else show('login');
  } catch (err) {
    show('login');
  }
})();
