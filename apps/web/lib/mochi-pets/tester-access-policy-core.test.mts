import assert from "node:assert/strict";
import {
  createMochiPetsTesterMemberBinding,
  createMochiPetsTesterSessionValue,
  verifyMochiPetsTesterPassword,
  verifyMochiPetsTesterSessionValue,
} from "./tester-session-core.ts";
import {
  authorizeMochiPetsTesterEntry,
  evaluateMochiPetsTesterAccess,
} from "./tester-access-policy-core.ts";

const now = Date.UTC(2026, 6, 26, 12, 0, 0);
const memberId = "00000000-0000-4000-8000-000000000001";
const secrets = {
  password: "test-only-mochi-pets-password",
  sessionSecret: "test-only-session-secret-that-is-long-enough-12345",
};
const createMemberBinding = (id: string) => createMochiPetsTesterMemberBinding(secrets, id);
const createTesterSession = (binding: string) => createMochiPetsTesterSessionValue(
  secrets,
  binding,
  now,
  "a".repeat(22),
);
const verifyTesterSession = (token: string, binding: string) => (
  verifyMochiPetsTesterSessionValue(token, secrets, binding, now)
);
const validMember = { ok: true as const, memberId };

const wrongPassword = await authorizeMochiPetsTesterEntry({
  verification: validMember,
  password: "wrong-but-valid-length",
  createMemberBinding,
  verifyPassword: (password) => verifyMochiPetsTesterPassword(password, secrets.password),
  createTesterSession,
});
assert.deepEqual(wrongPassword, { ok: false, status: 403, error: "invalid" });

for (const status of [401, 403, 503] as const) {
  let passwordChecked = false;
  const rejectedMember = await authorizeMochiPetsTesterEntry({
    verification: { ok: false, status },
    password: secrets.password,
    createMemberBinding,
    verifyPassword: async () => {
      passwordChecked = true;
      return true;
    },
    createTesterSession,
  });
  assert.deepEqual(rejectedMember, { ok: false, status, error: "member_required" });
  assert.equal(passwordChecked, false);
}

const validEntry = await authorizeMochiPetsTesterEntry({
  verification: validMember,
  password: secrets.password,
  createMemberBinding,
  verifyPassword: (password) => verifyMochiPetsTesterPassword(password, secrets.password),
  createTesterSession,
});
assert.equal(validEntry.ok, true);
assert.equal("testerSession" in validEntry, true);

const validAccess = evaluateMochiPetsTesterAccess({
  verification: validMember,
  testerToken: validEntry.ok ? validEntry.testerSession : "",
  createMemberBinding,
  verifyTesterSession,
});
assert.deepEqual(validAccess, { ok: true, testerAccess: true, clearTesterCookie: false });

assert.deepEqual(
  evaluateMochiPetsTesterAccess({
    verification: { ok: false, status: 401 },
    testerToken: validEntry.ok ? validEntry.testerSession : "",
    createMemberBinding,
    verifyTesterSession,
  }),
  { ok: false, status: 401, clearTesterCookie: true },
);
assert.deepEqual(
  evaluateMochiPetsTesterAccess({
    verification: { ok: true, memberId: "00000000-0000-4000-8000-000000000002" },
    testerToken: validEntry.ok ? validEntry.testerSession : "",
    createMemberBinding,
    verifyTesterSession,
  }),
  { ok: true, testerAccess: false, clearTesterCookie: true },
);

console.log("Mochi Pets tester-access policy tests passed.");
