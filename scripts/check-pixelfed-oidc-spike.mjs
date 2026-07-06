import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SUPABASE_PROJECT_REF, supabaseProjectUrl } from "./lib/public-urls.mjs";

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredFiles = [
  "docs/pixelfed-oidc-spike.md",
  "docs/pixelfed-first-login-testing.md",
  "docs/pixelfed-guild-social-adr.md",
  "package.json",
  "scripts/check-all.mjs",
];

const snippetChecks = [
  {
    label: "OIDC spike packet",
    file: "docs/pixelfed-oidc-spike.md",
    snippets: [
      "authorization code with mandatory PKCE",
      "PF_OIDC_ENABLED",
      "PF_OIDC_CLIENT_ID",
      "PF_OIDC_CLIENT_SECRET",
      "PF_OIDC_AUTHORIZE_URL",
      "PF_OIDC_TOKEN_URL",
      "PF_OIDC_PROFILE_URL",
      "PF_OIDC_USERNAME_FIELD=preferred_username",
      "PF_OIDC_FIELD_ID=sub",
      "PKCE compatibility as unproven",
      `Approve enabling Supabase OAuth 2.1 Server for project ${SUPABASE_PROJECT_REF} and setting Authorization Path /oauth/consent.`,
      "Approve registering the Pixelfed OAuth client for the approved staging Pixelfed URL with its exact OIDC callback URI.",
    ],
  },
  {
    label: "first login runbook link",
    file: "docs/pixelfed-first-login-testing.md",
    snippets: [
      "docs/pixelfed-oidc-spike.md",
      "npm run check:pixelfed-oidc-spike",
    ],
  },
  {
    label: "package script",
    file: "package.json",
    snippets: [
      "\"check:pixelfed-oidc-spike\": \"node scripts/check-pixelfed-oidc-spike.mjs\"",
    ],
  },
  {
    label: "check-all coverage",
    file: "scripts/check-all.mjs",
    snippets: [
      "check:pixelfed-oidc-spike",
      "scripts/check-pixelfed-oidc-spike.mjs",
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
  { label: "client secret assignment", pattern: /\bclient[_-]?secret\s*[:=]\s*(?!\[)[^\s`'"]{8,}/i },
  { label: "password assignment", pattern: /\bpassword\s*[:=]\s*(?!\[)[^\s`'"]{8,}/i },
];

function read(file) {
  const full = path.join(root, file);
  if (!existsSync(full)) {
    failures.push(`${file}: missing required Pixelfed OIDC spike file.`);
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

function assertHttpsUrl(label, value, requiredPath) {
  if (!value) return;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") failures.push(`${label}: must use https.`);
    if (requiredPath && parsed.pathname !== requiredPath) failures.push(`${label}: expected path ${requiredPath}, got ${parsed.pathname}.`);
  } catch {
    failures.push(`${label}: must be a valid URL.`);
  }
}

async function checkLiveDiscovery() {
  if (process.env.PIXELFED_OIDC_SPIKE_LIVE !== "1") {
    warnings.push("Live OIDC discovery skipped. Set PIXELFED_OIDC_SPIKE_LIVE=1 after OAuth Server approval.");
    return;
  }

  const projectRef = process.env.SUPABASE_PROJECT_REF || SUPABASE_PROJECT_REF;
  const discoveryUrl = `${supabaseProjectUrl(projectRef)}/auth/v1/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl);
  if (!response.ok) {
    failures.push(`OIDC discovery ${discoveryUrl}: HTTP ${response.status}.`);
    return;
  }

  const discovery = await response.json();
  const expected = {
    authorization_endpoint: `https://${projectRef}.supabase.co/auth/v1/oauth/authorize`,
    token_endpoint: `https://${projectRef}.supabase.co/auth/v1/oauth/token`,
    userinfo_endpoint: `https://${projectRef}.supabase.co/auth/v1/oauth/userinfo`,
    jwks_uri: `https://${projectRef}.supabase.co/auth/v1/.well-known/jwks.json`,
  };

  for (const [key, value] of Object.entries(expected)) {
    if (discovery[key] !== value) failures.push(`OIDC discovery ${key}: expected ${value}, got ${discovery[key] || "<missing>"}.`);
  }

  if (!Array.isArray(discovery.response_types_supported) || !discovery.response_types_supported.includes("code")) {
    failures.push("OIDC discovery: response_types_supported must include code.");
  }

  if (!Array.isArray(discovery.scopes_supported) || !["openid", "profile", "email"].every((scope) => discovery.scopes_supported.includes(scope))) {
    failures.push("OIDC discovery: scopes_supported must include openid, profile, and email.");
  }

  if (Array.isArray(discovery.code_challenge_methods_supported) && !discovery.code_challenge_methods_supported.includes("S256")) {
    failures.push("OIDC discovery: code_challenge_methods_supported must include S256 when advertised.");
  }
}

for (const file of requiredFiles) read(file);

for (const { label, file, snippets } of snippetChecks) {
  const text = read(file);
  snippets.forEach((snippet) => assertIncludes(label, text, snippet));
}

[
  "docs/pixelfed-oidc-spike.md",
  "docs/pixelfed-first-login-testing.md",
  "docs/pixelfed-guild-social-adr.md",
  "scripts/check-pixelfed-oidc-spike.mjs",
].forEach((file) => scanNoSecrets(file, read(file)));

assertHttpsUrl("PIXELFED_STAGING_BASE_URL", process.env.PIXELFED_STAGING_BASE_URL);
assertHttpsUrl("PIXELFED_OIDC_CALLBACK_URI", process.env.PIXELFED_OIDC_CALLBACK_URI, "/auth/oidc/callback");

await checkLiveDiscovery();

if (failures.length) {
  console.error("Pixelfed OIDC spike readiness failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Pixelfed OIDC spike readiness OK.");
warnings.forEach((warning) => console.warn(`WARN ${warning}`));
