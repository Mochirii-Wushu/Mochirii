import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  appLayout: "apps/web/app/layout.tsx",
  appCss: "apps/web/app/mochirii.css",
  nextConfig: "apps/web/next.config.ts",
  supabaseConfig: "supabase/config.toml",
  reaper: "supabase/functions/reaper-discord-interactions/index.ts",
  reaperMemberSync: "supabase/functions/reaper-discord-member-sync/index.ts",
  approvedFeed: "supabase/functions/list-approved-gallery-submissions/index.ts",
  visibleProfileCards: "supabase/functions/list-visible-profile-cards/index.ts",
  mochiSocialAlphaShared: "supabase/functions/_shared/mochi-social-alpha.ts",
  mochiSocialAlphaAction: "supabase/functions/mochi-social-alpha-action/index.ts",
  discordIngest: "supabase/functions/submit-discord-gallery-image/index.ts",
  voteReminder: "supabase/functions/send-vote-reminder/index.ts",
  spotlightPollShared: "supabase/functions/_shared/spotlight-polls.ts",
  spotlightPollSender: "supabase/functions/send-member-spotlight-poll/index.ts",
  spotlightPollPublisher: "supabase/functions/publish-member-spotlight-winner/index.ts",
  spotlightPollPublicWinner: "supabase/functions/get-current-spotlight-winner/index.ts",
  report: "reports/free-security-hardening-2026-06-08.md",
  cspReport: "reports/csp-enforcement-verification-2026-06-08.md",
  deployment: "docs/deployment.md",
  appReadme: "apps/web/README.md",
  currentLiveState: "docs/current-live-state.md",
  securityPolicy: "SECURITY.md",
  securityTxt: ".well-known/security.txt",
  appSecurityTxt: "apps/web/public/.well-known/security.txt",
  securityScanReport: "reports/security-scan-remediation-2026-06-10.md",
};

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required security hardening file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertMatches(label, text, pattern, message) {
  if (!pattern.test(text)) failures.push(`${label}: ${message}`);
}

function extractVerifyJwtFalseFunctions(config) {
  const blocks = [...config.matchAll(/\[functions\.([^\]]+)\]([\s\S]*?)(?=\n\[functions\.|\s*$)/g)];
  return blocks
    .filter(([, , body]) => /verify_jwt\s*=\s*false/.test(body))
    .map(([_, name]) => name);
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const appLayout = read(files.appLayout);
const appCss = read(files.appCss);
const nextConfig = read(files.nextConfig);
const supabaseConfig = read(files.supabaseConfig);
const reaper = read(files.reaper);
const reaperMemberSync = read(files.reaperMemberSync);
const approvedFeed = read(files.approvedFeed);
const visibleProfileCards = read(files.visibleProfileCards);
const mochiSocialAlphaShared = read(files.mochiSocialAlphaShared);
const mochiSocialAlphaAction = read(files.mochiSocialAlphaAction);
const discordIngest = read(files.discordIngest);
const voteReminder = read(files.voteReminder);
const spotlightPollShared = read(files.spotlightPollShared);
const spotlightPollSender = read(files.spotlightPollSender);
const spotlightPollPublisher = read(files.spotlightPollPublisher);
const spotlightPollPublicWinner = read(files.spotlightPollPublicWinner);
const report = read(files.report);
const cspReport = read(files.cspReport);
const deployment = read(files.deployment);
const appReadme = read(files.appReadme);
const currentLiveState = read(files.currentLiveState);
const securityPolicy = read(files.securityPolicy);
const securityTxt = read(files.securityTxt);
const appSecurityTxt = read(files.appSecurityTxt);
const securityScanReport = read(files.securityScanReport);

function assertNoCurrentReportOnlyClaim(label, text) {
  const stalePatterns = [
    /current CSP is [`"]?Content-Security-Policy-Report-Only/i,
    /production CSP is report-only/i,
    /CSP should stay report-only/i,
    /Do not promote it to [`"]?Content-Security-Policy/i,
  ];

  for (const pattern of stalePatterns) {
    if (pattern.test(text)) {
      failures.push(`${label}: active docs must not describe current production CSP as report-only.`);
    }
  }
}

assertIncludes("package.json", packageJson, '"check:security-hardening"');
assertIncludes("check-all", checkAll, "check:security-hardening");

[
  "next/font/google",
  "Zhi_Mang_Xing",
  "Noto_Serif_SC",
  "--font-zhi-mang",
  "--font-noto-serif-sc",
].forEach((snippet) => assertIncludes("Next font setup", appLayout, snippet));

[
  "@import url(\"https://fonts.googleapis.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
].forEach((snippet) => {
  if (appCss.includes(snippet)) {
    failures.push(`app CSS: external Google font loading must stay out of mochirii.css: ${snippet}`);
  }
});

[
  "--font-display:var(--font-zhi-mang), ui-serif, serif",
  "--font-body:var(--font-noto-serif-sc), ui-serif, serif",
].forEach((snippet) => assertIncludes("app CSS font variables", appCss, snippet));

[
  "Content-Security-Policy",
  "Access-Control-Allow-Origin",
  "https://mochirii.com",
  "X-Content-Type-Options",
  "nosniff",
  "Referrer-Policy",
  "strict-origin-when-cross-origin",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
  "same-origin-allow-popups",
  "X-Frame-Options",
  "DENY",
].forEach((snippet) => assertIncludes("Next security headers", nextConfig, snippet));

if (nextConfig.includes("Content-Security-Policy-Report-Only")) {
  failures.push("Next security headers: CSP should be enforced, not report-only.");
}

if (nextConfig.includes("'unsafe-eval'")) {
  failures.push("Next security headers: production CSP should not allow unsafe-eval.");
}

[
  "default-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "frame-src 'self' https://discord.com https://open.spotify.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com",
].forEach((snippet) => assertIncludes("CSP policy", nextConfig, snippet));

const verifyJwtFalseFunctions = extractVerifyJwtFalseFunctions(supabaseConfig);
const expectedUnauthenticatedFunctions = [
  "list-approved-gallery-submissions",
  "list-visible-profile-cards",
  "submit-discord-gallery-image",
  "reaper-discord-interactions",
  "reaper-discord-member-sync",
  "send-vote-reminder",
  "send-member-spotlight-poll",
  "publish-member-spotlight-winner",
  "get-current-spotlight-winner",
  "mochi-social-alpha-action",
];

if (verifyJwtFalseFunctions.length !== expectedUnauthenticatedFunctions.length) {
  failures.push(
    `supabase/config.toml: expected ${expectedUnauthenticatedFunctions.length} verify_jwt=false functions, found ${verifyJwtFalseFunctions.length}: ${verifyJwtFalseFunctions.join(", ")}`,
  );
}

for (const name of verifyJwtFalseFunctions) {
  if (!expectedUnauthenticatedFunctions.includes(name)) {
    failures.push(`supabase/config.toml: unauthenticated function ${name} needs an explicit security review.`);
  }
}

[
  "x-mochi-social-server-token",
  "MOCHI_SOCIAL_GAME_SERVER_TOKEN",
].forEach((snippet) => assertIncludes("mochi-social-alpha shared security", mochiSocialAlphaShared, snippet));

[
  "requireGameServer(req)",
  "network: \"CANARY\"",
  "noRealValue: true",
].forEach((snippet) => assertIncludes("mochi-social-alpha-action", mochiSocialAlphaAction, snippet));

[
  "x-signature-ed25519",
  "x-signature-timestamp",
  "DISCORD_PUBLIC_KEY",
  "verifyDiscordSignature(req, rawBody, publicKey)",
  "SIGNATURE_WINDOW_MS",
  "Retry-After",
  "retry_after",
].forEach((snippet) => assertIncludes("reaper-discord-interactions", reaper, snippet));

[
  "x-mochirii-reaper-member-sync-secret",
  "REAPER_PENDING_VERIFICATION_SYNC_SECRET",
  "verifyMemberSyncSecret(req)",
  "fetchCurrentMember",
  "buildSingleMemberPendingContainmentPlan",
  "applyPendingContainmentPlan(adminClient, plan, writePendingDiscordOverwrite)",
  "MAX_PENDING_VERIFICATION_MUTATIONS",
  "source: \"gateway_member_event\"",
].forEach((snippet) => assertIncludes("reaper-discord-member-sync", reaperMemberSync, snippet));

assertMatches(
  "reaper-discord-interactions",
  reaper,
  /const rawBody = await req\.text\(\);[\s\S]*verifyDiscordSignature\(req, rawBody, publicKey\)[\s\S]*JSON\.parse\(rawBody\)/,
  "Discord signatures must be validated against the raw body before parsing JSON.",
);

[
  "DISCORD_GALLERY_INGEST_SECRET",
  "x-mochirii-reaper-secret",
  "bearerOrHeaderSecret(req) !== ingestSecret",
  "invalid_ingest_secret",
].forEach((snippet) => assertIncludes("submit-discord-gallery-image", discordIngest, snippet));

[
  "VOTE_REMINDER_CRON_SECRET",
  "x-mochirii-vote-reminder-secret",
  "bearerOrHeaderSecret(req) !== cronSecret",
  "DISCORD_VOTE_CHANNEL_ID",
].forEach((snippet) => assertIncludes("send-vote-reminder", voteReminder, snippet));

[
  "SPOTLIGHT_POLL_CRON_SECRET",
  "DISCORD_SPOTLIGHT_POLL_CHANNEL_ID",
].forEach((snippet) => assertIncludes("spotlight-polls shared helper", spotlightPollShared, snippet));

[
  "bearerOrHeaderSecret(req) !== config.secret",
  "buildDiscordPollPayload",
  "duplicate: true",
].forEach((snippet) => assertIncludes("send-member-spotlight-poll", spotlightPollSender, snippet));

[
  "bearerOrHeaderSecret(req) !== config.secret",
  "results.finalized",
  "winner_display_name",
].forEach((snippet) => assertIncludes("publish-member-spotlight-winner", spotlightPollPublisher, snippet));

[
  "winner_display_name",
  "monthly-discord-poll",
].forEach((snippet) => assertIncludes("get-current-spotlight-winner", spotlightPollPublicWinner, snippet));

[
  "discord_user_id",
  "discord_username",
  "vote_count",
  "answer_label",
  "candidate_order",
].forEach((snippet) => {
  if (spotlightPollPublicWinner.includes(snippet)) {
    failures.push(`get-current-spotlight-winner: public endpoint must not return or select ${snippet}.`);
  }
});

[
  ".eq(\"status\", \"approved\")",
  "createSignedUrl",
  "SIGNED_URL_SECONDS",
  "signed_url",
  "signedUrlSeconds",
].forEach((snippet) => assertIncludes("list-approved-gallery-submissions", approvedFeed, snippet));

[
  "CORS_HEADERS",
  "new Response(\"ok\", { headers: CORS_HEADERS })",
  "asArray(body.slugs)",
  ".in(\"profile_slug\", requestedSlugs)",
  ".eq(\"profile_public_enabled\", true)",
  ".eq(\"member_status\", \"active\")",
  ".eq(\"has_required_discord_roles\", true)",
  "recentVerification(profile.discord_verified_at)",
  "signedMediaUrl",
  "hasApprovedAvatar",
].forEach((snippet) => assertIncludes("list-visible-profile-cards", visibleProfileCards, snippet));

assertMatches(
  "list-visible-profile-cards",
  visibleProfileCards,
  /return\s+\{[\s\S]*slug:[\s\S]*displayName:[\s\S]*guildTitle:[\s\S]*avatarUrl:[\s\S]*profileHref:[\s\S]*hasApprovedAvatar/s,
  "public visible profile card must return only safe card fields.",
);

[
  "discordHandle:",
  "gameUid:",
  "region:",
  "timezone:",
  "storagePath:",
  "storageBucket:",
  "discordUserId:",
].forEach((snippet) => {
  if (visibleProfileCards.includes(snippet)) {
    failures.push(`list-visible-profile-cards: public card function must not return ${snippet}`);
  }
});

assertMatches(
  "list-approved-gallery-submissions",
  approvedFeed,
  /const item:\s*JsonRecord\s*=\s*\{(?:(?!storage_path|storage_bucket|user_id)[\s\S])*signed_url/s,
  "public approved feed item must not expose raw storage path, bucket, or user_id fields.",
);

[
  "Cloudflare remains DNS-only",
  "Vercel platform-wide DDoS mitigation",
  "CodeQL",
  "Dependabot",
  "verify_jwt=false",
  "Discord 429",
].forEach((snippet) => assertIncludes("security report", report, snippet));

[
  "Content-Security-Policy",
  "no CSP report-only console violations",
  "@vercel/analytics/next",
  "@vercel/speed-insights/next",
].forEach((snippet) => assertIncludes("CSP enforcement report", cspReport, snippet));

[
  "Security Hardening",
  "Content-Security-Policy",
  "Cloudflare remains DNS-only",
].forEach((snippet) => assertIncludes("deployment docs", deployment, snippet));

[
  "Current Hardening Baseline",
  "CSP is enforced",
  "apps/web/next.config.ts",
  "Supabase service-role keys",
].forEach((snippet) => assertIncludes("security policy", securityPolicy, snippet));

[
  "Security Headers",
  "Production CSP is enforced",
  "Content-Security-Policy",
  "Cloudflare DNS-only",
  "@vercel/analytics",
  "@vercel/speed-insights",
].forEach((snippet) => assertIncludes("apps/web README", appReadme, snippet));

[
  "Current Live State",
  "Production CSP is enforced",
  "Access-Control-Allow-Origin",
  "Cloudflare remains DNS-only",
  "Supabase remains the authority",
  "Discord event schedule source is `data/guild-schedule.json`",
  "Vercel Web Analytics and Speed Insights",
].forEach((snippet) => assertIncludes("current live state docs", currentLiveState, snippet));

[
  "Contact: https://github.com/Mochirii-Wushu/Mochirii/security/policy",
  "Policy: https://github.com/Mochirii-Wushu/Mochirii/security/policy",
  "Preferred-Languages: en",
  "Canonical: https://mochirii.com/.well-known/security.txt",
  "Expires: 2027-06-10T00:00:00Z",
].forEach((snippet) => assertIncludes("security.txt", securityTxt, snippet));

if (securityTxt !== appSecurityTxt) {
  failures.push("security.txt: root rollback copy and Next public copy must match exactly.");
}

assertMatches(
  "security.txt",
  securityTxt,
  /^Contact:\s+https:\/\/github\.com\/Mochirii-Wushu\/Mochirii\/security\/policy/m,
  "Contact must use the HTTPS GitHub security policy URL.",
);

assertMatches(
  "security.txt",
  securityTxt,
  /^Canonical:\s+https:\/\/mochirii\.com\/\.well-known\/security\.txt/m,
  "Canonical must point to the production security.txt URL.",
);

[
  "Cloudflare Security Insights",
  "Security.txt not configured",
  "Dangling A Record detected",
  "Cloudflare remains DNS-only",
  "Server: Vercel",
  "CSP inline reduction remains a staged follow-up",
  "Supabase CLI auditability",
].forEach((snippet) => assertIncludes("security scan report", securityScanReport, snippet));

[
  ["deployment docs", deployment],
  ["apps/web README", appReadme],
  ["current live state docs", currentLiveState],
  ["security policy", securityPolicy],
].forEach(([label, text]) => assertNoCurrentReportOnlyClaim(label, text));

if (failures.length) {
  console.error("Security hardening validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Security hardening validation OK.");
