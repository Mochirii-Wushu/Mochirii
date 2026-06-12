const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const CONFIRM_GUILD_ARG = "--confirm-guild=1078630751077142608";
const PENDING_VERIFICATION_MANAGED_BY = "reaper-pending-verification";
const VIEW_CHANNEL_PERMISSION = 1n << 10n;
const DISCORD_MEMBER_OVERWRITE_TYPE = 1;
const PENDING_VERIFICATION_AUDIT_REASON = "Reaper pending verification containment rollback";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const confirmGuild = process.argv.find((arg) => arg.startsWith("--confirm-guild="))?.split("=")[1] || "";

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}.`);
  return value;
}

function getServiceRoleKey() {
  const direct = env("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;

  const secretKeys = env("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys);
    return String(parsed.default || parsed.service_role || "");
  } catch {
    return "";
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function snowflake(value) {
  const text = String(value || "").trim();
  return /^\d{16,22}$/.test(text) ? text : "";
}

function bits(value) {
  try {
    return BigInt(String(value || "0"));
  } catch {
    return 0n;
  }
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function retryAfterMs(response, data) {
  const headerSeconds = Number(response.headers.get("Retry-After") || "");
  const bodySeconds = Number(data?.retry_after || "");
  const seconds = Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : bodySeconds;
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.ceil(seconds * 1000);
}

async function discordFetch(path, init = {}) {
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    const response = await fetch(`${DISCORD_API_BASE_URL}${path}`, init);
    const data = await readPayload(response);

    if (response.status === 429 && attempt < 2) {
      const delay = retryAfterMs(response, data);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }

    return { ok: response.ok, status: response.status, data };
  }

  return { ok: false, status: 429, data: { error: "Discord retry budget exhausted." } };
}

async function supabaseFetch(path, init = {}) {
  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) throw new Error("Missing Supabase service role key.");

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(init.headers || {}),
    },
  });
  const data = await readPayload(response);
  return { ok: response.ok, status: response.status, data };
}

async function loadRows(guildId) {
  const params = new URLSearchParams({
    select: "id,guild_id,channel_id,discord_user_id,owned_allow,owned_deny",
    guild_id: `eq.${guildId}`,
    managed_by: `eq.${PENDING_VERIFICATION_MANAGED_BY}`,
    active: "eq.true",
  });
  const response = await supabaseFetch(`/rest/v1/discord_managed_permission_overwrites?${params}`);
  if (!response.ok || !Array.isArray(response.data)) {
    throw new Error(`Supabase managed overwrite query failed with API ${response.status}.`);
  }
  return response.data.map(asRecord);
}

async function loadChannels(guildId, token) {
  const response = await discordFetch(`/guilds/${guildId}/channels`, {
    headers: {
      Authorization: `Bot ${token}`,
      Accept: "application/json",
    },
  });
  if (!response.ok || !Array.isArray(response.data)) {
    throw new Error(`Discord channel query failed with API ${response.status}.`);
  }
  return response.data.map(asRecord);
}

function memberOverwrite(channel, userId) {
  return asRecord(
    asArray(channel.permission_overwrites).find((overwrite) => {
      const record = asRecord(overwrite);
      return snowflake(record.id) === userId && Number(record.type) === DISCORD_MEMBER_OVERWRITE_TYPE;
    }),
  );
}

function planRollback(row, channel) {
  const rowId = String(row.id || "").trim();
  const channelId = snowflake(row.channel_id);
  const userId = snowflake(row.discord_user_id);
  const ownedAllow = bits(row.owned_allow) & VIEW_CHANNEL_PERMISSION;
  const ownedDeny = bits(row.owned_deny) & VIEW_CHANNEL_PERMISSION;

  if (!rowId || !channelId || !userId) {
    return { row, channelId, userId, discordWrite: false, dbWrite: false, missingChannel: false, invalid: true };
  }

  if (!channel) {
    return { row, channelId, userId, discordWrite: false, dbWrite: true, missingChannel: true, invalid: false };
  }

  const overwrite = memberOverwrite(channel, userId);
  const currentAllow = bits(overwrite.allow);
  const currentDeny = bits(overwrite.deny);
  const nextAllow = currentAllow & ~ownedAllow;
  const nextDeny = currentDeny & ~ownedDeny;
  const hasOverwrite = Boolean(overwrite.id);

  return {
    row,
    channelId,
    userId,
    currentAllow,
    currentDeny,
    nextAllow,
    nextDeny,
    discordWrite: hasOverwrite && (currentAllow !== nextAllow || currentDeny !== nextDeny),
    dbWrite: true,
    missingChannel: false,
    invalid: false,
    deleteOverwrite: nextAllow === 0n && nextDeny === 0n,
  };
}

async function writeDiscordRollback(change, token) {
  const headers = {
    Authorization: `Bot ${token}`,
    Accept: "application/json",
    "X-Audit-Log-Reason": encodeURIComponent(PENDING_VERIFICATION_AUDIT_REASON),
  };

  const response = change.deleteOverwrite
    ? await discordFetch(`/channels/${change.channelId}/permissions/${change.userId}`, {
      method: "DELETE",
      headers,
    })
    : await discordFetch(`/channels/${change.channelId}/permissions/${change.userId}`, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allow: change.nextAllow.toString(),
        deny: change.nextDeny.toString(),
        type: DISCORD_MEMBER_OVERWRITE_TYPE,
      }),
    });

  if (!response.ok) {
    throw new Error(`Discord rollback write failed for channel ${change.channelId} user ${change.userId} with API ${response.status}.`);
  }
}

async function clearRegistryRow(rowId) {
  const response = await supabaseFetch(`/rest/v1/discord_managed_permission_overwrites?id=eq.${encodeURIComponent(rowId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      owned_allow: "0",
      owned_deny: "0",
      active: false,
      cleared_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase rollback registry update failed for row ${rowId} with API ${response.status}.`);
  }
}

async function main() {
  const guildId = EXPECTED_DISCORD_GUILD_ID;
  if (apply && confirmGuild !== guildId) {
    throw new Error(`Rollback apply requires ${CONFIRM_GUILD_ARG}.`);
  }

  const token = requiredEnv("DISCORD_BOT_TOKEN");
  const [rows, channels] = await Promise.all([loadRows(guildId), loadChannels(guildId, token)]);
  const channelById = new Map(channels.map((channel) => [snowflake(channel.id), channel]));
  const changes = rows.map((row) => planRollback(row, channelById.get(snowflake(row.channel_id))));
  const validChanges = changes.filter((change) => !change.invalid);
  const discordWrites = validChanges.filter((change) => change.discordWrite);
  const dbWrites = validChanges.filter((change) => change.dbWrite);

  console.log(JSON.stringify({
    dryRun: !apply,
    guildId,
    managedBy: PENDING_VERIFICATION_MANAGED_BY,
    activeRows: rows.length,
    plannedDiscordWrites: discordWrites.length,
    plannedRegistryWrites: dbWrites.length,
    missingChannels: validChanges.filter((change) => change.missingChannel).length,
    invalidRows: changes.filter((change) => change.invalid).length,
    sample: validChanges.slice(0, 20).map((change) => ({
      channelId: change.channelId,
      discordUserId: change.userId,
      discordWrite: change.discordWrite,
      deleteOverwrite: Boolean(change.deleteOverwrite),
      missingChannel: change.missingChannel,
    })),
  }, null, 2));

  if (!apply) {
    console.log(`Dry run only. Rerun with --apply ${CONFIRM_GUILD_ARG} after approval.`);
    return;
  }

  for (const change of validChanges) {
    if (change.discordWrite) {
      await writeDiscordRollback(change, token);
    }

    if (change.dbWrite) {
      await clearRegistryRow(String(change.row.id || ""));
    }
  }

  console.log(`Rollback completed for ${validChanges.length} tracked pending-verification overwrite rows.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
