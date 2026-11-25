# Tavo

(Formerly SmartFeedback.) Logo files: `../Tavo logo/` (SVG and PNG); in the app it is `src/components/Logo.tsx`.

Customers scan a table QR code, tap how it went and up to three things that stood out, and get a short draft they edit and post on Google themselves.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # normalizer + stats checks
```

- Customer page: `/r/chai-khana`
- Owner desk: `/signup` to create your own business, then `/login`. Without Supabase (local `data/db.json` only), a demo owner for the demo café is created automatically; see `DEMO_OWNER` in `src/lib/store.ts`. It is never copied to Supabase.
- Demo mode: `npm run dev:demo` (port 3011) uses `data/demo.json`, prints emails to the log and never touches Supabase. It creates a dummy main admin: log in at `/superadmin/login` with `admin@smartfeedback.test` / `admin-demo-2026` (`DEMO_ADMIN` in `src/lib/store.ts`). The demo owner above works at `/login`. A second team admin, `teammate@smartfeedback.test`, is listed too: give it a password from the admin panel → Team admins (e.g. `teammate-demo-2026`).
- Team admins: the main admin's email is `SUPER_ADMIN_EMAILS` (Vercel → Settings → Environment Variables). More admins are added straight from the admin panel → Team admins → Add admin (email + password); no hosting change needed.

Works with no config: template draft, rule-based tidy-up, data in `data/db.json`.

## AI pipeline (`src/lib/review.ts`)

1. **Draft**: any OpenAI-compatible endpoint (`LLM_*`). Only the options the customer picked reach the prompt; the API rejects anything else.
2. **Normalize**: an open-source model (`NORMALIZER_MODEL`, e.g. Gemma 3 4B / Qwen3 4B on Ollama or Hugging Face) rewrites the draft into plain customer language. Its output is dropped if it shrinks or grows too much or turns a negative review positive.
3. **Scrub**: rule pass that strips stock AI phrases ("delightful", "a testament to", em dashes, stacked "!!!").

Current setup (free, no download): Groq with Qwen 3.8 27B for both steps. In `.env.local`:

```
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=qwen/qwen3.8-27b
NORMALIZER_MODEL=qwen/qwen3.8-27b
```

Tested: gpt-oss-20b as normalizer garbled Urdu; Groq no longer serves Llama 3.x; Hugging Face router needs paid credits.

Offline open-source setup:

```bash
ollama pull gemma3:4b
```

then in `.env.local`: `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_MODEL=gemma3:4b`, `NORMALIZER_MODEL=gemma3:4b`. See `.env.example` for Hugging Face.

## Customer inputs

- Feeling, up to 3 options, dishes (from the menu), and when / who with (occasion).
- Own words (optional, 300 chars): kept close to verbatim; treated as content, not instructions.
- Photo (optional): shrunk to 640px in the browser (fewer model tokens), described by the vision model (`VISION_MODEL`, defaults to `LLM_MODEL`), and only what is visible is used. Non-food photos are ignored.
- Languages: English, Roman Urdu, Urdu script. A script check throws away output in the wrong script.

## Search (SEO / AI search)

Drafts name the place and city once, each dish once, and the occasion, which is what Google Maps and AI assistants (ChatGPT, Gemini, AI Overviews) match against. No keyword lists or repetition: Google treats that as spam and bans asking customers for specific content. The owner desk shows the share of drafts carrying each signal.

## Owner desk

- Pages: Overview (top problems, totals, feelings, 14-day chart, activity, search signals), Issues (see below), Drafts (filter by feeling and language), QR & table card (PNG download, print, copy link), Settings (profile, menu, options).
- Accounts: email + password (scrypt hash). Sign-up → 6-digit email code → desk. Unverified owners can't open any admin page or API.
- Forgot password → 6-digit code → new password. Account page: change password, or change email (current password → code sent to the new address → login switches only after the code). Each signs out every other device (session version in the cookie).
- Codes: HMAC-hashed, bound to email + purpose, 10-minute expiry, 5 tries, one resend per minute. 5 wrong passwords lock that email for 15 minutes.
- Email over SMTP (nodemailer): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optional `EMAIL_FROM`. Gmail needs an App Password. Without `SMTP_HOST`, development prints codes in the server log (look for `[email:dev]`); production refuses to send.
- Login cookie: signed, HttpOnly, 14 days (`SESSION_SECRET`).
- One owner can run several businesses (sidebar switcher, "Add a business"). Every admin page and the admin API check ownership; other owners get a 404.
- Drafts store the customer's choices and the draft text only, never the photo or contact details.

## Issues dashboard (`src/lib/insights.ts`, `insights-ai.ts`)

- **Counted (no AI, always on):** every complaint option across all drafts, with mentions, share of unhappy visits, this week vs last week, dishes and occasions it comes with, and example drafts. **Major** = 3+ "Not great" mentions making up a quarter of unhappy visits, or a sudden jump this week; "It was okay" picks are never major.
- **AI summary (on demand):** the model reads the counts plus the 30 latest unhappy drafts, groups similar complaints and suggests one fix each. Saved per business, re-run at most every 2 minutes; mention counts are capped at the real totals. `INSIGHTS_MODEL` overrides `LLM_MODEL`.
- Demo data: `node scripts/seed-demo-history.mjs` adds 3 weeks of sample drafts to the demo café only.

## Database

Without config the app uses `data/db.json` (one process, no locking: demo only). For real use, switch to Supabase Postgres:

1. Create a free project at supabase.com.
2. SQL editor → paste `supabase/schema.sql` → Run. Re-running it is safe and upgrades older databases.
3. Project Settings → API: put `SUPABASE_URL` and the `service_role` key as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (server-only, never `NEXT_PUBLIC_`).
4. Copy what's in `data/db.json` (accounts except the demo owner, businesses, events, drafts, AI summaries):

```bash
node --env-file=.env.local scripts/migrate-to-supabase.mjs
```

5. Restart `npm run dev`.

Tables: `users`, `codes` (email codes), `login_attempts` (wrong-password lock), `businesses`, `events`, `drafts`, `insights`. Row-level security is on with no policies, so only the server's service-role key can read or write.

## Google policy notes

- Every sentiment gets the same Google button (no review gating).
- Customers choose what to mention and post from their own account.
- Google calls reviews "primarily generated by AI" spam and (2026) bans asking for specific content, so the customer must edit and own the text. Don't add keyword-stuffing options.

## Google review link

Settings → Google review link accepts either the link from Google Business Profile (Ask for reviews → copy link, e.g. `https://g.page/r/…/review`) or the bare Place ID (starts with `ChIJ`; find it with Google's Place ID Finder), which is turned into a review link. Until a real link is saved, the customer's "Open Google reviews" button opens a Google Maps search for the business name and city instead of a broken link.

## ESP32 feedback station (`hardware/esp32-station`)

A box at the counter with three buttons: Loved it / Okay / Not great. Each press posts to `/api/station` and shows on the Overview under "Feedback station" (kept apart from draft feelings).

1. Owner desk → QR & table card: copy `SERVER_URL`, `SLUG` and `STATION_KEY`. The key is per business and derived from `SESSION_SECRET`.
2. Open `esp32-station.ino` in Arduino IDE (Boards Manager: "esp32" by Espressif), fill in Wi-Fi and those three values, upload.
3. Wire three push buttons from GPIO 25 / 26 / 27 to GND. The built-in LED gives one long blink when saved, fast blinks when not.

The station needs the app on the internet (e.g. Vercel); `localhost` is only reachable from your own computer. One press per 3 seconds.

## Not done yet

- Station HTTPS certificate check is skipped (`setInsecure`); pin your host's root CA for a real install.
