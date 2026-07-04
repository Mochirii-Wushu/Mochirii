import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const MOCHI_PETS_TESTER_COOKIE = "mochi_pets_tester_access";
export const MOCHI_PETS_TESTER_COOKIE_MAX_AGE = 60 * 60 * 8;

const SESSION_PURPOSE = "mochi-pets-tester-session:v1";
const PASSWORD_PURPOSE = "mochi-pets-tester-password:v1";
const DERIVED_KEY_LENGTH = 64;

function configuredPassword() {
  const password = process.env.MOCHI_PETS_TESTER_PASSWORD || "";
  return password.trim() ? password : "";
}

function derivePasswordKey(password: string, purpose: string) {
  return scryptSync(password, purpose, DERIVED_KEY_LENGTH);
}

function safeEqual(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isMochiPetsTesterPasswordConfigured() {
  return Boolean(configuredPassword());
}

export function verifyMochiPetsTesterPassword(password: string) {
  const expectedPassword = configuredPassword();
  if (!expectedPassword || !password) return false;
  return safeEqual(
    derivePasswordKey(password, PASSWORD_PURPOSE),
    derivePasswordKey(expectedPassword, PASSWORD_PURPOSE),
  );
}

export function createMochiPetsTesterSessionValue() {
  const expectedPassword = configuredPassword();
  if (!expectedPassword) return "";
  return derivePasswordKey(expectedPassword, SESSION_PURPOSE).toString("hex");
}

export async function hasMochiPetsTesterSession() {
  const expectedValue = createMochiPetsTesterSessionValue();
  if (!expectedValue) return false;

  const cookieStore = await cookies();
  const currentValue = cookieStore.get(MOCHI_PETS_TESTER_COOKIE)?.value || "";
  return safeEqual(Buffer.from(currentValue, "hex"), Buffer.from(expectedValue, "hex"));
}
