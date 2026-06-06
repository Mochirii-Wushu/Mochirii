import { spawn } from "node:child_process";

const DEFAULT_BASE_URL = "https://mochirii.com";
const TIMEOUT_MS = 30000;

const args = process.argv.slice(2);
const allowCloudflareProxy = args.includes("--allow-cloudflare-proxy");
const allowVercelPreview = args.includes("--allow-vercel-preview");

const requestHeaders = {
  "user-agent": "MochiriiDnsCutoverPostSmoke/1.0",
  accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.6",
  "cache-control": "no-cache",
  pragma: "no-cache",
};

function argValue(name) {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : "";
}

function parseBaseUrl() {
  const positionalUrl = args.find((value) => /^https?:\/\//i.test(value));
  const raw = argValue("--base-url") || process.env.BASE_URL || process.env.SMOKE_BASE_URL || positionalUrl || DEFAULT_BASE_URL;
  const parsed = new URL(raw);

  if (parsed.protocol !== "https:") {
    throw new Error(`Post-cutover smoke requires https: ${raw}`);
  }

  if (/\.vercel\.app$/i.test(parsed.hostname) && !allowVercelPreview) {
    throw new Error("Post-cutover smoke should target the custom domain. Use --allow-vercel-preview only for script validation.");
  }

  return parsed.origin;
}

function parseWwwMode() {
  const value = (argValue("--www-mode") || process.env.WWW_MODE || "redirect").toLowerCase();
  const allowed = new Set(["redirect", "serve", "skip"]);

  if (!allowed.has(value)) {
    throw new Error(`--www-mode must be redirect, serve, or skip. Got: ${value}`);
  }

  return value;
}

function expectedWwwOrigin(baseUrl) {
  const override = argValue("--www-url") || process.env.WWW_URL;
  if (override) return new URL(override).origin;

  const parsed = new URL(baseUrl);
  if (parsed.hostname.startsWith("www.")) return parsed.origin;

  parsed.hostname = `www.${parsed.hostname}`;
  return parsed.origin;
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...requestHeaders, ...(options.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function assertVercelHeaders(response, label) {
  const server = response.headers.get("server") || "";
  const vercelId = response.headers.get("x-vercel-id") || "";
  const cfRay = response.headers.get("cf-ray") || "";

  if (!/vercel/i.test(server) && !vercelId) {
    throw new Error(`${label} did not expose Vercel response headers.`);
  }

  if (!allowCloudflareProxy && (/cloudflare/i.test(server) || cfRay)) {
    throw new Error(`${label} appears Cloudflare-proxied; planned Vercel cutover records should be DNS-only.`);
  }
}

async function checkBaseOrigin(baseUrl) {
  const response = await fetchWithTimeout(baseUrl, { redirect: "manual" });

  if (response.status !== 200) {
    throw new Error(`${baseUrl} expected HTTP 200, got ${response.status}.`);
  }

  assertVercelHeaders(response, baseUrl);

  const body = await response.text();
  if (!/M[oō]chir[iī][iī]/i.test(body)) {
    throw new Error(`${baseUrl} did not render the guild site body.`);
  }

  console.log(`OK custom domain serves Vercel app at ${baseUrl}`);
}

async function checkWww(baseUrl, mode) {
  if (mode === "skip") {
    console.log("SKIP www check (--www-mode=skip).");
    return;
  }

  const wwwOrigin = expectedWwwOrigin(baseUrl);

  if (mode === "redirect") {
    const response = await fetchWithTimeout(wwwOrigin, { redirect: "manual" });
    const location = response.headers.get("location") || "";
    const finalUrl = location ? new URL(location, wwwOrigin) : null;

    if (![301, 302, 307, 308].includes(response.status)) {
      throw new Error(`${wwwOrigin} expected redirect to ${baseUrl}, got HTTP ${response.status}.`);
    }

    if (finalUrl?.origin !== baseUrl) {
      throw new Error(`${wwwOrigin} expected redirect to ${baseUrl}, got ${location || "(none)"}.`);
    }

    console.log(`OK ${wwwOrigin} redirects to ${baseUrl}`);
    return;
  }

  const response = await fetchWithTimeout(wwwOrigin, { redirect: "manual" });
  if (response.status !== 200) {
    throw new Error(`${wwwOrigin} expected HTTP 200, got ${response.status}.`);
  }

  assertVercelHeaders(response, wwwOrigin);
  console.log(`OK ${wwwOrigin} serves Vercel app`);
}

function runRouteSmoke(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/smoke-vercel-production.mjs", `--base-url=${baseUrl}`], {
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        console.log("OK custom-domain route and redirect smoke passed");
        resolve();
      } else {
        reject(new Error(`custom-domain route smoke failed with exit code ${code}.`));
      }
    });
  });
}

try {
  const baseUrl = parseBaseUrl();
  const wwwMode = parseWwwMode();

  await checkBaseOrigin(baseUrl);
  await runRouteSmoke(baseUrl);
  await checkWww(baseUrl, wwwMode);

  console.log("DNS cutover post-cutover smoke OK (read-only; no DNS/provider mutation performed).");
} catch (error) {
  console.error(`DNS cutover post-cutover smoke failed: ${error?.message || error}`);
  process.exit(1);
}
