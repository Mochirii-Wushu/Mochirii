import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const TIMEOUT_MS = 15000;

const protectedFunctions = [
  {
    name: "verify-discord-member",
    body: {},
  },
  {
    name: "list-gallery-review-queue",
    body: { checkOnly: true },
  },
  {
    name: "moderate-gallery-submission",
    body: {
      submission_id: "00000000-0000-4000-8000-000000000000",
      action: "approved",
    },
  },
  {
    name: "list-instagram-publish-queue",
    body: { status: "queued" },
  },
  {
    name: "publish-instagram-gallery-submission",
    body: {
      job_id: "00000000-0000-4000-8000-000000000000",
      caption: "Smoke test only.",
      alt_text: "Smoke test placeholder.",
      confirmPublish: true,
    },
  },
];

const secretProtectedFunctions = [
  {
    name: "submit-discord-gallery-image",
    body: {
      guildId: "1078630751077142608",
      channelId: "1078630751077142608",
      messageId: "1078630751077142608",
      attachmentId: "1078630751077142608",
      discordUserId: "1078630751077142608",
      attachmentUrl: "https://cdn.discordapp.com/attachments/1078630751077142608/1078630751077142608/example.png",
      mimeType: "image/png",
      sizeBytes: 1,
      instagramOptIn: false,
    },
  },
];

function readSupabasePublicConfig() {
  const text = readFileSync(path.join(root, "supabase.js"), "utf8");
  const url = text.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1] || "";
  const publishableKey = text.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1] || "";

  if (!url || !publishableKey) {
    throw new Error("Unable to read public Supabase URL and publishable key from supabase.js.");
  }

  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error("Supabase smoke requires the browser-safe sb_publishable_ key.");
  }

  return {
    url: url.replace(/\/+$/, ""),
    publishableKey,
  };
}

function functionUrl(config, name) {
  return `${config.url}/functions/v1/${name}`;
}

function headers(config, extra = {}) {
  return {
    apikey: config.publishableKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  };
}

async function fetchContract(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get("content-type") || "",
    cors: response.headers.get("access-control-allow-origin") || "",
    json,
    text,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") return String(body || "").slice(0, 120);
  const copy = JSON.parse(JSON.stringify(body));
  const submissions = copy?.data?.submissions;
  if (Array.isArray(submissions)) {
    copy.data.submissions = submissions.map((item) => ({
      ...item,
      signed_url: item?.signed_url ? "[redacted signed URL]" : item?.signed_url,
    }));
  }
  return JSON.stringify(copy).slice(0, 500);
}

async function checkOptions(config, name) {
  const result = await fetchContract(functionUrl(config, name), {
    method: "OPTIONS",
    headers: headers(config),
  });
  assert(result.status >= 200 && result.status < 300, `${name} OPTIONS expected 2xx, got ${result.status}.`);
  assert(result.cors === "*" || result.cors, `${name} OPTIONS missing CORS allow-origin header.`);
}

async function checkProtectedRejects(config, target, label, authorization) {
  const result = await fetchContract(functionUrl(config, target.name), {
    method: "POST",
    headers: headers(config, authorization ? { Authorization: authorization } : {}),
    body: JSON.stringify(target.body),
  });

  assert(
    result.status === 401 || result.status === 403,
    `${target.name} ${label} expected 401/403 fail-closed response, got ${result.status}: ${summarizeBody(result.json || result.text)}`,
  );
}

async function checkSecretProtectedRejects(config, target, label, extraHeaders = {}) {
  const result = await fetchContract(functionUrl(config, target.name), {
    method: "POST",
    headers: headers(config, extraHeaders),
    body: JSON.stringify(target.body),
  });

  assert(
    result.status === 401 || result.status === 403 || result.status === 500,
    `${target.name} ${label} expected fail-closed 401/403/500 response, got ${result.status}: ${summarizeBody(result.json || result.text)}`,
  );

  assert(result.ok === false, `${target.name} ${label} unexpectedly succeeded.`);
}

async function checkMethodNotAllowed(config, name) {
  const result = await fetchContract(functionUrl(config, name), {
    method: "DELETE",
    headers: headers(config),
  });

  assert(result.status === 405, `${name} DELETE expected 405 Method not allowed, got ${result.status}.`);
}

function validateApprovedFeedBody(body) {
  assert(body && typeof body === "object", "approved feed response was not JSON.");
  assert(body.ok === true, `approved feed response ok flag was not true: ${summarizeBody(body)}`);
  assert(body.data && typeof body.data === "object", "approved feed response missing data object.");
  assert(Array.isArray(body.data.submissions), "approved feed response data.submissions must be an array.");
  assert(Number.isFinite(Number(body.data.count)), "approved feed response data.count must be numeric.");
  assert(Number(body.data.count) === body.data.submissions.length, "approved feed count did not match submissions length.");
  assert(Number(body.data.signedUrlSeconds) === 3600, "approved feed signedUrlSeconds should be 3600.");

  const forbiddenKeys = new Set(["user_id", "storage_path", "storage_bucket", "reviewed_by", "rejection_reason"]);

  body.data.submissions.forEach((submission, index) => {
    assert(submission && typeof submission === "object", `approved feed submission ${index} was not an object.`);
    Object.keys(submission).forEach((key) => {
      assert(!forbiddenKeys.has(key), `approved feed submission ${index} exposed private key ${key}.`);
    });
    assert(typeof submission.id === "string" && submission.id, `approved feed submission ${index} missing id.`);
    if (submission.signed_url != null) {
      assert(typeof submission.signed_url === "string", `approved feed submission ${index} signed_url must be a string or null.`);
      assert(/^https?:\/\//.test(submission.signed_url), `approved feed submission ${index} signed_url did not look like an HTTP URL.`);
    }
  });
}

async function checkApprovedFeed(config) {
  const name = "list-approved-gallery-submissions";
  await checkOptions(config, name);

  const getResult = await fetchContract(functionUrl(config, name), {
    method: "GET",
    headers: headers(config),
  });

  assert(
    getResult.status === 200,
    `${name} GET expected 200 public response, got ${getResult.status}: ${summarizeBody(getResult.json || getResult.text)}`,
  );
  validateApprovedFeedBody(getResult.json);

  const deleteResult = await fetchContract(functionUrl(config, name), {
    method: "DELETE",
    headers: headers(config),
  });

  assert(deleteResult.status === 405, `${name} DELETE expected 405 Method not allowed, got ${deleteResult.status}.`);
}

const warnings = [];

try {
  const config = readSupabasePublicConfig();

  for (const target of protectedFunctions) {
    await checkOptions(config, target.name);
    await checkProtectedRejects(config, target, "without JWT", "");
    await checkProtectedRejects(config, target, "with malformed JWT", "Bearer malformed.jwt.token");
    await checkProtectedRejects(config, target, "with publishable key as bearer", `Bearer ${config.publishableKey}`);
  }

  for (const target of secretProtectedFunctions) {
    await checkOptions(config, target.name);
    await checkMethodNotAllowed(config, target.name);
    await checkSecretProtectedRejects(config, target, "without ingest secret");
    await checkSecretProtectedRejects(config, target, "with publishable key as bearer", {
      Authorization: `Bearer ${config.publishableKey}`,
    });
    await checkSecretProtectedRejects(config, target, "with invalid ingest header", {
      "x-mochirii-reaper-secret": "invalid-ingest-secret",
    });
  }

  await checkApprovedFeed(config);
  console.log("Supabase Edge Function contract smoke OK.");
} catch (error) {
  const message = error?.message || String(error);
  const networkUnavailable =
    error?.name === "TimeoutError" ||
    error?.name === "AbortError" ||
    /fetch failed|network|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|aborted/i.test(message);

  if (networkUnavailable) {
    warnings.push(`Supabase Edge Function contract smoke skipped: ${message}`);
    warnings.forEach((warning) => console.warn(`WARN ${warning}`));
    process.exit(0);
  }

  console.error(`Supabase Edge Function contract smoke failed: ${message}`);
  process.exit(1);
}
