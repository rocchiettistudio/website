# Rocchietti Studio — Packages page

| File | What it is |
|---|---|
| `index.html` | **The page to send now.** Three sections, in order: *the packages*, *add-ons & ongoing care*, *side by side*. |
| `full-page.html` | The complete version kept for later — adds hero, marquee, *meet the designer*, process, working rules, FAQ and the closing CTA. |

No build step — open the file, or drop it on any static host (Netlify, Vercel, GitHub Pages, a `/packages`
folder on the studio site). Keep `assets/` next to the HTML.

**Stack:** Tailwind (Play CDN) + GSAP 3.12.5 (ScrollTrigger), Google Fonts (Quicksand / Caveat /
Caveat Brush). Everything else is inline.

---

## Before sending it out

### 1. The logo asset

The mark lives in Figma, in the `logo` frame (667×235, already cropped tight to the artwork):
<https://www.figma.com/design/4e1o1Krd3ZuP5hMKJkOuj2/Visual-assets---Vivido?node-id=1782-1910>

Select that frame → Export → PNG @3x (or SVG) → save it in `assets/` as **`rocchietti-logo.svg`**
(preferred) or **`rocchietti-logo.png`**. Export the *frame*, not the square artboard — the frame is
already trimmed, a square export renders as a small square in the header instead of a wide wordmark.

The page tries the SVG first, then the PNG, and only falls back to a typeset wordmark if neither is
there — so nothing ever looks broken, but the real mark only appears once the file exists. Transparent
background is best; white also works (the page blends it out with `mix-blend-mode: multiply`).

> This session's network blocks `figma.com`, so the file could not be fetched and committed
> automatically — it has to be exported and dropped in by hand.

### 2. Booking link and email

Top of the `<script>` block near the end of the file:

```js
const BOOKING_URL   = "https://cal.com/sara-rocchietti-xlis94/30min";
const CONTACT_EMAIL = "rocchietti.studio@gmail.com";
```

Every "Book a call" button reads from those two constants — change them there, nowhere else.

### 3. Only for `full-page.html`

The *meet the designer* block uses a designed placeholder (grid card with the monogram). Swap it for a
black & white cut-out portrait, per the Figma moodboard — the yellow sticker glow is already behind it:

```html
<img src="assets/designer.jpg" alt="" class="relative w-full rounded-[28px] border-[1.5px] border-ink grayscale">
```

---

## Design system (from the Figma moodboard)

| Token | Value | Use |
|---|---|---|
| `ink` | `#3E2A21` | text, borders |
| `brown` | `#5C3A2E` | logo, script accents, dark sections |
| `cream` | `#FDFBF6` | page background |
| `lemon` | `#F8E7A1` | highlighter, card shadows, stickers |
| `peri` | `#C7D0EE` | secondary shadows, featured card |
| `grid` | `#D3DDF2` | graph-paper lines |

Type: **Quicksand** (UI/body), **Caveat** (handwritten notes), **Caveat Brush** (highlighted headline
words). Cards are white with a 1.5px ink outline and a hard offset shadow — the paper / scrapbook look
from the moodboard.

## Animations (GSAP)

- Highlighter sweep on every `.hl` word, fired by ScrollTrigger
- Staggered reveals (`[data-reveal]`, grouped by `[data-reveal-group]`)
- Floating confetti dots

`full-page.html` adds the infinite marquee, dot parallax, draggable hero stickers and the animated FAQ
accordion. Everything is skipped under `prefers-reduced-motion: reduce` (highlights snap on instead).

## What is deliberately **not** on these pages

The pricing strategy notes stay internal: the reasoning behind the price ladder, how to present prices
on Instagram vs LinkedIn, and the referral arrangement with Vivido. Vivido appears only as the partner
studio for websites (in `full-page.html`), without commercial terms.

## Content

Launch Kit €490 · Identity €990 · Brand System €2,490 · Custom on request · Brand Care €290/month.
The Launch Kit's €490 is credited against Identity if the client moves up within 30 days — stated on the
card and under the comparison table. Every package note says the project starts with an introductory
call and a quote built on request. No VAT wording anywhere; the footer states a 30-day validity.

---

## Deploying to a custom domain (Vercel)

The page is plain static HTML, so there is no build step — Vercel just serves the folder.

1. Push the branch (done) and go to **vercel.com → Add New → Project → Import** `Vividocumiana/claude`.
2. In the import screen set **Root Directory = `rocchietti-studio`**. This is the important one: the
   repo root is a skills repo, the site lives in this subfolder.
3. **Framework Preset: Other.** Leave Build Command and Output Directory empty.
4. Deploy → you get a `…vercel.app` URL to test.
5. **Settings → Domains → Add** your domain. Vercel prints the exact DNS records to create — normally
   an `A` record on the apex (`@`) and a `CNAME` on `www` pointing at `cname.vercel-dns.com`. Copy the
   values Vercel shows rather than any written here; they do change.
6. Add the records at the registrar (Namecheap, GoDaddy, Aruba…). Propagation is usually minutes.
   HTTPS is issued automatically, nothing to configure.

`.vercelignore` keeps `full-page.html` and the READMEs out of the deploy, so only the packages page is
publicly reachable.

**From the CLI instead:** `npm i -g vercel`, then `cd rocchietti-studio && vercel --prod` and follow the
prompts (it asks the same root-directory question once).

**Redeploys:** every push to this branch triggers a preview build; pushes to the branch Vercel is set to
track go to production. If the page ever needs to move, Netlify (drag the folder onto app.netlify.com/drop)
and Cloudflare Pages work the same way with zero config.
