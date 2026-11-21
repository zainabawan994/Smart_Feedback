// Copies data/db.json (accounts, businesses, events, drafts, AI summaries) into Supabase, so switching
// to the real database keeps the demo owner login and everything collected so far.
// Run supabase/schema.sql first, put SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local, then:
//   node --env-file=.env.local scripts/migrate-to-supabase.mjs
// Safe to re-run: rows are upserted, and events are skipped for businesses that already have some.
import fs from "node:fs";
import { createHash } from "node:crypto";

const { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
if (!URL_ || !KEY) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)");
const db = JSON.parse(fs.readFileSync("data/db.json", "utf8"));

async function sb(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal", ...init.headers },
  });
  if (!res.ok) throw new Error(`${path}: Supabase ${res.status} ${await res.text()}`);
  const text = await res.text(); // upserts that update rows answer 200 with an empty body
  return text ? JSON.parse(text) : null;
}
const upsert = async (table, rows, key) => {
  for (let i = 0; i < rows.length; i += 500)
    await sb(`${table}?on_conflict=${key}`, { method: "POST", body: JSON.stringify(rows.slice(i, i + 500)), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
  console.log(`${table}: ${rows.length}`);
};
// Seeded demo drafts have ids like "demo-3"; the table wants uuids, so derive a stable one.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (slug, id) => {
  if (UUID.test(id)) return id;
  const h = createHash("sha1").update(`${slug}:${id}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// The local demo owner's password is public (src/lib/store.ts), so it must never reach the real database.
const DEMO_EMAIL = "owner@chaikhana.test";
const users = Object.values(db.users ?? {}).filter((u) => u.email.toLowerCase() !== DEMO_EMAIL);
await upsert("users", users.map((u) => ({
  id: u.id, email: u.email.toLowerCase(), password_hash: u.passwordHash, created_at: u.createdAt,
  email_verified: u.emailVerified ?? false, session_version: u.sessionVersion ?? 1,
})), "id");

const userIds = new Set(users.map((u) => u.id));
const businesses = Object.values(db.businesses ?? {});
await upsert("businesses", businesses.map((b) => ({
  slug: b.slug, name: b.name, city: b.city ?? "", kind: b.kind ?? "café", google_review_url: b.googleReviewUrl ?? "",
  menu: b.menu ?? [], highlights: b.highlights, default_lang: b.defaultLang ?? "en",
  owner_id: userIds.has(b.ownerId) ? b.ownerId : null,
})), "slug");

let events = 0;
for (const b of businesses) {
  const list = db.events?.[b.slug] ?? [];
  if (!list.length || (await sb(`events?slug=eq.${encodeURIComponent(b.slug)}&select=id&limit=1`, { headers: { Prefer: "" } })).length) continue;
  for (let i = 0; i < list.length; i += 500)
    await sb("events", { method: "POST", body: JSON.stringify(list.slice(i, i + 500).map((e) => ({ slug: b.slug, type: e.type, sentiment: e.sentiment ?? null, tags: e.tags ?? null, created_at: e.at }))) });
  events += list.length;
}
console.log(`events: ${events}`);

await upsert("drafts", businesses.flatMap((b) => (db.drafts?.[b.slug] ?? []).map((d) => ({
  id: asUuid(b.slug, d.id), slug: b.slug, sentiment: d.sentiment, lang: d.lang, picks: d.picks ?? [], items: d.items ?? [],
  occasions: d.occasions ?? [], has_photo: !!d.hasPhoto, has_note: !!d.hasNote, text: d.text, source: d.source, created_at: d.at,
}))), "id");

await upsert("insights", Object.entries(db.insights ?? {}).filter(([slug]) => db.businesses[slug]).map(([slug, data]) => ({ slug, data })), "slug");
console.log("done");
