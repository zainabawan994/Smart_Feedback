// Adds ~3 weeks of realistic demo drafts to the demo café (chai-khana) so the Issues page has history.
// Local JSON store only. Safe to re-run: skips if demo drafts already exist. Usage: node scripts/seed-demo-history.mjs
import fs from "node:fs";

const FILE = "data/db.json";
const db = JSON.parse(fs.readFileSync(FILE, "utf8"));
db.drafts ??= {};
const list = (db.drafts["chai-khana"] ??= []);
if (list.some((d) => d.id.startsWith("demo-"))) {
  console.log("demo history already present, nothing to do");
  process.exit(0);
}

const DAY = 86_400_000;
const now = Date.now();
let n = 0;
const draft = (daysAgo, hour, sentiment, picks, items, occasions, text, lang = "en") => ({
  id: `demo-${n++}`,
  at: new Date(now - daysAgo * DAY - (24 - hour) * 3_600_000).toISOString(),
  sentiment, lang, picks, items, occasions, hasPhoto: n % 5 === 0, hasNote: n % 4 === 0, text, source: "llm",
});

const rows = [
  // Dinner waits with the Zinger roll: rising this week → should come out MAJOR
  [1, 21, "negative", ["Long wait", "Food arrived cold"], ["Zinger roll"], ["Dinner"], "Went to Chai Khana in Lahore for dinner. Ordered a Zinger roll. Waited a long time and it came cold."],
  [1, 22, "negative", ["Long wait"], ["Zinger roll"], ["Dinner", "With friends"], "Chai Khana Lahore mein doston ke saath dinner pe gaye. Zinger roll ka bohat lamba wait hua.", "roman"],
  [2, 21, "negative", ["Long wait", "Staff seemed rushed"], ["Zinger roll"], ["Dinner"], "Dinner at Chai Khana, Lahore. Long wait for the Zinger roll and the staff seemed rushed."],
  [2, 20, "neutral", ["Took a while to order", "A bit crowded"], ["Bun kebab"], ["Dinner"], "Visited Chai Khana in Lahore for dinner. Took a while to order and it was a bit crowded."],
  [3, 22, "negative", ["Food arrived cold"], ["Zinger roll"], ["Dinner"], "لاہور میں چائے خانہ رات کے کھانے پر گیا۔ زنگر رول ٹھنڈا آیا۔", "ur"],
  [4, 21, "negative", ["Long wait"], ["Zinger roll", "Doodh patti"], ["Dinner", "With family"], "Came with family for dinner at Chai Khana, Lahore. Ordered Zinger roll and Doodh patti. The wait was very long."],
  [5, 20, "negative", ["Long wait", "Order was wrong"], ["Zinger roll"], ["Dinner"], "Chai Khana Lahore. Long wait and then the order was wrong."],
  [6, 21, "neutral", ["Service was okay", "Took a while to order"], [], ["Dinner"], "Dinner at Chai Khana in Lahore. Service was okay, took a while to order."],
  // Older, fading complaints → minor / falling
  [9, 19, "negative", ["Too noisy"], [], ["Evening chai"], "Evening chai at Chai Khana, Lahore. Too noisy to talk."],
  [10, 20, "negative", ["Too noisy", "Table wasn't clean"], ["Kashmiri chai"], ["Evening chai"], "Had Kashmiri chai at Chai Khana. It was too noisy and the table wasn't clean."],
  [12, 13, "neutral", ["Average prices"], ["Aloo paratha"], ["Lunch"], "Lunch at Chai Khana, Lahore. Aloo paratha. Average prices."],
  [15, 9, "negative", ["Too pricey for the portion"], ["Aloo paratha"], ["Breakfast"], "Breakfast at Chai Khana. Aloo paratha felt too pricey for the portion."],
  [18, 20, "negative", ["Too noisy"], [], ["With friends"], "Chai Khana Lahore mein bohat shor tha.", "roman"],
  // Praise
  [1, 9, "positive", ["Chai was strong and fresh", "Quick service"], ["Doodh patti"], ["Breakfast"], "Went to Chai Khana in Lahore for breakfast. Doodh patti was strong and fresh. Service was quick."],
  [2, 10, "positive", ["Chai was strong and fresh", "Cozy seating"], ["Kashmiri chai"], ["Breakfast", "With family"], "Breakfast with family at Chai Khana, Lahore. Kashmiri chai was strong and fresh. Cozy seating."],
  [3, 17, "positive", ["Good value for money"], ["Bun kebab"], ["Evening chai"], "Evening chai at Chai Khana. Bun kebab was good value for money."],
  [4, 9, "positive", ["Chai was strong and fresh", "Staff were friendly"], ["Doodh patti", "Aloo paratha"], ["Breakfast"], "لاہور کے چائے خانہ میں ناشتہ کیا۔ دودھ پتی کڑک اور تازہ تھی۔ عملہ اچھا تھا۔", "ur"],
  [7, 10, "positive", ["Quick service", "Clean place"], ["Doodh patti"], ["Breakfast"], "Breakfast at Chai Khana, Lahore. Quick service and a clean place."],
  [11, 16, "positive", ["Chai was strong and fresh"], ["Gulab jamun", "Doodh patti"], ["Evening chai", "With friends"], "Chai Khana Lahore mein doston ke saath shaam ki chai. Chai kadak thi.", "roman"],
  [14, 9, "positive", ["Cozy seating", "Nice music"], [], ["Breakfast"], "Breakfast at Chai Khana in Lahore. Cozy seating and nice music."],
];

const added = rows.map((r) => draft(...r));
db.drafts["chai-khana"] = [...added, ...list].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 500);
fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
console.log(`added ${added.length} demo drafts to chai-khana`);
