import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import nacl from "tweetnacl";

type JsonRecord = Record<string, unknown>;

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_DISCORD_GALLERY_CHANNEL_ID = "1508077313965817856";
const EXPECTED_REQUIRED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"];
const EXPECTED_MODERATOR_ROLE_IDS = ["1078630751165222984"];
const BASE_GUILD_ROLE_ID = "1468659807736299520";
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MANAGE_ROLES_PERMISSION = 1n << 28n;
const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;
const EPHEMERAL_FLAG = 1 << 6;
const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
const INTERACTION_RESPONSE_PONG = 1;
const INTERACTION_RESPONSE_CHANNEL_MESSAGE = 4;
const INTERACTION_RESPONSE_DEFERRED_CHANNEL_MESSAGE = 5;
const OPTION_TYPE_STRING = 3;
const OPTION_TYPE_BOOLEAN = 5;
const OPTION_TYPE_ATTACHMENT = 11;

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

function snowflake(value: unknown): string | null {
  const id = safeString(value, 24);
  return id && /^\d{16,22}$/.test(id) ? id : null;
}

function normalizedMime(value: unknown): string | null {
  const mime = safeString(value, 80)?.split(";")[0]?.trim().toLowerCase() || null;
  if (mime === "image/jpg") return "image/jpeg";
  return mime && ALLOWED_MIME_TYPES.has(mime) ? mime : null;
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
  });
  if (contentType) headers.set("Content-Type", "application/json");
  return headers;
}

async function discordApi(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: unknown }> {
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
  return { ok: response.ok, status: response.status, data };
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
    body: JSON.stringify({ content }),
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

  if (interaction.type !== INTERACTION_TYPE_APPLICATION_COMMAND) {
    return interactionMessage("That Discord interaction is not supported.");
  }

  const data = asRecord(interaction.data);
  const commandName = safeString(data.name, 80)?.toLowerCase() || "";
  if (!["submit", "sync-ranks"].includes(commandName)) {
    return interactionMessage("That Reaper command is not supported.");
  }

  const configuredGuildId = Deno.env.get("DISCORD_GUILD_ID") || "";
  const configuredChannelId = Deno.env.get("DISCORD_GALLERY_CHANNEL_ID") || "";
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

  if (!interactionId || !interactionToken || !applicationId) {
    return interactionMessage("Discord interaction could not be identified.");
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

  const title = stringOption(data, "title", 90);
  const caption = stringOption(data, "subtitle", 220);
  const instagramOptIn = booleanOption(data, "share_to_instagram");
  const attachment = attachmentOption(data, "image");
  const attachmentId = snowflake(attachment.id);
  const attachmentUrl = safeString(attachment.url, 4096);
  const mimeType = normalizedMime(attachment.content_type);
  const sizeBytes = Number(attachment.size);
  const originalFilename = safeString(attachment.filename, 255);
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

  if (!attachmentId || !attachmentUrl || !mimeType || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
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
    mimeType,
    sizeBytes,
    title,
    caption,
    instagramOptIn,
    originalFilename,
  };

  EdgeRuntime.waitUntil(processSubmission(payload, interactionToken, applicationId));

  return deferredEphemeralResponse();
});
