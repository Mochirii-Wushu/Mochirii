import { readFileSync } from "node:fs";
import { readAppCss } from "./lib/app-css.mjs";

const failures = [];
const args = new Set(process.argv.slice(2));
const expectActive = args.has("--active") || process.env.APPLE_AUTH_READY_EXPECT_ACTIVE === "true";

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
const config = read("apps/web/lib/supabase/config.ts");
const authClient = read("apps/web/lib/supabase/auth.ts");
const authPanel = read("apps/web/components/member-workflow/AuthPanel.tsx");
const accountPanel = read("apps/web/components/member-workflow/AccountPanel.tsx");
const providerLogo = read("apps/web/components/member-workflow/ProviderLogo.tsx");
const multiProviderDoc = read("docs/multi-provider-login-and-verification.md");
const supabaseReadme = read("supabase/README.md");
const deploymentDoc = read("docs/deployment.md");

[
  '"check:apple-auth-readiness": "node scripts/check-apple-auth-readiness.mjs"',
  '"check:multi-provider-auth": "node scripts/check-multi-provider-auth.mjs"',
].forEach((snippet) => assertIncludes("package scripts", packageJson, snippet));

assertIncludes("check-all", checkAll, '["check:apple-auth-readiness", ["node", "scripts/check-apple-auth-readiness.mjs"]]');

[
  '"apple"',
  "label: \"Apple\"",
  "approvalRequired: true",
  "automaticVerification: false",
  "six-month rotation cadence",
  "providerToSupabaseProvider",
].forEach((snippet) => assertIncludes("Apple provider registry", providerRegistry, snippet));

[
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS",
  "NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS",
].forEach((snippet) => assertIncludes("Supabase public config", config, snippet));

[
  "signInWithProvider",
  "linkProviderIdentity",
  "resolveRedirectTo",
  "detectSessionInUrl",
].forEach((snippet) => {
  assertIncludes("auth client/config", `${authClient}\n${read("apps/web/lib/supabase/client.ts")}`, snippet);
});

[
  "placeholderOAuthProviders",
  "Setup pending",
  "signInWithProvider",
].forEach((snippet) => assertIncludes("AuthPanel", authPanel, snippet));

[
  "linkProviderIdentity",
  "placeholderOAuthProviders",
  "Setup pending",
].forEach((snippet) => assertIncludes("AccountPanel", accountPanel, snippet));

[
  'provider === "apple"',
  "provider-logo--apple",
].forEach((snippet) => assertIncludes("Apple provider logo support", `${providerLogo}\n${readAppCss()}`, snippet));

[
  "https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback",
  "com.mochirii.web",
  "com.mochirii.web.login",
  "Mochirii Web",
  "Mochirii Website Login",
  "Manual Linking",
  "security_manual_linking_enabled",
  "six-month",
  "C:\\Users\\xtyty\\Documents\\Creds",
  "identity evidence only",
].forEach((snippet) => {
  assertIncludes("multi-provider Apple activation docs", multiProviderDoc, snippet);
  assertIncludes("Supabase Apple activation docs", supabaseReadme, snippet);
});

[
  "Vercel Release Policy",
  "GitHub repository is currently public",
  "fresh required checks",
  "npx vercel deploy --prod --yes --token $token",
  "private",
].forEach((snippet) => assertIncludes("deployment docs", deploymentDoc, snippet));

[
  "provider_token",
  "provider_refresh_token",
  "client_secret=",
  "-----BEGIN PRIVATE KEY-----",
  "AuthKey_",
].forEach((snippet) => {
  [
    ["multi-provider docs", multiProviderDoc],
    ["Supabase README", supabaseReadme],
    ["deployment docs", deploymentDoc],
  ].forEach(([label, text]) => assertNotIncludes(label, text, snippet));
});

if (expectActive) {
  [
    "| Active | Discord, Google, Twitch, Apple |",
    "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch,apple",
    "NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS=",
    "Apple: active identity evidence",
  ].forEach((snippet) => {
    assertIncludes("active Apple multi-provider docs", multiProviderDoc, snippet);
    assertIncludes("active Apple Supabase docs", supabaseReadme, snippet);
  });

  [
    "| Visible placeholder | Apple |",
    "Apple is the only documented visible placeholder lane",
    "NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS=apple",
    "Setup pending",
  ].forEach((snippet) => {
    assertNotIncludes("active Apple multi-provider docs", multiProviderDoc, snippet);
    assertNotIncludes("active Apple Supabase docs", supabaseReadme, snippet);
  });
}

if (failures.length) {
  console.error("Apple auth readiness validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Apple auth readiness validation OK (${expectActive ? "active" : "pre-activation"} mode).`);
