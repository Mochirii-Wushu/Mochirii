import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  EXPECTED_DISCORD_VOTE_CHANNEL_ID,
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
import {
  buildModmailAudit,
  formatModmailAuditMessage,
  MODMAIL_BOT_USER_ID,
  MODMAIL_LOG_CHANNEL_ID,
  MODMAIL_MODERATOR_ROLE_ID,
} from "../_shared/modmail-audit.ts";
import {
  allowedImageFilename,
  asArray,
  asRecord,
  asStringArray,
  attachmentOption,
  booleanOption,
  deferredEphemeralResponse,
  interactionMessage,
  jsonResponse,
  normalizedMime,
  parseCsv,
  safeDiscordResponseMessage,
  safeString,
  snowflake,
  stringOption,
  successMessage,
} from "../_shared/discord-interaction-helpers.ts";
import { verifyDiscordSignature } from "../_shared/discord-signature.ts";
import { SITE_ORIGIN, siteUrl } from "../_shared/public-origins.ts";
import { processEventSync } from "../_shared/reaper-event-sync-workflow.ts";
import {
  discordDisplayName,
  recordVoteConfirmation,
  voteLeaderboardMessage,
  voteReminderPreviewMessage,
  voteStatusMessage,
  voteToday,
} from "../_shared/reaper-vote-interactions.ts";

type JsonRecord = SharedJsonRecord;
type SupabaseAdminClient = {
  from(table: string): any;
};

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = `Mochirii-Reaper-RankSync/1.0 (${SITE_ORIGIN})`;
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_DISCORD_GALLERY_CHANNEL_ID = "1508077313965817856";
const EXPECTED_REQUIRED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"];
const EXPECTED_MODERATOR_ROLE_IDS = ["1078630751165222984"];
const EXPECTED_MODMAIL_BOT_USER_ID = MODMAIL_BOT_USER_ID;
const EXPECTED_MODMAIL_LOG_CHANNEL_ID = MODMAIL_LOG_CHANNEL_ID;
const EXPECTED_MODMAIL_MODERATOR_ROLE_ID = MODMAIL_MODERATOR_ROLE_ID;
const BASE_GUILD_ROLE_ID = "1468659807736299520";
const GUILD_SCHEDULE_URL = siteUrl("data/guild-schedule.json");
const MANAGE_ROLES_PERMISSION = 1n << 28n;
const MANAGE_EVENTS_PERMISSION = 1n << 33n;
const CREATE_EVENTS_PERMISSION = 1n << 44n;
const DISCORD_MEMBER_OVERWRITE_TYPE = 1;
const MAX_PENDING_VERIFICATION_MUTATIONS = 500;
const DISCORD_API_MAX_RETRIES = 2;
const DISCORD_FUNCTION_RETRY_BUDGET_MS = 45_000;
const PENDING_VERIFICATION_AUDIT_REASON = "Reaper pending verification containment";
const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
const INTERACTION_TYPE_MESSAGE_COMPONENT = 3;
const INTERACTION_RESPONSE_PONG = 1;

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

async function fetchGuildMember(userId: string): Promise<JsonRecord | null> {
  const response = await discordApi(`/guilds/${EXPECTED_DISCORD_GUILD_ID}/members/${encodeURIComponent(userId)}`, {
    headers: discordApiHeaders(),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Guild member ${userId} fetch failed with Discord API ${response.status}.`);
  }

  return asRecord(response.data);
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

async function processModmailAudit(interactionToken: string, applicationId: string): Promise<void> {
  try {
    if (!Deno.env.get("DISCORD_BOT_TOKEN")) {
      await editOriginalInteractionResponse(applicationId, interactionToken, "Reaper ModMail audit is missing the Discord bot token.");
      return;
    }

    const [roles, channels, members, modmailMember] = await Promise.all([
      fetchGuildRoles(),
      fetchGuildChannels(),
      fetchGuildMembers(),
      fetchGuildMember(EXPECTED_MODMAIL_BOT_USER_ID),
    ]);

    const result = buildModmailAudit({
      guildId: EXPECTED_DISCORD_GUILD_ID,
      botUserId: EXPECTED_MODMAIL_BOT_USER_ID,
      logChannelId: EXPECTED_MODMAIL_LOG_CHANNEL_ID,
      moderatorRoleId: EXPECTED_MODMAIL_MODERATOR_ROLE_ID,
      roles,
      channels,
      members,
      modmailMember,
    });

    await editOriginalInteractionResponse(applicationId, interactionToken, formatModmailAuditMessage(result));
  } catch (error) {
    console.error("reaper-discord-interactions ModMail audit failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    await editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      "Reaper ModMail audit could not be completed. Check bot token, guild access, and Discord API permissions.",
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

function sourceEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/submit-discord-gallery-image`;
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

function voteDependencies() {
  return {
    expectedGuildId: EXPECTED_DISCORD_GUILD_ID,
    expectedVoteChannelId: EXPECTED_DISCORD_VOTE_CHANNEL_ID,
    adminClient: () => serviceAdminClient("vote reminders"),
    discordApi,
  };
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
      }, voteDependencies());
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
    "audit-modmail",
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
      return interactionMessage(await voteStatusMessage(discordUserId, voteDependencies()));
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
      return interactionMessage(await voteLeaderboardMessage(voteDependencies()));
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
      return interactionMessage(await voteReminderPreviewMessage(voteToday(), voteDependencies()));
    } catch (error) {
      console.error("reaper-discord-interactions vote reminder preview failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return interactionMessage("Vote reminder preview could not be built.");
    }
  }

  if (commandName === "audit-modmail") {
    const hasModeratorRole = EXPECTED_MODERATOR_ROLE_IDS.every((roleId) => memberRoleIds.includes(roleId));

    if (configuredGuildId !== EXPECTED_DISCORD_GUILD_ID || !expectedModeratorConfigMatches(configuredModeratorRoleIds)) {
      console.error("reaper-discord-interactions missing or mismatched ModMail audit configuration", {
        guildConfigMatches: configuredGuildId === EXPECTED_DISCORD_GUILD_ID,
        moderatorRoleConfigMatches: expectedModeratorConfigMatches(configuredModeratorRoleIds),
        configuredModeratorRoleCount: configuredModeratorRoleIds.length,
      });
      return interactionMessage("Reaper ModMail audit is not configured yet.");
    }

    if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
      return interactionMessage("Use this command in the Mochirii Discord server.");
    }

    if (!discordUserId || !hasModeratorRole) {
      return interactionMessage("ModMail audit requires the Moderator role.");
    }

    EdgeRuntime.waitUntil(processModmailAudit(interactionToken, applicationId));
    return deferredEphemeralResponse();
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

    EdgeRuntime.waitUntil(processEventSync(mode, interactionToken, applicationId, {
      expectedGuildId: EXPECTED_DISCORD_GUILD_ID,
      guildScheduleUrl: GUILD_SCHEDULE_URL,
      discordApiUserAgent: DISCORD_API_USER_AGENT,
      discordApi,
      discordApiHeaders,
      editOriginalInteractionResponse,
      serviceAdminClient,
    }));
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
