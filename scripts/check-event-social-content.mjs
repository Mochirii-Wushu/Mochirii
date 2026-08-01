import { readFileSync } from "node:fs";
import path from "node:path";
import {
  EVENT_SOCIAL_EVENT_IDS,
  EVENT_SOCIAL_PLATFORMS,
  validateEventSocialContent,
} from "./lib/event-social-content-contract.mjs";

const root = process.cwd();
const manifestPath = path.join(root, "apps", "web", "public", "data", "event-social-content.json");
const schedulePath = path.join(root, "apps", "web", "public", "data", "guild-schedule.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const schedule = JSON.parse(readFileSync(schedulePath, "utf8"));
const failures = validateEventSocialContent({ manifest, schedule, root });

if (failures.length) {
  console.error(`Event social content contract failed (${failures.length} issues).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Event social content contract OK.");
console.log(`- ${EVENT_SOCIAL_EVENT_IDS.length} schedule-backed event types and ${EVENT_SOCIAL_PLATFORMS.length} platform-specific captions validated.`);
console.log("- Every caption uses dynamic date/time tokens, the exact UTC+8 label, and the one-hour dispatch contract.");
console.log("- Reusable image text is occurrence-free; master/output paths, paired seal/cupcake marks, and alt text are validated.");
console.log("- Guild Party replacement/reward copy, layout rules, bounded game/theme accents, and public-copy restrictions validated.");
console.log("- Global and per-platform publication remain disabled.");
