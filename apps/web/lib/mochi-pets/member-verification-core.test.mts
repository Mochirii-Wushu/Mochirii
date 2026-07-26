import assert from "node:assert/strict";
import { verifyMochiPetsMemberBearer } from "./member-verification-core.ts";

const memberId = "00000000-0000-4000-8000-000000000001";
const config = {
  token: "synthetic.member.token",
  supabaseUrl: "https://project.example",
  publishableKey: "synthetic-publishable-key",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const active = await verifyMochiPetsMemberBearer({
  ...config,
  fetchImpl: async (url, init) => {
    assert.equal(url, "https://project.example/functions/v1/verify-member-access");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${config.token}`);
    assert.equal(init?.body, '{"refreshDiscord":false}');
    assert.equal(init?.cache, "no-store");
    return response({
      ok: true,
      data: {
        galleryEligible: true,
        discordVerified: false,
        memberStatus: "active",
        profile: { id: memberId, member_status: "active" },
      },
    });
  },
});
assert.deepEqual(active, { ok: true, memberId });

assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => response({
      ok: false,
      data: {
        galleryEligible: true,
        discordVerified: true,
        memberStatus: "active",
        profile: { id: memberId, member_status: "active" },
      },
    }),
  }),
  { ok: false, status: 503 },
);

assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => response({ ok: false }, 401),
  }),
  { ok: false, status: 401 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => response({
      ok: true,
      data: {
        galleryEligible: false,
        discordVerified: false,
        memberStatus: "active",
        profile: { id: memberId, member_status: "active" },
      },
    }),
  }),
  { ok: false, status: 403 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => response({
      ok: true,
      data: {
        galleryEligible: false,
        discordVerified: false,
        profile: {
          id: memberId,
          member_status: "active",
          has_required_discord_roles: true,
          discord_verified_at: "2026-07-26T11:59:00.000Z",
        },
        memberStatus: "active",
      },
    }),
  }),
  { ok: false, status: 403 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => response({
      ok: true,
      data: {
        galleryEligible: true,
        discordVerified: true,
        memberStatus: "inactive",
        profile: {
          id: memberId,
          member_status: "active",
        },
      },
    }),
  }),
  { ok: false, status: 403 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({ ...config, token: "bad token" }),
  { ok: false, status: 401 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({ ...config, supabaseUrl: "" }),
  { ok: false, status: 503 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => response({
      ok: true,
      data: {
        galleryEligible: true,
        discordVerified: false,
        memberStatus: "active",
        profile: { id: "invalid", member_status: "active" },
      },
    }),
  }),
  { ok: false, status: 503 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => new Response("not-json", { status: 200 }),
  }),
  { ok: false, status: 503 },
);
assert.deepEqual(
  await verifyMochiPetsMemberBearer({
    ...config,
    fetchImpl: async () => new Response("x".repeat(64 * 1_024 + 1), { status: 200 }),
  }),
  { ok: false, status: 503 },
);

console.log("Mochi Pets member-verification core tests passed.");
