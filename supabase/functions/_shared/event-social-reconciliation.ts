import { discordFetch } from "./discord-api.ts";
import {
  type EventSocialDestination,
  eventSocialMediaPathIsSafe,
} from "./event-social-schedule.ts";
import {
  facebookPageConfig,
  facebookPageObjectEvidence,
  normalizeFacebookPermalink,
} from "./facebook-page-publishing.ts";
import {
  fetchMetaGraphOnce,
  readBoundedMetaGraphJson,
} from "./meta-graph-security.ts";
import {
  instagramConfig,
  instagramMediaObjectEvidence,
  normalizeInstagramPostPermalink,
} from "./instagram-publishing.ts";
import { fetchWithTimeout, readBoundedResponseBytes } from "./outbound-http.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_ID_RE = /^[A-Za-z0-9_.:-]{1,255}$/;
const DISCORD_ID_RE = /^\d{16,22}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const DESTINATIONS = new Set<EventSocialDestination>([
  "facebook_page",
  "instagram",
  "discord",
]);
const DISCORD_CHANNEL_TYPES = new Set([0, 5]);
const DISCORD_ATTACHMENT_ORIGIN = "https://cdn.discordapp.com";
const DISCORD_ATTACHMENT_QUERY_KEYS = new Set(["ex", "is", "hm"]);
const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;

export type EventSocialReconciliationProviderConfig = Readonly<{
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
}>;

export type EventSocialReconciliationSnapshot = Readonly<{
  id: string;
  destination: EventSocialDestination;
  status: "reconcile_required";
  message: string;
  altText: string;
  mediaPath: string;
  mediaSha256: string;
  providerPrimaryId: string | null;
  providerSecondaryId: string | null;
  providerPermalink: string | null;
  updatedAt: string;
  destinationEnabled: false;
}>;

export type EventSocialReconciliationEvidence = Readonly<{
  providerPrimaryId: string | null;
  providerSecondaryId: string | null;
  providerPermalink: string | null;
}>;

export type EventSocialVerifiedPublication = Readonly<{
  providerPrimaryId: string;
  providerSecondaryId: string | null;
  providerPermalink: string | null;
}>;

export type EventSocialProviderReadbackResult =
  | { ok: true; evidence: EventSocialVerifiedPublication }
  | {
    ok: false;
    status: 409 | 503;
    error: string;
    message: string;
  };

type ReconciliationDependencies = {
  fetchImpl?: typeof fetch;
};

export function eventSocialReconciliationProviderConfig(): EventSocialReconciliationProviderConfig {
  const facebook = facebookPageConfig();
  const instagram = instagramConfig();
  const discordGuildId = Deno.env.get("DISCORD_GUILD_ID")?.trim() || "";
  const discordChannelId = Deno.env.get(
    "DISCORD_EVENT_ANNOUNCEMENT_CHANNEL_ID",
  )?.trim() || "";
  const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN")?.trim() || "";
  return {
    facebook: {
      ready: facebook.configured,
      appSecret: facebook.appSecret,
      pageId: facebook.pageId,
      accessToken: facebook.accessToken,
    },
    instagram: {
      ready: instagram.configured && instagram.accountIdPinned,
      appSecret: instagram.appSecret,
      accountId: instagram.accountId,
      accessToken: instagram.accessToken,
    },
    discord: {
      ready: discordGuildId === EXPECTED_DISCORD_GUILD_ID &&
        DISCORD_ID_RE.test(discordChannelId) && Boolean(discordBotToken),
      guildId: discordGuildId,
      channelId: discordChannelId,
      botToken: discordBotToken,
    },
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function exactBoundedString(
  value: unknown,
  maximum: number,
): string | null {
  if (
    typeof value !== "string" || value.length < 1 ||
    value.length > maximum || !value.trim()
  ) return null;
  if (
    Array.from(value).some((character) => {
      const code = character.codePointAt(0) || 0;
      return (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
        code === 0x7f;
    })
  ) {
    return null;
  }
  return value;
}

function optionalProviderId(value: unknown): {
  valid: boolean;
  value: string | null;
} {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }
  return typeof value === "string" && PROVIDER_ID_RE.test(value)
    ? { valid: true, value }
    : { valid: false, value: null };
}

function optionalPermalink(value: unknown): {
  valid: boolean;
  value: string | null;
} {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }
  const text = exactBoundedString(value, 1000);
  return text ? { valid: true, value: text } : { valid: false, value: null };
}

function isoTimestamp(value: unknown): string | null {
  const text = exactBoundedString(value, 80);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

function destination(value: unknown): EventSocialDestination | null {
  return typeof value === "string" &&
      DESTINATIONS.has(value as EventSocialDestination)
    ? value as EventSocialDestination
    : null;
}

export function boundedEventSocialReconciliationNote(
  value: unknown,
): string | null {
  const note = exactBoundedString(value, 500);
  return note ? note.trim() : null;
}

export function parseEventSocialReconciliationEvidence(
  value: unknown,
): EventSocialReconciliationEvidence | null {
  const body = asRecord(value);
  const primary = optionalProviderId(body.provider_primary_id);
  const secondary = optionalProviderId(body.provider_secondary_id);
  const permalink = optionalPermalink(body.provider_permalink);
  if (!primary.valid || !secondary.valid || !permalink.valid) return null;
  return {
    providerPrimaryId: primary.value,
    providerSecondaryId: secondary.value,
    providerPermalink: permalink.value,
  };
}

export function parseEventSocialReconciliationSnapshot(
  value: unknown,
  expectedJobId: string,
): EventSocialReconciliationSnapshot | null {
  if (!UUID_RE.test(expectedJobId)) return null;
  const root = asRecord(value);
  const nestedJob = asRecord(root.job);
  const job = Object.keys(nestedJob).length ? nestedJob : root;
  const selectedDestination = destination(job.destination);
  const message = exactBoundedString(job.message, 500);
  const altText = exactBoundedString(job.alt_text, 500);
  const mediaPath = exactBoundedString(job.media_path, 300);
  const mediaSha256 = exactBoundedString(job.media_sha256, 64);
  const updatedAt = isoTimestamp(job.updated_at);
  const primary = optionalProviderId(job.provider_primary_id);
  const secondary = optionalProviderId(job.provider_secondary_id);
  const permalink = optionalPermalink(job.provider_permalink);
  const destinationEnabled = root.destination_enabled ??
    job.destination_enabled;

  if (
    job.id !== expectedJobId || !selectedDestination ||
    job.status !== "reconcile_required" || !message || !altText ||
    !mediaPath || !mediaSha256 || !SHA256_RE.test(mediaSha256) ||
    !eventSocialMediaPathIsSafe(mediaPath, selectedDestination) ||
    !updatedAt || !primary.valid || !secondary.valid || !permalink.valid ||
    destinationEnabled !== false
  ) return null;

  return {
    id: expectedJobId,
    destination: selectedDestination,
    status: "reconcile_required",
    message,
    altText,
    mediaPath,
    mediaSha256,
    providerPrimaryId: primary.value,
    providerSecondaryId: secondary.value,
    providerPermalink: permalink.value,
    updatedAt,
    destinationEnabled: false,
  };
}

function mergeEvidence(
  snapshot: EventSocialReconciliationSnapshot,
  requested: EventSocialReconciliationEvidence,
): EventSocialReconciliationEvidence | null {
  if (
    snapshot.providerPrimaryId && requested.providerPrimaryId &&
    snapshot.providerPrimaryId !== requested.providerPrimaryId
  ) return null;
  if (
    snapshot.providerSecondaryId && requested.providerSecondaryId &&
    snapshot.providerSecondaryId !== requested.providerSecondaryId
  ) return null;
  if (
    snapshot.providerPermalink && requested.providerPermalink &&
    snapshot.providerPermalink !== requested.providerPermalink
  ) return null;
  return {
    providerPrimaryId: snapshot.providerPrimaryId ||
      requested.providerPrimaryId,
    providerSecondaryId: snapshot.providerSecondaryId ||
      requested.providerSecondaryId,
    providerPermalink: snapshot.providerPermalink ||
      requested.providerPermalink,
  };
}

export function confirmedNotPublishedEvidenceIsSafe(
  snapshot: EventSocialReconciliationSnapshot,
  requested: EventSocialReconciliationEvidence,
  note: unknown,
): boolean {
  return Boolean(boundedEventSocialReconciliationNote(note)) &&
    snapshot.destinationEnabled === false &&
    snapshot.providerPrimaryId === null &&
    snapshot.providerSecondaryId === null &&
    snapshot.providerPermalink === null &&
    requested.providerPrimaryId === null &&
    requested.providerSecondaryId === null &&
    requested.providerPermalink === null;
}

function readbackFailure(
  error: string,
  message: string,
  status: 409 | 503 = 409,
): EventSocialProviderReadbackResult {
  return { ok: false, error, message, status };
}

async function verifyFacebookPublication(
  snapshot: EventSocialReconciliationSnapshot,
  requested: EventSocialReconciliationEvidence,
  config: EventSocialReconciliationProviderConfig["facebook"],
  deps: ReconciliationDependencies,
): Promise<EventSocialProviderReadbackResult> {
  const merged = mergeEvidence(snapshot, requested);
  if (!merged?.providerPrimaryId) {
    return readbackFailure(
      "facebook_reconciliation_evidence_required",
      "A Facebook photo id is required for provider readback.",
    );
  }
  const expectedPermalink = merged.providerPermalink
    ? normalizeFacebookPermalink(merged.providerPermalink)
    : null;
  if (merged.providerPermalink && !expectedPermalink) {
    return readbackFailure(
      "facebook_reconciliation_evidence_invalid",
      "The Facebook publication evidence is invalid.",
    );
  }
  if (!config.ready) {
    return readbackFailure(
      "facebook_reconciliation_unavailable",
      "The pinned Facebook Page credentials are not ready for readback.",
      503,
    );
  }

  const ids = [
    merged.providerPrimaryId,
    ...(merged.providerSecondaryId ? [merged.providerSecondaryId] : []),
  ];
  const verifiedPermalinks: string[] = [];
  for (const [index, objectId] of ids.entries()) {
    try {
      const response = await fetchMetaGraphOnce({
        accessToken: config.accessToken,
        appSecret: config.appSecret,
        path: objectId,
        query: { fields: "id,from{id},permalink_url,link" },
        fetchImpl: deps.fetchImpl,
        timeoutMs: 20_000,
      });
      const body = response.ok
        ? await readBoundedMetaGraphJson(response)
        : null;
      const evidence = facebookPageObjectEvidence(
        body,
        objectId,
        config.pageId,
      );
      if (!response.ok || !evidence.verified || !evidence.permalink) {
        return readbackFailure(
          "facebook_reconciliation_verification_failed",
          "The Facebook object is not a canonical post from the pinned Page.",
        );
      }
      verifiedPermalinks[index] = evidence.permalink;
    } catch {
      return readbackFailure(
        "facebook_reconciliation_unavailable",
        "The Facebook publication could not be read back safely.",
        503,
      );
    }
  }

  const canonicalPermalink = merged.providerSecondaryId
    ? verifiedPermalinks[1]
    : verifiedPermalinks[0];
  if (
    !canonicalPermalink ||
    (expectedPermalink && expectedPermalink !== canonicalPermalink)
  ) {
    return readbackFailure(
      "facebook_reconciliation_permalink_mismatch",
      "The Facebook permalink does not match the pinned Page object.",
    );
  }
  return {
    ok: true,
    evidence: {
      providerPrimaryId: merged.providerPrimaryId,
      providerSecondaryId: merged.providerSecondaryId,
      providerPermalink: canonicalPermalink,
    },
  };
}

async function verifyInstagramPublication(
  snapshot: EventSocialReconciliationSnapshot,
  requested: EventSocialReconciliationEvidence,
  config: EventSocialReconciliationProviderConfig["instagram"],
  deps: ReconciliationDependencies,
): Promise<EventSocialProviderReadbackResult> {
  if (
    !snapshot.providerSecondaryId ||
    (requested.providerSecondaryId !== null &&
      requested.providerSecondaryId !== snapshot.providerSecondaryId)
  ) {
    return readbackFailure(
      "instagram_reconciliation_container_mismatch",
      "The Instagram container does not match the server-recorded publication attempt.",
    );
  }
  const merged = mergeEvidence(snapshot, requested);
  if (!merged?.providerPrimaryId) {
    return readbackFailure(
      "instagram_reconciliation_evidence_required",
      "An Instagram media id is required for provider readback.",
    );
  }
  const expectedPermalink = merged.providerPermalink
    ? normalizeInstagramPostPermalink(merged.providerPermalink)
    : null;
  if (merged.providerPermalink && !expectedPermalink) {
    return readbackFailure(
      "instagram_reconciliation_evidence_invalid",
      "The Instagram publication evidence is invalid.",
    );
  }
  if (!config.ready) {
    return readbackFailure(
      "instagram_reconciliation_unavailable",
      "The pinned Instagram credentials are not ready for readback.",
      503,
    );
  }

  try {
    const response = await fetchMetaGraphOnce({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      path: merged.providerPrimaryId,
      query: { fields: "id,owner,username,permalink,media_type" },
      fetchImpl: deps.fetchImpl,
      timeoutMs: 20_000,
    });
    const body = response.ok ? await readBoundedMetaGraphJson(response) : null;
    const evidence = instagramMediaObjectEvidence(
      body,
      merged.providerPrimaryId,
      config.accountId,
    );
    if (
      !response.ok || !evidence.verified || !evidence.permalink ||
      (expectedPermalink && expectedPermalink !== evidence.permalink)
    ) {
      return readbackFailure(
        "instagram_reconciliation_verification_failed",
        "The media is not a canonical image from @mochirii_guild.",
      );
    }
    return {
      ok: true,
      evidence: {
        providerPrimaryId: merged.providerPrimaryId,
        providerSecondaryId: snapshot.providerSecondaryId,
        providerPermalink: evidence.permalink,
      },
    };
  } catch {
    return readbackFailure(
      "instagram_reconciliation_unavailable",
      "The Instagram publication could not be read back safely.",
      503,
    );
  }
}

function discordContentType(path: string): string | null {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

function discordAttachmentUrl(
  value: unknown,
  channelId: string,
  attachmentId: string,
  filename: string,
): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.origin !== DISCORD_ATTACHMENT_ORIGIN ||
      url.username || url.password || url.port || url.hash ||
      /%(?:2f|5c)/iu.test(url.pathname)
    ) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      segments.length !== 4 || segments[0] !== "attachments" ||
      segments[1] !== channelId || segments[2] !== attachmentId ||
      decodeURIComponent(segments[3]) !== filename
    ) return null;
    const seen = new Set<string>();
    for (const [key, queryValue] of url.searchParams.entries()) {
      if (
        !DISCORD_ATTACHMENT_QUERY_KEYS.has(key) || seen.has(key) ||
        !/^[0-9a-f]{1,256}$/iu.test(queryValue)
      ) return null;
      seen.add(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function verifyDiscordPublication(
  snapshot: EventSocialReconciliationSnapshot,
  requested: EventSocialReconciliationEvidence,
  config: EventSocialReconciliationProviderConfig["discord"],
  deps: ReconciliationDependencies,
): Promise<EventSocialProviderReadbackResult> {
  const merged = mergeEvidence(snapshot, requested);
  const messageId = merged?.providerPrimaryId;
  if (
    !messageId || !DISCORD_ID_RE.test(messageId) ||
    merged?.providerSecondaryId || merged?.providerPermalink
  ) {
    return readbackFailure(
      "discord_reconciliation_evidence_required",
      "A single Discord message id is required for provider readback.",
    );
  }
  if (!config.ready) {
    return readbackFailure(
      "discord_reconciliation_unavailable",
      "The pinned Discord destination is not ready for readback.",
      503,
    );
  }

  try {
    const commonOptions = {
      token: config.botToken,
      fetcher: deps.fetchImpl,
      timeoutMs: 10_000,
      maximumResponseBytes: MAX_PROVIDER_RESPONSE_BYTES,
    };
    const [botResponse, channelResponse] = await Promise.all([
      discordFetch("/users/@me", commonOptions),
      discordFetch(`/channels/${config.channelId}`, commonOptions),
    ]);
    const bot = asRecord(botResponse.data);
    const channel = asRecord(channelResponse.data);
    const botId = exactBoundedString(bot.id, 22);
    if (
      !botResponse.ok || !botId || !DISCORD_ID_RE.test(botId) ||
      bot.bot !== true || !channelResponse.ok ||
      channel.id !== config.channelId || channel.guild_id !== config.guildId ||
      !DISCORD_CHANNEL_TYPES.has(Number(channel.type))
    ) {
      return readbackFailure(
        "discord_reconciliation_identity_mismatch",
        "The Discord bot or destination channel did not match the pinned guild.",
      );
    }

    const messageResponse = await discordFetch(
      `/channels/${config.channelId}/messages/${messageId}`,
      commonOptions,
    );
    const message = asRecord(messageResponse.data);
    const author = asRecord(message.author);
    const attachments = Array.isArray(message.attachments)
      ? message.attachments.map(asRecord)
      : [];
    const attachment = attachments[0] || {};
    const attachmentId = exactBoundedString(attachment.id, 22);
    const expectedFilename = snapshot.mediaPath.split("/").pop() || "";
    const expectedContentType = discordContentType(snapshot.mediaPath);
    const attachmentSize = Number(attachment.size);
    const attachmentUrl = attachmentId
      ? discordAttachmentUrl(
        attachment.url,
        config.channelId,
        attachmentId,
        expectedFilename,
      )
      : null;
    if (
      !messageResponse.ok || message.id !== messageId ||
      message.channel_id !== config.channelId ||
      author.id !== botId ||
      author.bot !== true || message.content !== snapshot.message ||
      attachments.length !== 1 || !attachmentId ||
      !DISCORD_ID_RE.test(attachmentId) ||
      attachment.filename !== expectedFilename ||
      attachment.description !== snapshot.altText ||
      attachment.content_type !== expectedContentType ||
      !Number.isSafeInteger(attachmentSize) || attachmentSize < 1 ||
      attachmentSize > MAX_ATTACHMENT_BYTES || !attachmentUrl ||
      !expectedContentType
    ) {
      return readbackFailure(
        "discord_reconciliation_message_mismatch",
        "The Discord message did not match the approved event publication.",
      );
    }

    const mediaResponse = await fetchWithTimeout(
      attachmentUrl,
      { headers: { Accept: expectedContentType } },
      { fetcher: deps.fetchImpl, timeoutMs: 10_000 },
    );
    const responseContentType = mediaResponse.headers.get("content-type")
      ?.split(";", 1)[0]?.trim().toLowerCase();
    if (!mediaResponse.ok || responseContentType !== expectedContentType) {
      return readbackFailure(
        "discord_reconciliation_attachment_unavailable",
        "The Discord attachment could not be verified.",
        503,
      );
    }
    const bytes = await readBoundedResponseBytes(
      mediaResponse,
      MAX_ATTACHMENT_BYTES,
    );
    if (
      bytes.length !== attachmentSize ||
      await sha256Hex(bytes) !== snapshot.mediaSha256
    ) {
      return readbackFailure(
        "discord_reconciliation_attachment_mismatch",
        "The Discord attachment did not match the approved event image.",
      );
    }
    return {
      ok: true,
      evidence: {
        providerPrimaryId: messageId,
        providerSecondaryId: null,
        providerPermalink: null,
      },
    };
  } catch {
    return readbackFailure(
      "discord_reconciliation_unavailable",
      "The Discord publication could not be read back safely.",
      503,
    );
  }
}

export async function verifyEventSocialProviderPublication(
  snapshot: EventSocialReconciliationSnapshot,
  requested: EventSocialReconciliationEvidence,
  config = eventSocialReconciliationProviderConfig(),
  deps: ReconciliationDependencies = {},
): Promise<EventSocialProviderReadbackResult> {
  if (snapshot.destination === "facebook_page") {
    return await verifyFacebookPublication(
      snapshot,
      requested,
      config.facebook,
      deps,
    );
  }
  if (snapshot.destination === "instagram") {
    return await verifyInstagramPublication(
      snapshot,
      requested,
      config.instagram,
      deps,
    );
  }
  return await verifyDiscordPublication(
    snapshot,
    requested,
    config.discord,
    deps,
  );
}

export function eventSocialReconciliationPublicDto(
  value: unknown,
  snapshot: EventSocialReconciliationSnapshot,
  resolution: "confirmed_published" | "confirmed_not_published",
): {
  jobId: string;
  destination: EventSocialDestination;
  status: "published" | "failed";
  updatedAt: string;
  destinationEnabled: false;
} | null {
  const root = asRecord(value);
  const job = asRecord(root.job);
  const updatedAt = isoTimestamp(job.updated_at);
  const expectedStatus = resolution === "confirmed_published"
    ? "published"
    : "failed";
  if (
    root.committed !== true || root.destination_enabled !== false ||
    job.id !== snapshot.id || job.destination !== snapshot.destination ||
    job.status !== expectedStatus || !updatedAt
  ) return null;
  return {
    jobId: snapshot.id,
    destination: snapshot.destination,
    status: expectedStatus,
    updatedAt,
    destinationEnabled: false,
  };
}
