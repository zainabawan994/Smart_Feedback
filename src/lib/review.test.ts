// Run: npm test
import assert from "node:assert/strict";
import { scrub, templateDraft, acceptNormalized, scriptOk, parsePhoto } from "./review.ts";

assert.equal(scrub("Overall, a truly delightful spot — a testament to good chai!!!"), "A nice spot, shows good chai!");
assert.equal(scrub("Great food! Great staff!"), "Great food! Great staff.");

const b = { slug: "x", name: "Chai Khana", city: "Lahore", kind: "café", googleReviewUrl: "", menu: [], highlights: { positive: [], neutral: [], negative: [] }, defaultLang: "en" as const };
const neg = templateDraft(b, { picks: ["Long wait"], items: [], sentiment: "negative", lang: "en" }, () => 0);
assert.match(neg, /didn't go well.*Long wait/);
assert.ok(templateDraft(b, { picks: ["کھانا ٹھنڈا تھا"], items: [], sentiment: "negative", lang: "ur" }, () => 0).includes("اچھا نہیں"));

assert.equal(acceptNormalized("Food was cold and the wait was long.", "Loved it! Amazing food, cold but great.", "negative"), false);
assert.equal(acceptNormalized("Food was cold and the wait was long.", "Food came cold, waited a long time.", "negative"), true);
assert.equal(acceptNormalized("Food was cold and the wait was long.", "", "neutral"), false);
console.log("review.test: ok");

const roman = templateDraft(b, { picks: ["Long wait"], items: ["Zinger roll"], sentiment: "negative", lang: "roman", occasions: ["Dinner"], note: "dobara nahi aaunga!" }, () => 0);
assert.equal(roman, "Lahore mein Chai Khana ka tajurba acha nahi raha. Dinner ke liye aaya tha. Maine Zinger roll liya. Long wait. Dobara nahi aaunga. Umeed hai ye behtar karenge.");
const both = templateDraft(b, { picks: ["Quick service"], items: [], sentiment: "neutral", lang: "en", occasions: ["Dinner", "With friends"] }, () => 0);
assert.match(both, /Came for dinner, with friends./);
const enOcc = templateDraft(b, { picks: [], items: [], sentiment: "positive", lang: "en", occasions: ["With family"], note: "Great for kids" }, () => 0);
assert.equal(enOcc, "Had a good time at Chai Khana in Lahore. Came with family. Great for kids. Would come back.");
console.log("review.test roman/occasion: ok");

// Same inputs, different wording: openings and closings vary, the customer's points stay.
{
  const input = { picks: [], items: ["Zinger roll"], sentiment: "positive" as const, lang: "en" as const };
  const first = templateDraft(b, input, () => 0);
  const last = templateDraft(b, input, () => 0.99);
  assert.notEqual(first, last);
  for (const t of [first, last]) assert.ok(t.includes("Zinger roll") && t.includes("Chai Khana") && t.includes("Lahore"), t);
  const seen = new Set(Array.from({ length: 40 }, () => templateDraft(b, input)));
  assert.ok(seen.size > 1, "random wording should vary");
  console.log("review.test variety: ok");
}

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

// Accuracy guards: invented dishes and dropped names.
{
  const { inventedDishes, lostNames, acceptNormalized } = await import("./review.ts");
  const menu = ["Zinger roll", "Doodh patti", "Bun kebab"];
  assert.deepEqual(inventedDishes("Had a zinger roll and some doodh patti.", menu, ["Zinger roll"]), ["Doodh patti"]);
  assert.deepEqual(inventedDishes("Had a Zinger roll.", menu, ["Zinger roll"]), []);
  assert.deepEqual(inventedDishes("Bun kebabs everywhere? no, just tea", ["Bun kebab"], []), []); // whole names only
  assert.deepEqual(lostNames("Dinner at Chai Khana in Lahore. Zinger roll was cold.", "Dinner here. It was cold.", ["Chai Khana", "Lahore", "Zinger roll"]), ["Chai Khana", "Lahore", "Zinger roll"]);
  assert.deepEqual(lostNames("Went for dinner. Food was cold.", "Dinner, food cold.", ["Chai Khana"]), []); // never in the draft, nothing to lose
  const draft = "Dinner at Chai Khana in Lahore. The Zinger roll came cold after a long wait.";
  assert.equal(acceptNormalized(draft, "Had dinner at Chai Khana, Lahore. Zinger roll came cold after a long wait.", "negative", "en", ["Chai Khana", "Lahore", "Zinger roll"]), true);
  assert.equal(acceptNormalized(draft, "Had dinner at Chai Khana, Lahore. My roll came cold after a really long wait.", "negative", "en", ["Chai Khana", "Lahore", "Zinger roll"]), false);
  console.log("review.test accuracy guards: ok");
}

// Template wording follows the business type.
{
  const shop = { ...b, kind: "clothing store", name: "Khaadi", city: "Lahore" };
  const t = templateDraft(shop, { picks: ["Nice designs"], items: ["Lawn suit"], sentiment: "positive", lang: "en" });
  assert.ok(t.includes("I bought the Lawn suit"), t);
  console.log("review.test business type: ok");
}
