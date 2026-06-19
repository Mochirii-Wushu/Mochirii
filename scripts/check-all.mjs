import { spawnSync } from "node:child_process";

const checks = [
  ["check:js", ["node", "scripts/check-js.mjs"]],
  ["check:json", ["node", "scripts/check-json.mjs"]],
  ["check:protected-content", ["node", "scripts/check-protected-content.mjs"]],
  ["check:recruitment-audio-player", ["node", "scripts/check-recruitment-audio-player.mjs"]],
  ["check:content", ["node", "scripts/check-content-guardrails.mjs"]],
  ["check:supabase-config", ["node", "scripts/check-supabase-public-config.mjs"]],
  ["check:discord-gallery-ingest", ["node", "scripts/check-discord-gallery-ingest.mjs"]],
  ["check:discord-reaper-parity", ["node", "scripts/check-discord-reaper-parity.mjs"]],
  ["check:discord-event-covers", ["node", "scripts/check-discord-event-covers.mjs"]],
  ["check:reaper-discord-interactions", ["node", "scripts/check-reaper-discord-interactions.mjs"]],
  ["check:reaper-modmail-audit", ["node", "scripts/check-reaper-modmail-audit.mjs"]],
  ["check:reaper-pending-verification", ["node", "scripts/check-reaper-pending-verification.mjs"]],
  ["check:vote-reminder", ["node", "scripts/check-vote-reminder.mjs"]],
  ["check:instagram-gallery-publishing", ["node", "scripts/check-instagram-gallery-publishing.mjs"]],
  ["check:member-profiles-and-ranks", ["node", "scripts/check-member-profiles-and-ranks.mjs"]],
  ["check:member-workflow-qa", ["node", "scripts/check-member-workflow-qa.mjs"]],
  ["check:multi-provider-auth", ["node", "scripts/check-multi-provider-auth.mjs"]],
  ["check:mochi-social-alpha", ["node", "scripts/check-mochi-social-alpha.mjs"]],
  ["check:mochi-social-auth-bridge", ["node", "scripts/check-mochi-social-auth-bridge.mjs"]],
  ["check:mochi-social-bridge-state", ["node", "scripts/check-mochi-social-bridge-state.mjs"]],
  ["check:mochi-social-browser-gates", ["node", "scripts/check-mochi-social-browser-gate-self-test.mjs"]],
  ["check:mochi-social-discord-oauth", ["node", "scripts/check-mochi-social-discord-oauth-self-test.mjs"]],
  ["check:mochi-social-edge-authority", ["node", "scripts/check-mochi-social-edge-authority.mjs"]],
  ["check:mochi-social-game-contract", ["node", "scripts/check-mochi-social-game-contract.mjs"]],
  ["check:mochi-social-preview-key-loader", ["node", "scripts/check-mochi-social-preview-key-loader.mjs"]],
  ["check:mochi-social-preview-url", ["node", "scripts/check-mochi-social-preview-url-self-test.mjs"]],
  ["check:mochi-social-tester-password-gate", ["node", "scripts/check-mochi-social-tester-password-gate.mjs"]],
  ["check:mochi-social-report-hygiene", ["node", "scripts/check-mochi-social-report-hygiene.mjs"]],
  ["smoke:mochi-social-alpha-edge", ["node", "scripts/smoke-mochi-social-alpha-edge.mjs"]],
  ["check:supabase-edge-types", ["node", "scripts/check-supabase-edge-types.mjs"]],
  ["check:cutover-validators", ["node", "scripts/check-cutover-validator-self-tests.mjs"]],
  ["check:gallery-approved-feed", ["node", "scripts/check-gallery-approved-feed.mjs"]],
  ["check:gallery-timestamps", ["node", "scripts/check-gallery-timestamps.mjs"]],
  ["check:media-performance", ["node", "scripts/check-media-performance.mjs"]],
  ["check:guild-schedule", ["node", "scripts/check-guild-schedule.mjs"]],
  ["check:home-celebration-splash", ["node", "scripts/check-home-celebration-splash.mjs"]],
  ["check:events-page-schedule-sync", ["node", "scripts/check-events-page-schedule-sync.mjs"]],
  ["check:observability-metadata-smoke", ["node", "scripts/check-observability-metadata-smoke.mjs"]],
  ["check:full-stack-release-evidence", ["node", "scripts/check-full-stack-release-evidence.mjs"]],
  ["check:csp-inline-hardening", ["node", "scripts/check-csp-inline-hardening.mjs"]],
  ["check:accessibility-route-matrix", ["node", "scripts/check-accessibility-route-matrix.mjs"]],
  ["check:shop-brand", ["node", "scripts/check-shop-brand-guardrails.mjs"]],
  ["check:supabase-security-performance", ["node", "scripts/check-supabase-security-performance.mjs"]],
  ["check:security-hardening", ["node", "scripts/check-security-hardening.mjs"]],
  ["check:spotlight-poll", ["node", "scripts/check-spotlight-poll.mjs"]],
  ["check:refs", ["node", "scripts/check-refs.mjs"]],
  ["check:assets", ["node", "scripts/check-assets.mjs"]],
  ["check:next-public-sync", ["node", "scripts/check-next-public-sync.mjs"]],
  ["check:universal-hero-spacing", ["node", "scripts/check-universal-hero-spacing.mjs"]],
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
