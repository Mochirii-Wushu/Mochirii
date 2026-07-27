import {
  currentMemberAccess,
  MEMBER_VERIFICATION_MAX_AGE_MS,
} from "./member-access-policy.ts";

const now = Date.parse("2026-07-27T12:00:00.000Z");
const activeDiscordProfile = {
  member_status: "active",
  discord_user_id: "1234567890",
  has_required_discord_roles: true,
  discord_verified_at: new Date(now - MEMBER_VERIFICATION_MAX_AGE_MS)
    .toISOString(),
};

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
