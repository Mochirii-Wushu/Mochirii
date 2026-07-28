import {
  type JsonRecord,
  profileMatchesTrustedDiscordIdentity,
  safeString,
} from "./member-verification-identity.ts";

export const MEMBER_VERIFICATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const DISCORD_NEGATIVE_RECHECK_AFTER_MS = 5 * 60 * 1000;

export type CurrentMemberAccess = {
  eligible: boolean;
  discordVerified: boolean;
  manualApproved: boolean;
};

export function discordVerificationNeedsRefresh(
  profile: JsonRecord | null,
  trustedDiscordUserId: string | null,
  nowMs = Date.now(),
): boolean {
  if (!trustedDiscordUserId) return false;

  const memberStatus = safeString(profile?.member_status, 40);
  if (memberStatus === "suspended" || memberStatus === "archived") return false;

  const profileDiscordUserId = safeString(profile?.discord_user_id, 40);
  if (profileDiscordUserId !== trustedDiscordUserId) return true;

  const checkedAt = safeString(profile?.discord_checked_at, 80);
  if (!checkedAt) return true;

  const timestamp = Date.parse(checkedAt);
  if (
    !Number.isFinite(timestamp) || timestamp > nowMs ||
    nowMs - timestamp >= MEMBER_VERIFICATION_MAX_AGE_MS
  ) {
    return true;
  }

  if (profile?.has_required_discord_roles !== true) {
    return nowMs - timestamp >= DISCORD_NEGATIVE_RECHECK_AFTER_MS;
  }

  const verifiedAt = safeString(profile?.discord_verified_at, 80);
  if (!verifiedAt) return true;

  const verifiedTimestamp = Date.parse(verifiedAt);
  return !Number.isFinite(verifiedTimestamp) || verifiedTimestamp > nowMs ||
    nowMs - verifiedTimestamp > MEMBER_VERIFICATION_MAX_AGE_MS;
}

function recentDiscordVerification(
  profile: JsonRecord | null,
  nowMs: number,
): boolean {
  if (profile?.has_required_discord_roles !== true) return false;
  const verifiedAt = safeString(profile?.discord_verified_at, 80);
  if (!verifiedAt) return false;
  const timestamp = Date.parse(verifiedAt);
  return Number.isFinite(timestamp) && timestamp <= nowMs &&
    nowMs - timestamp <= MEMBER_VERIFICATION_MAX_AGE_MS;
}

function approvedManualVerification(
  verification: JsonRecord | null,
  nowMs: number,
): boolean {
  const status = safeString(verification?.gallery_access_status, 40);
  const verifiedAt = safeString(verification?.gallery_access_verified_at, 80);
  const expiresAt = safeString(verification?.gallery_access_expires_at, 80);
  if (status !== "approved" || !verifiedAt) return false;

  const verifiedTimestamp = Date.parse(verifiedAt);
  if (!Number.isFinite(verifiedTimestamp) || verifiedTimestamp > nowMs) {
    return false;
  }
  if (!expiresAt) return true;

  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry >= nowMs;
}

export function currentMemberAccess({
  profile,
  verification,
  trustedDiscordUserId,
  nowMs = Date.now(),
}: {
  profile: JsonRecord | null;
  verification: JsonRecord | null;
  trustedDiscordUserId: string | null;
  nowMs?: number;
}): CurrentMemberAccess {
  if (safeString(profile?.member_status, 40) !== "active") {
    return { eligible: false, discordVerified: false, manualApproved: false };
  }

  const discordVerified = profileMatchesTrustedDiscordIdentity(
    profile?.discord_user_id,
    trustedDiscordUserId,
  ) && recentDiscordVerification(profile, nowMs);
  const manualApproved = approvedManualVerification(verification, nowMs);

  return {
    eligible: discordVerified || manualApproved,
    discordVerified,
    manualApproved,
  };
}
