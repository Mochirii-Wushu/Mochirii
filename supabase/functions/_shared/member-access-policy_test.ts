import {
  currentMemberAccess,
  DISCORD_NEGATIVE_RECHECK_AFTER_MS,
  discordVerificationNeedsRefresh,
  MEMBER_VERIFICATION_MAX_AGE_MS,
} from "./member-access-policy.ts";

const now = Date.parse("2026-07-27T12:00:00.000Z");
const activeDiscordProfile = {
  member_status: "active",
  discord_user_id: "1234567890",
  discord_checked_at: new Date(now - MEMBER_VERIFICATION_MAX_AGE_MS)
    .toISOString(),
  has_required_discord_roles: true,
  discord_verified_at: new Date(now - MEMBER_VERIFICATION_MAX_AGE_MS)
    .toISOString(),
};

Deno.test("Social access refreshes stale Discord evidence without polling recent checks", () => {
  assert(
    !discordVerificationNeedsRefresh(
      {
        ...activeDiscordProfile,
        discord_checked_at: new Date(now - MEMBER_VERIFICATION_MAX_AGE_MS + 1)
          .toISOString(),
      },
      "1234567890",
      now,
    ),
    "recent matching Discord evidence should not refresh",
  );

  for (
    const profile of [
      { ...activeDiscordProfile, discord_checked_at: null },
      {
        ...activeDiscordProfile,
        discord_checked_at: new Date(now - MEMBER_VERIFICATION_MAX_AGE_MS)
          .toISOString(),
      },
      { ...activeDiscordProfile, discord_checked_at: "not-a-time" },
      {
        ...activeDiscordProfile,
        discord_checked_at: new Date(now + 1).toISOString(),
      },
      { ...activeDiscordProfile, discord_user_id: "different-user" },
      { ...activeDiscordProfile, discord_verified_at: null },
      { ...activeDiscordProfile, discord_verified_at: "not-a-time" },
      {
        ...activeDiscordProfile,
        discord_verified_at: new Date(now + 1).toISOString(),
      },
      {
        ...activeDiscordProfile,
        discord_verified_at: new Date(now - MEMBER_VERIFICATION_MAX_AGE_MS - 1)
          .toISOString(),
      },
    ]
  ) {
    assert(
      discordVerificationNeedsRefresh(profile, "1234567890", now),
      `Discord evidence should refresh: ${JSON.stringify(profile)}`,
    );
  }

  assert(
    !discordVerificationNeedsRefresh(
      {
        ...activeDiscordProfile,
        has_required_discord_roles: false,
        discord_verified_at: null,
        discord_checked_at: new Date(now - 1).toISOString(),
      },
      "1234567890",
      now,
    ),
    "a recent role-missing result should not poll Discord repeatedly",
  );

  assert(
    discordVerificationNeedsRefresh(
      {
        ...activeDiscordProfile,
        has_required_discord_roles: false,
        discord_verified_at: null,
        discord_checked_at: new Date(
          now - DISCORD_NEGATIVE_RECHECK_AFTER_MS,
        ).toISOString(),
      },
      "1234567890",
      now,
    ),
    "a role-missing result should become refreshable after the negative cooldown",
  );

  for (const member_status of ["suspended", "archived"]) {
    assert(
      !discordVerificationNeedsRefresh(
        { ...activeDiscordProfile, member_status, discord_checked_at: null },
        "1234567890",
        now,
      ),
      `${member_status} members should fail closed without a Discord refresh`,
    );
  }
});

Deno.test("current Social access accepts an exact recently verified Discord identity", () => {
  const access = currentMemberAccess({
    profile: activeDiscordProfile,
    verification: null,
    trustedDiscordUserId: "1234567890",
    nowMs: now,
  });

  assert(
    access.eligible && access.discordVerified && !access.manualApproved,
    "Discord access should pass",
  );
});

Deno.test("current Social access rejects inactive, stale, role-missing, and mismatched Discord members", () => {
  const cases = [
    { ...activeDiscordProfile, member_status: "pending" },
    { ...activeDiscordProfile, member_status: "suspended" },
    { ...activeDiscordProfile, member_status: "archived" },
    { ...activeDiscordProfile, has_required_discord_roles: false },
    {
      ...activeDiscordProfile,
      discord_verified_at: new Date(now - MEMBER_VERIFICATION_MAX_AGE_MS - 1)
        .toISOString(),
    },
  ];

  for (const profile of cases) {
    const access = currentMemberAccess({
      profile,
      verification: null,
      trustedDiscordUserId: "1234567890",
      nowMs: now,
    });
    assert(
      !access.eligible,
      `profile should fail closed: ${JSON.stringify(profile)}`,
    );
  }

  const mismatch = currentMemberAccess({
    profile: activeDiscordProfile,
    verification: null,
    trustedDiscordUserId: "different-user",
    nowMs: now,
  });
  assert(
    !mismatch.eligible,
    "mismatched Discord identities should fail closed",
  );
});

Deno.test("current Social access accepts only active, unexpired manual approval", () => {
  const approved = {
    gallery_access_status: "approved",
    gallery_access_verified_at: new Date(now - 1000).toISOString(),
    gallery_access_expires_at: new Date(now + 1000).toISOString(),
  };
  const access = currentMemberAccess({
    profile: { member_status: "active" },
    verification: approved,
    trustedDiscordUserId: null,
    nowMs: now,
  });
  assert(
    access.eligible && access.manualApproved && !access.discordVerified,
    "manual access should pass",
  );

  for (
    const verification of [
      { ...approved, gallery_access_status: "revoked" },
      { ...approved, gallery_access_status: "rejected" },
      { ...approved, gallery_access_status: "expired" },
      {
        ...approved,
        gallery_access_expires_at: new Date(now - 1).toISOString(),
      },
      {
        ...approved,
        gallery_access_verified_at: new Date(now + 1).toISOString(),
      },
    ]
  ) {
    const denied = currentMemberAccess({
      profile: { member_status: "active" },
      verification,
      trustedDiscordUserId: null,
      nowMs: now,
    });
    assert(
      !denied.eligible,
      `manual verification should fail closed: ${JSON.stringify(verification)}`,
    );
  }
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
