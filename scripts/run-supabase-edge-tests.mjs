import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const deno = process.env.DENO_BIN || "deno";
const shared = (name) => `supabase/functions/_shared/${name}_test.ts`;
const rootLock = ["--lock=deno.lock", "--frozen=true"];

const suites = [
  [
    "pure shared",
    [
      ...rootLock,
      shared("discord-gallery-ingest-auth"),
      shared("discord-interaction-helpers"),
      shared("gallery-discord-ingest"),
      shared("gallery-preview-attestation"),
      shared("gallery-public-feed"),
      shared("gallery-source-decode"),
      shared("gallery-source-image"),
      shared("gallery-thumbnail"),
      shared("member-verification-identity"),
      shared("meta-graph-security"),
      shared("meta-provider-diagnostic"),
      shared("modmail-audit"),
      shared("pending-verification-containment"),
      shared("safe-telemetry"),
      shared("social-publication-confirmation"),
      shared("social-publication-copy"),
      shared("supabase-service-role"),
      "supabase/functions/withdraw-gallery-publication-consent/failure_test.ts",
    ],
  ],
  [
    "reaper and request security",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/reaper-discord-interactions/deno.json",
      ...rootLock,
      shared("bounded-request-body"),
      shared("discord-api"),
      shared("discord-signature"),
      shared("outbound-http"),
      shared("photo-day-polls"),
      shared("reaper-discord-events"),
      shared("secret-auth"),
    ],
  ],
  [
    "gallery cleanup",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/delete-rejected-gallery-submission/deno.json",
      ...rootLock,
      shared("gallery-cleanup"),
    ],
  ],
  [
    "gallery moderation",
    [
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/list-gallery-review-queue/deno.json",
      ...rootLock,
      shared("gallery-moderation"),
      shared("gallery-response-safety"),
    ],
  ],
  [
    "Facebook Page publishing",
    [
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/publish-facebook-page-gallery-submission/deno.json",
      ...rootLock,
      shared("facebook-page-publishing"),
      shared("facebook-page-queue-pagination"),
    ],
  ],
  [
    "Instagram publishing",
    [
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/publish-instagram-gallery-submission/deno.json",
      ...rootLock,
      shared("instagram-publishing"),
    ],
  ],
  [
    "spinner",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/spinner-live-session/deno.json",
      ...rootLock,
      shared("spinner-live"),
      shared("spinner-media"),
    ],
  ],
  [
    "member social",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/sync-pixelfed-social-account/deno.json",
      ...rootLock,
      shared("member-access-policy"),
      shared("pixelfed-social-sync"),
    ],
  ],
  [
    "member access refresh",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/verify-member-access/deno.json",
      ...rootLock,
      "supabase/functions/verify-member-access/index_test.ts",
    ],
  ],
  [
    "Mochi Pets",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--import-map=supabase/functions/mochi-pets-unity-auth/deno.json",
      ...rootLock,
      shared("mochi-pets-alpha"),
    ],
  ],
  [
    "spotlight poll",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--import-map=deno-spotlight-poll.import_map.json",
      ...rootLock,
      shared("spotlight-polls"),
    ],
  ],
  ["vote reminder", ["--allow-env", ...rootLock, shared("vote-reminders")]],
  [
    "raffle disabled foundation",
    [
      "--node-modules-dir=none",
      "--config=supabase/functions/manage-raffle-claim/deno.json",
      "--lock=supabase/functions/manage-raffle-claim/deno.lock",
      "--frozen=true",
      shared("raffle-claim-boundary"),
      shared("raffle-claim"),
      shared("raffle-flags"),
      shared("raffle-fulfillment"),
      shared("raffle-moderator-policy"),
      shared("reward-crypto"),
      shared("reward-fulfillment"),
      shared("reward-provider-webhook"),
      shared("reward-relay-protocol-vector"),
      shared("reward-webhook"),
    ],
  ],
  [
    "raffle leaderboard",
    [
      "--allow-env",
      "--node-modules-dir=auto",
      "--config=supabase/functions/get-current-raffle/deno.json",
      "--lock=supabase/functions/get-current-raffle/deno.lock",
      "--frozen=true",
      shared("raffle-core"),
      shared("raffle-current"),
      shared("raffle-edge"),
      shared("raffle-leaderboard"),
    ],
  ],
  [
    "event schedule",
    [
      "--node-modules-dir=auto",
      "--config=supabase/functions/run-event-social-publication/deno.json",
      "--lock=supabase/functions/run-event-social-publication/deno.lock",
      "--frozen=true",
      shared("event-social-schedule"),
      shared("event-social-scheduler-request"),
    ],
  ],
  [
    "event templates",
    [
      "--node-modules-dir=auto",
      "--config=supabase/functions/run-event-social-publication/deno.json",
      "--lock=supabase/functions/run-event-social-publication/deno.lock",
      "--frozen=true",
      shared("event-social-templates"),
    ],
  ],
  [
    "event publishing",
    [
      "--allow-env=EVENT_FACEBOOK_PAGE_PUBLISH_ENABLED,EVENT_INSTAGRAM_PUBLISH_ENABLED,EVENT_DISCORD_PUBLISH_ENABLED,FACEBOOK_PAGE_PUBLISH_ENABLED,INSTAGRAM_PUBLISH_ENABLED",
      "--node-modules-dir=auto",
      "--config=supabase/functions/run-event-social-publication/deno.json",
      "--lock=supabase/functions/run-event-social-publication/deno.lock",
      "--frozen=true",
      shared("event-social-publishing"),
    ],
  ],
  [
    "event reconciliation",
    [
      "--node-modules-dir=auto",
      "--config=supabase/functions/resolve-event-social-publication-reconciliation/deno.json",
      "--lock=supabase/functions/resolve-event-social-publication-reconciliation/deno.lock",
      "--frozen=true",
      shared("event-social-reconciliation"),
    ],
  ],
];

function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return discover(absolute);
    if (!entry.isFile() || !entry.name.endsWith("_test.ts")) return [];
    return [path.relative(root, absolute).replaceAll("\\", "/")];
  });
}

const discovered = discover(path.join(root, "supabase", "functions")).sort();
const covered = suites.flatMap(([, args]) => args.filter((arg) => arg.endsWith("_test.ts"))).sort();
if (JSON.stringify(discovered) !== JSON.stringify(covered)) {
  throw new Error(`Edge test coverage mismatch. Discovered: ${discovered.join(", ")}; covered: ${covered.join(", ")}`);
}

if (process.argv.includes("--validate-only")) {
  console.log(`Supabase Edge test map OK (${discovered.length} test files in ${suites.length} bounded runs).`);
  process.exit(0);
}

for (const [label, args] of suites) {
  console.log(`Running Supabase Edge tests: ${label}`);
  const result = spawnSync(deno, ["test", ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Supabase Edge test suite OK (${discovered.length} test files in ${suites.length} bounded runs).`);
