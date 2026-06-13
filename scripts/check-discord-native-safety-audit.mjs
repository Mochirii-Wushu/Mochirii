import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  runbook: "docs/discord-native-safety-audit.md",
  containment: "docs/reaper-pending-verification-containment.md",
  activation: "docs/reaper-pending-verification-activation-packet.md",
  currentLiveState: "docs/current-live-state.md",
  fullStackEvidence: "scripts/check-full-stack-release-evidence.mjs",
};

function read(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`${relativePath}: missing required Discord native safety file.`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: missing ${snippet}`);
}

function assertNotIncludes(label, text, snippet) {
  if (text.includes(snippet)) failures.push(`${label}: must not include ${snippet}`);
}

function scanSecretLikeText(label, text) {
  const patterns = [
    { name: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
    { name: "Discord webhook URL", pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/ },
    { name: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { name: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { name: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { name: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
  ];

  for (const [index, line] of String(text || "").split(/\r?\n/).entries()) {
    for (const { name, pattern } of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) failures.push(`${label}: line ${index + 1} contains ${name}.`);
    }
  }
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const runbook = read(files.runbook);
const containment = read(files.containment);
const activation = read(files.activation);
const currentLiveState = read(files.currentLiveState);
const fullStackEvidence = read(files.fullStackEvidence);

assertIncludes("package.json", packageJson, '"check:discord-native-safety-audit"');
assertIncludes("check-all", checkAll, "check:discord-native-safety-audit");
assertIncludes("full-stack evidence", fullStackEvidence, "docs/discord-native-safety-audit.md");
assertIncludes("full-stack evidence", fullStackEvidence, "discordNativeSafetyAudit");

[
  "https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ",
  "https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ",
  "https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ",
  "https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101",
  "https://support.discord.com/hc/en-us/articles/17439993574167-Activity-Alerts-Security-Actions",
  "Run this audit monthly",
  "This audit is read-only evidence",
  "Community Base",
  "Rules Screening",
  "Community Onboarding",
  "AutoMod",
  "Raid Protection And Alerts",
  "Roles And Mentions",
  "Reaper Backstop",
  "@everyone",
  "@here",
  "Moderator accounts use 2FA",
  "Contained users are never publicly shamed or announced.",
  "Never record:",
  "Discord bot tokens",
  "private message content",
  "Guild id: 1078630751077142608",
].forEach((snippet) => assertIncludes("Discord native safety runbook", runbook, snippet));

[
  "discord-native-safety-audit.md",
  "Rules Screening, Community Onboarding, AutoMod, Raid Protection, verification level, role hierarchy, and moderator 2FA stay separate Discord-native controls.",
].forEach((snippet) => assertIncludes("pending verification containment doc", containment, snippet));

assertIncludes("pending verification activation packet", activation, "docs/discord-native-safety-audit.md");
assertIncludes("pending verification activation packet", activation, "Discord Native Safety Audit");
assertIncludes("current live state", currentLiveState, "docs/discord-native-safety-audit.md");

[
  "DISCORD_BOT_TOKEN=",
  "DISCORD_CLIENT_SECRET=",
  "DISCORD_PUBLIC_KEY=",
  "SUPABASE_SERVICE_ROLE_KEY=",
].forEach((snippet) => assertNotIncludes("Discord native safety runbook", runbook, snippet));

scanSecretLikeText("Discord native safety runbook", runbook);

if (failures.length) {
  console.error("Discord native safety audit validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Discord native safety audit validation OK.");
