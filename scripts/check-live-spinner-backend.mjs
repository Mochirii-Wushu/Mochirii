import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const migrationPath =
  "supabase/migrations/20260726180052_add_private_live_spinner.sql";
const foreignKeyIndexMigrationPath =
  "supabase/migrations/20260726213000_add_spinner_foreign_key_indexes.sql";
const files = {
  migration: migrationPath,
  foreignKeyIndexMigration: foreignKeyIndexMigrationPath,
  config: "supabase/config.toml",
  index: "supabase/functions/spinner-live-session/index.ts",
  engine: "supabase/functions/_shared/spinner-live.ts",
  authority: "supabase/functions/_shared/spinner-authority.ts",
  cors: "supabase/functions/_shared/cors.ts",
  dispatcher: "supabase/functions/reaper-spinner-dispatch/index.ts",
  dispatcherShared: "supabase/functions/_shared/spinner-discord-outbox.ts",
  test: "supabase/functions/_shared/spinner-live_test.ts",
  sqlTest: "supabase/tests/private_live_spinner_test.sql",
};

function read(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    failures.push(`${rel}: missing required file.`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function includes(label, text, snippet) {
  if (!text.includes(snippet)) {
    failures.push(`${label}: expected snippet not found: ${snippet}`);
  }
}

function excludes(label, text, pattern, message) {
  if (pattern.test(text)) failures.push(`${label}: ${message}`);
}

const migration = read(files.migration);
const foreignKeyIndexMigration = read(files.foreignKeyIndexMigration);
const config = read(files.config);
const index = read(files.index);
const engine = read(files.engine);
const authority = read(files.authority);
const cors = read(files.cors);
const dispatcher = read(files.dispatcher);
const dispatcherShared = read(files.dispatcherShared);
const denoTest = read(files.test);
const sqlTest = read(files.sqlTest);

[
  "create index spinner_commands_actor_id_idx\non public.spinner_commands (actor_id);",
  "create index spinner_draw_receipts_actor_id_idx\non public.spinner_draw_receipts (actor_id);",
  "create index spinner_live_state_updated_by_idx\non public.spinner_live_state (updated_by);",
].forEach((snippet) =>
  includes("spinner foreign-key indexes", foreignKeyIndexMigration, snippet)
);

for (
  const table of [
    "spinner_live_state",
    "spinner_commands",
    "spinner_draw_receipts",
    "spinner_discord_outbox",
    "spinner_moderator_authorizations",
  ]
) {
  includes(
    "migration",
    migration,
    `create table if not exists public.${table}`,
  );
  includes(
    "migration",
    migration,
    `alter table public.${table} enable row level security`,
  );
  includes(
    "migration",
    migration,
    `revoke all on table public.${table} from public, anon, authenticated`,
  );
  includes(
    "migration",
    migration,
    `grant all on table public.${table} to service_role`,
  );
  includes(
    "migration",
    migration,
    `drop policy if exists service_only_default_deny on public.${table}`,
  );
}

for (
  const signature of [
    "spinner_reserve_command(uuid, text, uuid, bigint, text)",
    "spinner_stage_command(uuid, jsonb)",
    "spinner_reject_unstaged_spin(uuid)",
    "spinner_apply_command(uuid)",
    "spinner_recover_commands()",
    "spinner_finalize_reveal()",
    "spinner_cleanup_expired(timestamptz)",
    "spinner_claim_discord_outbox(uuid, integer)",
    "spinner_finish_discord_outbox_claim(uuid, uuid, text, text, text, timestamptz)",
  ]
) {
  includes(
    "service-only command RPC",
    migration,
    `revoke all on function public.${signature} from public, anon, authenticated`,
  );
  includes(
    "service-only command RPC",
    migration,
    `grant execute on function public.${signature} to service_role`,
  );
}

[
  "revision = next_revision",
  "expected_revision = p_expected_revision",
  "command_id_conflict",
  "command_in_progress",
  "staged_payload",
  "lease_expires_at",
  "unstaged_lease_expired",
  "recoveredReservation",
  "spin_result_not_durable",
  "spinner_recover_commands",
  "idempotentReplay",
  "for update",
].forEach((snippet) =>
  includes("monotonic idempotent commands", migration, snippet)
);

[
  "uniform-uint32-rejection-v1",
  "sampled_words",
  "accepted_word",
  "rejection_limit",
  "spinner_draw_receipts_immutable",
  "Spinner draw receipts must be retained for 30 days.",
  "expires_at >= created_at + interval '30 days'",
  "receipt_timestamp_value",
  "started_at_value <> receipt_timestamp_value + interval '2 seconds'",
  "spinner_cleanup_expired",
  "spinner_moderator_authorizations",
  "expires_at <= verified_at + interval '5 minutes'",
].forEach((snippet) =>
  includes("immutable 30-day receipts", migration, snippet)
);

if (
  /delete from public\.spinner_discord_outbox[\s\S]*?spinner_live_state[\s\S]*?get diagnostics outbox_count/i
    .test(migration)
) {
  failures.push(
    "retention cleanup: an active live-state pointer must not extend expired outbox retention.",
  );
}
if (
  /delete from public\.spinner_draw_receipts[\s\S]*?spinner_live_state[\s\S]*?get diagnostics receipt_count/i
    .test(migration)
) {
  failures.push(
    "retention cleanup: an active live-state pointer must not extend expired receipt retention.",
  );
}

[
  "spinner_discord_outbox_draw_channel_key unique (draw_id, channel_key)",
  "channel_key = 'raffle_spins' and channel_id = '1468667003366674721'",
  "discord_message_id text",
  "start_pending",
  "result_waiting",
  "result_pending",
  "claim_token uuid",
  "for update skip locked",
  "claim_expires_at",
  "delivery_attempts_exhausted",
  "enforce_nonce",
  "allowed_mentions,parse",
  "allowed_mentions,replied_user",
  "spinner_discord_outbox_queue_dispatch",
  "spinner_invoke_reaper_dispatcher",
  "net.http_post",
  "spinner-maintenance-every-5-seconds",
  "'5 seconds'",
  "reaper_spinner_dispatch_secret",
].forEach((snippet) =>
  includes("single-message Discord outbox", migration, snippet)
);

[
  "getRandomValues",
  "Math.floor(UINT32_RANGE / count) * count",
  "sampledWords.push(word)",
  "word < rejectionLimit",
  "SPINNER_START_DELAY_MS = 2_000",
  "SPINNER_DEFAULT_DURATION_MS = 4_800",
  "startRotation",
  "finalRotation",
  "https://mochirii.com/spinner",
  "allowed_mentions",
  "A live roster supports 0–",
  "A draw requires",
  'normalize("NFKC").trim()',
  '.toLocaleUpperCase("und")',
  "SPINNER_MAX_COMMAND_BODY_BYTES = 64 * 1_024",
  "readBoundedSpinnerJsonObject",
].forEach((snippet) => includes("server draw engine", engine, snippet));

excludes(
  "server draw engine",
  engine,
  /Math\.random\s*\(/,
  "Math.random must never be used.",
);
excludes(
  "spinner Edge function",
  index,
  /https:\/\/discord(?:app)?\.com|discordFetch\s*\(/i,
  "Discord delivery must stay in the outbox; this function must not send messages.",
);
excludes(
  "spinner backend",
  `${migration}\n${index}\n${engine}`,
  /realtime\.send|realtime\.messages|wss:\/\//i,
  "the browser contract is durable same-origin polling, not a direct Realtime channel.",
);

[
  'req.method === "GET"',
  'req.method === "POST"',
  'type SpinnerAction = "set_roster" | "spin" | "reset"',
  "requireSpinnerController(req)",
  "authenticateSpinnerUser(req)",
  "requireActiveVerifiedSpinnerMember(req)",
  "resolveModeratorAuthorizationRoute(",
  "requestedSpinnerAccessMode(req)",
  "spinner_finalize_reveal",
  "spinner_recover_commands",
  "spinner_reserve_command",
  "spinner_stage_command",
  "spinner_reject_unstaged_spin",
  "spinner_apply_command",
  "if-none-match",
  "ETag",
  "serverNow",
  "X-Mochirii-Server-Time",
  'SPINNER_VARY = "Authorization, X-Mochirii-Spinner-Mode"',
  'mode === "controller" && snapshot.drawId',
  'snapshot.phase !== "revealed"',
  '.from("spinner_draw_receipts")',
  "buildSnapshotResponseData(",
  '.select("receipt,command_id")',
  "appliedCommandResponse(applied, commandId)",
  '.from("spinner_moderator_authorizations")',
  "rememberModeratorAuthorization(",
  "readBoundedSpinnerJsonObject(req)",
  "rejectUnstagedSpin(moderator.adminClient, commandId)",
].forEach((snippet) => includes("Edge HTTP contract", index, snippet));

includes(
  "protected response variance",
  cors,
  "existing ? `${existing}, ${value}` : value",
);

const reservePosition = index.indexOf('"spinner_reserve_command"');
const randomPosition = index.indexOf("createLiveDrawPlan(");
const stagePosition = index.indexOf('"spinner_stage_command"');
const applyPosition = index.lastIndexOf('"spinner_apply_command"');
if (
  !(reservePosition >= 0 && randomPosition > reservePosition &&
    stagePosition > randomPosition && applyPosition > stagePosition)
) {
  failures.push(
    "Edge draw ordering: reserve must precede selection, which must be staged before transactional apply.",
  );
}

[
  'member_status === "active"',
  "RECENT_VERIFICATION_MS",
  'gallery_access_status === "approved"',
  "gallery_access_verified_at",
  "gallery_access_expires_at",
  "member_auth_identities",
  '.eq("active", true)',
  "resolveDiscordIdentity(",
  "profileMatchesTrustedDiscordIdentity(",
  "adminClient.auth.getUser(",
  "accessToken",
  "resolveModeratorAuthorizationRoute",
].forEach((snippet) =>
  includes("verified member authority", authority, snippet)
);

[
  "[functions.spinner-live-session]",
  "verify_jwt = true",
  'import_map = "./functions/spinner-live-session/deno.json"',
].forEach((snippet) => includes("Supabase function config", config, snippet));

[
  "[functions.reaper-spinner-dispatch]",
  "verify_jwt = false",
  'import_map = "./functions/reaper-spinner-dispatch/deno.json"',
].forEach((snippet) => includes("Reaper dispatcher config", config, snippet));

[
  "REAPER_SPINNER_DISPATCH_SECRET",
  "DISCORD_RAFFLE_CHANNEL_ID",
  "spinner_claim_discord_outbox",
  "spinner_finish_discord_outbox_claim",
  "dispatchSpinnerOutboxRow",
  "constantTimeSecretEqual",
  "readBoundedJsonObject",
].forEach((snippet) =>
  includes("authorized Reaper dispatcher", dispatcher, snippet)
);

[
  'method: "POST"',
  'method: "PATCH"',
  "start_sent",
  "result_sent",
  "retry-after",
  "discord_network_error",
  "safeAllowedMentions",
  "SPINNER_DISPATCH_MAX_BODY_BYTES",
  'crypto.subtle.digest("SHA-256"',
].forEach((snippet) =>
  includes("idempotent Reaper delivery", dispatcherShared, snippet)
);

[
  "records rejection retries without modulo bias",
  "future synchronized timeline",
  "default live draw stays below five seconds",
  "controller polling can recover the current receipt while viewer polling cannot",
  "withhold winner fields",
  "no mentions",
  "recently verified guild members",
  "defaults to viewer authority and opts into moderator checks explicitly",
  "moderator polling cache expires at the five-minute revocation boundary",
  "POST controller authorization uses current cache and exact fallback at missing or expired boundaries",
  "spinner command JSON accepts the 64 KiB boundary and rejects declared or streamed overflow",
  "normalization matches the browser Unicode and whitespace contract",
  "repeated live spins keep rotations bounded and preserve winner geometry",
  "spinner polling preserves authorization and mode variance when CORS adds origin",
  "posts the live link once with an enforced nonce",
  "retries rate limits",
  "compares secrets without an early mismatch and caps request bodies",
].forEach((snippet) => includes("focused Deno tests", denoTest, snippet));

[
  "RLS is enabled on every authoritative spinner table",
  "browser roles cannot apply moderator commands",
  "receipt immutability trigger is enabled",
  "one outbox row is keyed by draw and semantic channel",
  "persisted spin reservation lost before staging is terminal so its exact command ID cannot resample",
  "an Edge failure terminalizes an unstaged spin so retry requires a new command ID",
  "exhausted delivery is failed deterministically instead of violating its attempt bound",
  "retention cleanup removes expired evidence after 30 days even when the live stage still points at that draw",
].forEach((snippet) => includes("focused pgTAP tests", sqlTest, snippet));

if (failures.length) {
  console.error("Live spinner backend validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Live spinner backend validation OK.");
