import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  config: "supabase/config.toml",
  function: "supabase/functions/reaper-discord-interactions/index.ts",
  sharedPendingContainment: "supabase/functions/_shared/pending-verification-containment.ts",
  memberSyncFunction: "supabase/functions/reaper-discord-member-sync/index.ts",
  memberSyncImportMap: "supabase/functions/reaper-discord-member-sync/deno.json",
  importMap: "supabase/functions/reaper-discord-interactions/deno.json",
  pendingOverwriteMigration: "supabase/migrations/20260612105232_add_reaper_pending_verification_overwrites.sql",
  commandRegistration: "scripts/register-reaper-pending-verification-command.mjs",
  rollbackScript: "scripts/rollback-reaper-pending-verification-overwrites.mjs",
  envExample: "supabase/functions/.env.example",
  supabaseReadme: "supabase/README.md",
  deploymentRunbook: "docs/instagram-gallery-publishing-deployment-runbook.md",
  pendingContainmentRunbook: "docs/reaper-pending-verification-containment.md",
  activationPacket: "docs/reaper-pending-verification-activation-packet.md",
};

const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required Reaper Discord Interactions file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertMatches(label, text, pattern, message) {
  if (!pattern.test(text)) failures.push(`${label}: ${message}`);
}

function assertNotMatches(label, text, pattern, message) {
  if (pattern.test(text)) failures.push(`${label}: ${message}`);
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const config = read(files.config);
const functionSource = read(files.function);
const sharedPendingContainment = read(files.sharedPendingContainment);
const memberSyncFunction = read(files.memberSyncFunction);
const memberSyncImportMap = read(files.memberSyncImportMap);
const importMap = read(files.importMap);
const pendingOverwriteMigration = read(files.pendingOverwriteMigration);
const commandRegistration = read(files.commandRegistration);
const rollbackScript = read(files.rollbackScript);
const envExample = read(files.envExample);
const supabaseReadme = read(files.supabaseReadme);
const deploymentRunbook = read(files.deploymentRunbook);
const pendingContainmentRunbook = read(files.pendingContainmentRunbook);
const activationPacket = read(files.activationPacket);

[
  '"check:reaper-discord-interactions"',
  '"check:reaper-pending-verification"',
  '"register:reaper-pending-verification-command"',
  '"rollback:reaper-pending-verification"',
].forEach((snippet) => assertIncludes("package.json", packageJson, snippet));
assertIncludes("check-all", checkAll, "check:reaper-discord-interactions");
assertIncludes("check-all", checkAll, "check:reaper-pending-verification");

[
  "[functions.reaper-discord-interactions]",
  "[functions.reaper-discord-member-sync]",
  "verify_jwt = false",
  'import_map = "./functions/reaper-discord-interactions/deno.json"',
  'entrypoint = "./functions/reaper-discord-interactions/index.ts"',
  'import_map = "./functions/reaper-discord-member-sync/deno.json"',
  'entrypoint = "./functions/reaper-discord-member-sync/index.ts"',
].forEach((snippet) => assertIncludes("supabase config", config, snippet));

[
  '"tweetnacl": "npm:tweetnacl@1.0.3"',
  '"@supabase/supabase-js": "npm:@supabase/supabase-js@2"',
  '"@supabase/functions-js/edge-runtime.d.ts": "jsr:@supabase/functions-js/edge-runtime.d.ts"',
].forEach((snippet) => assertIncludes("import map", importMap, snippet));

[
  '"@supabase/supabase-js": "npm:@supabase/supabase-js@2"',
  '"@supabase/functions-js/edge-runtime.d.ts": "jsr:@supabase/functions-js/edge-runtime.d.ts"',
].forEach((snippet) => assertIncludes("member sync import map", memberSyncImportMap, snippet));

[
  'import nacl from "tweetnacl";',
  "x-signature-ed25519",
  "x-signature-timestamp",
  "DISCORD_PUBLIC_KEY",
  "DISCORD_API_USER_AGENT",
  "nacl.sign.detached.verify",
  "INTERACTION_TYPE_PING",
  "INTERACTION_RESPONSE_PONG",
  "INTERACTION_RESPONSE_DEFERRED_CHANNEL_MESSAGE",
  "EdgeRuntime.waitUntil",
  "submit-discord-gallery-image",
  "x-mochirii-reaper-secret",
  "DISCORD_GALLERY_INGEST_SECRET",
  "DISCORD_APPLICATION_ID",
  "DISCORD_GUILD_ID",
  "DISCORD_GALLERY_CHANNEL_ID",
  "DISCORD_REQUIRED_ROLE_IDS",
  "share_to_instagram",
  "instagramOptIn",
  "allowedImageFilename",
  "!declaredMime && !filenameLooksImage",
  "mimeType: declaredMime",
  "subtitle",
  "caption",
  "Use this command in the gallery submissions channel.",
  "Refresh Discord verification on mochirii.com/account before submitting gallery images.",
  "sync-ranks",
  "sync-events",
  "sync-pending-verification",
  "MAX_PENDING_VERIFICATION_MUTATIONS",
  "PENDING_VERIFICATION_MANAGED_BY = \"reaper-pending-verification\"",
  "PENDING_VERIFICATION_AUDIT_REASON = \"Reaper pending verification containment\"",
  "processPendingVerificationSync",
  "fetchGuildMembers",
  "fetchGuildChannels",
  "buildPendingContainmentPlan(adminClient, channels, members)",
  "type: DISCORD_MEMBER_OVERWRITE_TYPE",
  "X-Audit-Log-Reason",
  "modeValue === \"apply\" && !confirm",
  "Pending verification containment apply requires Discord Manage Roles permission.",
  "PendingContainmentApplyError",
  "failedDiscordWriteCount",
  "skippedDiscordWriteCount",
  "INTERACTION_TYPE_MESSAGE_COMPONENT",
  "vote-status",
  "vote-leaderboard",
  "vote-reminder-preview",
  "voteDateFromCustomId",
  "recordVoteConfirmation",
  "allowed_mentions",
  "permissions: \"0\"",
  "hoist: false",
  "mentionable: false",
  "mode === \"apply\" && !confirm",
  "GUILD_SCHEDULE_URL",
  "CREATE_EVENTS_PERMISSION",
  "MANAGE_EVENTS_PERMISSION",
  "processEventSync",
  "discordCoverImage",
  "discordLocation",
  "discordEventId",
  "discordDuplicateEventIds",
  "discordRecurrenceRule",
  "scheduleAssetUrl",
  "recurrenceRule",
  "eventCoverImageData",
  "discordCoverVersion",
  "searchParams.set(\"v\", version)",
  "recurrence_rule",
  "by_n_weekday",
  "canonicalEventId",
  "duplicateEventIds",
  "existingByCanonical",
  "processDuplicateScheduledEvents",
  "disableDuplicateEventResource",
  "scheduled-events",
  'method: "DELETE"',
  "body.image",
  "entity_type: DISCORD_EVENT_ENTITY_EXTERNAL",
  "privacy_level: DISCORD_EVENT_PRIVACY_GUILD_ONLY",
  "reaper-event-sync",
  "discord_resources",
  "url: `https://discord.com/events/${EXPECTED_DISCORD_GUILD_ID}/${eventId}`",
].forEach((snippet) => assertIncludes("reaper-discord-interactions", functionSource, snippet));

[
  "PENDING_BASE_ROLE_ID = \"1468659807736299520\"",
  "VERIFIED_ROLE_ID = \"1078630751077142615\"",
  "PENDING_ALLOWED_CATEGORY_ID = \"1468658801388290048\"",
  "VIEW_CHANNEL_PERMISSION = 1n << 10n",
  "DISCORD_MEMBER_OVERWRITE_TYPE = 1",
  "MAX_PENDING_VERIFICATION_MUTATIONS",
  "PENDING_VERIFICATION_MANAGED_BY = \"reaper-pending-verification\"",
  "discord_managed_permission_overwrites",
  "isPendingVerificationTarget",
  "buildPendingContainmentPlan",
  "buildSingleMemberPendingContainmentPlan",
  "applyPendingContainmentPlan",
  "memberOverwrite",
  "manual member allow outside allowed tree",
  "manual member deny inside allowed tree",
  "Pending verification containment preview. No Discord permissions were changed.",
  "sync_type: \"role_check\"",
].forEach((snippet) => assertIncludes("shared pending containment", sharedPendingContainment, snippet));

[
  "reaper-discord-member-sync",
  "x-mochirii-reaper-member-sync-secret",
  "guildMemberAdd",
  "guildMemberUpdate",
  "fetchCurrentMember",
  "buildSingleMemberPendingContainmentPlan",
  "applyPendingContainmentPlan(adminClient, plan, writePendingDiscordOverwrite)",
  "MAX_PENDING_VERIFICATION_MUTATIONS",
  "source: \"gateway_member_event\"",
  "type: DISCORD_MEMBER_OVERWRITE_TYPE",
  "X-Audit-Log-Reason",
  "reportedRoleCount",
].forEach((snippet) => assertIncludes("reaper-discord-member-sync", memberSyncFunction, snippet));

[
  "COMMAND_NAME = \"sync-pending-verification\"",
  "default_member_permissions: MANAGE_ROLES_PERMISSION",
  "MANAGE_ROLES_PERMISSION = \"268435456\"",
  "dm_permission: false",
  "Dry run only",
  "method: existing ? \"PATCH\" : \"POST\"",
].forEach((snippet) => assertIncludes("command registration", commandRegistration, snippet));

[
  "EXPECTED_DISCORD_GUILD_ID = \"1078630751077142608\"",
  "PENDING_VERIFICATION_MANAGED_BY = \"reaper-pending-verification\"",
  "VIEW_CHANNEL_PERMISSION = 1n << 10n",
  "DISCORD_MEMBER_OVERWRITE_TYPE = 1",
  "const apply = args.has(\"--apply\")",
  "--confirm-guild=1078630751077142608",
  "Dry run only",
  "discord_managed_permission_overwrites",
  "owned_allow: \"0\"",
  "owned_deny: \"0\"",
].forEach((snippet) => assertIncludes("rollback script", rollbackScript, snippet));

[
  "create table if not exists public.discord_managed_permission_overwrites",
  "owned_allow text not null default '0'",
  "owned_deny text not null default '0'",
  "unique (guild_id, channel_id, discord_user_id, managed_by)",
  "alter table public.discord_managed_permission_overwrites enable row level security",
  "revoke all on table public.discord_managed_permission_overwrites from anon",
  "revoke all on table public.discord_managed_permission_overwrites from authenticated",
  "grant all on table public.discord_managed_permission_overwrites to service_role",
  "never store Discord tokens, webhook URLs, message content, or interaction tokens",
].forEach((snippet) => assertIncludes("pending overwrite migration", pendingOverwriteMigration, snippet));

[
  "/sync-pending-verification mode:<preview|apply> confirm:<true|false>",
  "member-specific permission overwrites",
  "VIEW_CHANNEL",
  "discord_managed_permission_overwrites",
  "Responses are ephemeral.",
  "reaper-discord-member-sync",
  "Do not request Message Content or Presence intents.",
  "https://docs.discord.com/developers/topics/permissions",
].forEach((snippet) => assertIncludes("pending containment runbook", pendingContainmentRunbook, snippet));

[
  "Reaper Pending Verification Activation Packet",
  "Approval-Required Live Mutations",
  "supabase db push --dry-run",
  "npm run register:reaper-pending-verification-command",
  "Discord-Native Safety Checklist",
  "/sync-pending-verification mode:preview confirm:false",
  "reaper-discord-member-sync",
  "x-mochirii-reaper-member-sync-secret",
  "npm run rollback:reaper-pending-verification",
  "Evidence Fields",
].forEach((snippet) => assertIncludes("activation packet", activationPacket, snippet));

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /public_url/,
  "discord_resources uses the url column; event sync must not write a non-existent public_url column.",
);

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /PENDING_HELPER_ROLE|pending-verification-helper|pending verification helper role/i,
  "pending verification containment must not introduce a helper role.",
);

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /members\/\$\{[^}]+\}\/roles/,
  "pending verification containment must not mutate member roles.",
);

assertNotMatches(
  "reaper-discord-member-sync",
  memberSyncFunction,
  /members\/\$\{[^}]+\}\/roles/,
  "Gateway member sync endpoint must not mutate member roles.",
);

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /permission_overwrites\s*:/,
  "pending verification containment must not replace a channel permission_overwrites array wholesale.",
);

assertNotMatches(
  "reaper-discord-member-sync",
  memberSyncFunction,
  /permission_overwrites\s*:/,
  "Gateway member sync endpoint must not replace a channel permission_overwrites array wholesale.",
);

assertNotMatches(
  "command registration",
  commandRegistration,
  /method:\s*"PUT"|method:\s*'PUT'/,
  "command registration must never bulk-overwrite guild commands.",
);

assertNotMatches(
  "rollback script",
  rollbackScript,
  /members\/\$\{[^}]+\}\/roles|permission_overwrites\s*:/,
  "rollback must not mutate member roles or replace permission_overwrites arrays.",
);

assertMatches(
  "reaper-discord-interactions",
  functionSource,
  /const rawBody = await req\.text\(\);[\s\S]*verifyDiscordSignature\(req, rawBody, publicKey\)[\s\S]*JSON\.parse\(rawBody\)/,
  "Discord signature must be verified against the raw body before JSON parsing.",
);

assertMatches(
  "reaper-discord-interactions",
  functionSource,
  /configuredGuildId !== EXPECTED_DISCORD_GUILD_ID[\s\S]*configuredChannelId !== EXPECTED_DISCORD_GALLERY_CHANNEL_ID[\s\S]*!expectedRoleConfigMatches/,
  "runtime secrets must be checked against the expected guild, channel, and role configuration.",
);

assertMatches(
  "reaper-discord-interactions",
  functionSource,
  /guildId !== EXPECTED_DISCORD_GUILD_ID \|\| channelId !== EXPECTED_DISCORD_GALLERY_CHANNEL_ID/,
  "command invocations must be restricted to the configured guild and gallery channel.",
);

assertIncludes(
  "reaper-discord-interactions",
  functionSource,
  "return /\\.(jpe?g|png|webp)$/i.test(filename);",
);

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /!attachmentId \|\| !attachmentUrl \|\| !mimeType/,
  "Discord-declared attachment MIME metadata is optional and must not be the only image gate.",
);

assertMatches(
  "reaper-discord-interactions",
  functionSource,
  /type:\s*INTERACTION_RESPONSE_CHANNEL_MESSAGE[\s\S]*flags:\s*EPHEMERAL_FLAG/,
  "validation messages must be ephemeral interaction responses.",
);

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /console\.(log|error|warn)\([^)]*(DISCORD_BOT_TOKEN|DISCORD_GALLERY_INGEST_SECRET|DISCORD_PUBLIC_KEY|interactionToken|attachmentUrl)/,
  "function logs must not expose Discord tokens, interaction tokens, ingest secret, public key, or attachment URLs.",
);

[
  "DISCORD_PUBLIC_KEY=",
  "DISCORD_APPLICATION_ID=1156448856565887066",
  "DISCORD_BOT_TOKEN=",
  "DISCORD_GALLERY_CHANNEL_ID=1508077313965817856",
  "DISCORD_GALLERY_INGEST_SECRET=",
  "REAPER_PENDING_VERIFICATION_SYNC_SECRET=",
].forEach((snippet) => assertIncludes("supabase functions .env.example", envExample, snippet));

[
  "reaper-discord-interactions",
  "Discord Interactions Endpoint URL",
  "DISCORD_PUBLIC_KEY",
  "/submit image:<file> title:<title> subtitle:<subtitle> share_to_instagram:<true|false>",
  "/sync-pending-verification mode:<preview|apply> confirm:<true|false>",
  "discord_managed_permission_overwrites",
  "Supabase-hosted Discord Interactions",
].forEach((snippet) => assertIncludes("supabase README", supabaseReadme, snippet));

[
  "reaper-discord-interactions",
  "https://deyvmtncimmcinldjyqe.supabase.co/functions/v1/reaper-discord-interactions",
  "DISCORD_PUBLIC_KEY",
  "supabase functions deploy reaper-discord-interactions",
  "guild-scoped `/submit` command",
].forEach((snippet) => assertIncludes("Instagram deployment runbook", deploymentRunbook, snippet));

if (failures.length) {
  console.error("Reaper Discord Interactions validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Reaper Discord Interactions validation OK.");
