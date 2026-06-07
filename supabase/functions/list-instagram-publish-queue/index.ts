import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  type JsonRecord,
  jsonResponse,
  readOptionalJsonBody,
  requireModeratorAccess,
  safeString,
} from "../_shared/gallery-moderation.ts";

const SIGNED_URL_SECONDS = 10 * 60;
const QUEUE_LIMIT = 50;
const EVENT_LIMIT = 250;
const MEMBER_GALLERY_BUCKET = "member-gallery";
const VALID_STATUSES = new Set(["queued", "ineligible", "publishing", "published", "failed", "canceled"]);

function normalizeStatus(value: unknown): string {
  const status = safeString(value, 20)?.toLowerCase() || "queued";
  return status === "all" || VALID_STATUSES.has(status) ? status : "queued";
}

function displayName(profile: JsonRecord | null | undefined): string {
  return (
    safeString(profile?.discord_global_name, 100) ||
    safeString(profile?.display_name, 40) ||
    safeString(profile?.discord_username, 80) ||
    "Mochirii Member"
  );
}

function profileSummary(profile: JsonRecord | null | undefined): JsonRecord | null {
  if (!profile) return null;

  return {
    displayName: displayName(profile),
    discordUsername: safeString(profile.discord_username, 80),
    discordGlobalName: safeString(profile.discord_global_name, 100),
    discordUserId: safeString(profile.discord_user_id, 40),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const bodyResult = await readOptionalJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const requestedStatus = normalizeStatus(bodyResult.body.status);
  const summary: Record<string, number | string> = { status: requestedStatus, total: 0, shown: 0 };

  const countResults = await Promise.all(
    [...VALID_STATUSES].map(async (status) => ({
      status,
      result: await access.adminClient
        .from("gallery_instagram_publish_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", status),
    })),
  );

  for (const { status, result } of countResults) {
    if (result.error) {
      console.error("list-instagram-publish-queue count lookup failed", {
        status,
        code: result.error.code,
        message: result.error.message,
      });

      return jsonResponse(
        {
          ok: false,
          error: "instagram_job_count_failed",
          message: "Instagram publishing counts could not be loaded.",
        },
        500,
      );
    }

    const count = Number(result.count || 0);
    summary[status] = count;
    summary.total = Number(summary.total || 0) + count;
  }

  let jobQuery = access.adminClient
    .from("gallery_instagram_publish_jobs")
    .select("id,submission_id,status,eligibility_reason,caption,alt_text,instagram_media_id,instagram_permalink,last_error,attempt_count,published_by,published_at,created_at,updated_at")
    .limit(QUEUE_LIMIT);

  if (requestedStatus !== "all") {
    jobQuery = jobQuery.eq("status", requestedStatus);
  }

  const { data: jobData, error: jobError } = await jobQuery
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (jobError) {
    console.error("list-instagram-publish-queue job lookup failed", {
      code: jobError.code,
      message: jobError.message,
    });

    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_lookup_failed",
        message: "Instagram publishing jobs could not be loaded.",
      },
      500,
    );
  }

  const jobs = Array.isArray(jobData) ? jobData as JsonRecord[] : [];
  const jobIds = [
    ...new Set(
      jobs
        .map((job) => safeString(job.id, 80))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const submissionIds = [
    ...new Set(
      jobs
        .map((job) => safeString(job.submission_id, 80))
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const submissionsById = new Map<string, JsonRecord>();
  if (submissionIds.length > 0) {
    const { data: submissionData, error: submissionError } = await access.adminClient
      .from("gallery_submissions")
      .select("id,user_id,storage_bucket,storage_path,original_filename,mime_type,size_bytes,title,caption,category,status,reviewed_at,created_at,submission_source,discord_guild_id,discord_channel_id,discord_message_id,discord_attachment_id,discord_user_id,instagram_opt_in,instagram_opt_in_at,instagram_opt_in_source,instagram_opt_in_copy_version")
      .in("id", submissionIds);

    if (submissionError) {
      console.error("list-instagram-publish-queue submission lookup failed", {
        code: submissionError.code,
        message: submissionError.message,
      });

      return jsonResponse(
        {
          ok: false,
          error: "instagram_submission_lookup_failed",
          message: "Instagram submission details could not be loaded.",
        },
        500,
      );
    }

    (Array.isArray(submissionData) ? submissionData as JsonRecord[] : []).forEach((submission) => {
      const id = safeString(submission.id, 80);
      if (id) submissionsById.set(id, submission);
    });
  }

  const eventsByJobId = new Map<string, JsonRecord[]>();
  const allEvents: JsonRecord[] = [];
  if (jobIds.length > 0) {
    const { data: eventData, error: eventError } = await access.adminClient
      .from("gallery_instagram_publish_events")
      .select("id,job_id,submission_id,actor_id,action,created_at")
      .in("job_id", jobIds)
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT);

    if (eventError) {
      console.error("list-instagram-publish-queue event lookup failed", {
        code: eventError.code,
        message: eventError.message,
      });

      return jsonResponse(
        {
          ok: false,
          error: "instagram_event_lookup_failed",
          message: "Instagram publishing history could not be loaded.",
        },
        500,
      );
    }

    allEvents.push(...(Array.isArray(eventData) ? eventData as JsonRecord[] : []));
    allEvents.forEach((event) => {
      const jobId = safeString(event.job_id, 80);
      if (!jobId) return;
      const current = eventsByJobId.get(jobId) || [];
      current.push(event);
      eventsByJobId.set(jobId, current);
    });
  }

  const userIds = [
    ...new Set(
      [
        ...[...submissionsById.values()].map((submission) => safeString(submission.user_id, 80)),
        ...jobs.map((job) => safeString(job.published_by, 80)),
        ...allEvents.map((event) => safeString(event.actor_id, 80)),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
  const profilesById = new Map<string, JsonRecord>();

  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await access.adminClient
      .from("member_profiles")
      .select("id,display_name,discord_username,discord_global_name,discord_user_id")
      .in("id", userIds);

    if (profileError) {
      console.error("list-instagram-publish-queue profile lookup failed", {
        code: profileError.code,
        message: profileError.message,
      });

      return jsonResponse(
        {
          ok: false,
          error: "instagram_profile_lookup_failed",
          message: "Instagram publishing profile details could not be loaded.",
        },
        500,
      );
    }

    (Array.isArray(profileData) ? profileData as JsonRecord[] : []).forEach((profile) => {
      const id = safeString(profile.id, 80);
      if (id) profilesById.set(id, profile);
    });
  }

  const queue = [];

  for (const job of jobs) {
    const jobId = safeString(job.id, 80) || "";
    const submissionId = safeString(job.submission_id, 80) || "";
    const submission = submissionsById.get(submissionId) || {};
    const bucket = safeString(submission.storage_bucket, 80) || MEMBER_GALLERY_BUCKET;
    const storagePath = safeString(submission.storage_path, 1000);
    let signedPreviewUrl: string | null = null;
    let previewError: string | null = null;

    if (bucket !== MEMBER_GALLERY_BUCKET || !storagePath) {
      previewError = "invalid_storage_reference";
    } else {
      const { data: signedData, error: signedError } = await access.adminClient.storage
        .from(bucket)
        .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

      if (signedError || !signedData?.signedUrl) {
        previewError = "preview_unavailable";
      } else {
        signedPreviewUrl = signedData.signedUrl;
      }
    }

    const userId = safeString(submission.user_id, 80) || "";
    const profile = profilesById.get(userId) || {};
    const events = (eventsByJobId.get(jobId) || []).map((event) => {
      const actorId = safeString(event.actor_id, 80);
      return {
        id: safeString(event.id, 80),
        action: safeString(event.action, 40),
        createdAt: safeString(event.created_at, 80),
        actor: actorId ? profileSummary(profilesById.get(actorId) || null) : null,
      };
    });

    queue.push({
      id: jobId,
      status: safeString(job.status, 40),
      eligibilityReason: safeString(job.eligibility_reason, 300),
      caption: safeString(job.caption, 2200),
      altText: safeString(job.alt_text, 1000),
      instagramMediaId: safeString(job.instagram_media_id, 100),
      instagramPermalink: safeString(job.instagram_permalink, 500),
      lastError: safeString(job.last_error, 500),
      attemptCount: Number(job.attempt_count || 0),
      publishedAt: safeString(job.published_at, 80),
      createdAt: safeString(job.created_at, 80),
      updatedAt: safeString(job.updated_at, 80),
      signedPreviewUrl,
      previewError,
      submission: {
        id: submissionId,
        status: safeString(submission.status, 20),
        source: safeString(submission.submission_source, 40) || "website",
        discord: {
          guildId: safeString(submission.discord_guild_id, 40),
          channelId: safeString(submission.discord_channel_id, 40),
          messageId: safeString(submission.discord_message_id, 40),
          attachmentId: safeString(submission.discord_attachment_id, 40),
          userId: safeString(submission.discord_user_id, 40),
        },
        uploader: {
          displayName: displayName(profile),
          discordUsername: safeString(profile.discord_username, 80),
          discordGlobalName: safeString(profile.discord_global_name, 100),
          discordUserId: safeString(profile.discord_user_id, 40),
        },
        title: safeString(submission.title, 80),
        caption: safeString(submission.caption, 300),
        category: safeString(submission.category, 40),
        originalFilename: safeString(submission.original_filename, 255),
        mimeType: safeString(submission.mime_type, 80),
        sizeBytes: Number(submission.size_bytes || 0),
        createdAt: safeString(submission.created_at, 80),
        reviewedAt: safeString(submission.reviewed_at, 80),
        storageBucket: bucket,
        storagePath,
        instagramOptIn: submission.instagram_opt_in === true,
        instagramOptInAt: safeString(submission.instagram_opt_in_at, 80),
        instagramOptInSource: safeString(submission.instagram_opt_in_source, 80),
        instagramOptInCopyVersion: safeString(submission.instagram_opt_in_copy_version, 80),
      },
      events,
    });
  }

  summary.shown = queue.length;

  return jsonResponse({
    ok: true,
    data: {
      jobs: queue,
      count: queue.length,
      status: requestedStatus,
      summary,
      signedUrlSeconds: SIGNED_URL_SECONDS,
    },
    message: queue.length
      ? `${requestedStatus} Instagram publishing jobs loaded.`
      : `No ${requestedStatus} Instagram publishing jobs.`,
  });
});
