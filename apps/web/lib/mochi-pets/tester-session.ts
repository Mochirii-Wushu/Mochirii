import "server-only";

import {
  createMochiPetsTesterSessionValue as createSessionValue,
  createMochiPetsTesterMemberBinding as createMemberBinding,
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

export function createMochiPetsTesterSessionValue(memberBinding: string, now = Date.now()) {
  return createSessionValue(configuredSecrets(), memberBinding, now);
}

export function createMochiPetsTesterMemberBinding(memberId: string) {
  return createMemberBinding(configuredSecrets(), memberId);
}

export function verifyMochiPetsTesterCookieValue(token: string, memberBinding: string, now = Date.now()) {
  return verifyMochiPetsTesterSessionValue(token, configuredSecrets(), memberBinding, now);
}
