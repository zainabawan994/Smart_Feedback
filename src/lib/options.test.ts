import assert from "node:assert/strict";
import { googleLink, normalizeReviewUrl } from "./options.ts";

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
