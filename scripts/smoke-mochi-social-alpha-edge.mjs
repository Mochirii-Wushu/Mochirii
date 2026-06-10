const functionsUrl = (process.env.MOCHI_SOCIAL_ALPHA_EDGE_URL || "").replace(/\/+$/, "");
const publishableKey = process.env.MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY || "";
const gameServerToken = process.env.MOCHI_SOCIAL_GAME_SERVER_TOKEN || "";
const timeoutMs = Number(process.env.MOCHI_SOCIAL_ALPHA_EDGE_TIMEOUT_MS || 15000);

if (!functionsUrl || !publishableKey) {
  console.log("Mochi Social alpha Edge smoke skipped. Set MOCHI_SOCIAL_ALPHA_EDGE_URL and MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY to verify a Supabase preview branch.");
  process.exit(0);
}

const checks = [];

try {
  await run();
  console.log(`Mochi Social alpha Edge smoke passed for ${functionsUrl}`);
  if (!gameServerToken) {
    console.log("Tokened action probe skipped. Set MOCHI_SOCIAL_GAME_SERVER_TOKEN locally to verify the trusted-game invalid-action path.");
  }
} catch (error) {
  console.error("Mochi Social alpha Edge smoke failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function run() {
  for (const name of ["mochi-social-alpha-session", "mochi-social-alpha-action", "mochi-social-alpha-admin", "submit-mochi-social-feedback"]) {
    await checkOptions(name);
  }

  await expectJson("mochi-social-alpha-session", "session without auth", {}, {
    status: 401,
    error: "missing_auth",
    allowGatewayAuthError: true,
  });
  await expectJson("mochi-social-alpha-session", "session malformed auth", {}, {
    authorization: "Bearer malformed.jwt.token",
    status: 401,
    error: "invalid_auth",
    allowGatewayAuthError: true,
  });

  await expectJson("submit-mochi-social-feedback", "feedback without auth", { category: "alpha", message: "smoke" }, {
    status: 401,
    error: "missing_auth",
    allowGatewayAuthError: true,
  });
  await expectJson("submit-mochi-social-feedback", "feedback malformed auth", { category: "alpha", message: "smoke" }, {
    authorization: "Bearer malformed.jwt.token",
    status: 401,
    error: "invalid_auth",
    allowGatewayAuthError: true,
  });

  await expectJson("mochi-social-alpha-admin", "admin without auth", { action: "list" }, {
    statusSet: [401, 403],
    allowGatewayAuthError: true,
  });
  await expectJson("mochi-social-alpha-admin", "admin malformed auth", { action: "list" }, {
    authorization: "Bearer malformed.jwt.token",
    statusSet: [401, 403],
    allowGatewayAuthError: true,
  });

  await expectJson("mochi-social-alpha-action", "action without game token", {
    requestId: `edge-smoke-${Date.now().toString(36)}`,
    type: "chat.send",
    playerId: "00000000-0000-4000-8000-000000000000",
    payload: { message: "smoke" },
  }, {
    status: 401,
    error: "invalid_game_server_token",
  });
  await expectJson("mochi-social-alpha-action", "action invalid game token", {
    requestId: `edge-smoke-${Date.now().toString(36)}-invalid`,
    type: "chat.send",
    playerId: "00000000-0000-4000-8000-000000000000",
    payload: { message: "smoke" },
  }, {
    gameServerToken: "invalid-game-server-token",
    status: 401,
    error: "invalid_game_server_token",
  });

  if (gameServerToken) {
    await expectJson("mochi-social-alpha-action", "trusted game invalid action", {
      requestId: `edge-smoke-${Date.now().toString(36)}-trusted`,
      type: "not.valid",
      playerId: "00000000-0000-4000-8000-000000000000",
      payload: { noRealValue: true },
    }, {
      gameServerToken,
      status: 400,
      error: "invalid_alpha_action",
    });
  }
}

async function checkOptions(name) {
  const result = await request(name, {
    method: "OPTIONS",
    headers: baseHeaders(),
  });
  assert(result.status >= 200 && result.status < 300, `${name} OPTIONS expected 2xx, got ${result.status}.`);
}

async function expectJson(name, label, body, expectation) {
  const extraHeaders = {};
  if (expectation.authorization) extraHeaders.Authorization = expectation.authorization;
  if (expectation.gameServerToken) extraHeaders["x-mochi-social-server-token"] = expectation.gameServerToken;

  const result = await request(name, {
    method: "POST",
    headers: baseHeaders(extraHeaders),
    body: JSON.stringify(body),
  });

  if (expectation.statusSet) {
    assert(expectation.statusSet.includes(result.status), `${label} expected one of ${expectation.statusSet.join(", ")}, got ${result.status}.`);
  } else {
    assert(result.status === expectation.status, `${label} expected HTTP ${expectation.status}, got ${result.status}.`);
  }

  if (expectation.allowGatewayAuthError && !result.json) return;
  assert(result.json && typeof result.json === "object", `${label} did not return JSON.`);
  if (expectation.error) {
    if (expectation.allowGatewayAuthError && !result.json.error) return;
    assert(result.json.error === expectation.error, `${label} expected error ${expectation.error}, got ${result.json.error || "<missing>"}.`);
  }
}

async function request(name, init) {
  const response = await fetch(`${functionsUrl}/${name}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const json = contentType.includes("application/json") && text ? JSON.parse(text) : null;
  checks.push({ name, status: response.status });
  return { status: response.status, json, text };
}

function baseHeaders(extra = {}) {
  return {
    apikey: publishableKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
