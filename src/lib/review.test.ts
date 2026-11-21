// Run: npm test
import assert from "node:assert/strict";
import { scrub, templateDraft, acceptNormalized } from "./review.ts";

assert.equal(scrub("Overall, a truly delightful spot — a testament to good chai!!!"), "A nice spot, shows good chai!");
assert.equal(scrub("Great food! Great staff!"), "Great food! Great staff.");

const b = { slug: "x", name: "Chai Khana", city: "Lahore", kind: "café", googleReviewUrl: "", menu: [], highlights: { positive: [], neutral: [], negative: [] }, defaultLang: "en" as const };
const neg = templateDraft(b, { picks: ["Long wait"], items: [], sentiment: "negative", lang: "en" });
assert.match(neg, /didn't go well.*Long wait/);
assert.ok(templateDraft(b, { picks: ["کھانا ٹھنڈا تھا"], items: [], sentiment: "negative", lang: "ur" }).includes("اچھا نہیں"));

assert.equal(acceptNormalized("Food was cold and the wait was long.", "Loved it! Amazing food, cold but great.", "negative"), false);
assert.equal(acceptNormalized("Food was cold and the wait was long.", "Food came cold, waited a long time.", "negative"), true);
assert.equal(acceptNormalized("Food was cold and the wait was long.", "", "neutral"), false);
console.log("review.test: ok");
