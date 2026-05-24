import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { Resolver } from "node:dns/promises";

const CURRENT_CUSTOM_DOMAIN = "https://mochirii.com";
const WWW_CUSTOM_DOMAIN = "https://www.mochirii.com";
const TIMEOUT_MS = 30000;
const SKIP_CHILD_CHECKS = process.argv.includes("--skip-child-checks");

const requiredRollbackFiles = [
  "CNAME",
  "index.html",
  "auth.html",
  "auth.js",
  "account.html",
  "account.js",
  "gallery-submit.html",
  "gallery-submit.js",
  "leader-dashboard.html",
  "leader-dashboard.js",
];

const requiredDocs = new Map([
  [
    "docs/dns-cutover-readiness-and-rollback.md",
    [
      "Do not cut over `mochirii.com` DNS until the user explicitly approves",
      "Use only the exact DNS instructions shown in the final production-serving project's Domains dashboard",
      "GitHub Pages remains the current rollback surface",
      "Member workflow production QA has followed",
      "npm run check:dns-cutover-workstation",
      "npm run check:dns-cutover-final-readiness",
    ],
  ],
  [
    "docs/member-workflow-production-qa-runbook.md",
    [
      "It does not authorize DNS changes",
      "QA_ALLOW_LIVE_MUTATION=false",
      "D02: Live OAuth And Account Smoke",
      "D03: Live Upload And Moderation Smoke",
      "npm run check:live-member-workflow-result-packet",
      "npm run check:cutover-validators",
    ],
  ],
  [
    "docs/live-member-workflow-result-packet.md",
    [
      "It does not authorize DNS changes",
      "Result: READY / NO-GO",
      "D02 live OAuth/account smoke",
      "D03 live upload/moderation smoke",
      "npm run check:live-member-workflow-result-packet",
      "npm run check:cutover-validators",
    ],
  ],
  [
    "docs/dns-cutover-approval-packet.md",
    [
      "Do not treat this template as approval",
      "Completed packets may include dashboard screenshots",
      "Decision: GO / NO-GO",
      "Same-window rehearsal and validation passed",
      "npm run check:dns-cutover-approval-packet",
      "npm run check:live-member-workflow-result-packet",
      "npm run check:dns-cutover-workstation",
      "npm run check:dns-cutover-final-readiness",
      "npm run check:cutover-validators",
    ],
  ],
]);

const allowedCutoverFiles = new Set([
  "docs/dns-cutover-approval-packet.md",
  "docs/dns-cutover-readiness-and-rollback.md",
  "docs/live-member-workflow-result-packet.md",
  "scripts/check-dns-cutover-rehearsal.mjs",
]);

const privateCutoverArtifactPatterns = [
  /(?:^|\/)(?:private|operator|evidence|screenshots?)\/.*(?:cutover|dns|cloudflare|vercel|supabase|discord)/i,
  /(?:^|\/)(?:private|operator|evidence|screenshots?)\/.*(?:live-member|member-workflow|d02|d03|qa)/i,
  /(?:dns-cutover|cutover-approval|go-no-go).*(?:completed|filled|private|operator|evidence|screenshot|dashboard)/i,
  /(?:live-member|member-workflow|d02|d03).*(?:completed|filled|private|operator|evidence|screenshot|dashboard|cleanup|result).*\.(?:md|txt|png|jpe?g|webp|gif|pdf|json)$/i,
  /(?:cloudflare|vercel|supabase|discord|dashboard).*(?:cutover|approval).*\.(?:png|jpe?g|webp|gif|pdf)$/i,
];

const expectedLegacyRedirects = new Map([
  ["/index.html", "/"],
  ["/join.html", "/join"],
  ["/ranks.html", "/ranks"],
  ["/leaders.html", "/leaders"],
  ["/codex.html", "/codex"],
  ["/events.html", "/events"],
  ["/announcements.html", "/announcements"],
  ["/raffles.html", "/raffles"],
  ["/gallery.html", "/gallery"],
  ["/spotlight.html", "/spotlight"],
  ["/spotify.html", "/spotify"],
  ["/recruitment.html", "/recruitment"],
  ["/twills.html", "/twills"],
  ["/auth.html", "/auth"],
  ["/account.html", "/account"],
  ["/gallery-submit.html", "/gallery-submit"],
  ["/leader-dashboard.html", "/leader-dashboard"],
]);

const requestHeaders = {
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 MochiriiDnsCutoverRehearsal/1.0",
  accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.6",
  "cache-control": "no-cache",
  pragma: "no-cache",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function ok(message) {
  console.log(`OK ${message}`);
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim();
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

async function fileExists(path) {
  await access(path, constants.F_OK);
}

async function checkFiles() {
  for (const file of requiredRollbackFiles) {
    await fileExists(file);
  }

  const cname = (await readFile("CNAME", "utf8")).trim();
  assert(cname === "mochirii.com", `CNAME should stay mochirii.com for rollback, got ${cname || "(empty)"}.`);

  for (const [file, requiredText] of requiredDocs) {
    const text = await readFile(file, "utf8");
    for (const expected of requiredText) {
      assert(text.includes(expected), `${file} is missing required cutover guidance: ${expected}`);
    }
  }

  const nextConfig = await readFile("apps/web/next.config.ts", "utf8");
  for (const [source, destination] of expectedLegacyRedirects) {
    assert(nextConfig.includes(`"${source}"`), `apps/web/next.config.ts is missing redirect source ${source}.`);
    assert(nextConfig.includes(`"${destination}"`), `apps/web/next.config.ts is missing redirect destination ${destination}.`);
  }

  const trackedPrivateArtifacts = listTrackedFiles().filter(
    (file) =>
      !allowedCutoverFiles.has(file) &&
      privateCutoverArtifactPatterns.some((pattern) => pattern.test(file)),
  );

  assert(
    trackedPrivateArtifacts.length === 0,
    `private cutover artifacts must not be tracked: ${trackedPrivateArtifacts.join(", ")}`,
  );

  ok("rollback files, runbooks, CNAME, legacy redirect config, and private-artifact guards are present");
}

function makeResolver(label, servers) {
  const resolver = new Resolver();
  resolver.setServers(servers);
  return { label, resolver };
}

function flattenTxt(records) {
  return records.map((entry) => entry.join("")).join("\n");
}

function normalizeDnsName(value) {
  return String(value || "").replace(/\.$/, "").toLowerCase();
}

async function checkPublicDns() {
  const resolvers = [
    makeResolver("1.1.1.1", ["1.1.1.1"]),
    makeResolver("8.8.8.8", ["8.8.8.8"]),
  ];

  for (const { label, resolver } of resolvers) {
    const ns = (await resolver.resolveNs("mochirii.com")).map(normalizeDnsName);
    assert(ns.includes("igor.ns.cloudflare.com"), `${label} NS lookup is missing igor.ns.cloudflare.com.`);
    assert(ns.includes("naomi.ns.cloudflare.com"), `${label} NS lookup is missing naomi.ns.cloudflare.com.`);
  }

  const mxResolver = resolvers[0].resolver;
  const mx = (await mxResolver.resolveMx("mochirii.com")).map((record) => normalizeDnsName(record.exchange));
  assert(mx.includes("mail.protonmail.ch"), "MX lookup is missing mail.protonmail.ch.");
  assert(mx.includes("mailsec.protonmail.ch"), "MX lookup is missing mailsec.protonmail.ch.");

  const apexTxt = flattenTxt(await mxResolver.resolveTxt("mochirii.com"));
  assert(/v=spf1\s+include:_spf\.protonmail\.ch\s+-all/i.test(apexTxt), "Apex TXT lookup is missing Proton SPF.");
  assert(/protonmail-verification=/i.test(apexTxt), "Apex TXT lookup is missing Proton verification.");
  assert(/openai-domain-verification=/i.test(apexTxt), "Apex TXT lookup is missing OpenAI verification.");

  const dmarcTxt = flattenTxt(await mxResolver.resolveTxt("_dmarc.mochirii.com"));
  assert(/v=DMARC1/i.test(dmarcTxt), "_dmarc TXT lookup is missing DMARC policy.");

  const dkim = (await mxResolver.resolveCname("protonmail._domainkey.mochirii.com")).map(normalizeDnsName);
  assert(
    dkim.some((value) => value.endsWith(".domains.proton.ch")),
    "ProtonMail DKIM CNAME no longer points at a Proton target.",
  );

  ok("public DNS still preserves Cloudflare nameservers and mail/security records");
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...requestHeaders, ...(options.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function checkCurrentCustomDomain() {
  const response = await fetchWithTimeout(CURRENT_CUSTOM_DOMAIN, { redirect: "manual" });
  assert(response.status === 200, `${CURRENT_CUSTOM_DOMAIN} expected HTTP 200 before cutover, got ${response.status}.`);

  const server = response.headers.get("server") || "";
  const vercelId = response.headers.get("x-vercel-id") || "";
  assert(/cloudflare/i.test(server), `${CURRENT_CUSTOM_DOMAIN} should still be Cloudflare-fronted before cutover.`);
  assert(!vercelId, `${CURRENT_CUSTOM_DOMAIN} already has Vercel response headers; verify whether DNS was cut over.`);

  const body = await response.text();
  assert(/M[oō]chir[iī][iī]/i.test(body), `${CURRENT_CUSTOM_DOMAIN} did not render the guild site body.`);

  const wwwResponse = await fetchWithTimeout(WWW_CUSTOM_DOMAIN, { redirect: "manual" });
  const wwwLocation = wwwResponse.headers.get("location") || "";
  assert([301, 302, 307, 308].includes(wwwResponse.status), `${WWW_CUSTOM_DOMAIN} should redirect before cutover.`);
  assert(
    new URL(wwwLocation, WWW_CUSTOM_DOMAIN).href === `${CURRENT_CUSTOM_DOMAIN}/`,
    `${WWW_CUSTOM_DOMAIN} should redirect to ${CURRENT_CUSTOM_DOMAIN}/, got ${wwwLocation || "(none)"}.`,
  );

  ok("current custom domain still matches the pre-cutover Cloudflare/GitHub Pages surface");
}

function runCommand(label, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        ok(label);
        resolve();
      } else {
        reject(new Error(`${label} failed with exit code ${code}.`));
      }
    });
  });
}

async function checkChildCommands() {
  if (SKIP_CHILD_CHECKS) {
    console.log("SKIP child checks (--skip-child-checks).");
    return;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  await runCommand("cutover validator self-tests passed", npmCommand, ["run", "check:cutover-validators"]);
  await runCommand("Vercel production smoke passed", npmCommand, ["run", "smoke:vercel-production"]);
  await runCommand("live member workflow preflight passed", npmCommand, ["run", "check:live-member-workflow-preflight"]);
}

try {
  await checkFiles();
  await checkPublicDns();
  await checkCurrentCustomDomain();
  await checkChildCommands();

  console.log("DNS cutover rehearsal check OK (read-only; no DNS/provider mutation performed).");
} catch (error) {
  console.error(`DNS cutover rehearsal check failed: ${error?.message || error}`);
  process.exit(1);
}
