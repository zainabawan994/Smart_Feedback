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
