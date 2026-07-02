import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

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

if (!process.env.PIXELFED_FIRST_LOGIN_PROVIDER_READY) {
  warnings.push("Provider readiness is not asserted. Supabase OAuth, OAuth client registration, DNS, and Pixelfed staging remain approval-gated.");
}

if (failures.length) {
  console.error("Pixelfed first-login readiness failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Pixelfed first-login repo readiness OK.");
warnings.forEach((warning) => console.warn(`WARN ${warning}`));
