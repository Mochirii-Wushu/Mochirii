import assert from "node:assert/strict";
import { createMochiPetsTesterRateLimiter } from "./tester-rate-limit-core.ts";

const member = "synthetic-member-binding";
const now = Date.UTC(2026, 6, 26, 12, 0, 0);
const limiter = createMochiPetsTesterRateLimiter();
limiter.clear(member);
assert.deepEqual(limiter.check(member, now), { allowed: true });
for (let index = 0; index < 5; index += 1) limiter.recordFailure(member, now + index);
assert.deepEqual(limiter.check(member, now + 5), {
  allowed: false,
  retryAfterSeconds: 900,
});
assert.deepEqual(limiter.check(member, now + 15 * 60 * 1_000), { allowed: true });
limiter.clear(member);
assert.deepEqual(limiter.check(member, now), { allowed: true });
assert.equal(limiter.check("", now).allowed, false);

console.log("Mochi Pets tester rate-limit tests passed.");
