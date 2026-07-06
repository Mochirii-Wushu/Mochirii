const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_DISCORD_GALLERY_CHANNEL_ID = "1508077313965817856";
const COMMAND_NAME = "submit";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");

const commandPayload = {
  name: COMMAND_NAME,
  description: "Submit an image to the Mochirii gallery moderation queue.",
  type: 1,
  dm_permission: false,
  options: [
    {
      type: 11,
      name: "image",
      description: "The image file to submit.",
      required: true,
    },
    {
      type: 3,
      name: "title",
      description: "Optional gallery title.",
      required: false,
      max_length: 90,
    },
    {
      type: 3,
      name: "subtitle",
      description: "Optional gallery subtitle.",
      required: false,
      max_length: 220,
    },
    {
      type: 5,
      name: "share_to_instagram",
      description: "Allow Mochirii to share this image on our official Instagram if approved.",
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
    dm_permission: command.dm_permission,
    options: command.options,
  };
}

function normalizeOption(option) {
  return {
    type: option.type,
    name: option.name,
    description: option.description,
    required: option.required ?? false,
    ...(option.max_length ? { max_length: option.max_length } : {}),
  };
}

function normalizeCommandFields(command) {
  const fields = commandFields(command);
  return {
    ...fields,
    dm_permission: fields.dm_permission ?? false,
    options: Array.isArray(fields.options) ? fields.options.map(normalizeOption) : [],
  };
}

function samePayload(existing) {
  return JSON.stringify(normalizeCommandFields(existing)) === JSON.stringify(normalizeCommandFields(commandPayload));
}

function assertExpectedCommandShape() {
  const image = commandPayload.options.find((option) => option.name === "image");
  const title = commandPayload.options.find((option) => option.name === "title");
  const subtitle = commandPayload.options.find((option) => option.name === "subtitle");
  const share = commandPayload.options.find((option) => option.name === "share_to_instagram");

  if (image?.required !== true) throw new Error("Refusing to register /submit without required image option.");
  if (title?.required !== false) throw new Error("Refusing to register /submit with required title option.");
  if (subtitle?.required !== false) throw new Error("Refusing to register /submit with required subtitle option.");
  if (share?.required !== false) throw new Error("Refusing to register /submit with required share_to_instagram option.");
}

async function main() {
  assertExpectedCommandShape();

  const token = requiredEnv("DISCORD_BOT_TOKEN");
  const applicationId = requiredEnv("DISCORD_APPLICATION_ID");
  const guildId = env("DISCORD_GUILD_ID", EXPECTED_DISCORD_GUILD_ID);
  const galleryChannelId = env("DISCORD_GALLERY_CHANNEL_ID", EXPECTED_DISCORD_GALLERY_CHANNEL_ID);

  if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
    throw new Error(`Refusing to register ${COMMAND_NAME} outside guild ${EXPECTED_DISCORD_GUILD_ID}.`);
  }

  if (galleryChannelId !== EXPECTED_DISCORD_GALLERY_CHANNEL_ID) {
    throw new Error(`Refusing to register ${COMMAND_NAME} with unexpected gallery channel ${galleryChannelId}.`);
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
    galleryChannelId,
    action: alreadyCurrent ? "none" : action,
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
