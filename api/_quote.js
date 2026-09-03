'use strict';

/* The shape of a quote, in one place, so the API and the public page agree. */

const MAX_ITEMS = 40;
const CURRENCIES = ['EUR', 'GBP', 'USD'];

function str(value, max) {
  return String(value == null ? '' : value).slice(0, max).trim();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Coerces whatever the admin form sent into a stored quote. Never trusts the client. */
function normalize(input, previous) {
  const now = Date.now();
  const prev = previous || {};
  const raw = input || {};

  const items = Array.isArray(raw.items) ? raw.items.slice(0, MAX_ITEMS) : [];

  return {
    id:        prev.id,
    status:    raw.status === 'published' ? 'published' : 'draft',
    createdAt: prev.createdAt || now,
    updatedAt: now,

    client: {
      name:    str(raw.client && raw.client.name, 120),
      company: str(raw.client && raw.client.company, 120),
      email:   str(raw.client && raw.client.email, 160),
    },

    eyebrow: str(raw.eyebrow, 120),
    title:   str(raw.title, 200),
    intro:   str(raw.intro, 4000),

    currency:    CURRENCIES.includes(raw.currency) ? raw.currency : 'EUR',
    pricingMode: raw.pricingMode === 'total' ? 'total' : 'sum',
    fixedTotal:  Math.max(0, num(raw.fixedTotal)),

    items: items.map(function (item) {
      return {
        name:        str(item && item.name, 200),
        description: str(item && item.description, 2000),
        duration:    str(item && item.duration, 80),
        price:       Math.max(0, num(item && item.price)),
      };
    }).filter(function (item) { return item.name || item.description || item.price; }),

    discount: {
      type:  (raw.discount && raw.discount.type) === 'percent' ? 'percent' : 'amount',
      value: Math.max(0, num(raw.discount && raw.discount.value)),
      label: str(raw.discount && raw.discount.label, 120),
    },

    totalLabel:    str(raw.totalLabel, 80),
    paymentTerms:  str(raw.paymentTerms, 1000),
    notes:         str(raw.notes, 4000),
    validUntil:    str(raw.validUntil, 40),

    cta: {
      heading:    str(raw.cta && raw.cta.heading, 200),
      body:       str(raw.cta && raw.cta.body, 1000),
      bookLabel:  str(raw.cta && raw.cta.bookLabel, 80),
      bookUrl:    safeUrl(raw.cta && raw.cta.bookUrl),
      emailLabel: str(raw.cta && raw.cta.emailLabel, 80),
      email:      str(raw.cta && raw.cta.email, 160),
    },

    footerNote: str(raw.footerNote, 300),
  };
}

/** Only http(s) and mailto survive — keeps javascript: out of the rendered page. */
function safeUrl(value) {
  const url = str(value, 500);
  if (!url) return '';
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : '';
}

function computeTotals(quote) {
  const itemsTotal = (quote.items || []).reduce(function (sum, item) { return sum + (Number(item.price) || 0); }, 0);
  const subtotal = quote.pricingMode === 'total' ? (Number(quote.fixedTotal) || 0) : itemsTotal;

  const d = quote.discount || {};
  const value = Number(d.value) || 0;
  const discountAmount = value <= 0 ? 0
    : d.type === 'percent' ? Math.min(subtotal, subtotal * Math.min(value, 100) / 100)
    : Math.min(subtotal, value);

  return {
    itemsTotal: itemsTotal,
    subtotal: subtotal,
    discountAmount: discountAmount,
    total: Math.max(0, subtotal - discountAmount),
    hasDiscount: discountAmount > 0,
    /* Per-item prices only make sense when the total is their sum. */
    showItemPrices: quote.pricingMode === 'sum',
  };
}

/** The compact shape the dashboard list needs. */
function summary(quote) {
  return {
    id: quote.id,
    status: quote.status,
    title: quote.title,
    client: quote.client,
    currency: quote.currency,
    total: computeTotals(quote).total,
    itemCount: (quote.items || []).length,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
}

module.exports = { normalize, computeTotals, summary, safeUrl };
