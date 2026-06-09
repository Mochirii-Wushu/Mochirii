import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  config: "supabase/config.toml",
  function: "supabase/functions/reaper-discord-interactions/index.ts",
  importMap: "supabase/functions/reaper-discord-interactions/deno.json",
  envExample: "supabase/functions/.env.example",
  supabaseReadme: "supabase/README.md",
  deploymentRunbook: "docs/instagram-gallery-publishing-deployment-runbook.md",
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
const importMap = read(files.importMap);
const envExample = read(files.envExample);
const supabaseReadme = read(files.supabaseReadme);
const deploymentRunbook = read(files.deploymentRunbook);

[
  '"check:reaper-discord-interactions"',
].forEach((snippet) => assertIncludes("package.json", packageJson, snippet));
assertIncludes("check-all", checkAll, "check:reaper-discord-interactions");

[
  "[functions.reaper-discord-interactions]",
  "verify_jwt = false",
  'import_map = "./functions/reaper-discord-interactions/deno.json"',
  'entrypoint = "./functions/reaper-discord-interactions/index.ts"',
].forEach((snippet) => assertIncludes("supabase config", config, snippet));

[
  '"tweetnacl": "npm:tweetnacl@1.0.3"',
  '"@supabase/supabase-js": "npm:@supabase/supabase-js@2"',
  '"@supabase/functions-js/edge-runtime.d.ts": "jsr:@supabase/functions-js/edge-runtime.d.ts"',
].forEach((snippet) => assertIncludes("import map", importMap, snippet));

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

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /public_url/,
  "discord_resources uses the url column; event sync must not write a non-existent public_url column.",
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
].forEach((snippet) => assertIncludes("supabase functions .env.example", envExample, snippet));

[
  "reaper-discord-interactions",
  "Discord Interactions Endpoint URL",
  "DISCORD_PUBLIC_KEY",
  "/submit image:<file> title:<title> subtitle:<subtitle> share_to_instagram:<true|false>",
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
