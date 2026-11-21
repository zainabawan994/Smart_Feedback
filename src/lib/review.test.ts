// Run: npm test
import assert from "node:assert/strict";
import { scrub, templateDraft, acceptNormalized, scriptOk, parsePhoto } from "./review.ts";

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

const roman = templateDraft(b, { picks: ["Long wait"], items: ["Zinger roll"], sentiment: "negative", lang: "roman", occasions: ["Dinner"], note: "dobara nahi aaunga!" });
assert.equal(roman, "Lahore mein Chai Khana ka tajurba acha nahi raha. Dinner ke liye aaya tha. Maine Zinger roll liya. Long wait. Dobara nahi aaunga. Umeed hai ye behtar karenge.");
const both = templateDraft(b, { picks: ["Quick service"], items: [], sentiment: "neutral", lang: "en", occasions: ["Dinner", "With friends"] });
assert.match(both, /Came for dinner, with friends./);
const enOcc = templateDraft(b, { picks: [], items: [], sentiment: "positive", lang: "en", occasions: ["With family"], note: "Great for kids" });
assert.equal(enOcc, "Had a good time at Chai Khana in Lahore. Came with family. Great for kids. Would come back.");
console.log("review.test roman/occasion: ok");

assert.equal(scriptOk("Chai Khana Lahore mein dinner ke liye gaye the.", "ur"), false); // Roman Urdu where Urdu script was asked
assert.equal(scriptOk("Chai Khana میں Zinger roll ٹھنڈا آیا اور بہت انتظار کرنا پڑا۔", "ur"), false); // English names inside Urdu are rejected
assert.equal(scriptOk("لاہور کے چائے خانہ میں زنگر رول ٹھنڈا آیا۔", "ur"), true);
assert.equal(scriptOk("Chai kadak thi.", "roman"), true);
assert.equal(scriptOk("چائے کڑک تھی", "en"), false);
assert.equal(acceptNormalized("Chai kadak thi aur service fast thi.", "چائے کڑک تھی اور سروس تیز تھی۔", "positive", "roman"), false);
console.log("review.test script: ok");

const menu = ["Doodh patti", "Bun kebab", "Aloo paratha"];
assert.deepEqual(
  parsePhoto('Sure! {"menu": ["bun kebab", "Pizza"], "other": ["fries", "golden crispy delicious onion rings", "Doodh patti"]}', menu),
  { items: ["Bun kebab"], other: ["fries"] }, // menu name normalised, unknown dish dropped, long/adjective-heavy and duplicate menu entries dropped
);
assert.deepEqual(parsePhoto("I can't tell", menu), { items: [], other: [] });
assert.deepEqual(parsePhoto('{"menu": [], "other": []}', menu), { items: [], other: [] });
console.log("review.test photo: ok");
assert.deepEqual(parsePhoto('{"menu": [], "other": ["cup of tea", "Cup of tea "]}', menu), { items: [], other: ["cup of tea"] });
console.log("review.test photo dedupe: ok");
