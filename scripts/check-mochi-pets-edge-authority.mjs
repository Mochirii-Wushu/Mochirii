import { readFileSync } from "node:fs";

const actionPath = "supabase/functions/mochi-pets-alpha-action/index.ts";
const sharedPath = "supabase/functions/_shared/mochi-pets-alpha.ts";
const serviceRolePath = "supabase/functions/_shared/supabase-service-role.ts";
const sessionPath = "supabase/functions/mochi-pets-alpha-session/index.ts";
const progressPath = "supabase/functions/mochi-pets-alpha-progress/index.ts";
const migrationPath = "supabase/migrations/20260704120856_rename_mochi_pets_internal_prefix.sql";

const action = readFileSync(actionPath, "utf8");
const shared = readFileSync(sharedPath, "utf8");
const serviceRole = readFileSync(serviceRolePath, "utf8");
const session = readFileSync(sessionPath, "utf8");
const progress = readFileSync(progressPath, "utf8");
const migration = readFileSync(migrationPath, "utf8");

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

assertIncludes(sharedPath, shared, 'Deno.env.get("MOCHI_PETS_GAME_SERVER_TOKEN")');
assertIncludes(sharedPath, shared, 'req.headers.get("x-mochi-pets-server-token")');
assertIncludes(sharedPath, shared, "expected && provided && expected === provided");
assertIncludes(sharedPath, shared, "invalid_game_server_token");
assertIncludes(sharedPath, shared, './supabase-service-role.ts');
assertIncludes(sharedPath, shared, "getServiceRoleKey()");
for (const forbidden of [
  "export function getServiceRoleKey",
  'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")',
  'Deno.env.get("SUPABASE_SECRET_KEYS")',
]) {
  assert(!shared.includes(forbidden), `${sharedPath} must centralize service-role resolution: ${forbidden}.`);
}
for (const required of [
  'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")',
  'Deno.env.get("SUPABASE_SECRET_KEYS")',
  "resolveServiceRoleKey",
]) {
  assertIncludes(serviceRolePath, serviceRole, required);
}
assert(!serviceRole.includes("console."), `${serviceRolePath} must not log secret-resolution state.`);
assertIncludes(sharedPath, shared, 'UNITY_ROOM_KEY = "jade-lantern-room-alpha"');
assertIncludes(sharedPath, shared, 'UNITY_SHARED_PET_KEY = "lirabao"');
assertIncludes(sharedPath, shared, 'UNITY_SHARED_PET_DISPLAY_NAME = "Lirabao"');
assertIncludes(sharedPath, shared, 'UNITY_CUSTOM_ID_PREFIX = "mochirii:"');
assertIncludes(sharedPath, shared, "normalizeMemberUserId");
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
assertIncludes(sharedPath, shared, "invalid_shared_pet_actor");
assertIncludes(sharedPath, shared, "state.lastInteractionBy");
assertIncludes(sharedPath, shared, "state.writeLock");
assertIncludes(sharedPath, shared, "state.lastInteractionUnixSeconds");

assertBefore(actionPath, action, "const serverAccess = requireGameServer(req);", "const adminClient = createAdminClient();");
assertBefore(actionPath, action, "if (!serverAccess.ok) return serverAccess.response;", "const bodyResult = await readJsonBody(req);");
assertBefore(actionPath, action, '.from("mochi_pets_ledger_events")', 'if (type === "chat.send")');
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
  "mochi_pets_alpha_testers",
  "mochi_pets_terms_acknowledgements",
  "mochi_pets_profiles",
  "mochi_pets_ledger_events",
  "mochi_pets_progress_snapshots",
  "mochi_pets_ledger_request_idx",
  "mochi_pets_progress_updated_idx",
  "mochi_pets_ledger_read_own",
  "mochi_pets_progress_read_own",
  "mochi_pets_unity_players",
  "mochi_pets_shared_pet_snapshots",
  "mochi_pets_unity_players_read_own",
  "mochi_pets_shared_pet_read_authenticated",
  "('mochi_pets_unity_players', 'select', 'authenticated')",
  "('mochi_pets_shared_pet_snapshots', 'select', 'authenticated')",
  "('mochi_pets_unity_players', 'select, insert, update, delete', 'service_role')",
  "('mochi_pets_shared_pet_snapshots', 'select, insert, update, delete', 'service_role')",
]) {
  assertIncludes(migrationPath, migration, needle);
}

for (const forbidden of [/MAINNET/i, /cashout/i, /price_usd/i, /priceUsd/i, /fiat/i, /wallet_seed/i, /service_role/i]) {
  assert(!forbidden.test(action), `${actionPath} contains forbidden preview/authority term: ${forbidden}.`);
}

console.log("Mochi Pets Edge authority check passed.");

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
