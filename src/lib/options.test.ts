import assert from "node:assert/strict";
import { googleLink, normalizeReviewUrl, planState } from "./options.ts";

assert.equal(normalizeReviewUrl(""), "");
assert.equal(normalizeReviewUrl(" https://g.page/r/abc/review "), "https://g.page/r/abc/review");
assert.equal(normalizeReviewUrl("ChIJN1t_tDeuEmsRUsoyG83frY4"), "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4");
assert.equal(normalizeReviewUrl("http://g.page/x"), null);
assert.equal(normalizeReviewUrl("javascript:alert(1)"), null);
const b = { name: "Chai Khana", city: "Lahore" };
assert.equal(googleLink({ ...b, googleReviewUrl: "https://g.page/r/abc/review" }), "https://g.page/r/abc/review");
assert.equal(googleLink({ ...b, googleReviewUrl: "https://x?placeid=REPLACE_WITH_PLACE_ID" }), "https://www.google.com/maps/search/?api=1&query=Chai%20Khana%20Lahore");
assert.equal(googleLink({ ...b, googleReviewUrl: "" }).startsWith("https://www.google.com/maps/search/"), true);
console.log("options.test: ok");

const now = Date.parse("2026-11-21T12:00:00Z");
const in3 = new Date(now + 3 * 86_400_000).toISOString();
assert.equal(planState({ plan: null }, now).label, "No plan");
assert.equal(planState({ plan: "yearly", planExpiresAt: "2027-11-21T00:00:00Z" }, now).tone, "ok");
assert.deepEqual(planState({ plan: "monthly", planExpiresAt: in3 }, now), { label: "Monthly · 3d left", tone: "warn" });
assert.deepEqual(planState({ plan: "6months", planExpiresAt: "2026-11-01T00:00:00Z" }, now), { label: "6 Months · expired", tone: "bad" });
assert.equal(planState({ plan: "yearly", planExpiresAt: "2027-11-21T00:00:00Z", suspended: true }, now).label, "Suspended");
console.log("options.test plan state: ok");
