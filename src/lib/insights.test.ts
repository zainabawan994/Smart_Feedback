import assert from "node:assert/strict";
import { analyze } from "./insights.ts";
import type { Draft } from "./store.ts";

const now = Date.parse("2026-11-21T12:00:00Z");
let n = 0;
const d = (daysAgo: number, sentiment: Draft["sentiment"], picks: string[], items: string[] = [], occasions: string[] = []): Draft => ({
  id: String(n++), at: new Date(now - daysAgo * 86_400_000).toISOString(), sentiment, lang: "en",
  picks, items, occasions, hasPhoto: false, hasNote: false, text: `${picks.join(". ")}.`, source: "llm",
});

const drafts = [
  d(1, "negative", ["Long wait", "Food arrived cold"], ["Zinger roll"], ["Dinner"]),
  d(2, "negative", ["Long wait"], ["Zinger roll"], ["Dinner"]),
  d(3, "neutral", ["Long wait", "A bit crowded"], [], ["Dinner"]),
  d(4, "negative", ["Long wait"], ["Bun kebab"]),
  d(10, "negative", ["Too noisy"]),
  d(20, "neutral", ["A bit crowded"]),
  d(1, "positive", ["Quick service", "Chai was strong and fresh"]),
  d(2, "positive", ["Chai was strong and fresh"]),
];
const a = analyze(drafts, now);

assert.equal(a.total, 8);
assert.equal(a.unhappy, 6);
assert.equal(a.negative, 4);

const wait = a.issues[0];
assert.equal(wait.label, "Long wait"); // most serious first
assert.equal(wait.count, 4);
assert.equal(wait.severity, "major"); // 4 of 6 unhappy visits
assert.equal(wait.last7, 4);
assert.equal(wait.trend, "new"); // all mentions are this week
assert.deepEqual(wait.dishes, ["Zinger roll", "Bun kebab"]);
assert.deepEqual(wait.occasions, ["Dinner"]);
assert.equal(wait.examples.length, 2);

const noisy = a.issues.find((i) => i.label === "Too noisy")!;
assert.equal(noisy.severity, "minor"); // a single mention is not a pattern
assert.equal(noisy.trend, "falling");

assert.ok(!a.issues.some((i) => i.label === "Quick service")); // praise is never an issue
assert.deepEqual(a.praise[0], { label: "Chai was strong and fresh", count: 2 });

// A sudden spike is major even when it's a small share of all history.
const spike = analyze([...Array.from({ length: 20 }, (_, i) => d(30 + i, "negative", ["Order was wrong"])), d(1, "negative", ["Table wasn't clean"]), d(2, "negative", ["Table wasn't clean"]), d(3, "negative", ["Table wasn't clean"])], now);
assert.equal(spike.issues.find((i) => i.label === "Table wasn't clean")!.severity, "major");

// "It was okay" picks are listed but never major, however often they come up.
const mild = analyze([d(1, "neutral", ["Seating was alright"]), d(2, "neutral", ["Seating was alright"]), d(3, "neutral", ["Seating was alright"]), d(4, "negative", ["Long wait"])], now);
assert.equal(mild.issues.find((i) => i.label === "Seating was alright")!.severity, "minor");
assert.equal(mild.issues.find((i) => i.label === "Seating was alright")!.negative, 0);
assert.equal(wait.negative, 3);

assert.deepEqual(analyze([], now).issues, []);
console.log("insights.test: ok");

import { parseInsight } from "./insights-ai.ts";
const fake = analyze(drafts, now); // 6 unhappy
const parsed = parseInsight(
  'Here you go: {"summary":"Waits are the main issue.","issues":[{"title":"Slow service at dinner","severity":"major","mentions":999,"why":"4 of 6 unhappy visits","fix":"Add a second cook 7-10pm"},{"title":"","severity":"x","mentions":1},{"title":"Noise","severity":"whatever","mentions":"2","why":"once","fix":"Lower music"}]}',
  fake, "2026-11-21T12:00:00Z",
);
assert.equal(parsed.issues.length, 2); // empty title dropped
assert.equal(parsed.issues[0].mentions, 6); // capped at real unhappy count, never 999
assert.equal(parsed.issues[1].severity, "minor"); // unknown severity → minor
assert.equal(parsed.issues[1].mentions, 2);
assert.equal(parsed.draftCount, 8);
assert.throws(() => parseInsight("sorry, I can't", fake, "x"));
console.log("insights.test ai-parse: ok");
