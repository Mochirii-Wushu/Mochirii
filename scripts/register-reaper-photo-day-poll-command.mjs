const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_DISCORD_PHOTO_DAY_CHANNEL_ID = "1468667003366674721";
const COMMAND_NAME = "photo-day-poll";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");

const commandPayload = {
  name: COMMAND_NAME,
  description: "Preview and approve a Guild Photo Day reaction poll.",
  type: 1,
  dm_permission: false,
  options: [
    {
      type: 3,
      name: "question",
      description:
        "Optional poll question. Defaults to the approved Guild Photo Day wording.",
      required: false,
      max_length: 220,
    },
    {
      type: 3,
      name: "option_1",
      description:
        "Optional first answer. Provide at least two options when overriding defaults.",
      required: false,
      max_length: 90,
    },
    {
      type: 3,
      name: "option_2",
      description:
        "Optional second answer. Provide at least two options when overriding defaults.",
      required: false,
      max_length: 90,
    },
    {
      type: 3,
      name: "option_3",
      description: "Optional third answer.",
      required: false,
      max_length: 90,
    },
    {
      type: 3,
      name: "option_4",
      description: "Optional fourth answer.",
      required: false,
      max_length: 90,
    },
    {
      type: 3,
      name: "option_5",
      description: "Optional fifth answer.",
      required: false,
      max_length: 90,
    },
  ],
};

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }
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
  const seconds = Number.isFinite(headerSeconds) && headerSeconds > 0
    ? headerSeconds
    : bodySeconds;
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

  return {
    ok: false,
    status: 429,
    data: { error: "Discord retry budget exhausted." },
  };
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
    options: Array.isArray(fields.options)
      ? fields.options.map(normalizeOption)
      : [],
  };
}

function samePayload(existing) {
  return JSON.stringify(normalizeCommandFields(existing)) ===
    JSON.stringify(normalizeCommandFields(commandPayload));
}

function assertExpectedCommandShape() {
  const optionNames = commandPayload.options.map((option) => option.name);
  for (
    const expected of [
      "question",
      "option_1",
      "option_2",
      "option_3",
      "option_4",
      "option_5",
    ]
  ) {
    if (!optionNames.includes(expected)) {
      throw new Error(
        `Refusing to register /${COMMAND_NAME} without ${expected}.`,
      );
    }
  }

  for (const option of commandPayload.options) {
    if (option.required !== false) {
      throw new Error(
        `Refusing to register /${COMMAND_NAME} with required ${option.name}.`,
      );
    }
    if (option.type !== 3) {
      throw new Error(
        `Refusing to register /${COMMAND_NAME} with non-string ${option.name}.`,
      );
    }
  }
}

async function main() {
  assertExpectedCommandShape();

  const token = requiredEnv("DISCORD_BOT_TOKEN");
  const applicationId = requiredEnv("DISCORD_APPLICATION_ID");
  const guildId = env("DISCORD_GUILD_ID", EXPECTED_DISCORD_GUILD_ID);

  if (guildId !== EXPECTED_DISCORD_GUILD_ID) {
    throw new Error(
      `Refusing to register ${COMMAND_NAME} outside guild ${EXPECTED_DISCORD_GUILD_ID}.`,
    );
  }

  const headers = {
    Authorization: `Bot ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const route = `/applications/${applicationId}/guilds/${guildId}/commands`;
  const listResponse = await discordFetch(route, { headers });
  if (!listResponse.ok || !Array.isArray(listResponse.data)) {
    throw new Error(
      `Discord command list failed with API ${listResponse.status}.`,
    );
  }

  const existing = listResponse.data.find((command) =>
    command?.name === COMMAND_NAME
  );
  const action = existing ? "patch" : "create";
  const alreadyCurrent = existing && samePayload(existing);

  console.log(JSON.stringify(
    {
      dryRun: !apply,
      command: COMMAND_NAME,
      guildId,
      photoDayChannelId: EXPECTED_DISCORD_PHOTO_DAY_CHANNEL_ID,
      action: alreadyCurrent ? "none" : action,
      payload: commandPayload,
    },
    null,
    2,
  ));

  if (!apply) {
    console.log(
      "Dry run only. Rerun with --apply after approval to mutate the guild command.",
    );
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
    throw new Error(
      `Discord command ${action} failed with API ${mutationResponse.status}.`,
    );
  }

  console.log(`${COMMAND_NAME} ${action} completed for guild ${guildId}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
