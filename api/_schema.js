'use strict';

/* ─────────────────────────────────────────────────────────────────────────
   Every editable field of the homepage: where it lives, how it renders, and
   what index.html says today.

   The default is the text that reproduces the markup currently in the page.
   It is what the dashboard shows before anyone edits a field, and what the
   Reset button puts back. Edit index.html by hand and you should update the
   matching default here too, so the two never drift apart.
   ───────────────────────────────────────────────────────────────────────── */

const SCHEMA = {
  /* ── Intro ── */
  "intro.eyebrow": {
    group: "Intro",
    label: "Eyebrow above the title",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Rocchietti Studio · 2026 packages",
  },

  "intro.title": {
    group: "Intro",
    label: "Section title",
    type: "title",
    hint: "Use *word* for the brush highlight.",
    default: "The *packages*",
  },

  "intro.lead": {
    group: "Intro",
    label: "Lead paragraph",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Four ways in. Pick the one that matches where your business is right now — or book a call and I'll tell you honestly which one you need.",
  },

  "intro.note": {
    group: "Intro",
    label: "Boxed note",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Whichever one you pick, we always start with an introductory call — and the final quote is built around what you actually need.",
  },

  /* ── Launch Kit ── */
  "pkg1.name": {
    group: "Launch Kit",
    label: "Name",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Launch Kit",
  },

  "pkg1.price": {
    group: "Launch Kit",
    label: "Price",
    type: "text",
    hint: "Use *word* for bold.",
    default: "€490",
  },

  "pkg1.duration": {
    group: "Launch Kit",
    label: "Timeline",
    type: "text",
    hint: "Use *word* for bold.",
    default: "1–2 weeks",
  },

  "pkg1.for": {
    group: "Launch Kit",
    label: "Who it is for",
    type: "text",
    hint: "Use *word* for bold.",
    default: "*For:* businesses opening now, creators and local shops that need to look serious from day one.",
  },

  "pkg1.features": {
    group: "Launch Kit",
    label: "What is included — one per line",
    type: "list",
    hint: "One item per line. Use *word* for bold.",
    default: "Guided brief (form + 20-min call)\n2 logo proposals, 1 direction developed\nVersions: primary, horizontal, monogram/icon\nCore colour palette (3–5 colours) + 1 font pairing\nSocial profile pack — avatar and cover sized for Instagram, TikTok, LinkedIn and Facebook\nLight brand kit (5–8 pages) set up with your colours and fonts, plus a usage guide (do's & don'ts)\nFinal files: SVG, PNG, PDF, JPG — light & dark versions",
  },

  "pkg1.terms": {
    group: "Launch Kit",
    label: "Revisions and payment — separate with |",
    type: "inlineList",
    hint: "Separate the parts with |. Use *word* for bold.",
    default: "*2* revision rounds included | *50%* upfront / *50%* on delivery",
  },

  "pkg1.note": {
    group: "Launch Kit",
    label: "Upgrade note",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Move up to *Identity* within 30 days and your €490 comes off the price.",
  },

  "pkg1.cta": {
    group: "Launch Kit",
    label: "Button label",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Book a call about the Launch Kit →",
  },

  /* ── Identity ── */
  "pkg2.badge": {
    group: "Identity",
    label: "Corner badge",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Most chosen",
  },

  "pkg2.name": {
    group: "Identity",
    label: "Name",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Identity",
  },

  "pkg2.price": {
    group: "Identity",
    label: "Price",
    type: "text",
    hint: "Use *word* for bold.",
    default: "€990",
  },

  "pkg2.duration": {
    group: "Identity",
    label: "Timeline",
    type: "text",
    hint: "Use *word* for bold.",
    default: "2–3 weeks",
  },

  "pkg2.for": {
    group: "Identity",
    label: "Who it is for",
    type: "text",
    hint: "Use *word* for bold.",
    default: "*For:* businesses already up and running that need to stop looking improvised.",
  },

  "pkg2.plus": {
    group: "Identity",
    label: "Line above the list",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Everything in the Launch Kit, plus:",
  },

  "pkg2.features": {
    group: "Identity",
    label: "What is included — one per line",
    type: "list",
    hint: "One item per line. Use *word* for bold.",
    default: "Moodboard + visual direction agreed before any drawing starts\nOne creative direction, developed properly — chosen with you, not guessed at\nComplete logo system (variants, clear space, minimum sizes)\nExtended palette with HEX / RGB / CMYK codes\nType system (headings, body copy, hierarchy)\nSupporting graphic elements (patterns, textures, base iconography)\n2 real-world applications, picked by you (e.g. Instagram post, business card, sign or packaging)\n*Brand guidelines PDF, 10–12 pages*",
  },

  "pkg2.terms": {
    group: "Identity",
    label: "Revisions and payment — separate with |",
    type: "inlineList",
    hint: "Separate the parts with |. Use *word* for bold.",
    default: "*2* revision rounds included | *50%* / *50%*",
  },

  "pkg2.cta": {
    group: "Identity",
    label: "Button label",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Book a call about Identity →",
  },

  /* ── Brand System ── */
  "pkg3.name": {
    group: "Brand System",
    label: "Name",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Brand System",
  },

  "pkg3.price": {
    group: "Brand System",
    label: "Price",
    type: "text",
    hint: "Use *word* for bold.",
    default: "€2,490",
  },

  "pkg3.duration": {
    group: "Brand System",
    label: "Timeline",
    type: "text",
    hint: "Use *word* for bold.",
    default: "4–5 weeks",
  },

  "pkg3.for": {
    group: "Brand System",
    label: "Who it is for",
    type: "text",
    hint: "Use *word* for bold.",
    default: "*For:* startups and companies with a team and several touchpoints to keep consistent.",
  },

  "pkg3.plus": {
    group: "Brand System",
    label: "Line above the list",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Everything in Identity, plus:",
  },

  "pkg3.features": {
    group: "Brand System",
    label: "What is included — one per line",
    type: "list",
    hint: "One item per line. Use *word* for bold.",
    default: "Brand strategy workshop (90 min): positioning, audience, tone of voice, competitors\nNaming for payoff / tagline\nTwo creative directions presented, one developed\nFull type system with scale and responsive rules\nPhotographic art direction (guidelines + references)\n6–8 applications (social kit, stationery, deck, packaging or signage)\nEditable templates handed over to you\n*Brand guidelines PDF, 25–30 pages*\nHandoff call (45 min) + 30 days of email support after delivery",
  },

  "pkg3.terms": {
    group: "Brand System",
    label: "Revisions and payment — separate with |",
    type: "inlineList",
    hint: "Separate the parts with |. Use *word* for bold.",
    default: "*3* revision rounds included | *40%* kick-off / *30%* direction approved / *30%* delivery",
  },

  "pkg3.cta": {
    group: "Brand System",
    label: "Button label",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Book a call about Brand System →",
  },

  /* ── Custom ── */
  "pkg4.name": {
    group: "Custom",
    label: "Name",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Custom",
  },

  "pkg4.price": {
    group: "Custom",
    label: "Price",
    type: "text",
    hint: "Use *word* for bold.",
    default: "On request",
  },

  "pkg4.duration": {
    group: "Custom",
    label: "Timeline",
    type: "text",
    hint: "Use *word* for bold.",
    default: "scoped per project",
  },

  "pkg4.for": {
    group: "Custom",
    label: "Who it is for",
    type: "text",
    hint: "Use *word* for bold.",
    strong: "font-semibold text-cream",
    default: "*For:* rebrands of established companies, multi-brand portfolios, complex naming projects, brand + digital product, retail with many locations.",
  },

  "pkg4.body": {
    group: "Custom",
    label: "Body",
    type: "text",
    hint: "Use *word* for bold.",
    strong: "font-semibold text-cream",
    default: "Scope is built around you after a discovery call. You get a precise written quote within *48 hours* of that call.",
  },

  "pkg4.quote": {
    group: "Custom",
    label: "Pull quote",
    type: "text",
    hint: "Use *word* for bold.",
    default: "“Some projects are too specific for a package. Let's talk, I'll work out what you actually need and send you the exact scope within two days.”",
  },

  "pkg4.cta": {
    group: "Custom",
    label: "Button label",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Book a discovery call →",
  },

  /* ── Add-ons ── */
  "addons.title": {
    group: "Add-ons",
    label: "Section title",
    type: "title",
    hint: "Use *word* for the brush highlight.",
    default: "Add-ons & *ongoing care*",
  },

  "addons.lead": {
    group: "Add-ons",
    label: "Lead paragraph",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Bolt these onto any package, or add them later when you need them.",
  },

  "addons.list": {
    group: "Add-ons",
    label: "One per line: name | price",
    type: "pricelist",
    hint: "One per line: name | price.",
    default: "Social kit — 10 templates | €290\nNaming + payoff | €390\nEmail signature + favicon and watermark | €150\nPackaging / label design | from €390 per SKU\nMenu, brochure, flyer | €190 per page\nPitch deck template (12 slides) | €390\nSecond creative direction | €290\nExtra revision round beyond the included ones | €50 per hour",
  },

  /* ── Brand Care ── */
  "care.kicker": {
    group: "Brand Care",
    label: "Line above the name",
    type: "text",
    hint: "Use *word* for bold.",
    default: "The one people keep",
  },

  "care.name": {
    group: "Brand Care",
    label: "Name",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Brand Care",
  },

  "care.price": {
    group: "Brand Care",
    label: "Price | suffix",
    type: "price",
    hint: "Big price | small suffix.",
    default: "€290 | / month",
  },

  "care.lead": {
    group: "Brand Care",
    label: "Lead paragraph",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Your brand stays alive after handoff, without you having to brief a new designer every time something comes up.",
  },

  "care.features": {
    group: "Brand Care",
    label: "What is included — one per line",
    type: "list",
    hint: "One item per line. Use *word* for bold.",
    default: "4 graphic assets per month (posts, stories, posters, adaptations)\nReply within 48 hours\nSource files always kept up to date\n3-month minimum, then 30 days' notice to cancel",
  },

  "care.cta": {
    group: "Brand Care",
    label: "Button label",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Talk about Brand Care →",
  },

  /* ── Side by side ── */
  "compare.title": {
    group: "Side by side",
    label: "Section title",
    type: "title",
    hint: "Use *word* for the brush highlight.",
    default: "Side by *side*",
  },

  "compare.table": {
    group: "Side by side",
    label: "One row per line: package | price | timeline | revisions",
    type: "table",
    hint: "One row per line: package | price | timeline | revisions. Start a row with + to highlight it; *word* in the first cell becomes a pill.",
    default: "Launch Kit | €490 | 1–2 weeks | 2\n+ Identity *most chosen* | €990 | 2–3 weeks | 2\nBrand System | €2,490 | 4–5 weeks | 3\nCustom | On request | per scope | agreed in quote\nBrand Care | €290 / month | min. 3 months | —",
  },

  "compare.note": {
    group: "Side by side",
    label: "Note under the table",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Start with the Launch Kit and move up to Identity within 30 days — the €490 comes off the price.",
  },

  /* ── Footer ── */
  "footer.note": {
    group: "Footer",
    label: "Footer line",
    type: "text",
    hint: "Use *word* for bold.",
    default: "Quote valid 30 days from the date it is sent.",
  },

  /* Not markup: these two are injected into the page as a small script, so the
     booking link and the address can change without a deploy. */
  "settings.bookingUrl": {
    group: "Links", label: "Booking link", type: "setting",
    hint: "The link every Book a call button opens.",
    default: "https://cal.com/sara-rocchietti-xlis94/30min",
  },
  "settings.contactEmail": {
    group: "Links", label: "Contact email", type: "setting",
    hint: "Where the Email links write to.",
    default: "rocchietti.studio@gmail.com",
  },
};

/** The fields in page order, grouped into the sections the dashboard shows. */
function groups() {
  const out = [];
  Object.keys(SCHEMA).forEach(function (key) {
    const slot = SCHEMA[key];
    let group = out[out.length - 1];
    if (!group || group.name !== slot.group) { group = { name: slot.group, fields: [] }; out.push(group); }
    group.fields.push({
      key: key, label: slot.label, type: slot.type, hint: slot.hint, fallback: slot.default,
    });
  });
  return out;
}

module.exports = { SCHEMA, groups };
