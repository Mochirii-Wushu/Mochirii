import { existsSync, readFileSync } from "node:fs";
import { lookup } from "node:dns/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];
const notes = [];

const projectRef = process.env.SUPABASE_PROJECT_REF || "deyvmtncimmcinldjyqe";
const expectedSiteUrl = process.env.PIXELFED_SUPABASE_SITE_URL || "https://mochirii.com";
const expectedAuthorizationPath = "/oauth/consent";
const providerReady = process.env.PIXELFED_FIRST_LOGIN_PROVIDER_READY === "1";
const stagingReady = process.env.PIXELFED_FIRST_LOGIN_STAGING_READY === "1";

const requiredFiles = [
  "docs/pixelfed-guild-social-adr.md",
  "docs/pixelfed-first-login-testing.md",
  "apps/web/app/social/page.tsx",
  "apps/web/app/oauth/consent/page.tsx",
  "apps/web/app/api/oauth/decision/route.ts",
  "apps/web/components/member-workflow/SocialHubPanel.tsx",
  "apps/web/components/member-workflow/OAuthConsentPanel.tsx",
  "apps/web/lib/supabase/social.ts",
  "supabase/migrations/20260702080720_add_pixelfed_social_accounts.sql",
];

const snippetChecks = [
  {
    label: "Pixelfed ADR",
    file: "docs/pixelfed-guild-social-adr.md",
    snippets: [
      "social.mochirii.com",
      "Supabase OAuth 2.1 Server",
      "Authorization Path is `/oauth/consent`",
      "provider mutations",
      "federation disabled",
    ],
  },
  {
    label: "first login runbook",
    file: "docs/pixelfed-first-login-testing.md",
    snippets: [
      "Approve Supabase db push for project deyvmtncimmcinldjyqe migration 20260702080720.",
      "Approve enabling Supabase OAuth 2.1 Server for project deyvmtncimmcinldjyqe and setting Authorization Path /oauth/consent.",
      "PIXELFED_FIRST_LOGIN_PROVIDER_READY",
      "PIXELFED_FIRST_LOGIN_STAGING_READY",
      "Closed registration.",
      "Federation disabled.",
      "Negative Smokes",
      "Never paste OAuth client secrets",
    ],
  },
  {
    label: "OAuth consent component",
    file: "apps/web/components/member-workflow/OAuthConsentPanel.tsx",
    snippets: [
      "getAuthorizationDetails",
      "authorization_id",
      "verifyMemberAccess",
      "memberAccessIsApproved",
      "activeMember",
      "/api/oauth/decision",
    ],
  },
  {
    label: "OAuth decision route",
    file: "apps/web/app/api/oauth/decision/route.ts",
    snippets: [
      "verify-member-access",
      "galleryEligible",
      "member_status",
      "approveAuthorization",
      "denyAuthorization",
      "skipBrowserRedirect",
    ],
  },
  {
    label: "social doorway",
    file: "apps/web/components/member-workflow/SocialHubPanel.tsx",
    snippets: [
      "requireAuth",
      "verifyMemberAccess",
      "memberAccessIsApproved",
      "listMySocialAccounts",
      "Open Pixelfed",
    ],
  },
  {
    label: "social account helper",
    file: "apps/web/lib/supabase/social.ts",
    snippets: [
      ".from(\"social_accounts\")",
      "profile_link_visible",
      "updateSocialAccountVisibility",
    ],
  },
  {
    label: "social account migration",
    file: "supabase/migrations/20260702080720_add_pixelfed_social_accounts.sql",
    snippets: [
      "create table if not exists public.social_accounts",
      "alter table public.social_accounts enable row level security",
      "grant select on table public.social_accounts to authenticated",
      "grant update (profile_link_visible) on table public.social_accounts to authenticated",
      "grant all on table public.social_accounts to service_role",
      "using ((select auth.uid()) = user_id)",
      "with check ((select auth.uid()) = user_id)",
    ],
  },
  {
    label: "package script",
    file: "package.json",
    snippets: [
      "\"check:pixelfed-first-login-readiness\": \"node scripts/check-pixelfed-first-login-readiness.mjs\"",
    ],
  },
  {
    label: "check-all coverage",
    file: "scripts/check-all.mjs",
    snippets: [
      "check:pixelfed-first-login-readiness",
      "scripts/check-pixelfed-first-login-readiness.mjs",
    ],
  },
];

const secretPatterns = [
  { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { label: "Supabase PAT", pattern: /\bsbp_[A-Za-z0-9_-]{20,}\b/ },
  { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
  { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
  { label: "database URL", pattern: /\bpostgres(?:ql)?:\/\/[^\s<>)]+/i },
  { label: "Discord webhook URL", pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/ },
  { label: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
  { label: "client secret assignment", pattern: /\bclient[_-]?secret\s*[:=]\s*\S{8,}/i },
  { label: "password assignment", pattern: /\bpassword\s*[:=]\s*\S{8,}/i },
];

function read(file) {
  const full = path.join(root, file);
  if (!existsSync(full)) {
    failures.push(`${file}: missing required Pixelfed first-login file.`);
    return "";
  }

  return readFileSync(full, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function scanNoSecrets(file, text) {
  text.split(/\r?\n/).forEach((line, index) => {
    for (const { label, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) failures.push(`${file}:${index + 1}: possible secret pattern: ${label}`);
    }
  });
}

function env(name) {
  return (process.env[name] || "").trim();
}

function assertMarker(name, description) {
  if (env(name) !== "1") {
    failures.push(`${name}: set to 1 only after private verification of ${description}.`);
  }
}

function assertHttpsUrl(label, value, requiredPath) {
  if (!value) {
    failures.push(`${label}: required when staging readiness is asserted.`);
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") failures.push(`${label}: must use https.`);
    if (requiredPath && parsed.pathname !== requiredPath) {
      failures.push(`${label}: expected path ${requiredPath}, got ${parsed.pathname}.`);
    }
    return parsed;
  } catch {
    failures.push(`${label}: must be a valid URL.`);
    return null;
  }
}

async function fetchJson(label, url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      failures.push(`${label}: HTTP ${response.status}.`);
      return null;
    }
    return await response.json();
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : "request failed"}.`);
    return null;
  }
}

async function checkSupabaseProviderReadiness() {
  const token = env("SUPABASE_ACCESS_TOKEN");
  if (!token) {
    failures.push("SUPABASE_ACCESS_TOKEN: required in child-process env when PIXELFED_FIRST_LOGIN_PROVIDER_READY=1.");
    return;
  }

  const config = await fetchJson(
    "Supabase auth config",
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (config) {
    if (config.oauth_server_enabled !== true) failures.push("Supabase auth config: oauth_server_enabled must be true.");
    if (config.oauth_server_authorization_path !== expectedAuthorizationPath) {
      failures.push(`Supabase auth config: oauth_server_authorization_path must be ${expectedAuthorizationPath}.`);
    }
    if (config.oauth_server_allow_dynamic_registration !== false) {
      failures.push("Supabase auth config: dynamic OAuth client registration must remain disabled unless separately approved.");
    }
    if (config.site_url !== expectedSiteUrl) {
      failures.push(`Supabase auth config: site_url must be ${expectedSiteUrl}, got ${config.site_url || "<missing>"}.`);
    }
  }

  const authBase = `https://${projectRef}.supabase.co/auth/v1`;
  const oauthDiscovery = await fetchJson(
    "Supabase OAuth authorization server discovery",
    `https://${projectRef}.supabase.co/.well-known/oauth-authorization-server/auth/v1`,
  );
  const oidcDiscovery = await fetchJson(
    "Supabase OIDC discovery",
    `${authBase}/.well-known/openid-configuration`,
  );

  if (oauthDiscovery) {
    if (oauthDiscovery.issuer !== authBase) failures.push("OAuth discovery: issuer mismatch.");
    if (oauthDiscovery.authorization_endpoint !== `${authBase}/oauth/authorize`) failures.push("OAuth discovery: authorization endpoint mismatch.");
    if (oauthDiscovery.token_endpoint !== `${authBase}/oauth/token`) failures.push("OAuth discovery: token endpoint mismatch.");
    if (oauthDiscovery.registration_endpoint) {
      failures.push("OAuth discovery: registration_endpoint should be absent while dynamic registration is disabled.");
    }
  }

  if (oidcDiscovery) {
    const expected = {
      issuer: authBase,
      authorization_endpoint: `${authBase}/oauth/authorize`,
      token_endpoint: `${authBase}/oauth/token`,
      userinfo_endpoint: `${authBase}/oauth/userinfo`,
      jwks_uri: `${authBase}/.well-known/jwks.json`,
    };

    for (const [key, value] of Object.entries(expected)) {
      if (oidcDiscovery[key] !== value) failures.push(`OIDC discovery: ${key} mismatch.`);
    }

    const scopes = Array.isArray(oidcDiscovery.scopes_supported) ? oidcDiscovery.scopes_supported : [];
    for (const scope of ["openid", "profile", "email"]) {
      if (!scopes.includes(scope)) failures.push(`OIDC discovery: missing ${scope} scope.`);
    }

    const methods = Array.isArray(oidcDiscovery.code_challenge_methods_supported)
      ? oidcDiscovery.code_challenge_methods_supported
      : [];
    if (!methods.includes("S256")) failures.push("OIDC discovery: missing S256 PKCE support.");
  }

  notes.push("Supabase OAuth provider readiness asserted from live read-only checks.");
}

async function checkPixelfedStagingReadiness() {
  const baseUrl = assertHttpsUrl("PIXELFED_STAGING_BASE_URL", env("PIXELFED_STAGING_BASE_URL"));
  const callbackUrl = assertHttpsUrl("PIXELFED_OIDC_CALLBACK_URI", env("PIXELFED_OIDC_CALLBACK_URI"), "/auth/oidc/callback");

  if (baseUrl && callbackUrl && baseUrl.origin !== callbackUrl.origin) {
    failures.push("PIXELFED_OIDC_CALLBACK_URI: origin must match PIXELFED_STAGING_BASE_URL.");
  }

  assertMarker("PIXELFED_OAUTH_CLIENT_REGISTERED", "Supabase OAuth client registration with the exact callback URI");
  assertMarker("PIXELFED_STAGING_RUNTIME_READY", "Pixelfed web, database, Redis, queue worker, scheduler, HTTPS, and private media configuration");
  assertMarker("PIXELFED_STAGING_SECURITY_READY", "closed registration, federation disabled, upload limits, moderation/report flow, backups, and monitoring");

  if (!baseUrl) return;

  try {
    await lookup(baseUrl.hostname);
  } catch (error) {
    failures.push(`PIXELFED_STAGING_BASE_URL: DNS lookup failed for ${baseUrl.hostname}.`);
  }

  try {
    const response = await fetch(baseUrl, { redirect: "manual" });
    if (response.status < 200 || response.status >= 400) {
      failures.push(`PIXELFED_STAGING_BASE_URL: expected HTTP 2xx/3xx, got ${response.status}.`);
    }
  } catch (error) {
    failures.push(`PIXELFED_STAGING_BASE_URL: ${error instanceof Error ? error.message : "request failed"}.`);
  }

  notes.push("Pixelfed staging readiness asserted from URL, DNS, HTTP, and private operator markers.");
}

for (const file of requiredFiles) read(file);

for (const { label, file, snippets } of snippetChecks) {
  const text = read(file);
  snippets.forEach((snippet) => assertIncludes(label, text, snippet));
}

[
  "docs/pixelfed-guild-social-adr.md",
  "docs/pixelfed-first-login-testing.md",
  "apps/web/app/api/oauth/decision/route.ts",
  "apps/web/components/member-workflow/OAuthConsentPanel.tsx",
  "scripts/check-pixelfed-first-login-readiness.mjs",
].forEach((file) => scanNoSecrets(file, read(file)));

if (providerReady) {
  await checkSupabaseProviderReadiness();
} else {
  warnings.push("Supabase OAuth provider readiness is not asserted. Set PIXELFED_FIRST_LOGIN_PROVIDER_READY=1 with SUPABASE_ACCESS_TOKEN in child-process env after approval.");
}

if (stagingReady) {
  await checkPixelfedStagingReadiness();
} else {
  warnings.push("Pixelfed staging readiness is not asserted. OAuth client registration, staging runtime, DNS, and security posture remain approval-gated.");
}

if (failures.length) {
  console.error("Pixelfed first-login readiness failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Pixelfed first-login repo readiness OK.");
notes.forEach((note) => console.log(`OK ${note}`));
warnings.forEach((warning) => console.warn(`WARN ${warning}`));
if (providerReady && stagingReady) {
  console.log("NEXT First admin account creation prompt is appropriate before the first browser login smoke.");
}
