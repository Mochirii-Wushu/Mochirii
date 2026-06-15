import { readFileSync } from "node:fs";

const failures = [];

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertNotIncludes(label, text, snippet) {
  if (text.includes(snippet)) failures.push(`${label}: forbidden snippet found: ${snippet}`);
}

const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const providerRegistry = read("apps/web/lib/supabase/auth-providers.ts");
const authClient = read("apps/web/lib/supabase/auth.ts");
const profileClient = read("apps/web/lib/supabase/profile.ts");
const authPanel = read("apps/web/components/member-workflow/AuthPanel.tsx");
const accountPanel = read("apps/web/components/member-workflow/AccountPanel.tsx");
const gallerySubmit = read("apps/web/components/member-workflow/GallerySubmitForm.tsx");
const leaderDashboard = read("apps/web/components/member-workflow/LeaderDashboard.tsx");
const moderationClient = read("apps/web/lib/supabase/moderation.ts");
const supabaseConfig = read("supabase/config.toml");
const migration = read("supabase/migrations/20260615041842_add_multi_provider_member_verification.sql");
const verifyMemberAccess = read("supabase/functions/verify-member-access/index.ts");
const reviewMemberVerification = read("supabase/functions/review-member-verification/index.ts");
const staticSupabase = read("supabase.js");
const staticAuth = read("auth.js");
const staticGallerySubmit = read("gallery-submit.js");
const staticLeaderDashboard = read("leader-dashboard.js");
const staticLeaderDashboardHtml = read("leader-dashboard.html");

[
  '"check:multi-provider-auth": "node scripts/check-multi-provider-auth.mjs"',
].forEach((snippet) => assertIncludes("package scripts", packageJson, snippet));

assertIncludes("check-all", checkAll, '["check:multi-provider-auth", ["node", "scripts/check-multi-provider-auth.mjs"]]');

[
  '"discord"',
  '"phone"',
  '"apple"',
  '"facebook"',
  '"google"',
  '"kakao"',
  '"twitch"',
  '"spotify"',
  'process.env.NEXT_PUBLIC_PHONE_AUTH_READY === "true"',
  'process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true"',
  'requestedProviderIds()',
].forEach((snippet) => assertIncludes("auth provider registry", providerRegistry, snippet));

[
  "signInWithProvider",
  "signInWithPhoneOtp",
  "verifyPhoneOtp",
  "linkProviderIdentity",
  "getLinkedIdentities",
  "signInWithDiscord",
].forEach((snippet) => assertIncludes("auth client", authClient, snippet));

[
  "verifyMemberAccess",
  "verify-member-access",
  "memberAccessIsApproved",
  "Member verification must be approved before continuing.",
].forEach((snippet) => assertIncludes("profile client", profileClient, snippet));

[
  "Choose a sign-in method",
  "provider-grid",
  "signInWithProvider",
  "signInWithPhoneOtp",
  "verifyPhoneOtp",
].forEach((snippet) => assertIncludes("AuthPanel", authPanel, snippet));

[
  "Identity Linking",
  "linkProviderIdentity",
  "refreshMemberAccess({ refreshDiscord: true })",
  "moderator-approved member verification",
].forEach((snippet) => assertIncludes("AccountPanel", accountPanel, snippet));

[
  "Member Verification Required",
  "verifyMemberAccess({ refreshDiscord: refresh })",
  "profileIsActive(nextProfile, accessResult.data)",
  "moderator-approved member verification",
].forEach((snippet) => assertIncludes("GallerySubmitForm", gallerySubmit, snippet));

[
  "reviewMemberVerification",
  "review-member-verification",
].forEach((snippet) => assertIncludes("moderation client", moderationClient, snippet));

[
  "reviewMemberVerification",
  "memberVerificationPanel",
  "Review Gallery Access",
  "Approve access",
  "Reject",
  "Revoke",
  "redacted note",
].forEach((snippet) => assertIncludes("LeaderDashboard", leaderDashboard, snippet));

[
  "[functions.verify-member-access]",
  "verify_jwt = true",
  "[functions.review-member-verification]",
].forEach((snippet) => assertIncludes("supabase config", supabaseConfig, snippet));

[
  "create table if not exists public.member_auth_identities",
  "create table if not exists public.member_verifications",
  "alter table public.member_auth_identities enable row level security;",
  "alter table public.member_verifications enable row level security;",
  "revoke all on table public.member_auth_identities from public, anon, authenticated;",
  "revoke all on table public.member_verifications from public, anon, authenticated;",
  "grant usage on schema private to authenticated, service_role;",
  "create or replace function private.member_has_gallery_upload_access",
  "security definer",
  "private.member_has_gallery_upload_access((select auth.uid()))",
  "'approved'",
  "'revoked'",
  "'expired'",
].forEach((snippet) => assertIncludes("multi-provider migration", migration, snippet));

[
  "APPROVED_PROVIDER_IDS",
  "syncIdentities",
  "member_auth_identities",
  "member_verifications",
  "updateDiscordProfile",
  "provider_email_verified",
  "provider_phone_verified",
  "galleryEligible",
].forEach((snippet) => assertIncludes("verify-member-access", verifyMemberAccess, snippet));

[
  "requireModeratorAccess(req)",
  "VALID_METHODS",
  "approve",
  "reject",
  "revoke",
  "member_verifications",
].forEach((snippet) => assertIncludes("review-member-verification", reviewMemberVerification, snippet));

[
  "enabledAuthProviders",
  "signInWithProvider",
  "verifyMemberAccess",
  "reviewMemberVerification",
  "review-member-verification",
  "CONFIGURED_AUTH_PROVIDER_IDS",
].forEach((snippet) => assertIncludes("static Supabase helper", staticSupabase, snippet));

[
  "providerGrid",
  "Choose a sign-in method",
  "signInWithProvider",
].forEach((snippet) => assertIncludes("static auth", staticAuth, snippet));

[
  "verifyMemberAccess",
  "activeMemberAccess",
  "Member verification",
].forEach((snippet) => assertIncludes("static gallery submit", staticGallerySubmit, snippet));

[
  "memberVerificationPanel",
  "memberVerificationUserId",
  "data-member-verification-action=\"approve\"",
  "Review Gallery Access",
].forEach((snippet) => assertIncludes("static leader dashboard html", staticLeaderDashboardHtml, snippet));

[
  "reviewMemberVerification",
  "data-member-verification-action",
  "renderMemberVerificationResult",
].forEach((snippet) => assertIncludes("static leader dashboard", staticLeaderDashboard, snippet));

[
  "provider_token",
  "providerToken",
  "provider_refresh_token",
  "refresh_token",
  "access_token",
  "client_secret",
].forEach((snippet) => {
  [
    ["auth provider registry", providerRegistry],
    ["verify-member-access", verifyMemberAccess],
    ["review-member-verification", reviewMemberVerification],
    ["multi-provider migration", migration],
  ].forEach(([label, text]) => assertNotIncludes(label, text, snippet));
});

if (failures.length) {
  console.error("Multi-provider auth validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Multi-provider auth validation OK.");
