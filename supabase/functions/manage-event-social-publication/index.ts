import { withProtectedCors } from "../_shared/cors.ts";
import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  jsonResponse,
  readRequiredJsonBody,
  requireModeratorAccess,
  safeString,
} from "../_shared/gallery-moderation.ts";
import {
  EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
  type EventSocialDestination,
} from "../_shared/event-social-schedule.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESTINATIONS = new Set<EventSocialDestination>([
  "facebook_page",
  "instagram",
  "discord",
]);
const ACTIONS = new Set([
  "list",
  "revoke",
  "cancel",
  "set_enabled",
]);

function destination(value: unknown): EventSocialDestination | null {
  const candidate = safeString(value, 40) as EventSocialDestination | null;
  return candidate && DESTINATIONS.has(candidate) ? candidate : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeListedOccurrence(value: unknown) {
  const occurrence = asRecord(value);
  return {
    id: safeString(occurrence.id, 80),
    sourceEventId: safeString(occurrence.source_event_id, 80),
    sourceKind: safeString(occurrence.source_kind, 20),
    title: safeString(occurrence.title, 100),
    localDate: safeString(occurrence.local_date, 20),
    startsAt: safeString(occurrence.starts_at, 80),
    endsAt: safeString(occurrence.ends_at, 80),
    publishAt: safeString(occurrence.publish_at, 80),
    state: safeString(occurrence.state, 40),
    updatedAt: safeString(occurrence.updated_at, 80),
  };
}

function safeListedJob(value: unknown) {
  const job = asRecord(value);
  return {
    id: safeString(job.id, 80),
    occurrenceId: safeString(job.occurrence_id, 80),
    destination: destination(job.destination),
    status: safeString(job.status, 40),
    contentVersion: safeString(job.content_version, 80),
    message: safeString(job.message, 500),
    altText: safeString(job.alt_text, 500),
    mediaPath: safeString(job.media_path, 300),
    approvedAt: safeString(job.approved_at, 80),
    updatedAt: safeString(job.updated_at, 80),
  };
}

function safeDestinationSetting(value: unknown) {
  const setting = asRecord(value);
  return {
    destination: destination(setting.destination),
    enabled: setting.enabled === true,
    updatedAt: safeString(setting.updated_at, 80),
  };
}

function safeTemplateSetting(value: unknown) {
  const template = asRecord(value);
  return {
    sourceEventId: safeString(template.source_event_id, 80),
    destination: destination(template.destination),
    contentVersion: safeString(template.template_contract_version, 80),
    mediaPath: safeString(template.media_path, 300),
    approved: template.approved === true,
    enabled: template.enabled === true,
    updatedAt: safeString(template.updated_at, 80),
  };
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
  const action = safeString(body.action, 40);
  if (!action || !ACTIONS.has(action)) {
    return jsonResponse({
      ok: false,
      error: "invalid_action",
      message: "Choose a supported event publication action.",
    }, 400);
  }

  const occurrenceId = safeString(body.occurrence_id, 80);
  const selectedDestination = destination(body.destination);
  if (
    action !== "list" && action !== "set_enabled" &&
    (!occurrenceId || !UUID_RE.test(occurrenceId))
  ) {
    return jsonResponse({
      ok: false,
      error: "invalid_occurrence",
      message: "Refresh the event publication queue.",
    }, 400);
  }

  if (action === "list") {
    const now = new Date();
    const startsAfter = new Date(now.getTime() - 24 * 60 * 60 * 1_000)
      .toISOString();
    const startsBefore = new Date(now.getTime() + 93 * 24 * 60 * 60 * 1_000)
      .toISOString();
    const [occurrenceResult, settingResult, templateResult] = await Promise.all(
      [
        access.adminClient
          .from("event_social_occurrences")
          .select(
            "id,source_event_id,source_kind,title,local_date,starts_at,ends_at,publish_at,state,updated_at",
          )
          .gte("starts_at", startsAfter)
          .lte("starts_at", startsBefore)
          .order("starts_at", { ascending: true })
          .limit(256),
        access.adminClient
          .from("event_social_destination_settings")
          .select("destination,enabled,updated_at")
          .order("destination", { ascending: true }),
        access.adminClient
          .from("event_social_publication_templates")
          .select(
            "source_event_id,destination,template_contract_version,media_path,approved,enabled,updated_at",
          )
          .order("source_event_id", { ascending: true })
          .order("destination", { ascending: true })
          .limit(24),
      ],
    );
    if (occurrenceResult.error || settingResult.error || templateResult.error) {
      console.error("event social queue listing failed", {
        occurrenceCode: occurrenceResult.error?.code,
        settingCode: settingResult.error?.code,
        templateCode: templateResult.error?.code,
      });
      return jsonResponse({
        ok: false,
        error: "queue_listing_failed",
        message: "The event publication queue could not be loaded.",
      }, 500);
    }
    const occurrences = (occurrenceResult.data || [])
      .map(safeListedOccurrence);
    const occurrenceIds = occurrences.flatMap(
      (occurrence: ReturnType<typeof safeListedOccurrence>) =>
        occurrence.id ? [occurrence.id] : [],
    );
    let jobRows: unknown[] = [];
    if (occurrenceIds.length) {
      const jobResult = await access.adminClient
        .from("event_social_publication_jobs")
        .select(
          "id,occurrence_id,destination,status,content_version,message,alt_text,media_path,approved_at,updated_at",
        )
        .in("occurrence_id", occurrenceIds)
        .order("updated_at", { ascending: false })
        .limit(768);
      if (jobResult.error) {
        console.error("event social queue jobs listing failed", {
          code: jobResult.error.code,
        });
        return jsonResponse({
          ok: false,
          error: "queue_listing_failed",
          message: "The event publication queue could not be loaded.",
        }, 500);
      }
      jobRows = jobResult.data || [];
    }
    return jsonResponse({
      ok: true,
      scheduleContractVersion: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
      occurrences,
      jobs: jobRows.map(safeListedJob),
      destinations: (settingResult.data || []).map(safeDestinationSetting),
      templates: (templateResult.data || []).map(safeTemplateSetting),
    });
  }

  if (action === "cancel") {
    if (body.confirm_event_cancellation !== true) {
      return jsonResponse({
        ok: false,
        error: "confirmation_required",
        message: "Confirm the event cancellation separately.",
      }, 400);
    }
    const result = await access.adminClient.rpc(
      "cancel_event_social_occurrence",
      {
        p_occurrence_id: occurrenceId,
        p_actor_id: access.userId,
        p_confirm: true,
      },
    );
    if (result.error) {
      console.error("event social occurrence cancellation failed", {
        code: result.error.code,
      });
      return jsonResponse({
        ok: false,
        error: "event_cancellation_failed",
        message: "The event occurrence could not be canceled.",
      }, 409);
    }
    return jsonResponse({
      ok: result.data === true,
      scheduleContractVersion: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
      canceled: result.data === true,
    });
  }

  if (!selectedDestination) {
    return jsonResponse({
      ok: false,
      error: "invalid_destination",
      message: "Choose Facebook Page, Instagram, or Discord.",
    }, 400);
  }

  if (action === "set_enabled") {
    if (typeof body.enabled !== "boolean") {
      return jsonResponse({
        ok: false,
        error: "invalid_destination_setting",
        message: "Choose an explicit destination setting.",
      }, 400);
    }
    const enabled = body.enabled;
    if (enabled) {
      return jsonResponse({
        ok: false,
        error: "owner_operator_activation_required",
        message:
          "Only the approved owner/operator release path may activate publishing.",
      }, 403);
    }
    if (body.confirm_destination_activation !== true) {
      return jsonResponse({
        ok: false,
        error: "confirmation_required",
        message: "Confirm this destination emergency disable separately.",
      }, 400);
    }
    const result = await access.adminClient.rpc(
      "set_event_social_destination_enabled",
      {
        p_destination: selectedDestination,
        p_enabled: enabled,
        p_actor_id: access.userId,
        p_confirm: true,
      },
    );
    if (result.error) {
      console.error("event social destination setting failed", {
        code: result.error.code,
      });
      return jsonResponse({
        ok: false,
        error: "destination_setting_failed",
        message: "The destination setting was not changed.",
      }, 409);
    }
    return jsonResponse({
      ok: result.data === true,
      scheduleContractVersion: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
      destination: selectedDestination,
      enabled,
    });
  }

  if (action === "revoke") {
    if (body.confirm_approval_revocation !== true) {
      return jsonResponse({
        ok: false,
        error: "confirmation_required",
        message: "Confirm this destination approval revocation.",
      }, 400);
    }
    const result = await access.adminClient.rpc(
      "revoke_event_social_destination_approval",
      {
        p_occurrence_id: occurrenceId,
        p_destination: selectedDestination,
        p_actor_id: access.userId,
        p_confirm: true,
      },
    );
    if (result.error) {
      console.error("event social approval revocation failed", {
        code: result.error.code,
      });
      return jsonResponse({
        ok: false,
        error: "approval_revocation_failed",
        message: "The approval was not revoked.",
      }, 409);
    }
    return jsonResponse({
      ok: result.data === true,
      scheduleContractVersion: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
      revoked: result.data === true,
      destination: selectedDestination,
    });
  }

  return jsonResponse({
    ok: false,
    error: "invalid_action",
    message: "Choose a supported event publication action.",
  }, 400);
}
