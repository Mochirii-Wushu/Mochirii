import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const MOCHI_SOCIAL_TESTER_COOKIE = "mochi_social_tester_access";
export const MOCHI_SOCIAL_TESTER_COOKIE_MAX_AGE = 60 * 60 * 8;

const SESSION_PURPOSE = "mochi-social-tester-session:v1";

function normalizeHash(value: string) {
  return value.trim().toLowerCase();
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function configuredPasswordHash() {
  const explicitHash = normalizeHash(process.env.MOCHI_SOCIAL_TESTER_PASSWORD_SHA256 || "");
  if (/^[a-f0-9]{64}$/.test(explicitHash)) return explicitHash;

  const password = process.env.MOCHI_SOCIAL_TESTER_PASSWORD || "";
  if (!password) return "";

  return sha256(password);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isMochiSocialTesterPasswordConfigured() {
  return Boolean(configuredPasswordHash());
}

export function verifyMochiSocialTesterPassword(password: string) {
  const expectedHash = configuredPasswordHash();
  if (!expectedHash || !password) return false;
  return safeEqual(sha256(password), expectedHash);
}

export function createMochiSocialTesterSessionValue() {
  const expectedHash = configuredPasswordHash();
  if (!expectedHash) return "";
  return sha256(`${SESSION_PURPOSE}:${expectedHash}`);
}

export async function hasMochiSocialTesterSession() {
  const expectedValue = createMochiSocialTesterSessionValue();
  if (!expectedValue) return false;

  const cookieStore = await cookies();
  const currentValue = cookieStore.get(MOCHI_SOCIAL_TESTER_COOKIE)?.value || "";
  return safeEqual(currentValue, expectedValue);
}
