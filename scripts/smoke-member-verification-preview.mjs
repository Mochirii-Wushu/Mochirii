import { randomUUID } from "node:crypto";

const PRODUCTION_PROJECT_REF = "deyvmtncimmcinldjyqe";
const MODERATOR_ROLE_ID = "1078630751165222984";
const ENABLED = process.env.ALLOW_PREVIEW_MEMBER_VERIFICATION_SMOKE === "true";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!ENABLED) {
  console.log("Member verification preview smoke skipped.");
  console.log("- Set ALLOW_PREVIEW_MEMBER_VERIFICATION_SMOKE=true to run against a Supabase Preview project.");
  console.log("- The smoke refuses production project deyvmtncimmcinldjyqe.");
  process.exit(0);
}

const supabaseUrl = requiredEnv("SUPABASE_URL");
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const moderatorDiscordUserId = requiredEnv("PREVIEW_MEMBER_VERIFICATION_MODERATOR_DISCORD_USER_ID");
const reviewMethod = (process.env.PREVIEW_MEMBER_VERIFICATION_METHOD || "google").trim().toLowerCase();

if (!publishableKey) {
  throw new Error("Missing SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for preview fixture setup.");
}

refuseProduction(supabaseUrl);

const createdUserIds = [];
const fixtureId = randomUUID().replace(/-/g, "").slice(0, 12);
const moderatorEmail = `member-verification-smoke+mod-${fixtureId}@example.com`;
const targetEmail = `member-verification-smoke+target-${fixtureId}@example.com`;
const moderatorPassword = password();
const targetPassword = password();

try {
  const moderatorUser = await createUser("moderator", moderatorEmail, moderatorPassword, {
    provider_id: moderatorDiscordUserId,
    smoke_role_hint: MODERATOR_ROLE_ID,
  });
  const targetUser = await createUser("target", targetEmail, targetPassword, {
    smoke_target: true,
  });

  await upsertProfile({
    id: moderatorUser.id,
    discord_user_id: moderatorDiscordUserId,
    display_name: "Preview Moderator Smoke",
    member_status: "active",
  });
  await upsertProfile({
    id: targetUser.id,
    display_name: "Preview Target Smoke",
    member_status: "pending",
  });

  const moderatorToken = await signIn(moderatorEmail, moderatorPassword);
  const targetToken = await signIn(targetEmail, targetPassword);

  await review(moderatorToken, targetUser.id, "approve", {
    method: reviewMethod,
    reason: "Preview smoke approval",
    expires_at: futureIso(),
  });
  await expectAccess(targetToken, {
    galleryEligible: true,
    manualApproved: true,
    label: "approved member verification grants gallery eligibility",
  });

  await review(moderatorToken, targetUser.id, "revoke", {
    method: reviewMethod,
    reason: "Preview smoke revoke",
  });
  await expectAccess(targetToken, {
    galleryEligible: false,
    manualApproved: false,
    expectedStatus: "revoked",
    label: "revoked member verification fails closed",
  });

  await review(moderatorToken, targetUser.id, "reject", {
    method: reviewMethod,
    reason: "Preview smoke reject",
  });
  await expectAccess(targetToken, {
    galleryEligible: false,
    manualApproved: false,
    expectedStatus: "rejected",
    label: "rejected member verification fails closed",
  });

  await review(moderatorToken, targetUser.id, "approve", {
    method: reviewMethod,
    reason: "Preview smoke expired approval",
    expires_at: pastIso(),
  });
  await expectAccess(targetToken, {
    galleryEligible: false,
    manualApproved: false,
    expectedStatus: "expired",
    label: "expired member verification fails closed",
  });

  await patchProfile(targetUser.id, { member_status: "suspended" });
  await expectLockedApproval(moderatorToken, targetUser.id, "suspended");
  await expectAccess(targetToken, {
    galleryEligible: false,
    manualApproved: false,
    memberStatus: "suspended",
    label: "suspended member status fails closed",
  });

  await patchProfile(targetUser.id, { member_status: "archived" });
  await expectLockedApproval(moderatorToken, targetUser.id, "archived");
  await expectAccess(targetToken, {
    galleryEligible: false,
    manualApproved: false,
    memberStatus: "archived",
    label: "archived member status fails closed",
  });

  console.log("Member verification preview smoke OK.");
  console.log("- Approve granted gallery eligibility.");
  console.log("- Revoke, reject, expired, suspended, and archived states failed closed.");
  console.log("- Preview fixtures were created with redacted output and will be cleaned up.");
} finally {
  await cleanupFixtures();
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env ${name}.`);
  return value;
}

function refuseProduction(url) {
  const parsed = new URL(url);
  const ref = parsed.hostname.split(".")[0];
  const explicitRef = process.env.SUPABASE_PROJECT_REF || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || "";
  if (ref === PRODUCTION_PROJECT_REF || explicitRef === PRODUCTION_PROJECT_REF || url.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error("Refusing to run preview member-verification smoke against the production Supabase project.");
  }
}

function password() {
  return `${randomUUID()}Aa1!`;
}

function futureIso() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function pastIso() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

async function createUser(label, email, userPassword, metadata) {
  const response = await requestJson(`create ${label} auth user`, "/auth/v1/admin/users", {
    method: "POST",
    service: true,
    expected: [200, 201],
    body: {
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: metadata,
    },
  });
  const userId = findUserId(response) || await lookupUserIdByEmail(email);
  if (!userId) throw new Error(`Could not read ${label} auth user id from Supabase response.`);
  createdUserIds.push(userId);
  return { id: userId };
}

async function signIn(email, userPassword) {
  const response = await requestJson("sign in preview fixture", "/auth/v1/token?grant_type=password", {
    method: "POST",
    publishable: true,
    expected: [200],
    body: {
      email,
      password: userPassword,
    },
  });
  if (!response.access_token) throw new Error("Preview fixture sign-in did not return an access token.");
  return String(response.access_token);
}

async function lookupUserIdByEmail(email) {
  const response = await requestJson("list preview auth users", "/auth/v1/admin/users?per_page=1000", {
    method: "GET",
    service: true,
    expected: [200],
  });
  const users = Array.isArray(response.users) ? response.users : Array.isArray(response) ? response : [];
  const user = users.find((item) => String(item?.email || "").toLowerCase() === email.toLowerCase());
  const id = String(user?.id || "");
  return UUID_RE.test(id) ? id : null;
}

async function upsertProfile(profile) {
  await requestJson("upsert member profile", "/rest/v1/member_profiles?on_conflict=id", {
    method: "POST",
    service: true,
    expected: [200, 201, 204],
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: [profile],
  });
}

async function patchProfile(userId, patch) {
  await requestJson("patch member profile", `/rest/v1/member_profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    service: true,
    expected: [200, 204],
    headers: {
      Prefer: "return=minimal",
    },
    body: patch,
  });
}

async function review(moderatorToken, userId, action, options = {}) {
  const body = {
    user_id: userId,
    action,
    method: options.method || reviewMethod,
    reason: options.reason || "Preview smoke redacted note",
  };
  if (options.expires_at) body.expires_at = options.expires_at;

  const response = await callFunction("review-member-verification", moderatorToken, body, [200]);
  if (response.ok !== true) throw new Error(`Review action ${action} failed.`);
  return response;
}

async function expectLockedApproval(moderatorToken, userId, status) {
  const response = await callFunction(
    "review-member-verification",
    moderatorToken,
    {
      user_id: userId,
      action: "approve",
      method: reviewMethod,
      reason: `Preview smoke locked ${status}`,
    },
    [403],
  );
  if (response.error !== "locked_member_status") {
    throw new Error(`Expected locked_member_status while target was ${status}.`);
  }
}

async function expectAccess(targetToken, expectation) {
  const response = await callFunction("verify-member-access", targetToken, { refreshDiscord: false }, [200]);
  const data = response.data || {};
  if (response.ok !== true) throw new Error(`${expectation.label}: verify-member-access returned ok=false.`);
  if (Boolean(data.galleryEligible) !== expectation.galleryEligible) {
    throw new Error(`${expectation.label}: gallery eligibility did not match expected state.`);
  }
  if (typeof expectation.manualApproved === "boolean" && Boolean(data.manualApproved) !== expectation.manualApproved) {
    throw new Error(`${expectation.label}: manual approval did not match expected state.`);
  }
  if (expectation.expectedStatus && data.verification?.status !== expectation.expectedStatus) {
    throw new Error(`${expectation.label}: expected verification status ${expectation.expectedStatus}.`);
  }
  if (expectation.memberStatus && data.memberStatus !== expectation.memberStatus) {
    throw new Error(`${expectation.label}: expected member status ${expectation.memberStatus}.`);
  }
}

async function callFunction(name, token, body, expected) {
  return requestJson(`call ${name}`, `/functions/v1/${name}`, {
    method: "POST",
    publishable: true,
    bearer: token,
    expected,
    body,
  });
}

async function cleanupFixtures() {
  const ids = [...createdUserIds].reverse();
  for (const id of ids) {
    await deleteRest("member_auth_identities", "user_id", id);
    await deleteRest("member_verifications", "user_id", id);
    await deleteRest("member_profiles", "id", id);
    await requestJson("delete auth fixture", `/auth/v1/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      service: true,
      expected: [200, 204, 404],
    }).catch(() => {});
  }
}

async function deleteRest(table, column, value) {
  await requestJson(`delete ${table} fixture`, `/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: "DELETE",
    service: true,
    expected: [200, 204, 404],
    headers: {
      Prefer: "return=minimal",
    },
  }).catch(() => {});
}

async function requestJson(label, path, options) {
  const url = new URL(path, supabaseUrl);
  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.service) {
    headers.apikey = serviceRoleKey;
    headers.Authorization = `Bearer ${serviceRoleKey}`;
  } else if (options.publishable) {
    headers.apikey = publishableKey;
    headers.Authorization = options.bearer ? `Bearer ${options.bearer}` : `Bearer ${publishableKey}`;
  }

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const expected = new Set(options.expected || [200]);
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const json = text && contentType.toLowerCase().includes("json")
    ? parseJson(text, label)
    : text && !expected.has(response.status)
      ? { message: text.slice(0, 200) }
      : {};

  if (!expected.has(response.status)) {
    const message = typeof json?.message === "string" ? json.message : response.statusText;
    throw new Error(`${label} failed with HTTP ${response.status}: ${message}`);
  }

  return json;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON response.`);
  }
}

function findUserId(value) {
  const direct = [
    value?.id,
    value?.user?.id,
    value?.data?.id,
    value?.data?.user?.id,
  ].map((item) => String(item || ""));
  const directHit = direct.find((item) => UUID_RE.test(item));
  if (directHit) return directHit;

  const seen = new Set();
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    for (const [key, nested] of Object.entries(current)) {
      if (key === "id" && UUID_RE.test(String(nested || ""))) return String(nested);
      if (nested && typeof nested === "object") stack.push(nested);
    }
  }
  return null;
}
