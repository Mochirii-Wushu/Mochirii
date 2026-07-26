import "server-only";

import { cookies } from "next/headers";
import {
  createMochiPetsTesterSessionValue as createSessionValue,
  isMochiPetsTesterAccessConfigured as accessConfigured,
  MOCHI_PETS_TESTER_COOKIE,
  MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  verifyMochiPetsTesterPassword as verifyPassword,
  verifyMochiPetsTesterSessionValue,
} from "./tester-session-core";

export { MOCHI_PETS_TESTER_COOKIE, MOCHI_PETS_TESTER_COOKIE_MAX_AGE };

function configuredSecrets() {
  return {
    password: process.env.MOCHI_PETS_TESTER_PASSWORD ?? "",
    sessionSecret: process.env.MOCHI_PETS_TESTER_SESSION_SECRET ?? "",
  };
}

export function isMochiPetsTesterAccessConfigured() {
  return accessConfigured(configuredSecrets());
}

export function verifyMochiPetsTesterPassword(password: string) {
  return verifyPassword(password, configuredSecrets().password);
}

export function createMochiPetsTesterSessionValue(now = Date.now()) {
  return createSessionValue(configuredSecrets(), now);
}

export async function hasMochiPetsTesterSession(now = Date.now()) {
  const cookieStore = await cookies();
  const token = cookieStore.get(MOCHI_PETS_TESTER_COOKIE)?.value ?? "";
  return verifyMochiPetsTesterSessionValue(token, configuredSecrets(), now);
}
