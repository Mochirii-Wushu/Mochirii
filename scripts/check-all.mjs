import { spawnSync } from "node:child_process";

const checks = [
  ["check:js", ["node", "scripts/check-js.mjs"]],
  ["check:json", ["node", "scripts/check-json.mjs"]],
  ["check:protected-content", ["node", "scripts/check-protected-content.mjs"]],
  ["check:content", ["node", "scripts/check-content-guardrails.mjs"]],
  ["check:supabase-config", ["node", "scripts/check-supabase-public-config.mjs"]],
  ["check:discord-gallery-ingest", ["node", "scripts/check-discord-gallery-ingest.mjs"]],
  ["check:discord-reaper-parity", ["node", "scripts/check-discord-reaper-parity.mjs"]],
  ["check:discord-event-covers", ["node", "scripts/check-discord-event-covers.mjs"]],
  ["check:reaper-discord-interactions", ["node", "scripts/check-reaper-discord-interactions.mjs"]],
  ["check:vote-reminder", ["node", "scripts/check-vote-reminder.mjs"]],
  ["check:instagram-gallery-publishing", ["node", "scripts/check-instagram-gallery-publishing.mjs"]],
  ["check:member-profiles-and-ranks", ["node", "scripts/check-member-profiles-and-ranks.mjs"]],
  ["check:member-workflow-qa", ["node", "scripts/check-member-workflow-qa.mjs"]],
  ["check:mochi-social-alpha", ["node", "scripts/check-mochi-social-alpha.mjs"]],
  ["check:mochi-social-auth-bridge", ["node", "scripts/check-mochi-social-auth-bridge.mjs"]],
  ["check:mochi-social-browser-gates", ["node", "scripts/check-mochi-social-browser-gate-self-test.mjs"]],
  ["check:mochi-social-game-contract", ["node", "scripts/check-mochi-social-game-contract.mjs"]],
  ["check:mochi-social-preview-key-loader", ["node", "scripts/check-mochi-social-preview-key-loader.mjs"]],
  ["smoke:mochi-social-alpha-edge", ["node", "scripts/smoke-mochi-social-alpha-edge.mjs"]],
  ["check:supabase-edge-types", ["node", "scripts/check-supabase-edge-types.mjs"]],
  ["check:cutover-validators", ["node", "scripts/check-cutover-validator-self-tests.mjs"]],
  ["check:gallery-approved-feed", ["node", "scripts/check-gallery-approved-feed.mjs"]],
  ["check:gallery-timestamps", ["node", "scripts/check-gallery-timestamps.mjs"]],
  ["check:guild-schedule", ["node", "scripts/check-guild-schedule.mjs"]],
  ["check:events-page-schedule-sync", ["node", "scripts/check-events-page-schedule-sync.mjs"]],
  ["check:observability-metadata-smoke", ["node", "scripts/check-observability-metadata-smoke.mjs"]],
  ["check:shop-brand", ["node", "scripts/check-shop-brand-guardrails.mjs"]],
  ["check:security-hardening", ["node", "scripts/check-security-hardening.mjs"]],
  ["check:spotlight-poll", ["node", "scripts/check-spotlight-poll.mjs"]],
  ["check:refs", ["node", "scripts/check-refs.mjs"]],
  ["check:assets", ["node", "scripts/check-assets.mjs"]],
  ["check:next-public-sync", ["node", "scripts/check-next-public-sync.mjs"]],
];

let failed = false;

for (const [label, command] of checks) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command[0], command.slice(1), { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

if (failed) {
  console.error("\nValidation failed.");
  process.exit(1);
}

console.log("\nAll validation checks completed.");
