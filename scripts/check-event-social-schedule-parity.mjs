import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  EVENT_SOCIAL_SCHEDULE,
  EVENT_SOCIAL_SCHEDULE_PROJECTION_SHA256,
  EVENT_SOCIAL_SCHEDULE_SHA256,
  EVENT_SOCIAL_SUPPRESSED_OCCURRENCES,
} from "../supabase/functions/_shared/event-social-schedule.ts";
import {
  EVENT_SOCIAL_CONTENT_SHA256,
  EVENT_SOCIAL_MEDIA_SHA256,
  EVENT_SOCIAL_TEMPLATE_PACKET,
  EVENT_SOCIAL_TEMPLATE_PROJECTION,
  projectEventSocialTemplates,
} from "../supabase/functions/_shared/event-social-templates.ts";

const schedulePath = new URL("../apps/web/public/data/guild-schedule.json", import.meta.url);
const bytes = await readFile(schedulePath);
const source = JSON.parse(bytes.toString("utf8"));
const failures = [];
if (
  JSON.stringify(EVENT_SOCIAL_SUPPRESSED_OCCURRENCES) !==
    JSON.stringify([{
      sourceKey: "breaking-army:2026-08-05",
      reason: "manual_announcement_only",
    }])
) {
  failures.push("The manual one-time Breaking Army announcement is not fail-closed.");
}
const actualHash = createHash("sha256").update(bytes).digest("hex");
const contentPath = new URL(
  "../apps/web/public/data/event-social-content.json",
  import.meta.url,
);
const contentBytes = await readFile(contentPath);
const contentManifest = JSON.parse(contentBytes.toString("utf8"));
const contentHash = createHash("sha256").update(contentBytes).digest("hex");
const assetManifest = JSON.parse(
  await readFile(
    new URL("../apps/web/public/data/event-social-assets.json", import.meta.url),
    "utf8",
  ),
);

if (actualHash !== EVENT_SOCIAL_SCHEDULE_SHA256) {
  failures.push("The committed guild schedule hash changed without an event-social review.");
}
const projectionHash = createHash("sha256").update(JSON.stringify({
  scheduleSha256: actualHash,
  suppressedOccurrences: EVENT_SOCIAL_SUPPRESSED_OCCURRENCES,
})).digest("hex");
if (projectionHash !== EVENT_SOCIAL_SCHEDULE_PROJECTION_SHA256) {
  failures.push("The schedule projection hash does not bind the one-time suppression contract.");
}
if (contentHash !== EVENT_SOCIAL_CONTENT_SHA256) {
  failures.push("The event-social content manifest changed without a server-template review.");
}
const projectedTemplates = projectEventSocialTemplates(contentManifest);
if (!projectedTemplates || projectedTemplates.length !== 24) {
  failures.push("The server-trusted event-social template projection is incomplete.");
}
if (
  JSON.stringify(projectedTemplates) !==
    JSON.stringify(EVENT_SOCIAL_TEMPLATE_PROJECTION)
) {
  failures.push(
    "The public content manifest and immutable Edge template projection differ.",
  );
}
if (
  EVENT_SOCIAL_TEMPLATE_PACKET.contentSha256 !== EVENT_SOCIAL_CONTENT_SHA256 ||
  EVENT_SOCIAL_TEMPLATE_PACKET.templates !== EVENT_SOCIAL_TEMPLATE_PROJECTION
) {
  failures.push("The immutable Edge template packet identity or hash drifted.");
}
if (Object.keys(EVENT_SOCIAL_MEDIA_SHA256).length !== 24) {
  failures.push("The event-social static asset hash inventory is incomplete.");
}
if (
  assetManifest.publicationEnabled !== false ||
  assetManifest.providerMutationPerformed !== false ||
  assetManifest.reusableOccurrenceIndependentCreative !== true ||
  assetManifest.overlayContainsDateOrTime !== false ||
  !Array.isArray(assetManifest.outputs) || assetManifest.outputs.length !== 24
) {
  failures.push("The reusable static event-social asset manifest is incomplete or enabled.");
}
for (const template of projectedTemplates || []) {
  const platform = template.destination === "facebook_page"
    ? "facebook"
    : template.destination;
  const key = `${template.sourceEventId}:${platform}`;
  const expectedMediaHash = EVENT_SOCIAL_MEDIA_SHA256[key];
  const manifestOutput = (assetManifest.outputs || []).find((output) =>
    output.eventId === template.sourceEventId && output.platform === platform
  );
  if (
    manifestOutput?.assetPath !== `.${template.mediaPath}` ||
    manifestOutput?.sha256 !== expectedMediaHash
  ) {
    failures.push(`${key} does not match the reviewed static asset sidecar.`);
  }
  const publicAsset = new URL(
    `../apps/web/public${template.mediaPath}`,
    import.meta.url,
  );
  try {
    const assetBytes = await readFile(publicAsset);
    const assetHash = createHash("sha256").update(assetBytes).digest("hex");
    if (!expectedMediaHash || assetHash !== expectedMediaHash) {
      failures.push(`${key} exists but is not pinned to its exact static asset hash.`);
    }
  } catch (error) {
    if (expectedMediaHash || error?.code !== "ENOENT") {
      failures.push(`${key} has a pinned or unreadable static asset without an exact file.`);
    }
  }
}

const expectedTimezone = {
  label: source.timezone?.label,
  ianaZone: source.timezone?.ianaZone,
  offsetMinutes: source.timezone?.offsetMinutes,
};
if (JSON.stringify(expectedTimezone) !== JSON.stringify(EVENT_SOCIAL_SCHEDULE.timezone)) {
  failures.push("The event-social timezone does not match the committed guild schedule.");
}

const expectedMonthly = Object.values(source.monthly || {}).map((item) => ({
  id: item.id,
  title: item.title,
  rule: item.rule,
  replacesEventId: item.replacesEventId,
  replacementRewardEventId: item.replacementRewardEventId,
  cancellationRestoresReplacement: item.cancellationRestoresReplacement,
  startTime: item.startTime,
  endTime: item.endTime,
}));
const expectedWeekly = (source.weekly || []).map((item) => ({
  id: item.id,
  title: item.title,
  days: item.days,
  startTime: item.startTime,
  endTime: item.endTime,
}));
if (JSON.stringify(expectedMonthly) !== JSON.stringify(EVENT_SOCIAL_SCHEDULE.monthly)) {
  failures.push("The event-social monthly schedule is not an exact committed-source projection.");
}
if (JSON.stringify(expectedWeekly) !== JSON.stringify(EVENT_SOCIAL_SCHEDULE.weekly)) {
  failures.push("The event-social weekly schedule is not an exact committed-source projection.");
}

const backendFiles = [
  new URL("../supabase/functions/_shared/meta-graph-security.ts", import.meta.url),
  new URL("../supabase/functions/_shared/event-social-publishing.ts", import.meta.url),
  new URL("../supabase/functions/_shared/event-social-reconciliation.ts", import.meta.url),
  new URL("../supabase/functions/run-event-social-publication/index.ts", import.meta.url),
  new URL("../supabase/functions/resolve-event-social-publication-reconciliation/index.ts", import.meta.url),
  new URL("../supabase/migrations/20260731115926_add_event_social_publication_scheduler.sql", import.meta.url),
];
let runnerSource = "";
let reconciliationSource = "";
let reconciliationEndpointSource = "";
let migrationSource = "";
let metaGraphSecuritySource = "";
for (const file of backendFiles) {
  const text = await readFile(file, "utf8");
  if (file.pathname.endsWith("/run-event-social-publication/index.ts")) {
    runnerSource = text;
  }
  if (file.pathname.endsWith("/_shared/event-social-reconciliation.ts")) {
    reconciliationSource = text;
  }
  if (file.pathname.endsWith("/resolve-event-social-publication-reconciliation/index.ts")) {
    reconciliationEndpointSource = text;
  }
  if (file.pathname.endsWith("/20260731115926_add_event_social_publication_scheduler.sql")) {
    migrationSource = text;
  }
  if (file.pathname.endsWith("/_shared/meta-graph-security.ts")) {
    metaGraphSecuritySource = text;
  }
  if (/graph\.facebook\.com\/(?!v26\.0)|GRAPH_API_VERSION\s*=\s*["'](?!v26\.0)/i.test(text)) {
    failures.push(`${file.pathname} contains an unpinned Meta Graph path.`);
  }
  if (/\/(?:groups|group)\b|groups_access_member_info|publish_to_groups/i.test(text)) {
    failures.push(`${file.pathname} contains a forbidden Facebook Groups API path or scope.`);
  }
}
if (!metaGraphSecuritySource.includes('export const META_GRAPH_API_VERSION = "v26.0";')) {
  failures.push("The shared Meta Graph client is not pinned exactly to v26.0.");
}
for (const forbidden of [
  "event-social-content.json",
  "loadEventSocialTemplatePacket",
  "occurrence_override",
]) {
  if (runnerSource.includes(forbidden)) {
    failures.push(`The event-social runner contains forbidden runtime path: ${forbidden}`);
  }
}
for (const required of [
  "EVENT_SOCIAL_TEMPLATE_PACKET",
  "sweep_event_social_publication_leases",
  "event_social_projection_is_current",
  "claim_due_event_social_instagram_preparations",
  "start_event_social_instagram_preparation",
  "start_event_social_provider_mutation",
  "await Promise.all(rows.map(async (rawJob) =>",
]) {
  if (!runnerSource.includes(required)) {
    failures.push(`The event-social runner is missing: ${required}`);
  }
}

for (const required of [
  "publish_at - interval '15 minutes'",
  "publish_at - interval '10 minutes'",
  "publish_at + interval '2 minutes'",
  "get_event_social_publication_reconciliation_snapshot",
  "resolve_event_social_publication_reconciliation",
  "reconciliation_resolution",
  "instagram_container_unexpectedly_published",
  "instagram_container_mutation_lease_expired",
]) {
  if (!migrationSource.includes(required)) {
    failures.push(`The event-social migration is missing: ${required}`);
  }
}
if (
  !migrationSource.includes("set status = 'failed'") ||
  !migrationSource.includes("'expiredPreparationFailures'")
) {
  failures.push("An uncertain non-public Instagram container creation is not terminally failed.");
}
for (const required of [
  "requireModeratorAccess(req)",
  'Object.hasOwn(body, "destination")',
  "expected_updated_at",
  '"get_event_social_publication_reconciliation_snapshot"',
  '"resolve_event_social_publication_reconciliation"',
]) {
  if (!reconciliationEndpointSource.includes(required)) {
    failures.push(`The reconciliation endpoint is missing: ${required}`);
  }
}
for (const required of [
  "snapshot.providerSecondaryId",
  "instagram_reconciliation_container_mismatch",
  "destinationEnabled === false",
  "eventSocialReconciliationPublicDto",
]) {
  if (!reconciliationSource.includes(required)) {
    failures.push(`The reconciliation provider boundary is missing: ${required}`);
  }
}
if (
  runnerSource.indexOf("sweep_event_social_publication_leases") >
  runnerSource.indexOf("enabledDestinations.length === 0")
) {
  failures.push("Expired leases are not swept before the disabled fast path.");
}

const managerPath = new URL(
  "../supabase/functions/manage-event-social-publication/index.ts",
  import.meta.url,
);
const managerSource = await readFile(managerPath, "utf8");
for (const required of [
  'action === "list"',
  'error: "owner_operator_activation_required"',
  'if (enabled) {',
  '"destination,enabled,updated_at"',
  '"id,occurrence_id,destination,status,content_version,message,alt_text,media_path,approved_at,updated_at"',
]) {
  if (!managerSource.includes(required)) {
    failures.push(`The event-social moderator contract is missing: ${required}`);
  }
}
for (const forbidden of ["occurrence_override", '"approve"']) {
  if (managerSource.includes(forbidden)) {
    failures.push(`The event-social manager retains forbidden manual approval: ${forbidden}`);
  }
}
const listStart = managerSource.indexOf('if (action === "list")');
const listEnd = managerSource.indexOf('if (action === "cancel")', listStart);
const listSource = listStart >= 0 && listEnd > listStart
  ? managerSource.slice(listStart, listEnd)
  : "";
for (const forbidden of [
  "media_sha256",
  "confirmation_fingerprint",
  "claim_token",
  "claim_expires_at",
  "provider_primary_id",
  "provider_secondary_id",
  "provider_permalink",
]) {
  if (listSource.includes(forbidden)) {
    failures.push(`The event-social moderator list exposes forbidden field: ${forbidden}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`event-social schedule check: ${failure}`);
  process.exit(1);
}
console.log(
  "Event-social schedule, moderator safety, Graph v26 pin, and no-Groups-API guards passed.",
);
