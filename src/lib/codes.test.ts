import assert from "node:assert/strict";
import { codeHash, cooldownLeft, judge, MAX_ATTEMPTS } from "./codes.ts";
import type { Code } from "./store.ts";

const now = 1_800_000_000_000;
const make = (over: Partial<Code> = {}): Code => ({
  email: "a@b.pk", purpose: "verify", hash: codeHash("a@b.pk", "verify", "123456"),
  expiresAt: now + 60_000, attempts: 0, sentAt: now, ...over,
});

assert.equal(judge(make(), "a@b.pk", "verify", "123456", now), "ok");
assert.equal(judge(make(), "a@b.pk", "verify", "123 456", now), "ok"); // spaces from copy-paste are ignored
assert.equal(judge(make(), "A@B.pk", "verify", "123456", now), "ok"); // email case doesn't matter
assert.equal(judge(make(), "a@b.pk", "verify", "654321", now), "wrong");
assert.equal(judge(make(), "a@b.pk", "reset", "123456", now), "wrong"); // a verify code can't reset a password
assert.equal(judge(make(), "other@b.pk", "verify", "123456", now), "wrong"); // bound to the email
assert.equal(judge(make({ expiresAt: now - 1 }), "a@b.pk", "verify", "123456", now), "expired");
assert.equal(judge(make({ attempts: MAX_ATTEMPTS }), "a@b.pk", "verify", "123456", now), "locked"); // even the right code
assert.equal(judge(null, "a@b.pk", "verify", "123456", now), "missing");
assert.ok(!make().hash.includes("123456"));

assert.equal(cooldownLeft(null, now), 0);
assert.equal(cooldownLeft({ sentAt: now - 10_000 }, now), 50);
assert.equal(cooldownLeft({ sentAt: now - 61_000 }, now), 0);
console.log("codes.test: ok");
