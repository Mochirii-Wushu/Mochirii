import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const MOCHI_PETS_TESTER_COOKIE = "mochi_pets_tester_access";
export const MOCHI_PETS_TESTER_COOKIE_MAX_AGE = 60 * 60 * 8;

const PASSWORD_SALT = "mochirii:mochi-pets:tester-password:v2";
const SESSION_KEY_PURPOSE = "mochirii:mochi-pets:tester-session:v3";
const MEMBER_BINDING_PURPOSE = "mochirii:mochi-pets:tester-member:v1";
const SESSION_VERSION = "v3";
const DERIVED_KEY_LENGTH = 32;
const MAX_INPUT_CODE_POINTS = 128;
const MAX_INPUT_BYTES = 512;
const MIN_INPUT_CHARACTERS = 15;
const MIN_SIGNING_KEY_BYTES = 32;
const MAX_SIGNED_COOKIE_BYTES = 512;
const CLOCK_SKEW_SECONDS = 60;
const SCRYPT_OPTIONS = {
  N: 2 ** 15,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

export type MochiPetsTesterSecrets = {
  password: string;
  sessionSecret: string;
};

function deriveKey(value: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(value, salt, DERIVED_KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

function safeEqual(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

function validPasswordInput(password: string) {
  const byteLength = Buffer.byteLength(password, "utf8");
  const codePoints = Array.from(password).length;
  return codePoints >= MIN_INPUT_CHARACTERS
    && codePoints <= MAX_INPUT_CODE_POINTS
    && byteLength <= MAX_INPUT_BYTES;
}

function sessionKey(secret: string) {
  return createHmac("sha256", secret).update(SESSION_KEY_PURPOSE).digest();
}

function sessionSignature(key: Buffer, payload: string) {
  return createHmac("sha256", key).update(payload).digest();
}

function passwordVersion(key: Buffer, password: string) {
  return createHmac("sha256", key)
    .update("password-version\0")
    .update(password)
    .digest("base64url");
}

export function createMochiPetsTesterMemberBinding(secrets: MochiPetsTesterSecrets, memberId: string) {
  if (!isMochiPetsTesterAccessConfigured(secrets) || !memberId.trim()) return "";
  return createHmac("sha256", sessionKey(secrets.sessionSecret))
    .update(MEMBER_BINDING_PURPOSE)
    .update("\0")
    .update(memberId)
    .digest("base64url");
}

export function isMochiPetsTesterAccessConfigured(secrets: MochiPetsTesterSecrets) {
  return Boolean(
    validPasswordInput(secrets.password)
    && Buffer.byteLength(secrets.sessionSecret, "utf8") >= MIN_SIGNING_KEY_BYTES,
  );
}

export async function verifyMochiPetsTesterPassword(password: string, expectedPassword: string) {
  if (!validPasswordInput(expectedPassword) || !validPasswordInput(password)) return false;

  const [candidate, expected] = await Promise.all([
    deriveKey(password, PASSWORD_SALT),
    deriveKey(expectedPassword, PASSWORD_SALT),
  ]);
  return safeEqual(candidate, expected);
}

export function createMochiPetsTesterSessionValue(
  secrets: MochiPetsTesterSecrets,
  memberBinding: string,
  now = Date.now(),
  nonce = randomBytes(16).toString("base64url"),
) {
  if (!isMochiPetsTesterAccessConfigured(secrets)) return "";
  if (!/^[A-Za-z0-9_-]{22}$/.test(nonce)) throw new Error("Invalid session nonce.");
  if (!/^[A-Za-z0-9_-]{43}$/.test(memberBinding)) return "";

  const issuedAt = Math.floor(now / 1_000);
  const expiresAt = issuedAt + MOCHI_PETS_TESTER_COOKIE_MAX_AGE;
  const key = sessionKey(secrets.sessionSecret);
  const credentialVersion = passwordVersion(key, secrets.password);
  const payload = `${SESSION_VERSION}.${issuedAt}.${expiresAt}.${nonce}.${credentialVersion}.${memberBinding}`;
  const signature = sessionSignature(key, payload).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifyMochiPetsTesterSessionValue(
  token: string,
  secrets: MochiPetsTesterSecrets,
  memberBinding: string,
  now = Date.now(),
) {
  if (!isMochiPetsTesterAccessConfigured(secrets)) return false;
  if (Buffer.byteLength(token, "utf8") > MAX_SIGNED_COOKIE_BYTES) return false;

  const [version, rawIssuedAt, rawExpiry, nonce, credentialVersion, tokenMemberBinding, rawSignature, extra] = token.split(".");
  const issuedAt = Number(rawIssuedAt);
  const expiresAt = Number(rawExpiry);
  const nowSeconds = Math.floor(now / 1_000);

  if (
    extra !== undefined
    || version !== SESSION_VERSION
    || !Number.isSafeInteger(issuedAt)
    || !Number.isSafeInteger(expiresAt)
    || issuedAt > nowSeconds + CLOCK_SKEW_SECONDS
    || expiresAt - issuedAt !== MOCHI_PETS_TESTER_COOKIE_MAX_AGE
    || expiresAt <= nowSeconds
    || !/^[A-Za-z0-9_-]{22}$/.test(nonce ?? "")
    || !/^[A-Za-z0-9_-]{43}$/.test(credentialVersion ?? "")
    || !/^[A-Za-z0-9_-]{43}$/.test(tokenMemberBinding ?? "")
    || !/^[A-Za-z0-9_-]{43}$/.test(memberBinding)
    || !/^[A-Za-z0-9_-]{43}$/.test(rawSignature ?? "")
  ) {
    return false;
  }

  const key = sessionKey(secrets.sessionSecret);
  const expectedCredentialVersion = passwordVersion(key, secrets.password);
  if (!safeEqual(Buffer.from(credentialVersion), Buffer.from(expectedCredentialVersion))) return false;
  if (!safeEqual(Buffer.from(tokenMemberBinding), Buffer.from(memberBinding))) return false;

  const payload = `${version}.${issuedAt}.${expiresAt}.${nonce}.${credentialVersion}.${tokenMemberBinding}`;
  const expectedSignature = sessionSignature(key, payload);
  const candidateSignature = Buffer.from(rawSignature, "base64url");
  if (candidateSignature.toString("base64url") !== rawSignature) return false;
  return safeEqual(candidateSignature, expectedSignature);
}
