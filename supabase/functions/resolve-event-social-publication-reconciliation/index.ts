import { withProtectedCors } from "../_shared/cors.ts";
import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  jsonResponse,
  readRequiredJsonBody,
  requireModeratorAccess,
} from "../_shared/gallery-moderation.ts";
import {
  boundedEventSocialReconciliationNote,
  confirmedNotPublishedEvidenceIsSafe,
  eventSocialReconciliationPublicDto,
  parseEventSocialReconciliationEvidence,
  parseEventSocialReconciliationSnapshot,
  verifyEventSocialProviderPublication,
} from "../_shared/event-social-reconciliation.ts";
import { EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION } from "../_shared/event-social-schedule.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_RESOLUTIONS = new Set([
  "confirmed_published",
  "confirmed_not_published",
]);

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function requestString(value: unknown, maximum: number): string | null {
  if (
    typeof value !== "string" || value.length < 1 ||
    value.length > maximum || !value.trim()
  ) return null;
  return value.trim();
}

Deno.serve((req: Request) => withProtectedCors(req, handleRequest(req)));

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;
  const bodyResult = await readRequiredJsonBody(req, 16 * 1024);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.body;

  if (Object.hasOwn(body, "destination")) {
    return jsonResponse({
      ok: false,
      error: "destination_is_server_derived",
      message: "Refresh the reconciliation job before continuing.",
    }, 400);
  }

  const jobId = requestString(body.job_id, 80);
  const expectedUpdatedAt = requestString(body.expected_updated_at, 80);
  const resolution = requestString(body.resolution, 40);
  const note = boundedEventSocialReconciliationNote(body.note);
  const requestedEvidence = parseEventSocialReconciliationEvidence(body);
  if (!jobId || !UUID_RE.test(jobId)) {
    return jsonResponse({
      ok: false,
      error: "invalid_job_id",
      message: "A valid event publication job is required.",
    }, 400);
  }
  if (
    !expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))
  ) {
    return jsonResponse({
      ok: false,
      error: "invalid_expected_revision",
      message: "Refresh the reconciliation job before continuing.",
    }, 400);
  }
  if (!resolution || !VALID_RESOLUTIONS.has(resolution)) {
    return jsonResponse({
      ok: false,
      error: "invalid_reconciliation_resolution",
      message: "Choose whether the publication exists at the provider.",
    }, 400);
  }
  if (body.confirm_reconciliation !== true) {
    return jsonResponse({
      ok: false,
      error: "reconciliation_confirmation_required",
      message: "Confirm the provider inspection before resolving this job.",
    }, 400);
  }
  if (!note) {
    return jsonResponse({
      ok: false,
      error: "reconciliation_note_required",
      message: "Record a bounded moderator inspection note.",
    }, 400);
  }
  if (!requestedEvidence) {
    return jsonResponse({
      ok: false,
      error: "invalid_reconciliation_evidence",
      message: "The provider evidence is invalid.",
    }, 400);
  }

  const snapshotResult = await access.adminClient.rpc(
    "get_event_social_publication_reconciliation_snapshot",
    { p_job_id: jobId },
  );
  if (snapshotResult.error) {
    console.error("event social reconciliation snapshot failed", {
      category: "snapshot_unavailable",
    });
    return jsonResponse({
      ok: false,
      error: "reconciliation_snapshot_unavailable",
      message: "The reconciliation job could not be loaded.",
    }, 500);
  }
  const snapshotValue = Array.isArray(snapshotResult.data) &&
      snapshotResult.data.length === 1
    ? snapshotResult.data[0]
    : snapshotResult.data;
  const snapshotRoot = asRecord(snapshotValue);
  if (snapshotRoot.found === false || snapshotValue === null) {
    return jsonResponse({
      ok: false,
      error: "reconciliation_job_not_found",
      message: "The reconciliation job no longer exists.",
    }, 404);
  }
  const snapshot = parseEventSocialReconciliationSnapshot(
    snapshotValue,
    jobId,
  );
  if (!snapshot) {
    return jsonResponse({
      ok: false,
      error: "reconciliation_snapshot_invalid",
      message:
        "The job is not safely reconcilable or its destination is not disabled.",
    }, 409);
  }
  if (snapshot.updatedAt !== expectedUpdatedAt) {
    return jsonResponse({
      ok: false,
      error: "stale_reconciliation_job",
      message: "The reconciliation job changed. Refresh before continuing.",
    }, 409);
  }

  let verifiedEvidence = requestedEvidence;
  if (resolution === "confirmed_not_published") {
    if (
      !confirmedNotPublishedEvidenceIsSafe(
        snapshot,
        requestedEvidence,
        note,
      )
    ) {
      return jsonResponse({
        ok: false,
        error: "not_published_evidence_invalid",
        message:
          "Confirming no publication requires a note and no provider identifiers.",
      }, 400);
    }
  } else {
    const readback = await verifyEventSocialProviderPublication(
      snapshot,
      requestedEvidence,
    );
    if (!readback.ok) {
      return jsonResponse({
        ok: false,
        error: readback.error,
        message: readback.message,
      }, readback.status);
    }
    verifiedEvidence = readback.evidence;
  }

  const resolved = await access.adminClient.rpc(
    "resolve_event_social_publication_reconciliation",
    {
      p_job_id: snapshot.id,
      p_destination: snapshot.destination,
      p_expected_updated_at: snapshot.updatedAt,
      p_resolution: resolution,
      p_actor_id: access.userId,
      p_note: note,
      p_provider_primary_id: verifiedEvidence.providerPrimaryId,
      p_provider_secondary_id: verifiedEvidence.providerSecondaryId,
      p_provider_permalink: verifiedEvidence.providerPermalink,
      p_confirm: true,
    },
  );
  if (resolved.error) {
    console.error("event social reconciliation commit failed", {
      category: "commit_unavailable",
    });
    return jsonResponse({
      ok: false,
      error: "reconciliation_commit_unavailable",
      message: "The verified reconciliation result was not recorded.",
    }, 500);
  }
  const dto = eventSocialReconciliationPublicDto(
    resolved.data,
    snapshot,
    resolution as "confirmed_published" | "confirmed_not_published",
  );
  if (!dto) {
    return jsonResponse({
      ok: false,
      error: "reconciliation_commit_rejected",
      message: "The job changed or the destination did not remain disabled.",
    }, 409);
  }

  return jsonResponse({
    ok: true,
    scheduleContractVersion: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
    data: dto,
    message: resolution === "confirmed_published"
      ? "The provider publication was verified and recorded. Publishing remains disabled."
      : "No provider publication was confirmed. Publishing remains disabled.",
  });
}
