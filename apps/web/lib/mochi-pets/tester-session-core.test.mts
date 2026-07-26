import assert from "node:assert/strict";
import {
  createMochiPetsTesterSessionValue,
  isMochiPetsTesterAccessConfigured,
  MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  verifyMochiPetsTesterPassword,
  verifyMochiPetsTesterSessionValue,
} from "./tester-session-core.ts";

const now = Date.UTC(2026, 6, 26, 12, 0, 0);
const nonce = "a".repeat(22);
const secrets = {
  password: "test-only-mochi-pets-password",
  sessionSecret: "test-only-session-secret-that-is-long-enough-12345",
};

assert.equal(isMochiPetsTesterAccessConfigured(secrets), true);
assert.equal(isMochiPetsTesterAccessConfigured({ ...secrets, password: "" }), false);
assert.equal(isMochiPetsTesterAccessConfigured({ ...secrets, sessionSecret: "too-short" }), false);

assert.equal(await verifyMochiPetsTesterPassword(secrets.password, secrets.password), true);
assert.equal(await verifyMochiPetsTesterPassword("wrong-password", secrets.password), false);
assert.equal(await verifyMochiPetsTesterPassword("", secrets.password), false);
assert.equal(await verifyMochiPetsTesterPassword("x".repeat(513), secrets.password), false);

const token = createMochiPetsTesterSessionValue(secrets, now, nonce);
assert.ok(token.startsWith("v2."));
assert.equal(verifyMochiPetsTesterSessionValue(token, secrets, now), true);
assert.equal(
  verifyMochiPetsTesterSessionValue(token, secrets, now + (MOCHI_PETS_TESTER_COOKIE_MAX_AGE - 1) * 1_000),
  true,
);
assert.equal(
  verifyMochiPetsTesterSessionValue(token, secrets, now + MOCHI_PETS_TESTER_COOKIE_MAX_AGE * 1_000),
  false,
);

const tokenParts = token.split(".");
const signature = tokenParts.at(-1) ?? "";
const replacement = signature.startsWith("a") ? "b" : "a";
const tamperedSignature = [...tokenParts.slice(0, -1), `${replacement}${signature.slice(1)}`].join(".");
assert.notEqual(tamperedSignature, token);
assert.equal(verifyMochiPetsTesterSessionValue(tamperedSignature, secrets, now), false);
const finalCharacter = signature.at(-1) ?? "";
const base64urlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const signatureBytes = Buffer.from(signature, "base64url");
const noncanonicalCharacter = [...base64urlAlphabet].find((character) => (
  character !== finalCharacter
  && Buffer.from(`${signature.slice(0, -1)}${character}`, "base64url").equals(signatureBytes)
));
assert.ok(noncanonicalCharacter, "expected a noncanonical Base64URL alias for the signature fixture");
const noncanonicalSignature = [
  ...tokenParts.slice(0, -1),
  `${signature.slice(0, -1)}${noncanonicalCharacter}`,
].join(".");
assert.notEqual(noncanonicalSignature, token);
assert.equal(verifyMochiPetsTesterSessionValue(noncanonicalSignature, secrets, now), false);
assert.equal(verifyMochiPetsTesterSessionValue("malformed", secrets, now), false);
assert.equal(verifyMochiPetsTesterSessionValue(`v3.${tokenParts.slice(1).join(".")}`, secrets, now), false);
assert.equal(
  verifyMochiPetsTesterSessionValue(token, { ...secrets, password: "rotated-password" }, now),
  false,
);
assert.equal(
  verifyMochiPetsTesterSessionValue(token, { ...secrets, sessionSecret: `${secrets.sessionSecret}-rotated` }, now),
  false,
);

const futureToken = createMochiPetsTesterSessionValue(secrets, now + 61_000, nonce);
assert.equal(verifyMochiPetsTesterSessionValue(futureToken, secrets, now), false);

console.log("Mochi Pets tester-session core tests passed.");
