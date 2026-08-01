import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { withProtectedCors } from "../_shared/cors.ts";
import {
  deriveEventSocialOccurrences,
  EVENT_SOCIAL_SCHEDULE,
  EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
  EVENT_SOCIAL_SCHEDULE_PROJECTION_SHA256,
} from "../_shared/event-social-schedule.ts";
import { EVENT_SOCIAL_TEMPLATE_PACKET } from "../_shared/event-social-templates.ts";
import {
  enabledEventSocialDestinations,
  eventSocialClaimIsValid,
  eventSocialInstagramPreparationClaimIsValid,
  eventSocialProviderConfig,
  prepareEventSocialInstagramJob,
  publishEventSocialJob,
} from "../_shared/event-social-publishing.ts";
import { constantTimeSecretEqual } from "../_shared/secret-auth.ts";
import { eventSocialSchedulerRequestHasExactEmptyJson } from "../_shared/event-social-scheduler-request.ts";
import { getServiceRoleKey } from "../_shared/supabase-service-role.ts";

const SECRET_HEADER = "x-mochirii-event-social-secret";
const HORIZON_MS = 62 * 86_400_000;

function privateJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function opaqueDenied(): Response {
  return privateJson({ ok: false }, 401);
}

Deno.serve((req: Request) => withProtectedCors(req, handleRequest(req)));

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") return opaqueDenied();
  const expectedSecret =
    Deno.env.get("EVENT_SOCIAL_SCHEDULER_SECRET")?.trim() || "";
  const providedSecret = req.headers.get(SECRET_HEADER)?.trim() || "";
  if (
    expectedSecret.length < 32 || expectedSecret.length > 512 ||
    !await constantTimeSecretEqual(providedSecret, expectedSecret) ||
    !await eventSocialSchedulerRequestHasExactEmptyJson(req)
  ) return opaqueDenied();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) return opaqueDenied();
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sweep = await adminClient.rpc(
    "sweep_event_social_publication_leases",
  );
  if (sweep.error) {
    console.error("event social lease sweep failed", {
      code: sweep.error.code,
    });
    return privateJson({ ok: false, error: "lease_sweep_failed" }, 500);
  }
  const sweepData = sweep.data && typeof sweep.data === "object" &&
      !Array.isArray(sweep.data)
    ? sweep.data as Record<string, unknown>
    : {};
  const sweptExpired = Number.isSafeInteger(sweepData.expiredReconciliations)
    ? Number(sweepData.expiredReconciliations)
    : 0;
  const sweptPreparationFailed = Number.isSafeInteger(
      sweepData.expiredPreparationFailures,
    )
    ? Number(sweepData.expiredPreparationFailures)
    : 0;
  const sweptMissed = Number.isSafeInteger(sweepData.missedWindows)
    ? Number(sweepData.missedWindows)
    : 0;

  const projectionStatus = await adminClient.rpc(
    "event_social_projection_is_current",
    {
      p_schedule_sha256: EVENT_SOCIAL_SCHEDULE_PROJECTION_SHA256,
      p_content_sha256: EVENT_SOCIAL_TEMPLATE_PACKET.contentSha256,
    },
  );
  if (projectionStatus.error || typeof projectionStatus.data !== "boolean") {
    console.error("event social projection status failed", {
      code: projectionStatus.error?.code,
    });
    return privateJson({ ok: false, error: "projection_status_failed" }, 500);
  }

  let materializedCount = 0;
  let materializedSuppressedCount = 0;
  if (!projectionStatus.data) {
    const now = new Date();
    const occurrences = deriveEventSocialOccurrences(
      EVENT_SOCIAL_SCHEDULE,
      new Date(now.getTime() - 86_400_000),
      new Date(now.getTime() + HORIZON_MS),
    );
    const materialized = await adminClient.rpc(
      "materialize_event_social_occurrences",
      {
        p_occurrences: occurrences,
        p_schedule_contract_version: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
        p_schedule_sha256: EVENT_SOCIAL_SCHEDULE_PROJECTION_SHA256,
        p_templates: EVENT_SOCIAL_TEMPLATE_PACKET.templates,
        p_content_contract_version:
          EVENT_SOCIAL_TEMPLATE_PACKET.contentContractVersion,
        p_content_sha256: EVENT_SOCIAL_TEMPLATE_PACKET.contentSha256,
      },
    );
    if (materialized.error) {
      console.error("event social schedule materialization failed", {
        code: materialized.error.code,
      });
      return privateJson(
        { ok: false, error: "schedule_materialization_failed" },
        500,
      );
    }
    materializedCount = occurrences.length;
    materializedSuppressedCount = occurrences.filter((occurrence) =>
      occurrence.state === "suppressed"
    ).length;
  }

  const providerConfig = eventSocialProviderConfig();
  const enabledDestinations = enabledEventSocialDestinations(providerConfig);
  if (enabledDestinations.length === 0) {
    return privateJson({
      ok: true,
      scheduleContractVersion: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
      materialized: materializedCount,
      materializedSuppressed: materializedSuppressedCount,
      enabledDestinations: 0,
      claimed: 0,
      published: 0,
      verifiedPublished: 0,
      failed: 0,
      reconcileRequired: 0,
      sweptExpired,
      sweptPreparationFailed,
      sweptMissed,
      preparationClaimed: 0,
      preparationPrepared: 0,
      preparationPending: 0,
      preparationFailed: 0,
      preparationReconcileRequired: 0,
    });
  }

  const preparationCounts = {
    claimed: 0,
    prepared: 0,
    pending: 0,
    failed: 0,
    reconcileRequired: 0,
  };
  if (enabledDestinations.includes("instagram")) {
    const preparationClaimToken = crypto.randomUUID();
    const preparationClaim = await adminClient.rpc(
      "claim_due_event_social_instagram_preparations",
      { p_claim_token: preparationClaimToken, p_limit: 3 },
    );
    if (preparationClaim.error) {
      console.error("event social Instagram preparation claim failed", {
        code: preparationClaim.error.code,
      });
      return privateJson({ ok: false, error: "preparation_claim_failed" }, 500);
    }
    const preparationRows = Array.isArray(preparationClaim.data)
      ? preparationClaim.data
      : [];
    preparationCounts.claimed = preparationRows.length;
    await Promise.all(preparationRows.map(async (rawJob) => {
      const job = eventSocialInstagramPreparationClaimIsValid(rawJob)
        ? rawJob
        : null;
      if (!job) {
        console.error("event social Instagram preparation claim invalid", {
          category: "preparation_claim_invalid",
        });
        return;
      }
      let containerMutationStarted = false;
      const result = await prepareEventSocialInstagramJob(
        job,
        providerConfig.instagram,
        {
          beforeMutation: async (stage) => {
            if (stage !== "instagram_container") return false;
            const runtimeEnabled = enabledEventSocialDestinations(
              eventSocialProviderConfig(),
            ).includes("instagram");
            if (!runtimeEnabled) return false;
            const started = await adminClient.rpc(
              "start_event_social_instagram_preparation",
              { p_job_id: job.id, p_claim_token: preparationClaimToken },
            );
            if (started.error || started.data !== true) {
              console.error("event social Instagram preparation start failed", {
                code: started.error?.code,
              });
              return false;
            }
            containerMutationStarted = true;
            return true;
          },
        },
      );

      const failureCategory = result.failureCategory ||
        "instagram_preparation_failed";
      let finished;
      if (result.invalidateTemplate) {
        finished = await adminClient.rpc(
          "fail_event_social_template_attestation",
          {
            p_job_id: job.id,
            p_claim_token: preparationClaimToken,
            p_failure_category: failureCategory,
          },
        );
      } else if (
        job.preparation_action === "poll" || containerMutationStarted
      ) {
        finished = await adminClient.rpc(
          "finish_event_social_instagram_preparation",
          {
            p_job_id: job.id,
            p_claim_token: preparationClaimToken,
            p_outcome: result.outcome,
            p_provider_secondary_id: result.providerSecondaryId || null,
            p_failure_category: result.failureCategory || null,
          },
        );
      } else {
        finished = await adminClient.rpc("finish_event_social_pre_mutation", {
          p_job_id: job.id,
          p_claim_token: preparationClaimToken,
          p_outcome: result.outcome === "reconcile_required"
            ? "reconcile_required"
            : "failed",
          p_failure_category: failureCategory,
        });
      }
      if (finished.error || finished.data !== true) {
        console.error("event social Instagram preparation completion failed", {
          code: finished.error?.code,
          outcome: result.outcome,
        });
        return;
      }
      if (result.outcome === "prepared") preparationCounts.prepared += 1;
      else if (
        result.outcome === "pending" || result.outcome === "container_created"
      ) preparationCounts.pending += 1;
      else if (result.outcome === "reconcile_required") {
        preparationCounts.reconcileRequired += 1;
      } else preparationCounts.failed += 1;
    }));
  }

  const claimToken = crypto.randomUUID();
  const claim = await adminClient.rpc("claim_due_event_social_publications", {
    p_claim_token: claimToken,
    p_enabled_destinations: enabledDestinations,
    p_limit: Math.min(enabledDestinations.length * 3, 9),
  });
  if (claim.error) {
    console.error("event social publication claim failed", {
      code: claim.error.code,
    });
    return privateJson({ ok: false, error: "publication_claim_failed" }, 500);
  }

  const rows = Array.isArray(claim.data) ? claim.data : [];
  const counts = {
    published: 0,
    verifiedPublished: 0,
    failed: 0,
    reconcileRequired: 0,
  };
  await Promise.all(rows.map(async (rawJob) => {
    const job = eventSocialClaimIsValid(rawJob) ? rawJob : null;
    let providerMutationStarted = false;
    const result = job
      ? await publishEventSocialJob(job, providerConfig, {
        beforeMutation: async (stage) => {
          const runtimeEnabled = enabledEventSocialDestinations(
            eventSocialProviderConfig(),
          ).includes(job.destination);
          if (!runtimeEnabled) return false;
          const expectedStage = job.destination === "facebook_page"
            ? "facebook_photo"
            : job.destination === "instagram"
            ? "instagram_publish"
            : "discord_message";
          if (stage !== expectedStage) return false;
          const started = await adminClient.rpc(
            "start_event_social_provider_mutation",
            {
              p_job_id: job.id,
              p_claim_token: claimToken,
              p_destination: job.destination,
            },
          );
          if (started.error || started.data !== true) {
            console.error("event social provider mutation start failed", {
              code: started.error?.code,
              destination: job.destination,
              stage,
            });
            return false;
          }
          providerMutationStarted = true;
          return true;
        },
      })
      : { outcome: "failed" as const, failureCategory: "claimed_job_invalid" };
    const jobId = job?.id ||
      String((rawJob as Record<string, unknown>)?.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
      console.error("event social claimed job identity invalid", {
        category: "claimed_job_invalid",
      });
      return;
    }
    const finished = result.invalidateTemplate
      ? await adminClient.rpc("fail_event_social_template_attestation", {
        p_job_id: jobId,
        p_claim_token: claimToken,
        p_failure_category: result.failureCategory,
      })
      : providerMutationStarted
      ? await adminClient.rpc("finish_event_social_publication", {
        p_job_id: jobId,
        p_claim_token: claimToken,
        p_outcome: result.outcome,
        p_provider_primary_id: result.providerPrimaryId || null,
        p_provider_secondary_id: result.providerSecondaryId || null,
        p_provider_permalink: result.providerPermalink || null,
        p_failure_category: result.failureCategory || null,
      })
      : await adminClient.rpc("finish_event_social_pre_mutation", {
        p_job_id: jobId,
        p_claim_token: claimToken,
        p_outcome: result.outcome === "reconcile_required"
          ? "reconcile_required"
          : "failed",
        p_failure_category: result.failureCategory ||
          "provider_prepublication_failed",
      });
    if (finished.error || finished.data !== true) {
      console.error("event social publication completion failed", {
        code: finished.error?.code,
        outcome: result.outcome,
      });
      return;
    }
    if (result.outcome === "published") {
      counts.published += 1;
      counts.verifiedPublished += 1;
    } else if (result.outcome === "reconcile_required") {
      counts.reconcileRequired += 1;
    } else counts.failed += 1;
    console.info("event_social_publication_completed", {
      destination: job?.destination,
      outcome: result.outcome,
      errorCategory: result.failureCategory || undefined,
    });
  }));

  return privateJson({
    ok: true,
    scheduleContractVersion: EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION,
    materialized: materializedCount,
    materializedSuppressed: materializedSuppressedCount,
    enabledDestinations: enabledDestinations.length,
    claimed: rows.length,
    sweptExpired,
    sweptPreparationFailed,
    sweptMissed,
    preparationClaimed: preparationCounts.claimed,
    preparationPrepared: preparationCounts.prepared,
    preparationPending: preparationCounts.pending,
    preparationFailed: preparationCounts.failed,
    preparationReconcileRequired: preparationCounts.reconcileRequired,
    ...counts,
  });
}
