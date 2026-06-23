import { readFileSync } from "node:fs";

const actionPath = "supabase/functions/mochi-social-alpha-action/index.ts";
const sharedPath = "supabase/functions/_shared/mochi-social-alpha.ts";
const sessionPath = "supabase/functions/mochi-social-alpha-session/index.ts";
const progressPath = "supabase/functions/mochi-social-alpha-progress/index.ts";
const migrationPath = "supabase/migrations/20260610090000_add_mochi_social_alpha.sql";
const unityMigrationPath = "supabase/migrations/20260621120000_add_mochi_social_unity_room.sql";
const explicitGrantsPath = "supabase/migrations/20260622204823_add_mochi_social_alpha_explicit_grants.sql";

const action = readFileSync(actionPath, "utf8");
const shared = readFileSync(sharedPath, "utf8");
const session = readFileSync(sessionPath, "utf8");
const progress = readFileSync(progressPath, "utf8");
const migration = readFileSync(migrationPath, "utf8");
const unityMigration = readFileSync(unityMigrationPath, "utf8");
const explicitGrants = readFileSync(explicitGrantsPath, "utf8");

const expectedActions = [
  "chat.send",
  "emote.send",
  "unity.character.created",
  "unity.character.updated",
  "unity.pet.interaction",
  "unity.pet.state_saved",
  "unity.room.joined",
  "unity.room.left",
];

for (const actionType of expectedActions) {
  assertIncludes(actionPath, action, `"${actionType}"`);
}

for (const forbiddenAction of [
  "market.fixed_list",
  "market.guild_receipt",
  "trade.direct_offer",
  "trade.exchange_accord",
  "chain.withdraw_request",
  "chain.deposit_request",
  "chain.operation_update",
]) {
  assert(!action.includes(`"${forbiddenAction}"`), `${actionPath} must not accept ${forbiddenAction} during the shared-room alpha.`);
}

assertIncludes(sharedPath, shared, 'Deno.env.get("MOCHI_SOCIAL_GAME_SERVER_TOKEN")');
assertIncludes(sharedPath, shared, 'req.headers.get("x-mochi-social-server-token")');
assertIncludes(sharedPath, shared, "expected && provided && expected === provided");
assertIncludes(sharedPath, shared, "invalid_game_server_token");
assertIncludes(sharedPath, shared, 'UNITY_ROOM_KEY = "jade-lantern-room-alpha"');
assertIncludes(sharedPath, shared, 'UNITY_SHARED_PET_KEY = "lirabao"');
assertIncludes(sharedPath, shared, 'UNITY_SHARED_PET_DISPLAY_NAME = "Lirabao"');
assertIncludes(sharedPath, shared, 'UNITY_CUSTOM_ID_PREFIX = "mochirii:"');
assertIncludes(sharedPath, shared, "upsertSharedPetSnapshot");
assertIncludes(sharedPath, shared, "upsertUnityPlayerLink");
assertIncludes(sharedPath, shared, "customId !== unityCustomId(input.userId)");
assertIncludes(sharedPath, shared, "invalid_unity_custom_id");
assertIncludes(sharedPath, shared, "roomKey !== UNITY_ROOM_KEY");
assertIncludes(sharedPath, shared, "invalid_unity_room");
assertIncludes(sharedPath, shared, 'if (petKey !== UNITY_SHARED_PET_KEY || roomKey !== UNITY_ROOM_KEY)');
assertIncludes(sharedPath, shared, "UNITY_SHARED_PET_STATES");
assertIncludes(sharedPath, shared, "UNITY_SHARED_PET_MOODS");
assertIncludes(sharedPath, shared, "isValidSharedPetState");
assertIncludes(sharedPath, shared, "state.displayName === UNITY_SHARED_PET_DISPLAY_NAME");
assertIncludes(sharedPath, shared, 'UNITY_SHARED_PET_MOODS.has(String(state.mood || ""))');
assertIncludes(sharedPath, shared, 'UNITY_SHARED_PET_STATES.has(String(state.state || ""))');

assertBefore(actionPath, action, "const serverAccess = requireGameServer(req);", "const adminClient = createAdminClient();");
assertBefore(actionPath, action, "if (!serverAccess.ok) return serverAccess.response;", "const bodyResult = await readJsonBody(req);");
assertBefore(actionPath, action, '.from("mochi_social_ledger_events")', 'if (type === "chat.send")');
assertBefore(actionPath, action, "if (existingLedger)", 'if (type === "chat.send")');

assertRegex(actionPath, action, /data:\s*{\s*requestId,\s*type,\s*duplicate:\s*true,\s*noRealValue:\s*true\s*}/s);
assertIncludes(actionPath, action, "progress: normalizeAlphaProgressSnapshot(snapshot)");
assertIncludes(actionPath, action, "upsertAlphaProgressSnapshot(adminClient");
assertIncludes(actionPath, action, "upsertSharedPetSnapshot(adminClient");
assertIncludes(actionPath, action, 'type === "unity.pet.state_saved"');
assertIncludes(actionPath, action, "sharedPet: sharedPetResult?.snapshot ?? null");
assertRegex(actionPath, action, /delta:\s*{\s*\.\.\.payload,\s*noRealValue:\s*true\s*}/s);
assertIncludes(actionPath, action, "noRealValue: true");

for (const forbidden of [
  "chainNetwork",
  "VALID_CHAIN_STATUSES",
  "CERTIFICATE_ELIGIBLE_SPIRITS",
  "applyFinalizedChainInventory",
  "chain_request_",
  "enjin_transaction_uuid",
  "enjin_listing_id",
  "extrinsicHash",
]) {
  assert(!action.includes(forbidden), `${actionPath} must not include inactive chain/market authority: ${forbidden}.`);
}

assert(!session.includes("chainNetwork"), `${sessionPath} must not expose chain network metadata.`);
assert(!progress.includes("chainNetwork"), `${progressPath} must not expose chain network metadata.`);

for (const needle of [
  "mochi_social_ledger_events",
  "mochi_social_progress_snapshots",
  "request_id text",
  "mochi_social_ledger_request_idx",
  "mochi_social_progress_updated_idx",
  "mochi_social_ledger_read_own",
  "mochi_social_progress_read_own",
]) {
  assertIncludes(migrationPath, migration, needle);
}

for (const needle of [
  "mochi_social_unity_players",
  "mochi_social_shared_pet_snapshots",
  "user_id uuid primary key references auth.users(id) on delete cascade",
  "unity_player_id text not null unique",
  "custom_id text not null unique",
  "room_key text not null default 'jade-lantern-room-alpha'",
  "check (pet_key = 'lirabao')",
  "alter table public.mochi_social_unity_players enable row level security",
  "alter table public.mochi_social_shared_pet_snapshots enable row level security",
  "grant select on public.mochi_social_unity_players to authenticated",
  "grant select on public.mochi_social_shared_pet_snapshots to authenticated",
  "grant select, insert, update, delete on public.mochi_social_unity_players to service_role",
  "grant select, insert, update, delete on public.mochi_social_shared_pet_snapshots to service_role",
  "mochi_social_unity_players_read_own",
  "mochi_social_shared_pet_read_authenticated",
]) {
  assertIncludes(unityMigrationPath, unityMigration, needle);
}

for (const needle of [
  "grant select on table public.mochi_social_unity_players to authenticated",
  "grant select on table public.mochi_social_shared_pet_snapshots to authenticated",
  "grant select, insert, update, delete on table public.mochi_social_unity_players to service_role",
  "grant select, insert, update, delete on table public.mochi_social_shared_pet_snapshots to service_role",
]) {
  assertIncludes(explicitGrantsPath, explicitGrants, needle);
}

for (const forbidden of [/MAINNET/i, /cashout/i, /price_usd/i, /priceUsd/i, /fiat/i, /wallet_seed/i, /service_role/i]) {
  assert(!forbidden.test(action), `${actionPath} contains forbidden preview/authority term: ${forbidden}.`);
}

console.log("Mochi Social Edge authority check passed.");

function assertIncludes(label, text, needle) {
  assert(text.includes(needle), `${label} is missing ${needle}.`);
}

function assertRegex(label, text, pattern) {
  assert(pattern.test(text), `${label} does not match ${pattern}.`);
}

function assertBefore(label, text, first, second) {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  assert(firstIndex >= 0, `${label} is missing ${first}.`);
  assert(secondIndex >= 0, `${label} is missing ${second}.`);
  assert(firstIndex < secondIndex, `${label} should have ${first} before ${second}.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
