import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import nacl from "tweetnacl";
import {
  buildVoteReminderPayload,
  currentStreak,
  dateInTimeZone as voteDateInTimeZone,
  DEFAULT_VOTE_TIME_ZONE,
  EXPECTED_DISCORD_VOTE_CHANNEL_ID,
  leaderboardWindowStart,
  loadVoteLinks,
  previewText,
  voteDateFromCustomId,
} from "../_shared/vote-reminders.ts";
import {
  applyPendingContainmentPlan,
  buildPendingContainmentPlan,
  memberUserId,
  PendingContainmentApplyError,
  pendingChannelId,
  pendingPlanMessage,
  logPendingContainmentSync,
  type JsonRecord as SharedJsonRecord,
  type PendingContainmentChange,
  type PendingContainmentMode,
  type PendingContainmentPlan,
} from "../_shared/pending-verification-containment.ts";

type JsonRecord = SharedJsonRecord;
type SupabaseAdminClient = {
  from(table: string): any;
};

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "Mochirii-Reaper-RankSync/1.0 (https://mochirii.com)";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_DISCORD_GALLERY_CHANNEL_ID = "1508077313965817856";
const EXPECTED_REQUIRED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"];
const EXPECTED_MODERATOR_ROLE_IDS = ["1078630751165222984"];
const BASE_GUILD_ROLE_ID = "1468659807736299520";
const PENDING_BASE_ROLE_ID = "1468659807736299520";
const VERIFIED_ROLE_ID = "1078630751077142615";
const PENDING_ALLOWED_CATEGORY_ID = "1468658801388290048";
const GUILD_SCHEDULE_URL = "https://mochirii.com/data/guild-schedule.json";
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIEW_CHANNEL_PERMISSION = 1n << 10n;
const MANAGE_ROLES_PERMISSION = 1n << 28n;
const MANAGE_EVENTS_PERMISSION = 1n << 33n;
const CREATE_EVENTS_PERMISSION = 1n << 44n;
const GUILD_CATEGORY_CHANNEL_TYPE = 4;
const DISCORD_MEMBER_OVERWRITE_TYPE = 1;
const MAX_PENDING_VERIFICATION_MUTATIONS = 500;
const DISCORD_API_MAX_RETRIES = 2;
const DISCORD_FUNCTION_RETRY_BUDGET_MS = 45_000;
const DISCORD_WRITE_BATCH_SIZE = 10;
const DISCORD_WRITE_BATCH_PAUSE_MS = 250;
const PENDING_VERIFICATION_MANAGED_BY = "reaper-pending-verification";
const PENDING_VERIFICATION_AUDIT_REASON = "Reaper pending verification containment";
const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;
const EPHEMERAL_FLAG = 1 << 6;
const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
const INTERACTION_TYPE_MESSAGE_COMPONENT = 3;
const INTERACTION_RESPONSE_PONG = 1;
const INTERACTION_RESPONSE_CHANNEL_MESSAGE = 4;
const INTERACTION_RESPONSE_DEFERRED_CHANNEL_MESSAGE = 5;
const OPTION_TYPE_STRING = 3;
const OPTION_TYPE_BOOLEAN = 5;
const OPTION_TYPE_ATTACHMENT = 11;
const DISCORD_EVENT_PRIVACY_GUILD_ONLY = 2;
const DISCORD_EVENT_ENTITY_EXTERNAL = 3;
const eventCoverImageCache = new Map<string, string>();

const RANK_ROLES = [
  { name: "Guild Leader", tier: "senior", order: 1 },
  { name: "Vice Leader", tier: "senior", order: 2 },
  { name: "Hall Leader", tier: "senior", order: 3 },
  { name: "Dharmapala", tier: "middle", order: 4 },
  { name: "Lotus Warden", tier: "middle", order: 5 },
  { name: "Petal Keeper", tier: "middle", order: 6 },
  { name: "Mochi Blossom", tier: "members", order: 7 },
  { name: "Young Bamboo", tier: "members", order: 8 },
  { name: "Softwind", tier: "members", order: 9 },
  { name: "Rice Sprout", tier: "members", order: 10 },
];

type ScheduleEvent = {
  key: string;
  title: string;
  description: string;
  location: string;
  websiteLocation: string;
  startIso: string;
  endIso: string;
  coverImageUrl: string | null;
  canonicalEventId: string | null;
  duplicateEventIds: string[];
  recurrenceRule: JsonRecord | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function scheduleOffsetMinutes(schedule: JsonRecord): number {
  const timezone = asRecord(schedule.timezone);
  const value = Number(timezone.offsetMinutes);
  return Number.isFinite(value) ? value : 480;
}

function localParts(now: Date, offset: number) {
  const shifted = new Date(now.getTime() + offset * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateKey(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function addDays(value: string, days: number): string {
  const parsed = parseDateKey(value);
  if (!parsed) return value;
  const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) + days * MS_PER_DAY);
  return dateKey(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function parseTime(value: unknown): { hour: number; minute: number } {
  const match = String(value || "00:00").match(/^(\d{2}):(\d{2})$/);
  if (!match) return { hour: 0, minute: 0 };
  return {
    hour: Math.min(Math.max(Number(match[1]), 0), 23),
    minute: Math.min(Math.max(Number(match[2]), 0), 59),
  };
}

function localToUtcIso(localDate: string, time: string, offset: number): string {
  const parsed = parseDateKey(localDate);
  if (!parsed) return "";
  const parsedTime = parseTime(time);
  return new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsedTime.hour, parsedTime.minute) -
      offset * 60 * 1000,
  ).toISOString();
}

function scheduleAssetUrl(value: unknown, versionValue?: unknown): string | null {
  const raw = safeString(value, 300);
  if (!raw) return null;
  const version = safeString(versionValue, 80);
  const withVersion = (url: string) => {
    if (!version) return url;
    const parsed = new URL(url);
    parsed.searchParams.set("v", version);
    return parsed.toString();
  };
  if (/^https:\/\/[^\s]+$/i.test(raw)) return withVersion(raw);
  const normalized = raw.replace(/^\.?\//, "");
  if (!normalized.startsWith("assets/")) return null;
  return withVersion(`https://mochirii.com/${normalized}`);
}

function recurrenceRule(value: unknown, startIso: string): JsonRecord | null {
  const rule = asRecord(value);
  const frequency = Number(rule.frequency);
  const interval = Number(rule.interval || 1);
  const byNWeekday = asArray(rule.by_n_weekday)
    .map(asRecord)
    .map((entry) => ({
      n: Number(entry.n),
      day: Number(entry.day),
    }))
    .filter((entry) =>
      Number.isInteger(entry.n) &&
      entry.n >= 1 &&
      entry.n <= 5 &&
      Number.isInteger(entry.day) &&
      entry.day >= 0 &&
      entry.day <= 6
    );

  if (!Number.isInteger(frequency) || !Number.isInteger(interval) || interval < 1) return null;

  const normalized: JsonRecord = {
    start: startIso,
    frequency,
    interval,
  };

  if (byNWeekday.length) normalized.by_n_weekday = byNWeekday.slice(0, 1);
  return normalized;
}

function eventEndDate(startDate: string, startTime: string, endTime: string): string {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const crossesMidnight = end.hour * 60 + end.minute <= start.hour * 60 + start.minute;
  return crossesMidnight ? addDays(startDate, 1) : startDate;
}

function firstSaturday(year: number, month: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const delta = (6 - first.getUTCDay() + 7) % 7;
  return dateKey(year, month, 1 + delta);
}

function nextFirstSaturday(schedule: JsonRecord, now: Date): string {
  const parts = localParts(now, scheduleOffsetMinutes(schedule));
  const current = firstSaturday(parts.year, parts.month);
  const today = dateKey(parts.year, parts.month, parts.day);
  if (today <= current) return current;
  const nextMonth = new Date(Date.UTC(parts.year, parts.month, 1));
  return firstSaturday(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1);
}

function nextWeeklyDate(schedule: JsonRecord, item: JsonRecord, day: number, now: Date): string {
  const offset = scheduleOffsetMinutes(schedule);
  const parts = localParts(now, offset);
  const today = dateKey(parts.year, parts.month, parts.day);
  const start = parseTime(item.startTime);
  const end = parseTime(item.endTime);
  const nowMinutes = parts.hour * 60 + parts.minute;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  let delta = (day - parts.weekday + 7) % 7;

  if (delta === 0) {
    const stillUpcoming = endMinutes <= startMinutes ? nowMinutes < 24 * 60 : nowMinutes < endMinutes;
    if (!stillUpcoming) delta = 7;
  }

  return addDays(today, delta);
}

function scheduleEventFromDate(schedule: JsonRecord, key: string, item: JsonRecord, localDate: string): ScheduleEvent | null {
  const title = safeString(item.title, 100);
  const websiteLocation = safeString(item.location, 300) || "https://mochirii.com/events";
  const location = safeString(item.discordLocation, 100) || safeString(item.location, 100) || "https://mochirii.com/events";
  const startTime = safeString(item.startTime, 20) || "00:00";
  const endTime = safeString(item.endTime, 20) || "01:00";
  const offset = scheduleOffsetMinutes(schedule);
  const endDate = eventEndDate(localDate, startTime, endTime);
  const startIso = localToUtcIso(localDate, startTime, offset);
  const endIso = localToUtcIso(endDate, endTime, offset);

  if (!title || !startIso || !endIso) return null;

  return {
    key,
    title,
    description: safeString(item.description || item.summary || item.timeText, 1000) || title,
    location,
    websiteLocation,
    startIso,
    endIso,
    coverImageUrl: scheduleAssetUrl(item.discordCoverImage, schedule.discordCoverVersion),
    canonicalEventId: snowflake(item.discordEventId),
    duplicateEventIds: asArray(item.discordDuplicateEventIds).map(snowflake).filter((id): id is string => Boolean(id)),
    recurrenceRule: recurrenceRule(item.discordRecurrenceRule, startIso),
  };
}

function desiredEventsFromSchedule(schedule: JsonRecord, now = new Date()): ScheduleEvent[] {
  const monthly = asRecord(schedule.monthly);
  const events: ScheduleEvent[] = [];

  Object.entries(monthly).forEach(([fallbackKey, value]) => {
    const item = asRecord(value);
    const key = safeString(item.id, 80) || fallbackKey;
    const localDate = nextFirstSaturday(schedule, now);
    const event = scheduleEventFromDate(schedule, key, item, localDate);
    if (event) events.push(event);
  });

  asArray(schedule.weekly).map(asRecord).forEach((item) => {
    if (item.discord !== true) return;
    const key = safeString(item.id, 80);
    if (!key) return;
    asArray(item.days)
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      .forEach((day) => {
        const localDate = nextWeeklyDate(schedule, item, day, now);
        const event = scheduleEventFromDate(schedule, `${key}-${day}`, item, localDate);
        if (event) events.push(event);
      });
  });

  return events;
}

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function interactionMessage(content: string): Response {
  return jsonResponse(
    {
      type: INTERACTION_RESPONSE_CHANNEL_MESSAGE,
      data: {
        content,
        flags: EPHEMERAL_FLAG,
        allowed_mentions: {
          parse: [],
        },
      },
    },
  );
}

function deferredEphemeralResponse(): Response {
  return jsonResponse({
    type: INTERACTION_RESPONSE_DEFERRED_CHANNEL_MESSAGE,
    data: {
      flags: EPHEMERAL_FLAG,
    },
  });
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function parseCsv(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getServiceRoleKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys);
    return String(parsed.default || parsed.service_role || "");
  } catch {
    return "";
  }
}

function serviceAdminClient(purpose: string): SupabaseAdminClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(`Supabase service credentials are not configured for ${purpose}.`);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function snowflake(value: unknown): string | null {
  const id = safeString(value, 24);
  return id && /^\d{16,22}$/.test(id) ? id : null;
}

function normalizedMime(value: unknown): string | null {
  const mime = safeString(value, 80)?.split(";")[0]?.trim().toLowerCase() || null;
  if (mime === "image/jpg") return "image/jpeg";
  return mime && ALLOWED_MIME_TYPES.has(mime) ? mime : null;
}

function allowedImageFilename(value: unknown): boolean {
  const filename = safeString(value, 255)?.toLowerCase() || "";
  return /\.(jpe?g|png|webp)$/i.test(filename);
}

function hexToBytes(value: string): Uint8Array | null {
  const hex = value.trim();
  if (!/^[\da-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function expectedRoleConfigMatches(configuredRoleIds: string[]): boolean {
  return (
    configuredRoleIds.length === EXPECTED_REQUIRED_ROLE_IDS.length &&
    EXPECTED_REQUIRED_ROLE_IDS.every((roleId) => configuredRoleIds.includes(roleId))
  );
}

function expectedModeratorConfigMatches(configuredRoleIds: string[]): boolean {
  return (
    configuredRoleIds.length === EXPECTED_MODERATOR_ROLE_IDS.length &&
    EXPECTED_MODERATOR_ROLE_IDS.every((roleId) => configuredRoleIds.includes(roleId))
  );
}

function hasPermission(permissionValue: unknown, permission: bigint): boolean {
  try {
    const value = BigInt(String(permissionValue || "0"));
    return (value & permission) === permission;
  } catch {
    return false;
  }
}

function roleNameKey(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function discordApiHeaders(contentType = false): Headers {
  const headers = new Headers({
    Authorization: `Bot ${Deno.env.get("DISCORD_BOT_TOKEN") || ""}`,
    Accept: "application/json",
    "User-Agent": DISCORD_API_USER_AGENT,
  });
  if (contentType) headers.set("Content-Type", "application/json");
  return headers;
}

function retryAfterMs(response: Response, data: unknown): number {
  const headerSeconds = Number(response.headers.get("Retry-After") || "");
  const bodySeconds = Number(asRecord(data).retry_after || "");
  const seconds = Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : bodySeconds;
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.ceil(seconds * 1000);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discordApi(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: unknown }> {
  for (let attempt = 0; attempt <= DISCORD_API_MAX_RETRIES; attempt += 1) {
    const response = await fetch(`${DISCORD_API_BASE_URL}${path}`, init);
    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (response.status === 429 && attempt < DISCORD_API_MAX_RETRIES) {
      const delay = retryAfterMs(response, data);
      if (delay > 0 && delay <= DISCORD_FUNCTION_RETRY_BUDGET_MS) {
        await wait(delay);
        continue;
      }
      throw new Error("Discord rate limit retry_after exceeds the Edge Function retry budget.");
    }

    return { ok: response.ok, status: response.status, data };
  }

  return { ok: false, status: 429, data: { error: "Discord rate limit retry budget exhausted." } };
}

async function fetchGuildMembers(): Promise<JsonRecord[]> {
  const members: JsonRecord[] = [];
  let after = "0";

  for (let page = 0; page < 25; page += 1) {
    const response = await discordApi(
      `/guilds/${EXPECTED_DISCORD_GUILD_ID}/members?limit=1000&after=${encodeURIComponent(after)}`,
      { headers: discordApiHeaders() },
    );

    if (!response.ok) {
      throw new Error(`Guild member fetch failed with Discord API ${response.status}.`);
    }

    const batch = asArray(response.data).map(asRecord);
    members.push(...batch);
    if (batch.length < 1000) break;

    const lastUserId = memberUserId(batch[batch.length - 1]);
    if (!lastUserId || lastUserId === after) break;
    after = lastUserId;
  }

  return members;
}

async function fetchGuildRoles(): Promise<JsonRecord[]> {
  const response = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/roles`, {
    headers: discordApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Guild role fetch failed with Discord API ${response.status}.`);
  }

  return asArray(response.data).map(asRecord).filter((role) => Boolean(snowflake(role.id)));
}

async function fetchGuildChannels(): Promise<JsonRecord[]> {
  const response = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/channels`, {
    headers: discordApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Guild channel fetch failed with Discord API ${response.status}.`);
  }

  return asArray(response.data).map(asRecord).filter((channel) => Boolean(pendingChannelId(channel)));
}

function discordApiErrorDetail(data: unknown): string {
  const record = asRecord(data);
  const code = safeString(record.code, 40);
  const message = safeString(record.message, 140);
  const details = [code ? `code ${code}` : "", message].filter(Boolean).join(": ");
  return details ? ` (${details})` : "";
}

async function writePendingDiscordOverwrite(change: PendingContainmentChange): Promise<void> {
  const auditHeaders = discordApiHeaders(change.nextAllow !== 0n || change.nextDeny !== 0n);
  auditHeaders.set("X-Audit-Log-Reason", encodeURIComponent(PENDING_VERIFICATION_AUDIT_REASON));

  const removeOverwrite = change.nextAllow === 0n && change.nextDeny === 0n;
  const response = removeOverwrite
    ? await discordApi(`/channels/${change.channelId}/permissions/${change.userId}`, {
      method: "DELETE",
      headers: auditHeaders,
    })
    : await discordApi(`/channels/${change.channelId}/permissions/${change.userId}`, {
      method: "PUT",
      headers: auditHeaders,
      body: JSON.stringify({
        allow: change.nextAllow.toString(),
        deny: change.nextDeny.toString(),
        type: DISCORD_MEMBER_OVERWRITE_TYPE,
      }),
    });

  if (!response.ok) {
    throw new Error(
      `Discord overwrite ${change.detail} on ${change.channelName}:${change.channelId} user:${change.userId} failed with API ${response.status}${discordApiErrorDetail(response.data)}.`,
    );
  }
}

async function processPendingVerificationSync(
  mode: PendingContainmentMode,
  interactionToken: string,
  applicationId: string,
): Promise<void> {
  let adminClient: SupabaseAdminClient | null = null;
  let plan: PendingContainmentPlan | null = null;

  try {
    if (!Deno.env.get("DISCORD_BOT_TOKEN")) {
      await editOriginalInteractionResponse(applicationId, interactionToken, "Reaper pending verification sync is missing the Discord bot token.");
      return;
    }

    adminClient = serviceAdminClient("pending verification containment");
    const [channels, members, roles] = await Promise.all([fetchGuildChannels(), fetchGuildMembers(), fetchGuildRoles()]);
    plan = await buildPendingContainmentPlan(adminClient, channels, members, roles);
    const discordWriteCount = plan.changes.filter((change) => change.discordWrite).length;

    if (plan.conflicts.length) {
      await logPendingContainmentSync(adminClient, mode, "warning", "Manual VIEW_CHANNEL conflicts blocked containment.", plan);
      await editOriginalInteractionResponse(applicationId, interactionToken, pendingPlanMessage(mode, plan));
      return;
    }

    if (mode === "apply" && discordWriteCount > MAX_PENDING_VERIFICATION_MUTATIONS) {
      await logPendingContainmentSync(
        adminClient,
        mode,
        "warning",
        "Pending verification containment exceeded the mutation guard.",
        plan,
        { maxMutationGuard: MAX_PENDING_VERIFICATION_MUTATIONS },
      );
      await editOriginalInteractionResponse(
        applicationId,
        interactionToken,
        `${pendingPlanMessage("preview", plan)}\nBlocked: planned Discord writes exceed safety limit ${MAX_PENDING_VERIFICATION_MUTATIONS}.`,
      );
      return;
    }

    if (mode === "preview") {
      await logPendingContainmentSync(adminClient, mode, "skipped", "Pending verification containment preview completed.", plan);
      await editOriginalInteractionResponse(applicationId, interactionToken, pendingPlanMessage(mode, plan));
      return;
    }

    const result = await applyPendingContainmentPlan(adminClient, plan, writePendingDiscordOverwrite);
    await logPendingContainmentSync(
      adminClient,
      mode,
      "success",
      "Pending verification containment apply completed.",
      plan,
      result,
    );
    await editOriginalInteractionResponse(applicationId, interactionToken, pendingPlanMessage(mode, plan, result));
  } catch (error) {
    console.error("reaper-discord-interactions pending verification containment failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    if (adminClient) {
      const partialApply = error instanceof PendingContainmentApplyError ? error.result : null;
      await logPendingContainmentSync(
        adminClient,
        mode,
        "failed",
        "Pending verification containment failed.",
        plan,
        {
          error: error instanceof Error ? error.message.slice(0, 160) : "Unknown error",
          failedDiscordWriteCount: partialApply?.failedWrites || 0,
          skippedDiscordWriteCount: partialApply?.skippedWrites || 0,
          appliedDiscordWriteCount: partialApply?.discordWrites || 0,
          registryWriteCountBeforeFailure: partialApply?.dbWrites || 0,
        },
      );
    }

    const partialMessage = error instanceof PendingContainmentApplyError
      ? ` Discord writes applied before failure: ${error.result.discordWrites}. Failed writes: ${error.result.failedWrites}. Skipped writes: ${error.result.skippedWrites}.`
      : "";
    await editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      `Reaper pending verification containment could not be completed.${partialMessage} Rerun preview and check configuration.`,
    );
  }
}

function hasChannelOverwrite(channels: JsonRecord[], roleId: string): boolean {
  return channels.some((channel) =>
    asArray(channel.permission_overwrites).some((overwrite) => {
      const record = asRecord(overwrite);
      if (safeString(record.id, 24) !== roleId) return false;
      const allow = String(record.allow || "0");
      const deny = String(record.deny || "0");
      return allow !== "0" || deny !== "0";
    })
  );
}

function roleSafetyProblems(role: JsonRecord, channels: JsonRecord[]): string[] {
  const problems: string[] = [];
  const roleId = safeString(role.id, 24) || "";
  if (String(role.permissions || "0") !== "0") problems.push("nonzero permissions");
  if (role.hoist === true) problems.push("displayed separately");
  if (role.mentionable === true) problems.push("mentionable");
  if (hasChannelOverwrite(channels, roleId)) problems.push("channel overwrites");
  return problems;
}

function rankSummaryLine(action: string, rankName: string, detail = ""): string {
  return detail ? `${action}: ${rankName} (${detail})` : `${action}: ${rankName}`;
}

async function upsertDiscordResource(role: JsonRecord, rank: typeof RANK_ROLES[number]): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();
  const roleId = safeString(role.id, 24);

  if (!supabaseUrl || !serviceRoleKey || !roleId) {
    throw new Error("Supabase service credentials are not configured for rank registry updates.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await adminClient
    .from("discord_resources")
    .upsert(
      {
        kind: "role",
        label: rank.name,
        discord_id: roleId,
        discord_parent_id: EXPECTED_DISCORD_GUILD_ID,
        enabled: true,
        description: `Vanity guild rank role for ${rank.name}.`,
        metadata: {
          managedBy: "reaper-rank-sync",
          vanityOnly: true,
          rankTier: rank.tier,
          rankOrder: rank.order,
          source: "data/ranks.json",
          baseAccessRoleId: BASE_GUILD_ROLE_ID,
        },
      },
      { onConflict: "kind,discord_id" },
    );

  if (error) {
    console.error("reaper-discord-interactions rank registry upsert failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Rank role was created but could not be recorded in the website registry.");
  }
}

async function processRankSync(
  mode: string,
  interactionToken: string,
  applicationId: string,
): Promise<void> {
  const apply = mode === "apply";
  const lines: string[] = [];

  try {
    if (!Deno.env.get("DISCORD_BOT_TOKEN")) {
      await editOriginalInteractionResponse(applicationId, interactionToken, "Reaper rank sync is missing the Discord bot token.");
      return;
    }

    const rolesResponse = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/roles`, {
      headers: discordApiHeaders(),
    });
    const channelsResponse = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/channels`, {
      headers: discordApiHeaders(),
    });

    if (!rolesResponse.ok || !channelsResponse.ok) {
      await editOriginalInteractionResponse(
        applicationId,
        interactionToken,
        "Reaper could not read guild roles and channels. Check bot role hierarchy and permissions.",
      );
      return;
    }

    const roles = asArray(rolesResponse.data).map(asRecord);
    const channels = asArray(channelsResponse.data).map(asRecord);
    const roleByName = new Map(roles.map((role) => [roleNameKey(role.name), role]));

    for (const rank of RANK_ROLES) {
      const existing = roleByName.get(roleNameKey(rank.name));
      if (existing) {
        const problems = roleSafetyProblems(existing, channels);
        if (problems.length) {
          lines.push(rankSummaryLine("Blocked", rank.name, problems.join(", ")));
          continue;
        }

        lines.push(rankSummaryLine("Adopted", rank.name, `role ${safeString(existing.id, 24) || "unknown"}`));
        if (apply) await upsertDiscordResource(existing, rank);
        continue;
      }

      if (!apply) {
        lines.push(rankSummaryLine("Would create", rank.name, "zero-permission vanity role"));
        continue;
      }

      const createResponse = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/roles`, {
        method: "POST",
        headers: discordApiHeaders(true),
        body: JSON.stringify({
          name: rank.name,
          permissions: "0",
          color: 0,
          hoist: false,
          mentionable: false,
        }),
      });

      if (!createResponse.ok) {
        lines.push(rankSummaryLine("Blocked", rank.name, `Discord API ${createResponse.status}`));
        continue;
      }

      const createdRole = asRecord(createResponse.data);
      lines.push(rankSummaryLine("Created", rank.name, `role ${safeString(createdRole.id, 24) || "unknown"}`));
      await upsertDiscordResource(createdRole, rank);
    }

    const intro = apply
      ? "Rank sync finished. Rank roles are vanity-only; assign them manually in Discord."
      : "Rank sync preview. No Discord roles were changed.";
    await editOriginalInteractionResponse(applicationId, interactionToken, `${intro}\n${lines.slice(0, 20).join("\n")}`);
  } catch (error) {
    console.error("reaper-discord-interactions rank sync failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    await editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      "Reaper rank sync could not be completed. Check configuration and try preview again.",
    );
  }
}

async function fetchGuildSchedule(): Promise<JsonRecord> {
  const scheduleUrl = Deno.env.get("GUILD_SCHEDULE_URL") || GUILD_SCHEDULE_URL;
  const response = await fetch(scheduleUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": DISCORD_API_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Schedule fetch failed with HTTP ${response.status}.`);
  }

  return asRecord(await response.json());
}

async function loadManagedEventResources(): Promise<JsonRecord[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured for event registry lookup.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await adminClient
    .from("discord_resources")
    .select("id,label,discord_id,metadata,enabled")
    .eq("kind", "scheduled_event")
    .eq("enabled", true);

  if (error) {
    console.error("reaper-discord-interactions scheduled event registry lookup failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Scheduled event registry could not be read.");
  }

  return asArray(data).map(asRecord).filter((resource) => {
    const metadata = asRecord(resource.metadata);
    return metadata.managedBy === "reaper-event-sync";
  });
}

async function upsertDiscordEventResource(event: JsonRecord, desired: ScheduleEvent): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();
  const eventId = safeString(event.id, 24);

  if (!supabaseUrl || !serviceRoleKey || !eventId) {
    throw new Error("Supabase service credentials are not configured for event registry updates.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await adminClient
    .from("discord_resources")
    .upsert(
      {
        kind: "scheduled_event",
        label: desired.title,
        discord_id: eventId,
        discord_parent_id: EXPECTED_DISCORD_GUILD_ID,
        enabled: true,
        url: `https://discord.com/events/${EXPECTED_DISCORD_GUILD_ID}/${eventId}`,
        description: desired.description,
        metadata: {
          managedBy: "reaper-event-sync",
          siteEventKey: desired.key,
          location: desired.location,
          websiteLocation: desired.websiteLocation,
          coverImageUrl: desired.coverImageUrl,
          canonicalEventId: desired.canonicalEventId,
          recurrenceRule: desired.recurrenceRule,
          source: "data/guild-schedule.json",
          startIso: desired.startIso,
          endIso: desired.endIso,
          entityType: "EXTERNAL",
        },
      },
      { onConflict: "kind,discord_id" },
    );

  if (error) {
    console.error("reaper-discord-interactions scheduled event registry upsert failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Scheduled event was changed but could not be recorded in the website registry.");
  }
}

async function disableDuplicateEventResource(eventId: string, desired: ScheduleEvent): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured for duplicate event registry updates.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await adminClient
    .from("discord_resources")
    .update({
      enabled: false,
      description: `Retired duplicate scheduled event for ${desired.title}.`,
      metadata: {
        managedBy: "reaper-event-sync",
        siteEventKey: desired.key,
        duplicateOf: desired.canonicalEventId,
        retiredBy: "reaper-event-sync",
        retiredReason: "duplicate-monthly-raffle",
        retiredAt: new Date().toISOString(),
      },
    })
    .eq("kind", "scheduled_event")
    .eq("discord_id", eventId);

  if (error) {
    console.error("reaper-discord-interactions duplicate scheduled event registry update failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Duplicate scheduled event was removed but could not be retired in the website registry.");
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function eventCoverImageData(url: string): Promise<string> {
  const cached = eventCoverImageCache.get(url);
  if (cached) return cached;

  const response = await fetch(url, {
    headers: {
      Accept: "image/png,image/jpeg,image/webp",
      "User-Agent": DISCORD_API_USER_AGENT,
    },
  });
  const contentType = normalizedMime(response.headers.get("Content-Type"));
  if (!response.ok || !contentType) {
    throw new Error(`Event cover image fetch failed with HTTP ${response.status}.`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) {
    throw new Error("Event cover image fetch returned an empty file.");
  }

  const data = `data:${contentType};base64,${bytesToBase64(bytes)}`;
  eventCoverImageCache.set(url, data);
  return data;
}

async function scheduledEventBody(desired: ScheduleEvent, includeImage: boolean): Promise<JsonRecord> {
  const body: JsonRecord = {
    channel_id: null,
    name: desired.title.slice(0, 100),
    description: desired.description.slice(0, 1000),
    scheduled_start_time: desired.startIso,
    scheduled_end_time: desired.endIso,
    privacy_level: DISCORD_EVENT_PRIVACY_GUILD_ONLY,
    entity_type: DISCORD_EVENT_ENTITY_EXTERNAL,
    entity_metadata: {
      location: desired.location.slice(0, 100),
    },
  };

  if (desired.recurrenceRule) {
    body.recurrence_rule = desired.recurrenceRule;
  }

  if (includeImage && desired.coverImageUrl) {
    body.image = await eventCoverImageData(desired.coverImageUrl);
  }

  return body;
}

function eventLocation(event: JsonRecord): string {
  return safeString(asRecord(event.entity_metadata).location, 100) || "";
}

function managedEventLine(action: string, desired: ScheduleEvent, detail = ""): string {
  return detail ? `${action}: ${desired.title} (${detail})` : `${action}: ${desired.title}`;
}

async function processDuplicateScheduledEvents(
  apply: boolean,
  desired: ScheduleEvent,
  existingEvents: JsonRecord[],
  lines: string[],
): Promise<void> {
  for (const duplicateId of desired.duplicateEventIds) {
    if (!duplicateId || duplicateId === desired.canonicalEventId) continue;
    const existingDuplicate = existingEvents.find((event) => safeString(event.id, 24) === duplicateId);
    if (!existingDuplicate) {
      lines.push(managedEventLine("Duplicate already absent", desired, `event ${duplicateId}`));
      continue;
    }

    lines.push(managedEventLine(apply ? "Removed duplicate" : "Would remove duplicate", desired, `event ${duplicateId}`));
    if (!apply) continue;

    const response = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/scheduled-events/${duplicateId}`, {
      method: "DELETE",
      headers: discordApiHeaders(),
    });
    if (!response.ok) {
      lines[lines.length - 1] = managedEventLine("Blocked duplicate removal", desired, `Discord API ${response.status}`);
      continue;
    }
    await disableDuplicateEventResource(duplicateId, desired);
  }
}

async function processEventSync(
  mode: string,
  interactionToken: string,
  applicationId: string,
): Promise<void> {
  const apply = mode === "apply";
  const lines: string[] = [];

  try {
    if (!Deno.env.get("DISCORD_BOT_TOKEN")) {
      await editOriginalInteractionResponse(applicationId, interactionToken, "Reaper event sync is missing the Discord bot token.");
      return;
    }

    const schedule = await fetchGuildSchedule();
    const desiredEvents = desiredEventsFromSchedule(schedule);
    if (!desiredEvents.length) {
      await editOriginalInteractionResponse(applicationId, interactionToken, "Reaper event sync found no website schedule events.");
      return;
    }

    const [resources, eventsResponse] = await Promise.all([
      loadManagedEventResources(),
      discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/scheduled-events`, {
        headers: discordApiHeaders(),
      }),
    ]);

    if (!eventsResponse.ok) {
      await editOriginalInteractionResponse(
        applicationId,
        interactionToken,
        "Reaper could not read Discord scheduled events. Check bot event permissions.",
      );
      return;
    }

    const existingEvents = asArray(eventsResponse.data).map(asRecord);
    const resourceByKey = new Map(resources.map((resource) => [safeString(asRecord(resource.metadata).siteEventKey, 100) || "", resource]));

    for (const desired of desiredEvents) {
      const resource = resourceByKey.get(desired.key);
      const resourceEventId = safeString(resource?.discord_id, 24);
      const existingByCanonical = desired.canonicalEventId
        ? existingEvents.find((event) => safeString(event.id, 24) === desired.canonicalEventId)
        : null;
      const existingByResource = resourceEventId
        ? existingEvents.find((event) => safeString(event.id, 24) === resourceEventId)
        : null;
      const existingByName = existingEvents.find((event) =>
        safeString(event.name, 100) === desired.title &&
        safeString(event.scheduled_start_time, 60) === desired.startIso &&
        Number(event.entity_type) === DISCORD_EVENT_ENTITY_EXTERNAL &&
        eventLocation(event) === desired.location
      );
      const existing = existingByCanonical || existingByResource || existingByName;

      if (existing) {
        lines.push(managedEventLine(apply ? "Updated" : "Would update", desired, `event ${safeString(existing.id, 24) || "unknown"}`));
        if (apply) {
          let body: JsonRecord;
          try {
            body = await scheduledEventBody(desired, true);
          } catch {
            lines[lines.length - 1] = managedEventLine("Blocked", desired, "cover image unavailable");
            continue;
          }
          const response = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/scheduled-events/${safeString(existing.id, 24)}`, {
            method: "PATCH",
            headers: discordApiHeaders(true),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            lines[lines.length - 1] = managedEventLine("Blocked", desired, `Discord API ${response.status}`);
            continue;
          }
          await upsertDiscordEventResource(asRecord(response.data), desired);
        }
        await processDuplicateScheduledEvents(apply, desired, existingEvents, lines);
        continue;
      }

      lines.push(managedEventLine(apply ? "Created" : "Would create", desired, "external scheduled event"));
      if (apply) {
        let body: JsonRecord;
        try {
          body = await scheduledEventBody(desired, true);
        } catch {
          lines[lines.length - 1] = managedEventLine("Blocked", desired, "cover image unavailable");
          continue;
        }
        const response = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/scheduled-events`, {
          method: "POST",
          headers: discordApiHeaders(true),
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          lines[lines.length - 1] = managedEventLine("Blocked", desired, `Discord API ${response.status}`);
          continue;
        }
        await upsertDiscordEventResource(asRecord(response.data), desired);
      }
      await processDuplicateScheduledEvents(apply, desired, existingEvents, lines);
    }

    const intro = apply
      ? "Event sync finished. Only Reaper-managed external Discord events were created or updated."
      : "Event sync preview. No Discord scheduled events were changed.";
    await editOriginalInteractionResponse(applicationId, interactionToken, `${intro}\n${lines.slice(0, 25).join("\n")}`);
  } catch (error) {
    console.error("reaper-discord-interactions event sync failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    await editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      "Reaper event sync could not be completed. Check configuration and try preview again.",
    );
  }
}

function verifyDiscordSignature(req: Request, rawBody: string, publicKey: string): boolean {
  const signatureHeader = req.headers.get("x-signature-ed25519") || "";
  const timestampHeader = req.headers.get("x-signature-timestamp") || "";
  const signature = hexToBytes(signatureHeader);
  const key = hexToBytes(publicKey);
  const timestampMs = Number(timestampHeader) * 1000;

  if (!signature || signature.length !== 64 || !key || key.length !== 32 || !Number.isFinite(timestampMs)) {
    return false;
  }

  if (Math.abs(Date.now() - timestampMs) > SIGNATURE_WINDOW_MS) {
    return false;
  }

  const message = new TextEncoder().encode(`${timestampHeader}${rawBody}`);
  return nacl.sign.detached.verify(message, signature, key);
}

function optionByName(data: JsonRecord, name: string): JsonRecord {
  return asRecord(asArray(data.options).find((option) => safeString(asRecord(option).name, 80) === name));
}

function stringOption(data: JsonRecord, name: string, maxLength: number): string | null {
  const option = optionByName(data, name);
  if (option.type !== OPTION_TYPE_STRING) return null;
  return safeString(option.value, maxLength);
}

function booleanOption(data: JsonRecord, name: string): boolean {
  const option = optionByName(data, name);
  return option.type === OPTION_TYPE_BOOLEAN && option.value === true;
}

function attachmentOption(data: JsonRecord, name: string): JsonRecord {
  const option = optionByName(data, name);
  if (option.type !== OPTION_TYPE_ATTACHMENT) return {};

  const attachmentId = snowflake(option.value);
  if (!attachmentId) return {};

  const resolved = asRecord(data.resolved);
  const attachments = asRecord(resolved.attachments);
  return {
    id: attachmentId,
    ...asRecord(attachments[attachmentId]),
  };
}

function sourceEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/submit-discord-gallery-image`;
}

function safeDiscordResponseMessage(body: JsonRecord, fallback: string): string {
  return safeString(body.message, 220) || fallback;
}

function successMessage(instagramOptIn: boolean, duplicate: boolean): string {
  const status = duplicate ? "That image is already in the moderation queue." : "Image submitted to the moderation queue.";
  const instagram = instagramOptIn
    ? " Instagram sharing is enabled for moderator review after gallery approval."
    : " Instagram sharing is not enabled for this submission.";
  return `${status}${instagram}`;
}

async function editOriginalInteractionResponse(
  applicationId: string,
  interactionToken: string,
  content: string,
): Promise<void> {
  const endpoint = `${DISCORD_API_BASE_URL}/webhooks/${applicationId}/${interactionToken}/messages/@original`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      allowed_mentions: {
        parse: [],
      },
    }),
  });

  if (!response.ok) {
    console.error("reaper-discord-interactions original response edit failed", {
      status: response.status,
      statusText: response.statusText,
    });
  }
}

async function processSubmission(payload: JsonRecord, interactionToken: string, applicationId: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const ingestSecret = Deno.env.get("DISCORD_GALLERY_INGEST_SECRET") || "";

  if (!supabaseUrl || !ingestSecret) {
    console.error("reaper-discord-interactions missing submit-discord-gallery-image configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasIngestSecret: Boolean(ingestSecret),
    });
    await editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      "Discord gallery submissions are not configured yet.",
    );
    return;
  }

  try {
    const response = await fetch(sourceEndpoint(supabaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mochirii-reaper-secret": ingestSecret,
      },
      body: JSON.stringify(payload),
    });
    const body = asRecord(await response.json().catch(() => ({})));

    if (!response.ok || body.ok !== true) {
      await editOriginalInteractionResponse(
        applicationId,
        interactionToken,
        safeDiscordResponseMessage(body, "Gallery submission could not be queued."),
      );
      return;
    }

    await editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      successMessage(payload.instagramOptIn === true, body.duplicate === true),
    );
  } catch (error) {
    console.error("reaper-discord-interactions background submission failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    await editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      "Gallery submission could not be queued.",
    );
  }
}

function voteTimeZone(): string {
  return Deno.env.get("VOTE_REMINDER_TIME_ZONE") || DEFAULT_VOTE_TIME_ZONE;
}

function voteToday(): string {
  return voteDateInTimeZone(new Date(), voteTimeZone());
}

function voteAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured for vote reminders.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function discordDisplayName(member: JsonRecord): string | null {
  const user = asRecord(member.user);
  return safeString(user.global_name || user.username, 80);
}

async function voteDatesForUser(adminClient: SupabaseAdminClient, discordUserId: string, today: string): Promise<string[]> {
  const { data, error } = await adminClient
    .from("vote_confirmations")
    .select("vote_date")
    .eq("discord_user_id", discordUserId)
    .gte("vote_date", leaderboardWindowStart(today, 366))
    .order("vote_date", { ascending: false });

  if (error) throw error;
  return asArray(data).map((row) => safeString(asRecord(row).vote_date, 20) || "").filter(Boolean);
}

async function recordVoteConfirmation(options: {
  discordUserId: string;
  discordUsername: string | null;
  voteDate: string;
  channelId: string | null;
  interactionId: string;
}): Promise<{ duplicate: boolean; streak: number }> {
  const adminClient = voteAdminClient();
  const { error } = await adminClient
    .from("vote_confirmations")
    .insert({
      discord_user_id: options.discordUserId,
      discord_username: options.discordUsername,
      vote_date: options.voteDate,
      source: "discord_button",
      discord_guild_id: EXPECTED_DISCORD_GUILD_ID,
      discord_channel_id: options.channelId,
      discord_interaction_id: options.interactionId,
      metadata: {
        managedBy: "manual-vote-reminder",
      },
    });

  if (error && error.code !== "23505") throw error;

  const dates = await voteDatesForUser(adminClient, options.discordUserId, options.voteDate);
  return {
    duplicate: error?.code === "23505",
    streak: currentStreak(dates, options.voteDate),
  };
}

async function voteStatusMessage(discordUserId: string): Promise<string> {
  const today = voteToday();
  const adminClient = voteAdminClient();
  const dates = await voteDatesForUser(adminClient, discordUserId, today);
  const streak = currentStreak(dates, today);
  const todayDone = dates.includes(today);
  const lastDate = dates[0] || "none yet";

  return todayDone
    ? `You are marked done for ${today}. Current streak: ${streak} day(s). Last confirmation: ${lastDate}.`
    : `You are not marked done for ${today} yet. Current streak: ${streak} day(s). Last confirmation: ${lastDate}.`;
}

async function voteLeaderboardMessage(): Promise<string> {
  const today = voteToday();
  const start = leaderboardWindowStart(today, 30);
  const adminClient = voteAdminClient();
  const { data, error } = await adminClient
    .from("vote_confirmations")
    .select("discord_user_id,discord_username,vote_date,confirmed_at")
    .gte("vote_date", start)
    .order("vote_date", { ascending: false })
    .order("confirmed_at", { ascending: false });

  if (error) throw error;

  const grouped = new Map<string, { username: string; dates: Set<string>; latest: string }>();
  for (const row of asArray(data).map(asRecord)) {
    const userId = snowflake(row.discord_user_id);
    const voteDate = safeString(row.vote_date, 20);
    if (!userId || !voteDate) continue;

    const current = grouped.get(userId) || {
      username: safeString(row.discord_username, 80) || `User ${userId.slice(-4)}`,
      dates: new Set<string>(),
      latest: voteDate,
    };
    current.dates.add(voteDate);
    if (voteDate > current.latest) current.latest = voteDate;
    grouped.set(userId, current);
  }

  const leaders = [...grouped.entries()]
    .map(([userId, record]) => ({
      userId,
      username: record.username,
      count: record.dates.size,
      streak: currentStreak([...record.dates], today),
      latest: record.latest,
    }))
    .sort((left, right) => right.count - left.count || right.streak - left.streak || left.username.localeCompare(right.username))
    .slice(0, 10);

  if (!leaders.length) {
    return `No manual vote confirmations have been recorded since ${start}.`;
  }

  return [
    `Manual vote leaderboard since ${start}:`,
    ...leaders.map((leader, index) =>
      `${index + 1}. ${leader.username}: ${leader.count} day(s), streak ${leader.streak}, latest ${leader.latest}`
    ),
  ].join("\n");
}

async function voteReminderPreviewMessage(voteDate: string): Promise<string> {
  const links = await loadVoteLinks({
    channelId: EXPECTED_DISCORD_VOTE_CHANNEL_ID,
    discordFetch: (path, init) => discordApi(path, init),
    linksJson: Deno.env.get("DISCORD_VOTE_LINKS_JSON") || "",
  });

  if (!links.length) {
    return "No configured or pinned vote links were found. Add DISCORD_VOTE_LINKS_JSON or pin a message containing [vote-links].";
  }

  const payload = buildVoteReminderPayload(links, voteDate);
  const rowCount = asArray(payload.components).length;
  return `${previewText(links, voteDate)}\n\nDiscord component rows: ${rowCount}. Done button custom ID: vote_done:${voteDate}.`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed.", { status: 405 });
  }

  const rawBody = await req.text();
  const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY") || "";

  if (!publicKey || !verifyDiscordSignature(req, rawBody, publicKey)) {
    return new Response("invalid request signature", { status: 401 });
  }

  let interaction: JsonRecord;
  try {
    interaction = asRecord(JSON.parse(rawBody));
  } catch {
    return interactionMessage("Discord request could not be read.");
  }

  if (interaction.type === INTERACTION_TYPE_PING) {
    return jsonResponse({ type: INTERACTION_RESPONSE_PONG });
  }

  const data = asRecord(interaction.data);
  const configuredGuildId = Deno.env.get("DISCORD_GUILD_ID") || "";
  const configuredChannelId = Deno.env.get("DISCORD_GALLERY_CHANNEL_ID") || "";
  const configuredVoteChannelId = Deno.env.get("DISCORD_VOTE_CHANNEL_ID") || "";
  const configuredRequiredRoleIds = parseCsv(Deno.env.get("DISCORD_REQUIRED_ROLE_IDS"));
  const configuredModeratorRoleIds = parseCsv(Deno.env.get("DISCORD_MODERATOR_ROLE_IDS"));
  const guildId = snowflake(interaction.guild_id);
  const channelId = snowflake(interaction.channel_id);
  const member = asRecord(interaction.member);
  const discordUserId = snowflake(asRecord(member.user).id);
  const memberRoleIds = asStringArray(member.roles);
  const interactionId = snowflake(interaction.id);
  const interactionToken = safeString(interaction.token, 512);
  const applicationId = snowflake(interaction.application_id) || Deno.env.get("DISCORD_APPLICATION_ID") || "";

  if (!interactionId) {
    return interactionMessage("Discord interaction could not be identified.");
  }

  if (interaction.type === INTERACTION_TYPE_MESSAGE_COMPONENT) {
    const voteDate = voteDateFromCustomId(data.custom_id);
    if (!voteDate) {
      return interactionMessage("That Discord component is not supported.");
    }

    if (configuredGuildId !== EXPECTED_DISCORD_GUILD_ID || configuredVoteChannelId !== EXPECTED_DISCORD_VOTE_CHANNEL_ID) {
      console.error("reaper-discord-interactions missing or mismatched vote reminder configuration", {
        guildConfigMatches: configuredGuildId === EXPECTED_DISCORD_GUILD_ID,
        voteChannelConfigMatches: configuredVoteChannelId === EXPECTED_DISCORD_VOTE_CHANNEL_ID,
      });
      return interactionMessage("Vote reminders are not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID || channelId !== EXPECTED_DISCORD_VOTE_CHANNEL_ID) {
      return interactionMessage("Use the daily vote reminder in the vote channel.");
    }

    if (!discordUserId) {
      return interactionMessage("Discord user could not be identified.");
    }

    try {
      const result = await recordVoteConfirmation({
        discordUserId,
        discordUsername: discordDisplayName(member),
        voteDate,
        channelId,
        interactionId,
      });
      const prefix = result.duplicate ? "You were already marked done" : "Done voting recorded";
      return interactionMessage(`${prefix} for ${voteDate}. Current streak: ${result.streak} day(s).`);
    } catch (error) {
      console.error("reaper-discord-interactions vote confirmation failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return interactionMessage("Vote confirmation could not be recorded.");
    }
  }

  if (interaction.type !== INTERACTION_TYPE_APPLICATION_COMMAND) {
    return interactionMessage("That Discord interaction is not supported.");
  }

  const commandName = safeString(data.name, 80)?.toLowerCase() || "";
  if (![
    "submit",
    "sync-ranks",
    "sync-events",
    "sync-pending-verification",
    "vote-status",
    "vote-leaderboard",
    "vote-reminder-preview",
  ].includes(commandName)) {
    return interactionMessage("That Reaper command is not supported.");
  }

  if (!interactionToken || !applicationId) {
    return interactionMessage("Discord interaction could not be identified.");
  }

  if (commandName === "vote-status") {
    if (configuredGuildId !== EXPECTED_DISCORD_GUILD_ID || configuredVoteChannelId !== EXPECTED_DISCORD_VOTE_CHANNEL_ID) {
      return interactionMessage("Vote reminders are not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID || !discordUserId) {
      return interactionMessage("Use this command in the Mochirii Discord server.");
    }

    try {
      return interactionMessage(await voteStatusMessage(discordUserId));
    } catch (error) {
      console.error("reaper-discord-interactions vote status failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return interactionMessage("Vote status could not be read.");
    }
  }

  if (commandName === "vote-leaderboard") {
    if (configuredGuildId !== EXPECTED_DISCORD_GUILD_ID || configuredVoteChannelId !== EXPECTED_DISCORD_VOTE_CHANNEL_ID) {
      return interactionMessage("Vote reminders are not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
      return interactionMessage("Use this command in the Mochirii Discord server.");
    }

    try {
      return interactionMessage(await voteLeaderboardMessage());
    } catch (error) {
      console.error("reaper-discord-interactions vote leaderboard failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return interactionMessage("Vote leaderboard could not be read.");
    }
  }

  if (commandName === "vote-reminder-preview") {
    const hasModeratorRole = EXPECTED_MODERATOR_ROLE_IDS.every((roleId) => memberRoleIds.includes(roleId));

    if (
      configuredGuildId !== EXPECTED_DISCORD_GUILD_ID ||
      configuredVoteChannelId !== EXPECTED_DISCORD_VOTE_CHANNEL_ID ||
      !expectedModeratorConfigMatches(configuredModeratorRoleIds)
    ) {
      return interactionMessage("Vote reminder preview is not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID || !discordUserId || !hasModeratorRole) {
      return interactionMessage("Vote reminder preview requires the Moderator role.");
    }

    try {
      return interactionMessage(await voteReminderPreviewMessage(voteToday()));
    } catch (error) {
      console.error("reaper-discord-interactions vote reminder preview failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return interactionMessage("Vote reminder preview could not be built.");
    }
  }

  if (commandName === "sync-pending-verification") {
    const modeValue = stringOption(data, "mode", 20)?.toLowerCase() || "preview";
    const confirm = booleanOption(data, "confirm");
    const memberPermissions = safeString(member.permissions, 80) || "0";
    const hasModeratorRole = EXPECTED_MODERATOR_ROLE_IDS.every((roleId) => memberRoleIds.includes(roleId));

    if (configuredGuildId !== EXPECTED_DISCORD_GUILD_ID || !expectedModeratorConfigMatches(configuredModeratorRoleIds)) {
      console.error("reaper-discord-interactions missing or mismatched pending verification configuration", {
        guildConfigMatches: configuredGuildId === EXPECTED_DISCORD_GUILD_ID,
        moderatorRoleConfigMatches: expectedModeratorConfigMatches(configuredModeratorRoleIds),
        configuredModeratorRoleCount: configuredModeratorRoleIds.length,
      });
      return interactionMessage("Reaper pending verification containment is not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
      return interactionMessage("Use this command in the Mochirii Discord server.");
    }

    if (!discordUserId || !hasModeratorRole) {
      return interactionMessage("Pending verification containment requires the Moderator role.");
    }

    if (!["preview", "apply"].includes(modeValue)) {
      return interactionMessage("Choose sync-pending-verification mode preview or apply.");
    }

    if (modeValue === "apply" && !confirm) {
      return interactionMessage("Run /sync-pending-verification mode:apply confirm:true after reviewing preview.");
    }

    if (modeValue === "apply" && !hasPermission(memberPermissions, MANAGE_ROLES_PERMISSION)) {
      return interactionMessage("Pending verification containment apply requires Discord Manage Roles permission.");
    }

    const mode: PendingContainmentMode = modeValue === "apply" ? "apply" : "preview";
    EdgeRuntime.waitUntil(processPendingVerificationSync(mode, interactionToken, applicationId));
    return deferredEphemeralResponse();
  }

  if (commandName === "sync-ranks") {
    const mode = stringOption(data, "mode", 20)?.toLowerCase() || "preview";
    const confirm = booleanOption(data, "confirm");
    const memberPermissions = safeString(member.permissions, 80) || "0";
    const hasModeratorRole = EXPECTED_MODERATOR_ROLE_IDS.every((roleId) => memberRoleIds.includes(roleId));

    if (configuredGuildId !== EXPECTED_DISCORD_GUILD_ID || !expectedModeratorConfigMatches(configuredModeratorRoleIds)) {
      console.error("reaper-discord-interactions missing or mismatched rank sync configuration", {
        guildConfigMatches: configuredGuildId === EXPECTED_DISCORD_GUILD_ID,
        moderatorRoleConfigMatches: expectedModeratorConfigMatches(configuredModeratorRoleIds),
        configuredModeratorRoleCount: configuredModeratorRoleIds.length,
      });
      return interactionMessage("Reaper rank sync is not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
      return interactionMessage("Use this command in the Mōchirīī Discord server.");
    }

    if (!discordUserId || !hasModeratorRole || !hasPermission(memberPermissions, MANAGE_ROLES_PERMISSION)) {
      return interactionMessage("Rank sync requires the Moderator role and Discord Manage Roles permission.");
    }

    if (!["preview", "apply"].includes(mode)) {
      return interactionMessage("Choose sync-ranks mode preview or apply.");
    }

    if (mode === "apply" && !confirm) {
      return interactionMessage("Run /sync-ranks mode:apply confirm:true after reviewing preview.");
    }

    EdgeRuntime.waitUntil(processRankSync(mode, interactionToken, applicationId));
    return deferredEphemeralResponse();
  }

  if (commandName === "sync-events") {
    const mode = stringOption(data, "mode", 20)?.toLowerCase() || "preview";
    const confirm = booleanOption(data, "confirm");
    const memberPermissions = safeString(member.permissions, 80) || "0";
    const hasModeratorRole = EXPECTED_MODERATOR_ROLE_IDS.every((roleId) => memberRoleIds.includes(roleId));

    if (configuredGuildId !== EXPECTED_DISCORD_GUILD_ID || !expectedModeratorConfigMatches(configuredModeratorRoleIds)) {
      console.error("reaper-discord-interactions missing or mismatched event sync configuration", {
        guildConfigMatches: configuredGuildId === EXPECTED_DISCORD_GUILD_ID,
        moderatorRoleConfigMatches: expectedModeratorConfigMatches(configuredModeratorRoleIds),
        configuredModeratorRoleCount: configuredModeratorRoleIds.length,
      });
      return interactionMessage("Reaper event sync is not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
      return interactionMessage("Use this command in the Mōchirīī Discord server.");
    }

    if (!discordUserId || !hasModeratorRole) {
      return interactionMessage("Event sync requires the Moderator role.");
    }

    if (!["preview", "apply"].includes(mode)) {
      return interactionMessage("Choose sync-events mode preview or apply.");
    }

    if (mode === "apply" && !confirm) {
      return interactionMessage("Run /sync-events mode:apply confirm:true after reviewing preview.");
    }

    if (
      mode === "apply" &&
      (!hasPermission(memberPermissions, CREATE_EVENTS_PERMISSION) || !hasPermission(memberPermissions, MANAGE_EVENTS_PERMISSION))
    ) {
      return interactionMessage("Event sync apply requires Discord Create Events and Manage Events permissions.");
    }

    EdgeRuntime.waitUntil(processEventSync(mode, interactionToken, applicationId));
    return deferredEphemeralResponse();
  }

  const title = stringOption(data, "title", 90);
  const caption = stringOption(data, "subtitle", 220);
  const instagramOptIn = booleanOption(data, "share_to_instagram");
  const attachment = attachmentOption(data, "image");
  const attachmentId = snowflake(attachment.id);
  const attachmentUrl = safeString(attachment.url, 4096);
  const declaredMime = normalizedMime(attachment.content_type);
  const sizeBytes = Number(attachment.size);
  const originalFilename = safeString(attachment.filename, 255);
  const filenameLooksImage = allowedImageFilename(originalFilename);
  const missingRequestRoleIds = EXPECTED_REQUIRED_ROLE_IDS.filter((roleId) => !memberRoleIds.includes(roleId));

  if (
    configuredGuildId !== EXPECTED_DISCORD_GUILD_ID ||
    configuredChannelId !== EXPECTED_DISCORD_GALLERY_CHANNEL_ID ||
    !expectedRoleConfigMatches(configuredRequiredRoleIds)
  ) {
    console.error("reaper-discord-interactions missing or mismatched Discord configuration", {
      guildConfigMatches: configuredGuildId === EXPECTED_DISCORD_GUILD_ID,
      channelConfigMatches: configuredChannelId === EXPECTED_DISCORD_GALLERY_CHANNEL_ID,
      roleConfigMatches: expectedRoleConfigMatches(configuredRequiredRoleIds),
      configuredRoleCount: configuredRequiredRoleIds.length,
    });
    return interactionMessage("Discord gallery submissions are not configured yet.");
  }

  if (guildId !== EXPECTED_DISCORD_GUILD_ID || channelId !== EXPECTED_DISCORD_GALLERY_CHANNEL_ID) {
    return interactionMessage("Use this command in the gallery submissions channel.");
  }

  if (!discordUserId || missingRequestRoleIds.length > 0) {
    return interactionMessage("Refresh Discord verification on mochirii.com/account before submitting gallery images.");
  }

  if (
    !attachmentId ||
    !attachmentUrl ||
    (!declaredMime && !filenameLooksImage) ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes <= 0
  ) {
    return interactionMessage("Attach a JPEG, PNG, or WebP image for the gallery submission.");
  }

  if (!title || !caption) {
    return interactionMessage("Add both a title and subtitle for the gallery submission.");
  }

  const payload = {
    guildId,
    channelId,
    messageId: interactionId,
    attachmentId,
    discordUserId,
    attachmentUrl,
    mimeType: declaredMime,
    sizeBytes,
    title,
    caption,
    instagramOptIn,
    originalFilename,
  };

  EdgeRuntime.waitUntil(processSubmission(payload, interactionToken, applicationId));

  return deferredEphemeralResponse();
});
