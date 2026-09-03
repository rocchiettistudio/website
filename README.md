# Rocchietti Studio — Packages page

| File | What it is |
|---|---|
| `index.html` | **The public packages page.** Three sections, in order: *the packages*, *add-ons & ongoing care*, *side by side*. |
| `admin.html` + `admin.js` | Password-protected dashboard at `/admin` — write, save and publish per-client quotes. |
| `api/` | Vercel serverless functions: login/session, quote CRUD, and the server-rendered client page. |
| `full-page.html` | The long version kept for later — hero, marquee, *meet the designer*, process, working rules, FAQ, closing CTA. Not deployed. |
| `dev-server.js` | Runs the whole site locally with a stand-in database, so you can try the quote flow with nothing installed. Not deployed. |

No build step and no dependencies to install. The pages are hand-written HTML; the functions in `api/`
are plain CommonJS and talk to Redis over its REST API with `fetch`, so there is no `package.json` and
nothing to `npm install`.

**Stack:** Tailwind (Play CDN) on the packages page, GSAP 3.12.5 (ScrollTrigger) for its animations,
Google Fonts (Quicksand / Caveat / Caveat Brush) everywhere. The admin and the client quote page use
plain CSS with the same tokens. Vercel serverless functions + Upstash Redis behind `/admin` and `/q/*`.

Because of those functions the site now needs Vercel (or any host that runs Node functions) — a
pure-static host would still serve the packages page, but `/admin` and the quote links would not work.

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

## The quote tool

`/admin` → password → dashboard → **+ New quote** → fill it in → **Publish** → you get
`https://yourdomain/q/<random-slug>` to send the client. The page carries `noindex` both as a meta tag
and as an `X-Robots-Tag` header, so it never lands in a search result. Whoever holds the link can open
it — that is the trade chosen for zero friction on a sales page; nothing sensitive should go on it.

**Every field on the client page is editable** from the editor: eyebrow, title, intro, each service
(name, description, timeline, price), the total, the discount row and its label, payment terms, notes,
validity date, footer note, and the whole call-to-action block including button labels and links.

**Two pricing modes.** *Sum of the services* shows a price on every line and adds them up. *One total
price* hides the line prices and uses the figure you type — the services still show with their
descriptions and timelines. The discount applies to either.

**Draft vs published.** A draft is invisible from outside: its URL answers 404 exactly like a wrong
link. **Unpublish** puts a live quote back to draft and the client link stops working immediately.
Deleting removes it for good.

### Trying it locally first

There is no default password anywhere in the code — it is whatever you put in `ADMIN_PASSWORD`. To see
the whole thing working before touching Vercel or Upstash, run the bundled dev server:

```bash
cd rocchietti-studio
node dev-server.js
```

```
packages   http://localhost:7788/
admin      http://localhost:7788/admin
password   dev
```

It serves the site exactly the way Vercel does — static files, the `api/` functions, the `/q/:slug`
rewrite, clean URLs — and stands in for Upstash with a small local store, so nothing needs to be
installed or signed up for. Quotes you make land in `.dev-data.json` next to the file (git-ignored) and
survive a restart; delete it to start clean.

Use your own password with `ADMIN_PASSWORD=whatever node dev-server.js`. The server needs Node 18 or
newer, is excluded from the deploy in `.vercelignore`, and is the only place a fallback password
exists — in production, no `ADMIN_PASSWORD` means no login at all.

### One-time setup

The tool needs a Redis store and two secrets. All of it is free at this volume.

1. **Vercel → your project → Storage → Create Database → Upstash Redis.** Connect it to the project;
   Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` on its own. (The code also accepts the
   `UPSTASH_REDIS_REST_*` names.)
2. **Settings → Environment Variables**, add two of your own:

   | Name | Value |
   |---|---|
   | `ADMIN_PASSWORD` | the password you will type at `/admin` |
   | `SESSION_SECRET` | a long random string — `openssl rand -base64 32` gives you one |

   Set both for Production (and Preview if you want the tool to work there too).
3. **Redeploy.** Env vars are read at build time, so an existing deployment will not see them.

Until those exist, `/admin` shows a "not configured yet" note instead of failing silently.

### How the protection actually works

`admin.html` and `admin.js` are plain static files — anyone can download them, and that is fine: they
hold no secrets. What is protected is the data. Every `/api/quotes` call requires a session cookie that
is signed with `SESSION_SECRET` (HttpOnly, Secure, SameSite=Lax, 7 days); without it the API answers
401 and the page shows the login form. The password is compared in constant time, and after 8 failed
attempts from the same IP login is blocked for 15 minutes.

Everything the client types into a quote is HTML-escaped before it is rendered, so pasted markup shows
as text instead of running.

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

`.vercelignore` keeps `full-page.html` and the READMEs out of the deploy, and `vercel.json` redirects
`/full-page` to `/` as a second guard. `vercel.json` also sets `cleanUrls`, maps `/q/:slug` onto the
renderer, and puts the `noindex` headers on `/q/*` and `/admin`.

`robots.txt` deliberately disallows nothing: a `Disallow` would stop crawlers from ever reading the
`noindex` header, which is what actually keeps those pages out of the index.

**From the CLI instead:** `npm i -g vercel`, then `cd rocchietti-studio && vercel --prod` and follow the
prompts (it asks the same root-directory question once).

**Redeploys:** every push to this branch triggers a preview build; pushes to the branch Vercel is set to
track go to production. If the page ever needs to move, Netlify (drag the folder onto app.netlify.com/drop)
and Cloudflare Pages work the same way with zero config.
