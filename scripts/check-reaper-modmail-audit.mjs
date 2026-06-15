import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  function: "supabase/functions/reaper-discord-interactions/index.ts",
  sharedAudit: "supabase/functions/_shared/modmail-audit.ts",
  sharedTest: "supabase/functions/_shared/modmail-audit_test.ts",
  commandRegistration: "scripts/register-reaper-modmail-audit-command.mjs",
  supabaseReadme: "supabase/README.md",
  runbook: "docs/reaper-modmail-audit.md",
};

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required ModMail audit file.`);
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

function denoBinary() {
  if (process.env.DENO_BIN) return process.env.DENO_BIN;

  const localInstall = path.join(os.homedir(), ".deno", "bin", process.platform === "win32" ? "deno.exe" : "deno");
  if (existsSync(localInstall)) return localInstall;

  return "deno";
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const functionSource = read(files.function);
const sharedAudit = read(files.sharedAudit);
const sharedTest = read(files.sharedTest);
const commandRegistration = read(files.commandRegistration);
const supabaseReadme = read(files.supabaseReadme);
const runbook = read(files.runbook);

[
  '"check:reaper-modmail-audit"',
  '"test:modmail-audit"',
  '"register:reaper-modmail-audit-command"',
].forEach((snippet) => assertIncludes("package.json", packageJson, snippet));
assertIncludes("check-all", checkAll, "check:reaper-modmail-audit");

[
  "buildModmailAudit",
  "formatModmailAuditMessage",
  "MODMAIL_BOT_USER_ID",
  "MODMAIL_LOG_CHANNEL_ID",
  "MODMAIL_MODERATOR_ROLE_ID",
  "EXPECTED_MODMAIL_BOT_USER_ID = MODMAIL_BOT_USER_ID",
  "EXPECTED_MODMAIL_LOG_CHANNEL_ID = MODMAIL_LOG_CHANNEL_ID",
  "EXPECTED_MODMAIL_MODERATOR_ROLE_ID = MODMAIL_MODERATOR_ROLE_ID",
  "fetchGuildMember(EXPECTED_MODMAIL_BOT_USER_ID)",
  "processModmailAudit",
  "\"audit-modmail\"",
  "ModMail audit requires the Moderator role.",
  "EdgeRuntime.waitUntil(processModmailAudit(interactionToken, applicationId))",
  "return deferredEphemeralResponse();",
  "allowed_mentions",
].forEach((snippet) => assertIncludes("reaper-discord-interactions", functionSource, snippet));

[
  "MODMAIL_BOT_USER_ID = \"575252669443211264\"",
  "MODMAIL_LOG_CHANNEL_ID = \"1165567735871311914\"",
  "MODMAIL_MODERATOR_ROLE_ID = \"1078630751165222984\"",
  "GUILD_TEXT_CHANNEL_TYPE = 0",
  "VIEW_CHANNEL_PERMISSION = 1n << 10n",
  "SEND_MESSAGES_PERMISSION = 1n << 11n",
  "EMBED_LINKS_PERMISSION = 1n << 14n",
  "READ_MESSAGE_HISTORY_PERMISSION = 1n << 16n",
  "MENTION_EVERYONE_PERMISSION = 1n << 17n",
  "buildModmailAudit",
  "formatModmailAuditMessage",
  "=viewconfig",
  "=accessrole <@&1078630751165222984>",
  "=pingrole <@&1078630751165222984>",
  "=logging <#1165567735871311914>",
  "=commandonly",
  "Do not enable =loggingplus unless separately approved",
].forEach((snippet) => assertIncludes("shared ModMail audit", sharedAudit, snippet));

[
  "missing bot",
  "missing Moderator role",
  "missing log channel",
  "public log channel",
  "Moderator role lacking read permissions",
  "ModMail bot lacking write permissions",
  "scoped bot mention permission",
].forEach((snippet) => assertIncludes("ModMail audit tests", sharedTest, snippet));

[
  "COMMAND_NAME = \"audit-modmail\"",
  "dm_permission: false",
  "Dry run only",
  "method: existing ? \"PATCH\" : \"POST\"",
].forEach((snippet) => assertIncludes("ModMail command registration", commandRegistration, snippet));

[
  "/audit-modmail",
  "575252669443211264",
  "1165567735871311914",
  "1078630751165222984",
  "=viewconfig",
  "=accessrole <@&1078630751165222984>",
  "=pingrole <@&1078630751165222984>",
  "=logging <#1165567735871311914>",
  "=commandonly",
  "Do not enable `=loggingplus`",
  "Reaper cannot read third-party ModMail internal config",
  "metadata-only",
].forEach((snippet) => assertIncludes("ModMail runbook", runbook, snippet));

assertIncludes("supabase README", supabaseReadme, "/audit-modmail");
assertIncludes("supabase README", supabaseReadme, "register:reaper-modmail-audit-command");
assertIncludes("supabase README", supabaseReadme, "ModMail bot `575252669443211264`");

assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /GatewayIntentBits\.MessageContent|MessageContent/i,
  "ModMail audit must not introduce Message Content intent or message-content handling.",
);
assertNotMatches(
  "reaper-discord-interactions",
  functionSource,
  /=loggingplus/,
  "Interaction function must not tell operators to enable content-heavy ModMail loggingplus.",
);
assertNotMatches(
  "ModMail command registration",
  commandRegistration,
  /method:\s*"PUT"|method:\s*'PUT'/,
  "ModMail command registration must never bulk-overwrite guild commands.",
);
assertNotMatches(
  "ModMail command registration",
  commandRegistration,
  /default_member_permissions:\s*"0"/,
  "ModMail audit command should rely on runtime Moderator role enforcement, not a disabled command requiring manual permission grants.",
);
assertNotMatches(
  "shared ModMail audit",
  sharedAudit,
  /smtp|service-role|SUPABASE_SERVICE_ROLE_KEY|transcript|raw message|message body/i,
  "ModMail audit must remain metadata-only and not become an email/transcript feature.",
);
assertMatches(
  "reaper-discord-interactions",
  functionSource,
  /type:\s*INTERACTION_RESPONSE_CHANNEL_MESSAGE[\s\S]*flags:\s*EPHEMERAL_FLAG/,
  "ModMail audit denial and status responses must be ephemeral.",
);

if (!failures.length) {
  const deno = denoBinary();
  const result = spawnSync(
    deno,
    [
      "test",
      "--lock=deno.lock",
      "--frozen=true",
      "supabase/functions/_shared/modmail-audit_test.ts",
    ],
    {
      cwd: root,
      stdio: "inherit",
    },
  );

  if (result.error) {
    failures.push(`Unable to run Deno ModMail audit tests: ${result.error.message}`);
  } else if (result.status !== 0) {
    failures.push("Deno ModMail audit tests failed.");
  }
}

if (failures.length) {
  console.error("Reaper ModMail audit validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Reaper ModMail audit validation OK.");
