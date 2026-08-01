import path from "node:path";
import {
  getRepositoryRoot,
  loadEventSocialJson,
  removeSupersededEventSocialPlatformAssets,
  renderEventSocialAssets,
  renderEventSocialContactSheet,
} from "./lib/event-social-assets.mjs";

const root = getRepositoryRoot();
const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  console.log("Usage: node scripts/render-event-social-assets.mjs --confirm-text-free-masters --confirm-canonical-public-write [--remove-superseded-unhashed-assets] [--write-review-contact-sheet]");
  console.log("Renders the eight reusable, occurrence-independent platform assets. This command never contacts a provider.");
  process.exit(0);
}

const allowed = new Set([
  "--confirm-text-free-masters",
  "--confirm-canonical-public-write",
  "--remove-superseded-unhashed-assets",
  "--write-review-contact-sheet",
]);
const unknown = [...args].filter((argument) => !allowed.has(argument));
if (unknown.length) throw new Error(`Unsupported arguments: ${unknown.join(", ")}.`);

const manifest = loadEventSocialJson(
  path.join(root, "apps", "web", "public", "data", "event-social-content.json"),
  "Event social content manifest",
);
const schedule = loadEventSocialJson(
  path.join(root, "apps", "web", "public", "data", "guild-schedule.json"),
  "Guild schedule",
);

const report = await renderEventSocialAssets({
  manifest,
  schedule,
  confirmTextFreeMasters: args.has("--confirm-text-free-masters"),
  confirmCanonicalPublicWrite: args.has("--confirm-canonical-public-write"),
});

console.log("Event social assets rendered without provider activity.");
console.log(`- ${report.outputs.length} occurrence-independent derivatives across eight events.`);
console.log(`- Render version: ${report.renderVersion}`);
console.log(`- Sidecar: ${path.relative(root, report.sidecar).split(path.sep).join("/")}`);
if (args.has("--remove-superseded-unhashed-assets")) {
  const cleanup = removeSupersededEventSocialPlatformAssets(report, {
    confirmSupersededAssetRemoval: true,
  });
  console.log(`- Removed ${cleanup.removed.length} byte-identical superseded unhashed derivatives.`);
}
if (args.has("--write-review-contact-sheet")) {
  const review = await renderEventSocialContactSheet(report, {
    confirmReviewArtifactWrite: true,
  });
  console.log(`- Review contact sheet: ${path.relative(root, review.file).split(path.sep).join("/")} (${review.sha256})`);
}
console.log("- Every publication flag remains false.");
