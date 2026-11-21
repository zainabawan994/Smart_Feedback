import assert from "node:assert/strict";
import { computeStats } from "./store.ts";

const now = new Date("2026-11-21T12:00:00Z");
const s = computeStats(
  [
    { type: "visit", at: "2026-11-21T10:00:00Z" },
    { type: "visit", at: "2026-11-20T10:00:00Z" },
    { type: "generate", at: "2026-11-21T10:01:00Z", sentiment: "negative" },
    { type: "google", at: "2026-11-21T10:02:00Z" },
    { type: "visit", at: "2026-10-01T10:00:00Z" }, // outside the 14-day window, still in totals
  ],
  now,
);
assert.equal(s.counts.visit, 3);
assert.equal(s.sentiment.negative, 1);
assert.equal(s.daily.length, 14);
assert.deepEqual(s.daily.at(-1), { day: "2026-11-21", visits: 1, google: 1 });
assert.equal(s.daily.at(-2)!.visits, 1);
console.log("store.test: ok");

const sig = computeStats([
  { type: "generate", at: "2026-11-21T10:00:00Z", sentiment: "positive", tags: ["lang:roman", "dish", "photo"] },
  { type: "generate", at: "2026-11-21T10:05:00Z", sentiment: "neutral", tags: ["lang:en", "dish"] },
  { type: "visit", at: "2026-11-21T10:06:00Z", tags: ["dish"] }, // tags on non-draft events are ignored
  { type: "generate", at: "2026-10-01T10:00:00Z", sentiment: "negative" }, // older data without tags
], now).signals;
assert.deepEqual(sig, { "lang:roman": 1, dish: 2, photo: 1, "lang:en": 1 });
console.log("store.test signals: ok");

import { hashPassword, verifyPassword } from "./password.ts";
const h = hashPassword("correct horse battery");
assert.ok(h.startsWith("scrypt:") && !h.includes("correct horse"));
assert.equal(verifyPassword("correct horse battery", h), true);
assert.equal(verifyPassword("wrong password", h), false);
assert.equal(verifyPassword("anything", "plain-text-not-a-hash"), false);
assert.notEqual(hashPassword("same"), hashPassword("same")); // salted
console.log("password.test: ok");

const taps = computeStats([
  { type: "tap", at: "2026-11-21T10:00:00Z", sentiment: "positive" },
  { type: "tap", at: "2026-11-21T10:01:00Z", sentiment: "negative" },
  { type: "generate", at: "2026-11-21T10:02:00Z", sentiment: "positive" },
], now);
assert.equal(taps.counts.tap, 2);
assert.deepEqual(taps.station, { positive: 1, neutral: 0, negative: 1 });
assert.equal(taps.sentiment.positive, 1); // station taps don't mix into draft feelings
console.log("store.test station: ok");

// Local (JSON mode) rate limiter: 3 per window, then blocked, separate keys stay independent.
const { rateLimit } = await import("./store.ts");
const hits = [];
for (let i = 0; i < 4; i++) hits.push(await rateLimit("test:a", 3, 60));
assert.deepEqual(hits, [true, true, true, false]);
assert.equal(await rateLimit("test:b", 3, 60), true);
console.log("store.test rate limit: ok");

// Days follow Pakistan time: 01:00 PKT on the 21st is still the 20th in UTC.
const pk = computeStats([{ type: "visit", at: "2026-11-20T20:00:00Z" }], now);
assert.deepEqual(pk.daily.at(-1), { day: "2026-11-21", visits: 1, google: 0 });
console.log("store.test pakistan days: ok");
