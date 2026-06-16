import { readFileSync } from "node:fs";

const actionPath = "supabase/functions/mochi-social-alpha-action/index.ts";
const sharedPath = "supabase/functions/_shared/mochi-social-alpha.ts";
const migrationPath = "supabase/migrations/20260610090000_add_mochi_social_alpha.sql";

const action = readFileSync(actionPath, "utf8");
const shared = readFileSync(sharedPath, "utf8");
const migration = readFileSync(migrationPath, "utf8");

const expectedActions = [
  "chat.send",
  "emote.send",
  "spirit.starter_vow",
  "spirit.capture",
  "spirit.capture_rite",
  "spirit.route_invite",
  "world.route_mastery",
  "world.route_patrol",
  "spirit.habitat_bond",
  "spirit.sanctuary_rite",
  "spirit.research",
  "spirit.compendium_complete",
  "spirit.roster_archive",
  "spirit.care_cycle",
  "spirit.temperament_concord",
  "spirit.field_almanac",
  "world.route_ecology",
  "world.weather_veil",
  "world.encounter_rotation",
  "world.encounter_atlas",
  "spirit.habitat_census",
  "item.craft_writ",
  "world.route_waystone",
  "world.route_charter",
  "spirit.nurture_rite",
  "spirit.recovery_tea",
  "spirit.kinship_album",
  "spirit.nursery_grove",
  "spirit.bloom_ascendance",
  "spirit.lineage_register",
  "item.bond_gift",
  "spirit.name_banner",
  "item.provision_satchel",
  "item.provision_catalog",
  "item.battle_kit",
  "item.remedy_pouch",
  "quest.ledger_record",
  "story.dialogue_scroll",
  "spirit.roster_cabinet",
  "spirit.blossom_cradle",
  "guild.commission_complete",
  "guild.social_rally",
  "guild.wayfarer_chronicle",
  "guild.ascension_trial",
  "spirit.attune",
  "spirit.bond",
  "spirit.care",
  "spirit.journal",
  "world.expedition",
  "spirit.technique",
  "spirit.technique_loadout",
  "battle.technique_codex",
  "spirit.trait_attune",
  "spirit.relic_attune",
  "battle.tactic_scroll",
  "guild.rank_trial",
  "spirit.growth_rite",
  "party.set",
  "party.harmony_form",
  "battle.harmony_trial",
  "battle.team_spar_match",
  "battle.mentor_challenge",
  "battle.dojo_ladder",
  "battle.sifu_council",
  "battle.summit_circuit",
  "battle.battle_chronicle",
  "battle.tournament_bracket",
  "battle.rival_circle",
  "story.chapter_complete",
  "guild.insignia_case",
  "battle.condition_weave",
  "battle.affinity_trial",
  "battle.affinity_matrix",
  "battle.spar_ladder",
  "spirit.train",
  "spirit.raise",
  "quest.accept",
  "quest.progress",
  "market.fixed_list",
  "market.guild_receipt",
  "trade.direct_offer",
  "trade.exchange_accord",
  "chain.withdraw_request",
  "chain.deposit_request",
  "chain.operation_update",
];

for (const actionType of expectedActions) {
  assertIncludes(actionPath, action, `"${actionType}"`);
}

assertIncludes(sharedPath, shared, 'Deno.env.get("MOCHI_SOCIAL_GAME_SERVER_TOKEN")');
assertIncludes(sharedPath, shared, 'req.headers.get("x-mochi-social-server-token")');
assertIncludes(sharedPath, shared, "expected && provided && expected === provided");
assertIncludes(sharedPath, shared, "invalid_game_server_token");

assertBefore(actionPath, action, "const serverAccess = requireGameServer(req);", "const adminClient = createAdminClient();");
assertBefore(actionPath, action, "if (!serverAccess.ok) return serverAccess.response;", "const bodyResult = await readJsonBody(req);");
assertBefore(actionPath, action, '.from("mochi_social_ledger_events")', 'if (type === "chat.send")');
assertBefore(actionPath, action, "if (existingLedger)", 'if (type === "chat.send")');
assertBefore(actionPath, action, 'if (type === "chain.operation_update")', "const ledgerError = await recordLedgerEvent");

assertRegex(actionPath, action, /data:\s*{\s*requestId,\s*type,\s*duplicate:\s*true,\s*noRealValue:\s*true,\s*chainNetwork:\s*"CANARY"\s*}/s);
assertIncludes(actionPath, action, "progress: normalizeAlphaProgressSnapshot(snapshot)");
assertIncludes(actionPath, action, "upsertAlphaProgressSnapshot(adminClient");
assertRegex(actionPath, action, /delta:\s*{\s*\.\.\.payload,\s*noRealValue:\s*true,\s*chainNetwork:\s*"CANARY"\s*}/s);
assertRegex(actionPath, action, /VALID_CHAIN_STATUSES\s*=\s*new Set\(\[\s*"pending",\s*"broadcast",\s*"finalized",\s*"failed",\s*"abandoned",\s*"timeout"\s*\]\)/s);
assertRegex(actionPath, action, /CERTIFICATE_ELIGIBLE_SPIRITS\s*=\s*new Set\(\["lirabao"\]\)/);

for (const needle of [
  'network: "CANARY"',
  "enjin_transaction_uuid",
  "enjin_listing_id",
  "noRealValue: true",
  'chainNetwork: "CANARY"',
  "finalityRequired: true",
  "chain_request_missing",
  "chain_request_owner_mismatch",
  "extrinsicHash",
  'if (nextStatus === "finalized") updateRow.finalized_at',
  'if (nextStatus === "finalized" && !wasFinalized)',
]) {
  assertIncludes(actionPath, action, needle);
}

assertBefore(
  actionPath,
  action,
  'if (nextStatus === "finalized" && !wasFinalized)',
  "const result = await applyFinalizedChainInventory",
);

const finalizedInventoryCalls = countOccurrences(action, "applyFinalizedChainInventory(");
assert(
  finalizedInventoryCalls === 2,
  `${actionPath} should call applyFinalizedChainInventory only once, plus the function declaration; found ${finalizedInventoryCalls}.`,
);

const inventorySection = sectionFrom(action, "async function applyFinalizedChainInventory");
assertIncludes(`${actionPath} finalized inventory section`, inventorySection, 'if (operationType === "chain.deposit_request")');
assertIncludes(`${actionPath} finalized inventory section`, inventorySection, 'location: "hot"');
assertIncludes(`${actionPath} finalized inventory section`, inventorySection, 'if (operationType === "chain.withdraw_request")');
assertIncludes(`${actionPath} finalized inventory section`, inventorySection, 'location: "cold"');

for (const needle of [
  "mochi_social_ledger_events",
  "mochi_social_spirits",
  "mochi_social_progress_snapshots",
  "request_id text",
  "mochi_social_ledger_request_idx",
  "mochi_social_progress_updated_idx",
  "mochi_social_ledger_read_own",
  "mochi_social_progress_read_own",
  "mochi_social_chain_operations",
  "request_id text not null unique",
  "network text not null default 'CANARY' check (network = 'CANARY')",
  "status text not null default 'pending' check (status in ('pending', 'broadcast', 'finalized', 'failed', 'abandoned', 'timeout'))",
  "finalized_at timestamptz",
]) {
  assertIncludes(migrationPath, migration, needle);
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

function sectionFrom(text, marker) {
  const index = text.indexOf(marker);
  assert(index >= 0, `Missing section marker ${marker}.`);
  return text.slice(index);
}

function countOccurrences(text, needle) {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(needle, index)) >= 0) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
