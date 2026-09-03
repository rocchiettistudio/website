'use strict';

const { redis, escapeHtml, escapeRich, money } = require('./_lib');
const { computeTotals } = require('./_quote');

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || '');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (!/^[A-Za-z0-9_-]{6,32}$/.test(slug)) return res.status(404).send(notFound());

  let quote = null;
  try {
    const raw = await redis('GET', 'quote:' + slug);
    quote = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error('quote lookup failed:', err.message);
    return res.status(500).send(notFound('Something went wrong loading this page.'));
  }

  // Drafts are invisible from the outside — same answer as a wrong link.
  if (!quote || quote.status !== 'published') return res.status(404).send(notFound());

  return res.status(200).send(render(quote));
};

function render(q) {
  const t = computeTotals(q);
  const cur = q.currency || 'EUR';
  const clientLine = [q.client && q.client.name, q.client && q.client.company].filter(Boolean).join(' · ');
  const bookUrl = q.cta && q.cta.bookUrl;
  const email = q.cta && q.cta.email;
  // Keep the address readable in the mailto but strip anything that could break out of the attribute.
  const safeEmail = String(email || '').replace(/[^A-Za-z0-9._%+@-]/g, '');
  const mailto = safeEmail
    ? 'mailto:' + safeEmail + '?subject=' + encodeURIComponent('Re: ' + (q.title || 'Your proposal'))
    : '';

  const items = (q.items || []).map(function (item) {
    return '' +
      '<li class="item">' +
        '<div class="item-main">' +
          '<p class="item-name">' + escapeHtml(item.name) + '</p>' +
          (item.description ? '<div class="item-desc">' + escapeRich(item.description) + '</div>' : '') +
          (item.duration ? '<p class="item-duration">' + escapeHtml(item.duration) + '</p>' : '') +
        '</div>' +
        (t.showItemPrices ? '<p class="item-price">' + escapeHtml(money(item.price, cur)) + '</p>' : '') +
      '</li>';
  }).join('');

  const validUntil = formatDate(q.validUntil);

  return '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">\n' +
'<meta name="referrer" content="no-referrer">\n' +
'<title>' + escapeHtml(q.title || 'Proposal') + ' — Rocchietti Studio</title>\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Caveat+Brush&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
'<style>' + CSS + '</style>\n' +
'<script>function logoFallback(img){img.style.display="none";var f=img.parentElement.querySelector(".logo-fallback");if(f)f.style.display="flex";}</script>\n' +
'</head>\n<body>\n' +

'<header class="topbar">' +
  '<a class="logo" href="/">' +
    '<img src="/assets/rocchietti-logo.png" alt="Rocchietti Studio" onerror="logoFallback(this)">' +
    '<span class="logo-fallback"><b>Rocchietti</b><i>&#10035; studio &#10035;</i></span>' +
  '</a>' +
  '<span class="topbar-note">Proposal</span>' +
'</header>\n' +

'<main class="wrap">' +

  '<section class="head">' +
    (q.eyebrow ? '<p class="eyebrow">' + escapeHtml(q.eyebrow) + '</p>' : '') +
    '<h1>' + escapeHtml(q.title || 'Your proposal') + '</h1>' +
    (clientLine ? '<p class="for">Prepared for <b>' + escapeHtml(clientLine) + '</b></p>' : '') +
    (q.intro ? '<div class="intro">' + escapeRich(q.intro) + '</div>' : '') +
  '</section>' +

  (items ? '<section class="card"><h2>What&#39;s included</h2><ul class="items">' + items + '</ul></section>' : '') +

  '<section class="card total-card">' +
    (t.hasDiscount ?
      '<div class="row muted"><span>Subtotal</span><span>' + escapeHtml(money(t.subtotal, cur)) + '</span></div>' +
      '<div class="row muted"><span>' + escapeHtml((q.discount && q.discount.label) || 'Discount') + '</span>' +
      '<span>&minus;' + escapeHtml(money(t.discountAmount, cur)) + '</span></div>' : '') +
    '<div class="row total">' +
      '<span>' + escapeHtml(q.totalLabel || 'Total') + '</span>' +
      '<span class="total-value">' + escapeHtml(money(t.total, cur)) + '</span>' +
    '</div>' +
    (q.paymentTerms ? '<p class="terms">' + escapeHtml(q.paymentTerms) + '</p>' : '') +
  '</section>' +

  (q.notes ? '<section class="card notes"><h2>Notes</h2><div>' + escapeRich(q.notes) + '</div></section>' : '') +

  ((bookUrl || mailto || q.cta && q.cta.heading) ?
  '<section class="cta">' +
    '<h2>' + escapeHtml((q.cta && q.cta.heading) || 'Shall we start?') + '</h2>' +
    ((q.cta && q.cta.body) ? '<div class="cta-body">' + escapeRich(q.cta.body) + '</div>' : '') +
    '<div class="cta-actions">' +
      (bookUrl ? '<a class="btn btn-light" href="' + escapeHtml(bookUrl) + '" target="_blank" rel="noopener">' +
        escapeHtml((q.cta && q.cta.bookLabel) || 'Book a call') + ' &rarr;</a>' : '') +
      (mailto ? '<a class="btn btn-outline" href="' + escapeHtml(mailto) + '">' +
        escapeHtml((q.cta && q.cta.emailLabel) || 'Send an email') + '</a>' : '') +
    '</div>' +
  '</section>' : '') +

'</main>\n' +

'<footer class="foot">' +
  (validUntil ? '<p>Valid until ' + escapeHtml(validUntil) + '</p>' : '') +
  (q.footerNote ? '<p>' + escapeHtml(q.footerNote) + '</p>' : '') +
  '<p class="copy">&copy; ' + new Date().getFullYear() + ' Rocchietti Studio</p>' +
'</footer>\n' +

'</body>\n</html>';
}

/** The admin stores a date input as YYYY-MM-DD; anything else is passed through as typed. */
function formatDate(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw + 'T00:00:00Z');
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function notFound(message) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<title>Not found — Rocchietti Studio</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Quicksand:wght@400;600&display=swap" rel="stylesheet">' +
    '<style>' + CSS + '</style></head><body>' +
    '<main class="wrap empty">' +
      '<p class="eyebrow">Rocchietti Studio</p>' +
      '<h1>This proposal isn&#39;t here.</h1>' +
      '<p class="intro">The link may have expired, or it was copied incompletely. ' +
      escapeHtml(message || 'Ask for a fresh one and it will open straight away.') + '</p>' +
      '<p><a class="btn btn-dark" href="/">See the packages &rarr;</a></p>' +
    '</main></body></html>';
}

const CSS = `
:root{--ink:#3E2A21;--brown:#5C3A2E;--cream:#FDFBF6;--grid:#D3DDF2;--lemon:#F8E7A1;--peri:#C7D0EE}
*{box-sizing:border-box}
body{margin:0;background:var(--cream);color:var(--ink);
  font-family:Quicksand,ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
  background-size:26px 26px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;
  max-width:820px;margin:20px auto 0;padding:10px 18px;background:rgba(253,251,246,.9);
  border:1.5px solid var(--ink);border-radius:999px}
.logo{display:flex;align-items:center;text-decoration:none}
.logo img{height:36px;width:auto;mix-blend-mode:multiply}
.logo-fallback{display:none;flex-direction:column;line-height:1;color:var(--brown);font-family:Caveat,cursive}
.logo-fallback b{font-size:26px;font-weight:600}
.logo-fallback i{font-size:12px;font-style:normal;letter-spacing:.3em;padding-left:2px}
.topbar-note{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(62,42,33,.55)}
.wrap{max-width:820px;margin:0 auto;padding:40px 18px 24px}
.head{text-align:center;padding:16px 0 32px}
.eyebrow{display:inline-block;margin:0 0 18px;padding:6px 16px;background:#fff;border:1.5px solid var(--ink);
  border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(62,42,33,.7)}
h1{margin:0;font-size:clamp(30px,5vw,46px);line-height:1.08;letter-spacing:-.02em;font-weight:700}
.for{margin:16px 0 0;font-size:16px;color:rgba(62,42,33,.7)}
.intro{margin-top:20px;font-size:17px;line-height:1.65;color:rgba(62,42,33,.78)}
.intro p{margin:0 0 12px}
.card{background:#fff;border:1.5px solid var(--ink);border-radius:24px;box-shadow:6px 6px 0 var(--lemon);
  padding:24px;margin-bottom:22px}
.card h2{margin:0 0 18px;font-family:"Caveat Brush",Caveat,cursive;font-weight:400;font-size:26px;color:var(--brown)}
.items{list-style:none;margin:0;padding:0}
.item{display:flex;gap:20px;justify-content:space-between;align-items:flex-start;
  padding:16px 0;border-top:1px dashed rgba(62,42,33,.22)}
.item:first-child{border-top:0;padding-top:0}
.item-main{min-width:0}
.item-name{margin:0;font-size:16.5px;font-weight:600}
.item-desc{margin-top:6px;font-size:14.5px;line-height:1.6;color:rgba(62,42,33,.72)}
.item-desc p{margin:0 0 8px}
.item-duration{margin:8px 0 0;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(62,42,33,.5)}
.item-price{margin:0;flex-shrink:0;font-size:17px;font-weight:700;white-space:nowrap}
.total-card{box-shadow:6px 6px 0 var(--peri)}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:20px;padding:6px 0;font-size:15.5px}
.row.muted{color:rgba(62,42,33,.65)}
.row.total{margin-top:10px;padding-top:16px;border-top:1.5px solid rgba(62,42,33,.15);font-size:18px;font-weight:600}
.total-value{font-size:32px;font-weight:700;letter-spacing:-.01em}
.terms{margin:16px 0 0;padding-top:14px;border-top:1px dashed rgba(62,42,33,.22);
  font-size:14px;line-height:1.6;color:rgba(62,42,33,.7)}
.notes div{font-size:15px;line-height:1.7;color:rgba(62,42,33,.78)}
.notes p{margin:0 0 10px}
.cta{margin-top:34px;padding:34px 26px;background:var(--brown);color:var(--cream);
  border:1.5px solid var(--ink);border-radius:26px;text-align:center}
.cta h2{margin:0;font-family:Quicksand,sans-serif;font-weight:700;font-size:clamp(24px,4vw,32px);color:var(--cream)}
.cta-body{margin-top:14px;font-size:16px;line-height:1.65;color:rgba(253,251,246,.82)}
.cta-body p{margin:0 0 10px}
.cta-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:24px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 26px;border-radius:999px;
  font-size:15px;font-weight:600;text-decoration:none;border:1.5px solid transparent;transition:transform .2s}
.btn:hover{transform:translateY(-2px)}
.btn-light{background:var(--cream);color:var(--ink);border-color:var(--cream);box-shadow:4px 4px 0 rgba(248,231,161,.6)}
.btn-outline{background:transparent;color:var(--cream);border-color:rgba(253,251,246,.55)}
.btn-dark{background:var(--brown);color:var(--cream);border-color:var(--ink);box-shadow:4px 4px 0 var(--lemon)}
.foot{max-width:820px;margin:0 auto;padding:26px 18px 48px;text-align:center;
  font-size:13px;line-height:1.7;color:rgba(62,42,33,.55)}
.foot p{margin:0}
.copy{margin-top:8px}
.empty{text-align:center;padding-top:90px}
.empty .intro{max-width:460px;margin:20px auto 28px}
@media (max-width:560px){
  .item{flex-direction:column;gap:8px}
  .item-price{font-size:18px}
  .card{padding:20px}
}
`;
