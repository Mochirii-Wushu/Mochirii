import {
  fetchMetaGraphOnce,
  META_GRAPH_API_VERSION,
  readBoundedMetaGraphJson,
} from "./meta-graph-security.ts";
import { discordFetch } from "./discord-api.ts";
import {
  exactHttpsUrl,
  fetchWithTimeout,
  readBoundedResponseBytes,
} from "./outbound-http.ts";
import {
  type EventSocialDestination,
  eventSocialDestinationEnabled,
  eventSocialMediaPathIsSafe,
} from "./event-social-schedule.ts";
import { validateSocialPublicationCopy } from "./social-publication-copy.ts";
import { facebookPageObjectEvidence } from "./facebook-page-publishing.ts";

export type EventSocialClaimedJob = {
  id: string;
  occurrence_id: string;
  destination: EventSocialDestination;
  message: string;
  alt_text: string;
  media_path: string;
  media_sha256: string;
  approval_mode: "template";
  template_id: string;
  template_revision: string;
  source_event_id: string;
  title: string;
  starts_at: string;
  publish_at: string;
  provider_secondary_id?: string | null;
  preparation_fingerprint?: string | null;
  preparation_action?: "create" | "poll";
};

export type EventSocialPublishOutcome = {
  outcome: "published" | "failed" | "reconcile_required";
  providerPrimaryId?: string | null;
  providerSecondaryId?: string | null;
  providerPermalink?: string | null;
  failureCategory?: string | null;
  invalidateTemplate?: boolean;
};

export type EventSocialInstagramPreparationOutcome = {
  outcome:
    | "container_created"
    | "pending"
    | "prepared"
    | "failed"
    | "reconcile_required";
  providerSecondaryId?: string | null;
  failureCategory?: string | null;
  invalidateTemplate?: boolean;
};

export type EventSocialProviderConfig = {
  facebook: {
    ready: boolean;
    appSecret: string;
    pageId: string;
    accessToken: string;
  };
  instagram: {
    ready: boolean;
    appSecret: string;
    accountId: string;
    accessToken: string;
  };
  discord: {
    ready: boolean;
    guildId: string;
    channelId: string;
    botToken: string;
  };
};

type PublishDependencies = {
  fetchImpl?: typeof fetch;
  beforeMutation?: (
    stage:
      | "facebook_photo"
      | "instagram_container"
      | "instagram_publish"
      | "discord_message",
  ) => Promise<boolean>;
};

const META_ID_RE = /^\d{5,30}$/;
const DISCORD_ID_RE = /^\d{16,22}$/;
const PROVIDER_ID_RE = /^[A-Za-z0-9_.:-]{1,255}$/;
const EXPECTED_INSTAGRAM_USERNAME = "mochirii_guild";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const SITE_ORIGIN = "https://mochirii.com";
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

async function mutationPreflight(
  deps: PublishDependencies,
  stage: Parameters<NonNullable<PublishDependencies["beforeMutation"]>>[0],
): Promise<boolean> {
  if (!deps.beforeMutation) return true;
  try {
    return await deps.beforeMutation(stage);
  } catch {
    return false;
  }
}

type AttestedMedia = {
  bytes: Uint8Array;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  filename: string;
};

function stringValue(value: unknown, maximum = 1000): string | null {
  const text = String(value ?? "").trim();
  return text && text.length <= maximum ? text : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function mediaUrl(path: string, destination: EventSocialDestination): string {
  return eventSocialMediaPathIsSafe(path, destination)
    ? `${SITE_ORIGIN}${path}`
    : "";
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

async function attestMedia(
  job: EventSocialClaimedJob,
  fetchImpl?: typeof fetch,
): Promise<
  | { ok: true; media: AttestedMedia }
  | { ok: false; result: EventSocialPublishOutcome }
> {
  const rawUrl = mediaUrl(job.media_path, job.destination);
  const url = rawUrl
    ? exactHttpsUrl(rawUrl, {
      allowedOrigins: new Set([SITE_ORIGIN]),
      pathPrefix: "/assets/",
    })
    : null;
  const template = job.approval_mode === "template";
  const unavailable = template
    ? "template_media_attestation_unavailable"
    : "media_attestation_unavailable";
  if (!url) {
    return {
      ok: false,
      result: {
        outcome: "failed",
        failureCategory: unavailable,
        invalidateTemplate: template,
      },
    };
  }
  try {
    const response = await fetchWithTimeout(
      url,
      { headers: { Accept: "image/jpeg,image/png,image/webp" } },
      { timeoutMs: 10_000, fetcher: fetchImpl },
    );
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]
      ?.trim().toLowerCase();
    const allowed = job.destination === "discord"
      ? new Set(["image/jpeg", "image/png", "image/webp"])
      : new Set(["image/jpeg"]);
    if (!response.ok || !contentType || !allowed.has(contentType)) {
      return {
        ok: false,
        result: {
          outcome: "failed",
          failureCategory: unavailable,
          invalidateTemplate: template,
        },
      };
    }
    const bytes = await readBoundedResponseBytes(response, MAX_MEDIA_BYTES);
    const hash = bytes.length ? await sha256Hex(bytes) : "";
    if (hash !== job.media_sha256) {
      return {
        ok: false,
        result: {
          outcome: "failed",
          failureCategory: template
            ? "template_media_attestation_mismatch"
            : "media_attestation_mismatch",
          invalidateTemplate: template,
        },
      };
    }
    const filename = job.media_path.split("/").pop() || "event-image";
    return {
      ok: true,
      media: {
        bytes,
        contentType: contentType as AttestedMedia["contentType"],
        filename,
      },
    };
  } catch {
    return {
      ok: false,
      result: {
        outcome: "failed",
        failureCategory: unavailable,
        invalidateTemplate: template,
      },
    };
  }
}

function mutatingFailure(
  status: number,
  category: string,
): EventSocialPublishOutcome {
  return {
    outcome: status === 429 || status >= 500 ? "reconcile_required" : "failed",
    failureCategory: status === 429 || status >= 500
      ? `${category}_ambiguous`
      : category,
  };
}

function instagramQuota(value: unknown): {
  readable: boolean;
  exhausted: boolean;
} {
  const body = record(value);
  const first = Array.isArray(body.data) ? record(body.data[0]) : body;
  const config = record(first.config);
  const usage = Number(first.quota_usage);
  const total = Number(config.quota_total);
  const readable = Number.isSafeInteger(usage) && usage >= 0 &&
    Number.isSafeInteger(total) && total > 0;
  return { readable, exhausted: readable && usage >= total };
}

function instagramPermalink(value: unknown): string | null {
  const raw = stringValue(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" || url.username || url.password || url.port ||
      !["instagram.com", "www.instagram.com"].includes(
        url.hostname.toLowerCase(),
      ) || parts.length !== 2 || !["p", "reel"].includes(parts[0]) ||
      !/^[A-Za-z0-9_-]+$/.test(parts[1])
    ) return null;
    return `https://www.instagram.com/${parts[0]}/${parts[1]}/`;
  } catch {
    return null;
  }
}

function requiredMetaPins(
  id: string,
  expectedId: string,
  token: string,
  appSecret: string,
  apiVersion: string,
): boolean {
  return META_ID_RE.test(id) && id === expectedId && Boolean(token) &&
    Boolean(appSecret) && apiVersion === META_GRAPH_API_VERSION;
}

export function eventSocialProviderConfig(): EventSocialProviderConfig {
  const appId = Deno.env.get("META_APP_ID")?.trim() || "";
  const expectedAppId = Deno.env.get("META_EXPECTED_APP_ID")?.trim() || "";
  const appSecret = Deno.env.get("META_APP_SECRET")?.trim() || "";
  const pageId = Deno.env.get("FACEBOOK_PAGE_ID")?.trim() || "";
  const expectedPageId = Deno.env.get("FACEBOOK_EXPECTED_PAGE_ID")?.trim() ||
    "";
  const facebookToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")?.trim() ||
    "";
  const instagramId = Deno.env.get("INSTAGRAM_ACCOUNT_ID")?.trim() || "";
  const expectedInstagramId =
    Deno.env.get("INSTAGRAM_EXPECTED_ACCOUNT_ID")?.trim() || "";
  const instagramToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN")?.trim() || "";
  const guildId = Deno.env.get("DISCORD_GUILD_ID")?.trim() || "";
  const channelId =
    Deno.env.get("DISCORD_EVENT_ANNOUNCEMENT_CHANNEL_ID")?.trim() || "";
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN")?.trim() || "";
  const appPinsReady = META_ID_RE.test(appId) && appId === expectedAppId;

  return {
    facebook: {
      ready: appPinsReady && requiredMetaPins(
        pageId,
        expectedPageId,
        facebookToken,
        appSecret,
        Deno.env.get("FACEBOOK_API_VERSION")?.trim() || "",
      ),
      appSecret,
      pageId,
      accessToken: facebookToken,
    },
    instagram: {
      ready: appPinsReady && requiredMetaPins(
        instagramId,
        expectedInstagramId,
        instagramToken,
        appSecret,
        Deno.env.get("INSTAGRAM_API_VERSION")?.trim() || "",
      ),
      appSecret,
      accountId: instagramId,
      accessToken: instagramToken,
    },
    discord: {
      ready: guildId === EXPECTED_DISCORD_GUILD_ID &&
        DISCORD_ID_RE.test(channelId) && Boolean(botToken),
      guildId,
      channelId,
      botToken,
    },
  };
}

export function enabledEventSocialDestinations(
  config = eventSocialProviderConfig(),
): EventSocialDestination[] {
  const enabled: EventSocialDestination[] = [];
  if (
    config.facebook.ready &&
    eventSocialDestinationEnabled(
      Deno.env.get("EVENT_FACEBOOK_PAGE_PUBLISH_ENABLED"),
    ) &&
    eventSocialDestinationEnabled(Deno.env.get("FACEBOOK_PAGE_PUBLISH_ENABLED"))
  ) enabled.push("facebook_page");
  if (
    config.instagram.ready &&
    eventSocialDestinationEnabled(
      Deno.env.get("EVENT_INSTAGRAM_PUBLISH_ENABLED"),
    ) &&
    eventSocialDestinationEnabled(Deno.env.get("INSTAGRAM_PUBLISH_ENABLED"))
  ) enabled.push("instagram");
  if (
    config.discord.ready &&
    eventSocialDestinationEnabled(Deno.env.get("EVENT_DISCORD_PUBLISH_ENABLED"))
  ) enabled.push("discord");
  return enabled;
}

export function eventSocialClaimIsValid(
  value: unknown,
): value is EventSocialClaimedJob {
  const job = record(value);
  const destination = job.destination as EventSocialDestination;
  const copyIsSafe = job.approval_mode === "template" &&
    validateSocialPublicationCopy([job.message, job.alt_text]).ok;
  const instagramPreparationIsValid = destination !== "instagram" || (
    typeof job.provider_secondary_id === "string" &&
    PROVIDER_ID_RE.test(job.provider_secondary_id) &&
    typeof job.preparation_fingerprint === "string" &&
    /^[0-9a-f]{64}$/.test(job.preparation_fingerprint)
  );
  return /^[0-9a-f-]{36}$/i.test(String(job.id ?? "")) &&
    /^[0-9a-f-]{36}$/i.test(String(job.occurrence_id ?? "")) &&
    ["facebook_page", "instagram", "discord"].includes(destination) &&
    Boolean(stringValue(job.message, 500)) &&
    Boolean(stringValue(job.alt_text, 500)) && copyIsSafe &&
    eventSocialMediaPathIsSafe(job.media_path, destination) &&
    /^[0-9a-f]{64}$/.test(String(job.media_sha256 ?? "")) &&
    job.approval_mode === "template" &&
    /^[0-9a-f-]{36}$/i.test(String(job.template_id ?? "")) &&
    /^[0-9a-f]{64}$/.test(String(job.template_revision ?? "")) &&
    Boolean(stringValue(job.source_event_id, 80)) &&
    Number.isFinite(Date.parse(String(job.starts_at ?? ""))) &&
    Number.isFinite(Date.parse(String(job.publish_at ?? ""))) &&
    instagramPreparationIsValid;
}

export function eventSocialInstagramPreparationClaimIsValid(
  value: unknown,
): value is EventSocialClaimedJob & { preparation_action: "create" | "poll" } {
  const job = record(value);
  const action = job.preparation_action;
  const destination = job.destination as EventSocialDestination;
  const copyIsSafe = job.approval_mode === "template" &&
    validateSocialPublicationCopy([job.message, job.alt_text]).ok;
  const common = /^[0-9a-f-]{36}$/i.test(String(job.id ?? "")) &&
    /^[0-9a-f-]{36}$/i.test(String(job.occurrence_id ?? "")) &&
    destination === "instagram" &&
    Boolean(stringValue(job.message, 500)) &&
    Boolean(stringValue(job.alt_text, 500)) && copyIsSafe &&
    eventSocialMediaPathIsSafe(job.media_path, "instagram") &&
    /^[0-9a-f]{64}$/.test(String(job.media_sha256 ?? "")) &&
    /^[0-9a-f-]{36}$/i.test(String(job.template_id ?? "")) &&
    /^[0-9a-f]{64}$/.test(String(job.template_revision ?? "")) &&
    Boolean(stringValue(job.source_event_id, 80)) &&
    Number.isFinite(Date.parse(String(job.starts_at ?? ""))) &&
    Number.isFinite(Date.parse(String(job.publish_at ?? "")));
  if (!common || (action !== "create" && action !== "poll")) return false;
  if (action === "create") {
    return job.provider_secondary_id == null &&
      job.preparation_fingerprint == null;
  }
  return typeof job.provider_secondary_id === "string" &&
    PROVIDER_ID_RE.test(job.provider_secondary_id) &&
    typeof job.preparation_fingerprint === "string" &&
    /^[0-9a-f]{64}$/.test(job.preparation_fingerprint);
}

async function publishFacebook(
  job: EventSocialClaimedJob,
  config: EventSocialProviderConfig["facebook"],
  deps: PublishDependencies,
): Promise<EventSocialPublishOutcome> {
  if (!config.ready) {
    return { outcome: "failed", failureCategory: "facebook_not_configured" };
  }
  const imageUrl = mediaUrl(job.media_path, "facebook_page");
  if (!imageUrl) {
    return { outcome: "failed", failureCategory: "media_path_invalid" };
  }

  let providerMutationStarted = false;
  try {
    const identity = await fetchMetaGraphOnce({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      path: config.pageId,
      query: { fields: "id,tasks" },
      fetchImpl: deps.fetchImpl,
    });
    const identityBody = await readBoundedMetaGraphJson(identity);
    const tasks = Array.isArray(identityBody.tasks) ? identityBody.tasks : [];
    if (
      !identity.ok || identityBody.id !== config.pageId ||
      !tasks.some((task) =>
        task === "CREATE_CONTENT" || task === "PROFILE_PLUS_CREATE_CONTENT"
      )
    ) {
      return {
        outcome: "failed",
        failureCategory: "facebook_identity_mismatch",
      };
    }

    if (!await mutationPreflight(deps, "facebook_photo")) {
      return {
        outcome: "failed",
        failureCategory: "publication_preflight_rejected",
      };
    }
    providerMutationStarted = true;
    const body = new URLSearchParams({
      url: imageUrl,
      message: job.message,
      alt_text_custom: job.alt_text,
    });
    const created = await fetchMetaGraphOnce({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      path: `${config.pageId}/photos`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
      fetchImpl: deps.fetchImpl,
      timeoutMs: 60_000,
    });
    const createdBody = await readBoundedMetaGraphJson(created);
    if (!created.ok) {
      return mutatingFailure(created.status, "facebook_publish_rejected");
    }
    const photoId = stringValue(createdBody.id, 255);
    const postId = stringValue(createdBody.post_id, 255);
    if (
      !photoId || !PROVIDER_ID_RE.test(photoId) ||
      !postId || !PROVIDER_ID_RE.test(postId)
    ) {
      return {
        outcome: "reconcile_required",
        providerPrimaryId: photoId && PROVIDER_ID_RE.test(photoId)
          ? photoId
          : null,
        providerSecondaryId: postId && PROVIDER_ID_RE.test(postId)
          ? postId
          : null,
        failureCategory: "facebook_created_identity_missing",
      };
    }

    const verifiedPermalinks: string[] = [];
    for (const objectId of [photoId, postId]) {
      const verification = await fetchMetaGraphOnce({
        accessToken: config.accessToken,
        appSecret: config.appSecret,
        path: objectId,
        query: { fields: "id,from{id},permalink_url,link" },
        fetchImpl: deps.fetchImpl,
      });
      const verified = verification.ok
        ? await readBoundedMetaGraphJson(verification)
        : null;
      const evidence = facebookPageObjectEvidence(
        verified,
        objectId,
        config.pageId,
      );
      if (!verification.ok || !evidence.verified || !evidence.permalink) {
        return {
          outcome: "reconcile_required",
          providerPrimaryId: photoId,
          providerSecondaryId: postId,
          failureCategory: "facebook_ownership_unverified",
        };
      }
      verifiedPermalinks.push(evidence.permalink);
    }
    const canonicalPostPermalink = verifiedPermalinks[1];
    return {
      outcome: "published",
      providerPrimaryId: photoId,
      providerSecondaryId: postId,
      providerPermalink: canonicalPostPermalink,
    };
  } catch {
    return {
      outcome: providerMutationStarted ? "reconcile_required" : "failed",
      failureCategory: providerMutationStarted
        ? "facebook_transport_ambiguous"
        : "facebook_prepublication_read_failed",
    };
  }
}

async function validateInstagramIdentityAndQuota(
  config: EventSocialProviderConfig["instagram"],
  deps: PublishDependencies,
): Promise<EventSocialPublishOutcome | null> {
  const identity = await fetchMetaGraphOnce({
    accessToken: config.accessToken,
    appSecret: config.appSecret,
    path: config.accountId,
    query: { fields: "id,username,account_type" },
    fetchImpl: deps.fetchImpl,
  });
  const identityBody = await readBoundedMetaGraphJson(identity);
  if (
    !identity.ok || identityBody.id !== config.accountId ||
    identityBody.username !== EXPECTED_INSTAGRAM_USERNAME ||
    identityBody.account_type !== "BUSINESS"
  ) {
    return {
      outcome: "failed",
      failureCategory: "instagram_identity_mismatch",
    };
  }

  const quota = await fetchMetaGraphOnce({
    accessToken: config.accessToken,
    appSecret: config.appSecret,
    path: `${config.accountId}/content_publishing_limit`,
    query: { fields: "quota_usage,config" },
    fetchImpl: deps.fetchImpl,
  });
  const quotaBody = await readBoundedMetaGraphJson(quota);
  const quotaState = instagramQuota(quotaBody);
  if (!quota.ok || !quotaState.readable || quotaState.exhausted) {
    return {
      outcome: "failed",
      failureCategory: quotaState.exhausted
        ? "instagram_quota_exhausted"
        : "instagram_quota_unreadable",
    };
  }
  return null;
}

export async function prepareEventSocialInstagramJob(
  job: EventSocialClaimedJob & { preparation_action: "create" | "poll" },
  config = eventSocialProviderConfig().instagram,
  deps: PublishDependencies = {},
): Promise<EventSocialInstagramPreparationOutcome> {
  if (!eventSocialInstagramPreparationClaimIsValid(job)) {
    return { outcome: "failed", failureCategory: "preparation_claim_invalid" };
  }
  if (!config.ready) {
    return { outcome: "failed", failureCategory: "instagram_not_configured" };
  }

  if (job.preparation_action === "poll") {
    const containerId = job.provider_secondary_id!;
    try {
      const statusResponse = await fetchMetaGraphOnce({
        accessToken: config.accessToken,
        appSecret: config.appSecret,
        path: containerId,
        query: { fields: "id,status_code" },
        fetchImpl: deps.fetchImpl,
        timeoutMs: 30_000,
      });
      const statusBody = await readBoundedMetaGraphJson(statusResponse);
      if (!statusResponse.ok || statusBody.id !== containerId) {
        return {
          outcome: "pending",
          providerSecondaryId: containerId,
          failureCategory: "instagram_container_status_unavailable",
        };
      }
      if (statusBody.status_code === "FINISHED") {
        return { outcome: "prepared", providerSecondaryId: containerId };
      }
      if (
        statusBody.status_code === "ERROR" ||
        statusBody.status_code === "EXPIRED"
      ) {
        return {
          outcome: "failed",
          providerSecondaryId: containerId,
          failureCategory: "instagram_container_terminal_failure",
        };
      }
      if (statusBody.status_code === "PUBLISHED") {
        return {
          outcome: "reconcile_required",
          providerSecondaryId: containerId,
          failureCategory: "instagram_container_unexpectedly_published",
        };
      }
      return {
        outcome: "pending",
        providerSecondaryId: containerId,
        failureCategory: "instagram_container_not_ready",
      };
    } catch {
      return {
        outcome: "pending",
        providerSecondaryId: containerId,
        failureCategory: "instagram_container_status_unavailable",
      };
    }
  }

  const imageUrl = mediaUrl(job.media_path, "instagram");
  if (!imageUrl || !job.alt_text) {
    return { outcome: "failed", failureCategory: "instagram_media_invalid" };
  }
  const attested = await attestMedia(job, deps.fetchImpl);
  if (!attested.ok) {
    return {
      outcome: "failed",
      failureCategory: attested.result.failureCategory,
      invalidateTemplate: attested.result.invalidateTemplate,
    };
  }

  let containerMutationStarted = false;
  try {
    const validationFailure = await validateInstagramIdentityAndQuota(
      config,
      deps,
    );
    if (validationFailure) {
      return {
        outcome: "failed",
        failureCategory: validationFailure.failureCategory,
      };
    }
    if (!await mutationPreflight(deps, "instagram_container")) {
      return {
        outcome: "failed",
        failureCategory: "publication_preflight_rejected",
      };
    }
    containerMutationStarted = true;
    const created = await fetchMetaGraphOnce({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      path: `${config.accountId}/media`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image_url: imageUrl,
          caption: job.message,
          alt_text: job.alt_text,
        }),
      },
      fetchImpl: deps.fetchImpl,
      timeoutMs: 60_000,
    });
    const createdBody = await readBoundedMetaGraphJson(created);
    if (!created.ok) {
      return {
        outcome: "failed",
        failureCategory: created.status === 429 || created.status >= 500
          ? "instagram_container_creation_ambiguous"
          : "instagram_container_rejected",
      };
    }
    const containerId = stringValue(createdBody.id, 255);
    if (!containerId || !PROVIDER_ID_RE.test(containerId)) {
      return {
        outcome: "failed",
        failureCategory: "instagram_container_identity_missing",
      };
    }
    return { outcome: "container_created", providerSecondaryId: containerId };
  } catch {
    return {
      outcome: "failed",
      failureCategory: containerMutationStarted
        ? "instagram_container_transport_ambiguous"
        : "instagram_preparation_read_failed",
    };
  }
}

async function publishInstagram(
  job: EventSocialClaimedJob,
  config: EventSocialProviderConfig["instagram"],
  deps: PublishDependencies,
): Promise<EventSocialPublishOutcome> {
  if (!config.ready) {
    return { outcome: "failed", failureCategory: "instagram_not_configured" };
  }
  const containerId = stringValue(job.provider_secondary_id, 255);
  if (
    !containerId || !PROVIDER_ID_RE.test(containerId) ||
    !/^[0-9a-f]{64}$/.test(job.preparation_fingerprint || "")
  ) {
    return { outcome: "failed", failureCategory: "instagram_not_prepared" };
  }

  let providerMutationStarted = false;
  try {
    const validationFailure = await validateInstagramIdentityAndQuota(
      config,
      deps,
    );
    if (validationFailure) return validationFailure;

    const statusResponse = await fetchMetaGraphOnce({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      path: containerId,
      query: { fields: "id,status_code" },
      fetchImpl: deps.fetchImpl,
      timeoutMs: 30_000,
    });
    const statusBody = await readBoundedMetaGraphJson(statusResponse);
    if (
      !statusResponse.ok || statusBody.id !== containerId ||
      statusBody.status_code !== "FINISHED"
    ) {
      return {
        outcome: statusBody.status_code === "PUBLISHED"
          ? "reconcile_required"
          : "failed",
        providerSecondaryId: containerId,
        failureCategory: statusBody.status_code === "PUBLISHED"
          ? "instagram_container_unexpectedly_published"
          : "instagram_container_not_ready_at_publish_time",
      };
    }

    if (!await mutationPreflight(deps, "instagram_publish")) {
      return {
        outcome: "failed",
        providerSecondaryId: containerId,
        failureCategory: "publication_preflight_rejected",
      };
    }
    providerMutationStarted = true;
    const published = await fetchMetaGraphOnce({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      path: `${config.accountId}/media_publish`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ creation_id: containerId }),
      },
      fetchImpl: deps.fetchImpl,
      timeoutMs: 60_000,
    });
    const publishedBody = await readBoundedMetaGraphJson(published);
    if (!published.ok) {
      const failure = mutatingFailure(
        published.status,
        "instagram_publish_rejected",
      );
      return { ...failure, providerSecondaryId: containerId };
    }
    const mediaId = stringValue(publishedBody.id, 255);
    if (!mediaId || !PROVIDER_ID_RE.test(mediaId)) {
      return {
        outcome: "reconcile_required",
        providerSecondaryId: containerId,
        failureCategory: "instagram_published_identity_missing",
      };
    }

    const verification = await fetchMetaGraphOnce({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      path: mediaId,
      query: { fields: "id,owner,username,permalink,media_type" },
      fetchImpl: deps.fetchImpl,
    });
    const verified = await readBoundedMetaGraphJson(verification);
    const owner = record(verified.owner);
    const permalink = instagramPermalink(verified.permalink);
    if (
      !verification.ok || verified.id !== mediaId ||
      owner.id !== config.accountId ||
      verified.username !== EXPECTED_INSTAGRAM_USERNAME ||
      verified.media_type !== "IMAGE" || !permalink
    ) {
      return {
        outcome: "reconcile_required",
        providerPrimaryId: mediaId,
        providerSecondaryId: containerId,
        failureCategory: "instagram_ownership_unverified",
      };
    }
    return {
      outcome: "published",
      providerPrimaryId: mediaId,
      providerSecondaryId: containerId,
      providerPermalink: permalink,
    };
  } catch {
    return {
      outcome: providerMutationStarted ? "reconcile_required" : "failed",
      providerSecondaryId: containerId,
      failureCategory: providerMutationStarted
        ? "instagram_transport_ambiguous"
        : "instagram_prepublication_read_failed",
    };
  }
}

async function publishDiscord(
  job: EventSocialClaimedJob,
  config: EventSocialProviderConfig["discord"],
  media: AttestedMedia,
  deps: PublishDependencies,
): Promise<EventSocialPublishOutcome> {
  if (!config.ready) {
    return { outcome: "failed", failureCategory: "discord_not_configured" };
  }
  let providerMutationStarted = false;
  try {
    const payload = {
      content: job.message,
      allowed_mentions: { parse: [] },
      attachments: [{
        id: 0,
        filename: media.filename,
        description: job.alt_text,
      }],
    };
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));
    form.append(
      "files[0]",
      new Blob([Uint8Array.from(media.bytes)], { type: media.contentType }),
      media.filename,
    );
    if (!await mutationPreflight(deps, "discord_message")) {
      return {
        outcome: "failed",
        failureCategory: "publication_preflight_rejected",
      };
    }
    providerMutationStarted = true;
    const response = await discordFetch(
      `/channels/${config.channelId}/messages`,
      {
        method: "POST",
        token: config.botToken,
        fetcher: deps.fetchImpl,
        body: form,
        timeoutMs: 10_000,
        maximumResponseBytes: 64 * 1024,
      },
    );
    if (!response.ok) {
      return mutatingFailure(response.status, "discord_publish_rejected");
    }
    const message = record(response.data);
    const messageId = stringValue(message.id, 30);
    const attachments = Array.isArray(message.attachments)
      ? message.attachments.map(record)
      : [];
    const attachment = attachments[0] || {};
    const attachmentId = stringValue(attachment.id, 30);
    if (
      !messageId || !DISCORD_ID_RE.test(messageId) ||
      message.channel_id !== config.channelId || attachments.length !== 1 ||
      !attachmentId || !DISCORD_ID_RE.test(attachmentId) ||
      attachment.filename !== media.filename ||
      attachment.description !== job.alt_text ||
      attachment.content_type !== media.contentType ||
      attachment.size !== media.bytes.length
    ) {
      return {
        outcome: "reconcile_required",
        failureCategory: "discord_message_identity_missing",
      };
    }
    return { outcome: "published", providerPrimaryId: messageId };
  } catch {
    return {
      outcome: providerMutationStarted ? "reconcile_required" : "failed",
      failureCategory: providerMutationStarted
        ? "discord_transport_ambiguous"
        : "discord_prepublication_failed",
    };
  }
}

export async function publishEventSocialJob(
  job: EventSocialClaimedJob,
  config = eventSocialProviderConfig(),
  deps: PublishDependencies = {},
): Promise<EventSocialPublishOutcome> {
  if (!eventSocialClaimIsValid(job)) {
    return { outcome: "failed", failureCategory: "claimed_job_invalid" };
  }
  const attested = await attestMedia(job, deps.fetchImpl);
  if (!attested.ok) return attested.result;
  if (job.destination === "facebook_page") {
    return await publishFacebook(job, config.facebook, deps);
  }
  if (job.destination === "instagram") {
    return await publishInstagram(job, config.instagram, deps);
  }
  return await publishDiscord(job, config.discord, attested.media, deps);
}
