const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const MANAGE_ROLES_PERMISSION = "268435456";
const COMMAND_NAME = "sync-pending-verification";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");

const commandPayload = {
  name: COMMAND_NAME,
  description: "Preview or apply Reaper pending-verification containment.",
  type: 1,
  default_member_permissions: MANAGE_ROLES_PERMISSION,
  dm_permission: false,
  options: [
    {
      type: 3,
      name: "mode",
      description: "Preview without changes or apply after approval.",
      required: true,
      choices: [
        { name: "preview", value: "preview" },
        { name: "apply", value: "apply" },
      ],
    },
    {
      type: 5,
      name: "confirm",
      description: "Required true for apply.",
      required: false,
    },
  ],
};

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}.`);
  return value;
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

function commandFields(command) {
  return {
    name: command.name,
    description: command.description,
    type: command.type,
    default_member_permissions: command.default_member_permissions,
    dm_permission: command.dm_permission,
    options: command.options,
  };
}

function samePayload(existing) {
  return JSON.stringify(commandFields(existing)) === JSON.stringify(commandPayload);
}

async function main() {
  const token = requiredEnv("DISCORD_BOT_TOKEN");
  const applicationId = requiredEnv("DISCORD_APPLICATION_ID");
  const guildId = env("DISCORD_GUILD_ID", EXPECTED_DISCORD_GUILD_ID);

  if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
    throw new Error(`Refusing to register ${COMMAND_NAME} outside guild ${EXPECTED_DISCORD_GUILD_ID}.`);
  }

  const headers = {
    Authorization: `Bot ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const route = `/applications/${applicationId}/guilds/${guildId}/commands`;
  const listResponse = await discordFetch(route, { headers });
  if (!listResponse.ok || !Array.isArray(listResponse.data)) {
    throw new Error(`Discord command list failed with API ${listResponse.status}.`);
  }

  const existing = listResponse.data.find((command) => command?.name === COMMAND_NAME);
  const action = existing ? "patch" : "create";
  const alreadyCurrent = existing && samePayload(existing);

  console.log(JSON.stringify({
    dryRun: !apply,
    command: COMMAND_NAME,
    guildId,
    action: alreadyCurrent ? "none" : action,
    default_member_permissions: commandPayload.default_member_permissions,
    dm_permission: commandPayload.dm_permission,
    payload: commandPayload,
  }, null, 2));

  if (!apply) {
    console.log("Dry run only. Rerun with --apply after approval to mutate the guild command.");
    return;
  }

  if (alreadyCurrent) {
    console.log(`${COMMAND_NAME} is already current.`);
    return;
  }

  const mutationPath = existing ? `${route}/${existing.id}` : route;
  const mutationResponse = await discordFetch(mutationPath, {
    method: existing ? "PATCH" : "POST",
    headers,
    body: JSON.stringify(commandPayload),
  });

  if (!mutationResponse.ok) {
    throw new Error(`Discord command ${action} failed with API ${mutationResponse.status}.`);
  }

  console.log(`${COMMAND_NAME} ${action} completed for guild ${guildId}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
