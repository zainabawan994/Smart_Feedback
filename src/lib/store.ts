import { promises as fs } from "fs";
import path from "path";

export type Sentiment = "positive" | "neutral" | "negative";
export type Lang = "en" | "ur";
export type EventType = "visit" | "generate" | "copy" | "google";

export type Business = {
  slug: string;
  name: string;
  city: string;
  kind: string; // "café", "restaurant", ...
  googleReviewUrl: string;
  menu: string[]; // products the customer can mention (they pick, we never force)
  highlights: Record<Sentiment, string[]>; // options shown per sentiment
  defaultLang: Lang;
};

export type Event = { type: EventType; at: string; sentiment?: Sentiment | null };

export type Stats = {
  counts: Record<EventType, number>;
  sentiment: Record<Sentiment, number>;
  daily: { day: string; visits: number; google: number }[]; // last 14 days, oldest first
  recent: Event[];
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
  return res.status === 204 ? null : res.json();
}

type Row = { slug: string; name: string; city: string; kind: string; google_review_url: string; menu: string[]; highlights: Business["highlights"]; default_lang: Lang };
const fromRow = (r: Row): Business => ({ slug: r.slug, name: r.name, city: r.city, kind: r.kind, googleReviewUrl: r.google_review_url, menu: r.menu, highlights: r.highlights, defaultLang: r.default_lang });
const toRow = (b: Partial<Business>) => {
  const r: Partial<Row> = { name: b.name, city: b.city, kind: b.kind, google_review_url: b.googleReviewUrl, menu: b.menu, highlights: b.highlights, default_lang: b.defaultLang };
  for (const k of Object.keys(r) as (keyof Row)[]) if (r[k] === undefined) delete r[k];
  return r;
};

/* ---------------- Local JSON file (default for development) ---------------- */

// shortcut: single JSON file, no concurrency control. Fine for a demo; set SUPABASE_* for anything real.
const FILE = path.join(process.cwd(), "data", "db.json");
type DB = { businesses: Record<string, Business>; events: Record<string, Event[]> };

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

async function load(): Promise<DB> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { businesses: { [seed.slug]: seed }, events: { [seed.slug]: [] } };
  }
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

export async function updateBusiness(slug: string, patch: Partial<Business>) {
  if (useSupabase) {
    const rows: Row[] = await sb(`businesses?slug=eq.${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(toRow(patch)) });
    return rows[0] ? fromRow(rows[0]) : null;
  }
  const db = await load();
  if (!db.businesses[slug]) return null;
  db.businesses[slug] = { ...db.businesses[slug], ...patch, slug };
  await save(db);
  return db.businesses[slug];
}

export async function track(slug: string, type: EventType, sentiment?: Sentiment) {
  if (useSupabase) {
    // Unknown slug fails the foreign key; analytics must never break the customer page.
    await sb("events", { method: "POST", body: JSON.stringify({ slug, type, sentiment: sentiment ?? null }), headers: { Prefer: "return=minimal" } }).catch(() => {});
    return;
  }
  const db = await load();
  if (!db.businesses[slug]) return;
  db.events[slug] = [{ type, at: new Date().toISOString(), sentiment }, ...(db.events[slug] ?? [])].slice(0, 5000);
  await save(db);
}

export async function getStats(slug: string): Promise<Stats> {
  let events: Event[];
  if (useSupabase) {
    // shortcut: pulls raw rows (max 5000); move to a SQL view/RPC once a location gets more traffic than that.
    const rows: { type: EventType; sentiment: Sentiment | null; created_at: string }[] = await sb(
      `events?slug=eq.${encodeURIComponent(slug)}&select=type,sentiment,created_at&order=created_at.desc&limit=5000`,
    );
    events = rows.map((r) => ({ type: r.type, sentiment: r.sentiment, at: r.created_at }));
  } else {
    events = (await load()).events[slug] ?? [];
  }
  return computeStats(events);
}

export function computeStats(events: Event[], now = new Date()): Stats {
  const counts: Stats["counts"] = { visit: 0, generate: 0, copy: 0, google: 0 };
  const sentiment: Stats["sentiment"] = { positive: 0, neutral: 0, negative: 0 };
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return { day: d.toISOString().slice(0, 10), visits: 0, google: 0 };
  });
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const e of events) {
    counts[e.type]++;
    if (e.type === "generate" && e.sentiment) sentiment[e.sentiment]++;
    const d = byDay.get(e.at.slice(0, 10));
    if (d && e.type === "visit") d.visits++;
    if (d && e.type === "google") d.google++;
  }
  return { counts, sentiment, daily: days, recent: events.slice(0, 30) };
}
