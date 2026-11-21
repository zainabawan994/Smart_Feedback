import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { hashPassword } from "./password.ts";

export type Sentiment = "positive" | "neutral" | "negative";
export type Lang = "en" | "ur" | "roman";
export type EventType = "visit" | "generate" | "copy" | "google" | "tap"; // tap = a button press on the ESP32 feedback station

export type Business = {
  slug: string;
  name: string;
  city: string;
  kind: string; // "café", "restaurant", ...
  googleReviewUrl: string;
  menu: string[]; // products the customer can mention (they pick, we never force)
  highlights: Record<Sentiment, string[]>; // options shown per sentiment
  defaultLang: Lang;
  ownerId?: string | null;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  emailVerified: boolean;
  sessionVersion: number; // bumped on password change/reset so old login cookies stop working
};

export type CodePurpose = "verify" | "reset";
/** One-time email code. Only an HMAC of the code is stored. */
export type Code = { email: string; purpose: CodePurpose; hash: string; expiresAt: number; attempts: number; sentAt: number };

/** Saved AI read of a business's feedback history (re-run on demand, not per page view). */
export type Insight = {
  at: string;
  draftCount: number;
  summary: string;
  issues: { title: string; severity: "major" | "minor"; mentions: number; why: string; fix: string }[];
};

/** A generated draft as shown to the customer. They may edit it before posting, so it is not the final review. */
export type Draft = {
  id: string;
  at: string;
  sentiment: Sentiment;
  lang: Lang;
  picks: string[];
  items: string[];
  occasions: string[];
  hasPhoto: boolean;
  hasNote: boolean;
  text: string;
  source: "llm" | "template";
};

// tags on "generate" events: which search signals the draft carries (dish, occasion, photo, note) and lang:<code>
export type Event = { type: EventType; at: string; sentiment?: Sentiment | null; tags?: string[] | null };

export type Stats = {
  counts: Record<EventType, number>;
  sentiment: Record<Sentiment, number>; // from drafts
  station: Record<Sentiment, number>; // from feedback-station taps
  daily: { day: string; visits: number; google: number }[]; // last 14 days, oldest first
  recent: Event[];
  signals: Record<string, number>; // tag → number of drafts carrying it
};

/* ---------------- Supabase (PostgREST over fetch, no SDK needed) ---------------- */

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(SB_URL && SB_KEY);

async function sb(pathAndQuery: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: SB_KEY!, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text(); // return=minimal answers 201/200 with an empty body
  return text ? JSON.parse(text) : null;
}

type Row = { slug: string; name: string; city: string; kind: string; google_review_url: string; menu: string[]; highlights: Business["highlights"]; default_lang: Lang; owner_id: string | null };
const fromRow = (r: Row): Business => ({ slug: r.slug, name: r.name, city: r.city, kind: r.kind, googleReviewUrl: r.google_review_url, menu: r.menu, highlights: r.highlights, defaultLang: r.default_lang, ownerId: r.owner_id });
const toRow = (b: Partial<Business>) => {
  const r: Partial<Row> = { slug: b.slug, name: b.name, city: b.city, kind: b.kind, google_review_url: b.googleReviewUrl, menu: b.menu, highlights: b.highlights, default_lang: b.defaultLang, owner_id: b.ownerId };
  for (const k of Object.keys(r) as (keyof Row)[]) if (r[k] === undefined) delete r[k];
  return r;
};

/* ---------------- Local JSON file (default for development) ---------------- */

// shortcut: single JSON file, no concurrency control. Fine for a demo; set SUPABASE_* for anything real.
const FILE = path.join(process.cwd(), "data", "db.json");
type DB = { businesses: Record<string, Business>; events: Record<string, Event[]>; users: Record<string, User>; drafts: Record<string, Draft[]>; codes: Record<string, Code>; insights: Record<string, Insight>; logins: Record<string, LoginAttempts> };

const seed: Business = {
  slug: "chai-khana",
  name: "Chai Khana",
  city: "Lahore",
  kind: "café",
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=REPLACE_WITH_PLACE_ID",
  menu: ["Doodh patti", "Kashmiri chai", "Bun kebab", "Aloo paratha", "Zinger roll", "Gulab jamun"],
  highlights: {
    positive: ["Chai was strong and fresh", "Food came out hot", "Staff were friendly", "Quick service", "Cozy seating", "Good value for money", "Clean place", "Nice music"],
    neutral: ["Food was fine", "Service was okay", "A bit crowded", "Average prices", "Took a while to order", "Seating was alright"],
    negative: ["Food arrived cold", "Long wait", "Staff seemed rushed", "Too pricey for the portion", "Table wasn't clean", "Order was wrong", "Too noisy"],
  },
  defaultLang: "en",
};

// Demo owner for the seeded café. Test-only credentials, also listed in README.
export const DEMO_OWNER = { email: "owner@chaikhana.test", password: "chai-demo-2026" };

async function load(): Promise<DB> {
  let db: DB;
  try {
    db = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    db = { businesses: { [seed.slug]: { ...seed } }, events: { [seed.slug]: [] }, users: {}, drafts: {}, codes: {}, insights: {}, logins: {} };
  }
  db.users ??= {};
  db.codes ??= {};
  db.insights ??= {};
  db.logins ??= {};
  // Accounts made before verification existed: demo stays verified, others must verify.
  for (const u of Object.values(db.users)) {
    u.sessionVersion ??= 1;
    u.emailVerified ??= u.email === DEMO_OWNER.email;
  }
  db.drafts ??= {};
  // Older files have no owners: give the demo café to the demo account once.
  const demo = db.businesses[seed.slug];
  if (demo && !demo.ownerId && !Object.values(db.users).some((u) => u.email === DEMO_OWNER.email)) {
    const id = randomUUID();
    db.users[id] = { id, email: DEMO_OWNER.email, passwordHash: hashPassword(DEMO_OWNER.password), createdAt: new Date().toISOString(), emailVerified: true, sessionVersion: 1 };
    demo.ownerId = id;
    await save(db);
  }
  return db;
}
async function save(db: DB) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

/* ---------------- Public API (same for both backends) ---------------- */

export async function getBusiness(slug: string): Promise<Business | null> {
  if (useSupabase) {
    const rows: Row[] = await sb(`businesses?slug=eq.${encodeURIComponent(slug)}&select=*`);
    return rows[0] ? fromRow(rows[0]) : null;
  }
  return (await load()).businesses[slug] ?? null;
}

/* ---- users ---- */

type UserRow = { id: string; email: string; password_hash: string; created_at: string; email_verified: boolean; session_version: number };
const userFromRow = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  passwordHash: r.password_hash,
  createdAt: r.created_at,
  emailVerified: r.email_verified,
  sessionVersion: r.session_version,
});

export async function getUserByEmail(email: string): Promise<User | null> {
  const e = email.trim().toLowerCase();
  if (useSupabase) {
    const rows: UserRow[] = await sb(`users?email=eq.${encodeURIComponent(e)}&select=*`);
    return rows[0] ? userFromRow(rows[0]) : null;
  }
  return Object.values((await load()).users).find((u) => u.email === e) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  if (useSupabase) {
    const rows: UserRow[] = await sb(`users?id=eq.${encodeURIComponent(id)}&select=*`);
    return rows[0] ? userFromRow(rows[0]) : null;
  }
  return (await load()).users[id] ?? null;
}

/** Returns null when the email is already registered. */
export async function createUser(email: string, password: string): Promise<User | null> {
  const user: User = { id: randomUUID(), email: email.trim().toLowerCase(), passwordHash: hashPassword(password), createdAt: new Date().toISOString(), emailVerified: false, sessionVersion: 1 };
  if (await getUserByEmail(user.email)) return null;
  if (useSupabase) {
    await sb("users", { method: "POST", body: JSON.stringify({ id: user.id, email: user.email, password_hash: user.passwordHash }) });
    return user;
  }
  const db = await load();
  db.users[user.id] = user;
  await save(db);
  return user;
}

/** Partial update of a user. Changing the password or email also bumps sessionVersion (logs out other devices). */
export async function updateUser(id: string, patch: Partial<Pick<User, "emailVerified" | "passwordHash" | "email">>): Promise<User | null> {
  const cur = await getUserById(id);
  if (!cur) return null;
  const bump = Boolean(patch.passwordHash || patch.email);
  const next: User = { ...cur, ...patch, sessionVersion: bump ? cur.sessionVersion + 1 : cur.sessionVersion };
  if (useSupabase) {
    await sb(`users?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ email: next.email, email_verified: next.emailVerified, password_hash: next.passwordHash, session_version: next.sessionVersion }),
    });
    return next;
  }
  const db = await load();
  db.users[id] = next;
  await save(db);
  return next;
}

/* ---- one-time email codes ---- */

const codeKey = (email: string, purpose: CodePurpose) => `${purpose}:${email.toLowerCase()}`;
type CodeRow = { email: string; purpose: CodePurpose; hash: string; expires_at: string; attempts: number; sent_at: string };

export async function getCode(email: string, purpose: CodePurpose): Promise<Code | null> {
  if (useSupabase) {
    const rows: CodeRow[] = await sb(`codes?email=eq.${encodeURIComponent(email.toLowerCase())}&purpose=eq.${purpose}&select=*`);
    const r = rows[0];
    return r ? { email: r.email, purpose: r.purpose, hash: r.hash, expiresAt: +new Date(r.expires_at), attempts: r.attempts, sentAt: +new Date(r.sent_at) } : null;
  }
  return (await load()).codes[codeKey(email, purpose)] ?? null;
}

/** Insert or replace the single active code for this email + purpose. */
export async function putCode(c: Code) {
  if (useSupabase) {
    const row = { email: c.email.toLowerCase(), purpose: c.purpose, hash: c.hash, expires_at: new Date(c.expiresAt).toISOString(), attempts: c.attempts, sent_at: new Date(c.sentAt).toISOString() };
    await sb("codes?on_conflict=email,purpose", { method: "POST", body: JSON.stringify(row), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    return;
  }
  const db = await load();
  db.codes[codeKey(c.email, c.purpose)] = { ...c, email: c.email.toLowerCase() };
  await save(db);
}

export async function deleteCode(email: string, purpose: CodePurpose) {
  if (useSupabase) {
    await sb(`codes?email=eq.${encodeURIComponent(email.toLowerCase())}&purpose=eq.${purpose}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return;
  }
  const db = await load();
  delete db.codes[codeKey(email, purpose)];
  await save(db);
}

/* ---- login throttle (shared by every server, survives restarts) ---- */

export type LoginAttempts = { n: number; until: number };

export async function getLoginAttempts(email: string): Promise<LoginAttempts | null> {
  const e = email.toLowerCase();
  if (useSupabase) {
    const rows: { n: number; until: string }[] = await sb(`login_attempts?email=eq.${encodeURIComponent(e)}&select=n,until`);
    return rows[0] ? { n: rows[0].n, until: +new Date(rows[0].until) } : null;
  }
  return (await load()).logins[e] ?? null;
}

// shortcut: read-then-write, so parallel wrong guesses can each count once; an RPC with an atomic increment fixes that if it matters.
export async function putLoginAttempts(email: string, a: LoginAttempts | null) {
  const e = email.toLowerCase();
  if (useSupabase) {
    if (!a) await sb(`login_attempts?email=eq.${encodeURIComponent(e)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    else await sb("login_attempts?on_conflict=email", { method: "POST", body: JSON.stringify({ email: e, n: a.n, until: new Date(a.until).toISOString() }), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    return;
  }
  const db = await load();
  if (a) db.logins[e] = a;
  else delete db.logins[e];
  await save(db);
}

/* ---- rate limits (abuse protection for public endpoints) ---- */

// shortcut: JSON mode keeps counters in this process's memory; fine for local development only.
const localHits = new Map<string, { n: number; reset: number }>();

/** Counts one hit for `key`; true while it is within `max` hits per `windowSec`. */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  if (useSupabase) {
    try {
      return await sb("rpc/hit_rate_limit", { method: "POST", body: JSON.stringify({ p_key: key, p_max: max, p_window_seconds: windowSec }) });
    } catch (e) {
      if (!String(e).includes("PGRST202")) throw e;
      console.warn("[limits] run supabase/schema.sql to add hit_rate_limit; requests are not rate limited yet");
      return true;
    }
  }
  const now = Date.now();
  const cur = localHits.get(key);
  const next = !cur || cur.reset < now ? { n: 1, reset: now + windowSec * 1000 } : { n: cur.n + 1, reset: cur.reset };
  localHits.set(key, next);
  return next.n <= max;
}

/* ---- businesses ---- */

export async function listBusinesses(ownerId: string): Promise<Business[]> {
  if (useSupabase) {
    const rows: Row[] = await sb(`businesses?owner_id=eq.${encodeURIComponent(ownerId)}&select=*&order=created_at`);
    return rows.map(fromRow);
  }
  return Object.values((await load()).businesses).filter((b) => b.ownerId === ownerId);
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "place";

// Neutral starter options any café/restaurant can use; owners tailor them in Settings.
const STARTER_HIGHLIGHTS: Business["highlights"] = {
  positive: ["Food was tasty", "Friendly staff", "Quick service", "Clean place", "Good value for money", "Nice atmosphere"],
  neutral: ["Food was fine", "Service was okay", "A bit crowded", "Average prices"],
  negative: ["Food arrived cold", "Long wait", "Order was wrong", "Too pricey", "Place wasn't clean"],
};

/** Creates a business with a unique slug and starter options the owner can edit. */
export async function createBusiness(input: Pick<Business, "name" | "city" | "kind" | "googleReviewUrl">, ownerId: string): Promise<Business> {
  const base = slugify(`${input.name} ${input.city}`);
  let slug = base;
  for (let i = 2; await getBusiness(slug); i++) slug = `${base}-${i}`;
  const b: Business = { ...input, slug, ownerId, menu: [], highlights: structuredClone(STARTER_HIGHLIGHTS), defaultLang: "en" };
  if (useSupabase) {
    await sb("businesses", { method: "POST", body: JSON.stringify(toRow(b)) });
    return b;
  }
  const db = await load();
  db.businesses[slug] = b;
  db.events[slug] = [];
  await save(db);
  return b;
}

export async function updateBusiness(slug: string, patch: Partial<Business>) {
  if (useSupabase) {
    const rows: Row[] = await sb(`businesses?slug=eq.${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(toRow(patch)) });
    return rows[0] ? fromRow(rows[0]) : null;
  }
  const db = await load();
  if (!db.businesses[slug]) return null;
  db.businesses[slug] = { ...db.businesses[slug], ...patch, slug, ownerId: db.businesses[slug].ownerId };
  await save(db);
  return db.businesses[slug];
}

export async function track(slug: string, type: EventType, sentiment?: Sentiment, tags?: string[]) {
  if (useSupabase) {
    // Unknown slug fails the foreign key; analytics must never break the customer page.
    await sb("events", { method: "POST", body: JSON.stringify({ slug, type, sentiment: sentiment ?? null, tags: tags ?? null }), headers: { Prefer: "return=minimal" } }).catch(() => {});
    return;
  }
  const db = await load();
  if (!db.businesses[slug]) return;
  db.events[slug] = [{ type, at: new Date().toISOString(), sentiment, tags }, ...(db.events[slug] ?? [])].slice(0, 5000);
  await save(db);
}

/* ---- drafts ---- */

type DraftRow = { id: string; created_at: string; sentiment: Sentiment; lang: Lang; picks: string[]; items: string[]; occasions: string[]; has_photo: boolean; has_note: boolean; text: string; source: Draft["source"] };

export async function saveDraft(slug: string, d: Omit<Draft, "id" | "at">) {
  const draft: Draft = { id: randomUUID(), at: new Date().toISOString(), ...d };
  if (useSupabase) {
    const row = { id: draft.id, slug, sentiment: d.sentiment, lang: d.lang, picks: d.picks, items: d.items, occasions: d.occasions, has_photo: d.hasPhoto, has_note: d.hasNote, text: d.text, source: d.source };
    await sb("drafts", { method: "POST", body: JSON.stringify(row), headers: { Prefer: "return=minimal" } }).catch(() => {});
    return;
  }
  const db = await load();
  if (!db.businesses[slug]) return;
  db.drafts[slug] = [draft, ...(db.drafts[slug] ?? [])].slice(0, 500);
  await save(db);
}

export async function listDrafts(slug: string, limit = 200): Promise<Draft[]> {
  if (useSupabase) {
    const rows: DraftRow[] = await sb(`drafts?slug=eq.${encodeURIComponent(slug)}&select=*&order=created_at.desc&limit=${limit}`);
    return rows.map((r) => ({ id: r.id, at: r.created_at, sentiment: r.sentiment, lang: r.lang, picks: r.picks, items: r.items, occasions: r.occasions, hasPhoto: r.has_photo, hasNote: r.has_note, text: r.text, source: r.source }));
  }
  return ((await load()).drafts[slug] ?? []).slice(0, limit);
}

/* ---- insights ---- */

export async function getInsight(slug: string): Promise<Insight | null> {
  if (useSupabase) {
    const rows: { data: Insight }[] = await sb(`insights?slug=eq.${encodeURIComponent(slug)}&select=data`);
    return rows[0]?.data ?? null;
  }
  return (await load()).insights[slug] ?? null;
}

export async function saveInsight(slug: string, insight: Insight) {
  if (useSupabase) {
    await sb("insights?on_conflict=slug", { method: "POST", body: JSON.stringify({ slug, data: insight }), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    return;
  }
  const db = await load();
  db.insights[slug] = insight;
  await save(db);
}

export async function getStats(slug: string): Promise<Stats> {
  let events: Event[];
  if (useSupabase) {
    // Counted inside Postgres (business_stats in schema.sql), so it stays fast however many events there are.
    try {
      return await sb("rpc/business_stats", { method: "POST", body: JSON.stringify({ p_slug: slug }) });
    } catch (e) {
      if (!String(e).includes("PGRST202")) throw e; // PGRST202 = function not created yet: count here instead
      console.warn("[stats] run supabase/schema.sql to add business_stats; counting the last 5000 events in the app for now");
    }
    const rows: { type: EventType; sentiment: Sentiment | null; tags: string[] | null; created_at: string }[] = await sb(
      `events?slug=eq.${encodeURIComponent(slug)}&select=type,sentiment,tags,created_at&order=created_at.desc&limit=5000`,
    );
    events = rows.map((r) => ({ type: r.type, sentiment: r.sentiment, tags: r.tags, at: r.created_at }));
  } else {
    events = (await load()).events[slug] ?? [];
  }
  return computeStats(events);
}

export function computeStats(events: Event[], now = new Date()): Stats {
  const counts: Stats["counts"] = { visit: 0, generate: 0, copy: 0, google: 0, tap: 0 };
  const sentiment: Stats["sentiment"] = { positive: 0, neutral: 0, negative: 0 };
  const station: Stats["station"] = { positive: 0, neutral: 0, negative: 0 };
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return { day: d.toISOString().slice(0, 10), visits: 0, google: 0 };
  });
  const signals: Record<string, number> = {};
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const e of events) {
    counts[e.type]++;
    if (e.type === "generate" && e.sentiment) sentiment[e.sentiment]++;
    if (e.type === "tap" && e.sentiment) station[e.sentiment]++;
    if (e.type === "generate") for (const t of e.tags ?? []) signals[t] = (signals[t] ?? 0) + 1;
    const d = byDay.get(e.at.slice(0, 10));
    if (d && e.type === "visit") d.visits++;
    if (d && e.type === "google") d.google++;
  }
  return { counts, sentiment, station, daily: days, recent: events.slice(0, 30), signals };
}
