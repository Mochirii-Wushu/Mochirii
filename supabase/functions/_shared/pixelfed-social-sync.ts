import { SOCIAL_ORIGIN } from "./public-origins.ts";

export type JsonRecord = Record<string, unknown>;

export type PixelfedSocialSyncPayload = {
  sub: string;
  provider_user_id: string;
  username: string;
  profile_url: string;
  event: "login" | "account_created" | "account_updated";
  timestamp: string;
};

export const PIXELFED_SOCIAL_SYNC_SECRET_HEADER = "x-mochirii-social-sync-secret";
export const PIXELFED_SOCIAL_SYNC_MAX_SKEW_MS = 5 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERNAME_RE = /^[a-z0-9_][a-z0-9_.-]{1,63}$/;
const ALLOWED_EVENTS = new Set(["login", "account_created", "account_updated"]);
const SOCIAL_PROFILE_PREFIX = `${SOCIAL_ORIGIN}/`;

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }

  return diff === 0;
}

export function validTimestamp(timestamp: string, nowMs = Date.now()): boolean {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(nowMs - parsed) <= PIXELFED_SOCIAL_SYNC_MAX_SKEW_MS;
}

export function parsePixelfedSocialSyncPayload(value: unknown, nowMs = Date.now()): PixelfedSocialSyncPayload {
  const body = asRecord(value);
  const sub = safeString(body.sub, 80);
  const providerUserId = safeString(body.provider_user_id, 255);
  const username = safeString(body.username, 64)?.toLowerCase();
  const profileUrl = safeString(body.profile_url, 500);
  const event = safeString(body.event, 40);
  const timestamp = safeString(body.timestamp, 80);

  if (!sub || !UUID_RE.test(sub)) {
    throw new Error("sub must be a valid Supabase user UUID.");
  }
  if (!providerUserId) {
    throw new Error("provider_user_id is required.");
  }
  if (!username || !USERNAME_RE.test(username)) {
    throw new Error("username must match the Mochirii Social username contract.");
  }
  if (!profileUrl || !profileUrl.startsWith(SOCIAL_PROFILE_PREFIX)) {
    throw new Error(`profile_url must stay under ${SOCIAL_PROFILE_PREFIX}.`);
  }
  if (!event || !ALLOWED_EVENTS.has(event)) {
    throw new Error("event must be login, account_created, or account_updated.");
  }
  if (!timestamp || !validTimestamp(timestamp, nowMs)) {
    throw new Error("timestamp is missing, invalid, or outside the accepted freshness window.");
  }

  return {
    sub,
    provider_user_id: providerUserId,
    username,
    profile_url: profileUrl,
    event: event as PixelfedSocialSyncPayload["event"],
    timestamp,
  };
}
