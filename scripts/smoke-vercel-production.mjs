const DEFAULT_BASE_URL = "https://mochirii.vercel.app";
const TIMEOUT_MS = 30000;

const cleanRoutes = [
  "/",
  "/join",
  "/ranks",
  "/leaders",
  "/codex",
  "/events",
  "/announcements",
  "/raffles",
  "/gallery",
  "/spotlight",
  "/spotify",
  "/recruitment",
  "/twills",
  "/auth",
  "/account",
  "/members",
  "/members/twills",
  "/gallery-submit",
  "/leader-dashboard",
  "/games/mochi-social",
];

const legacyRedirects = new Map([
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

const bodyChecks = new Map([
  ["/auth", /M[oō]chir[iī][iī] Login|Sign-in connects your website account|Website Sign-In/i],
  ["/account", /Choose a Sign-In Method|Sign In Required/i],
  ["/members", /Published profiles|Member Profiles|Sign In Required/i],
  ["/members/twills", /M[oō]chir[iī][iī] Member Profile|Sign In Required|Access Denied/i],
  ["/gallery-submit", /Login Required|Access Check/i],
  ["/leader-dashboard", /Choose a Sign-In Method|Sign In Required|Access Denied/i],
  ["/games/mochi-social", /Mochi Social|Closed alpha|tester password/i],
]);

const requestHeaders = {
  "user-agent": "MochiriiVercelProductionSmoke/1.0",
  accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.6",
};

function parseBaseUrl() {
  const baseArg = process.argv.find((value) => value.startsWith("--base-url="))?.split("=").slice(1).join("=");
  const positionalUrl = process.argv.slice(2).find((value) => /^https?:\/\//i.test(value));
  const raw = baseArg || process.env.BASE_URL || process.env.SMOKE_BASE_URL || positionalUrl || DEFAULT_BASE_URL;
  const parsed = new URL(raw);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`BASE_URL must use http or https: ${raw}`);
  }

  return parsed.origin;
}

function urlFor(baseUrl, path) {
  return new URL(path, baseUrl).href;
}

async function request(baseUrl, path, { method = "HEAD", redirect = "follow" } = {}) {
  return fetch(urlFor(baseUrl, path), {
    method,
    redirect,
    headers: requestHeaders,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function checkRoute(baseUrl, path) {
  let response = await request(baseUrl, path);

  if (response.status === 405) {
    response = await request(baseUrl, path, { method: "GET" });
  }

  if (response.status !== 200) {
    throw new Error(`${path} expected HTTP 200, got ${response.status}`);
  }

  console.log(`OK route ${path} 200`);
}

async function checkRedirect(baseUrl, from, expectedPath) {
  const first = await request(baseUrl, from, { redirect: "manual" });
  const followed = await request(baseUrl, from, { redirect: "follow" });
  const finalPath = new URL(followed.url).pathname;

  if (![301, 302, 307, 308].includes(first.status)) {
    throw new Error(`${from} expected redirect, got HTTP ${first.status}`);
  }

  if (followed.status !== 200 || finalPath !== expectedPath) {
    throw new Error(`${from} expected final ${expectedPath} 200, got ${finalPath} ${followed.status}`);
  }

  console.log(`OK redirect ${from} ${first.status} -> ${expectedPath}`);
}

async function checkBody(baseUrl, path, pattern) {
  const response = await request(baseUrl, path, { method: "GET" });
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`${path} body check expected HTTP 200, got ${response.status}`);
  }

  if (/Invalid supabaseUrl/i.test(body)) {
    throw new Error(`${path} rendered Invalid supabaseUrl`);
  }

  if (!pattern.test(body)) {
    throw new Error(`${path} did not render expected signed-out/access content`);
  }

  console.log(`OK content ${path}`);
}

try {
  const baseUrl = parseBaseUrl();
  console.log(`Smoke base: ${baseUrl}`);

  for (const route of cleanRoutes) {
    await checkRoute(baseUrl, route);
  }

  for (const [from, expectedPath] of legacyRedirects) {
    await checkRedirect(baseUrl, from, expectedPath);
  }

  for (const [path, pattern] of bodyChecks) {
    await checkBody(baseUrl, path, pattern);
  }

  console.log("Vercel production smoke check OK.");
} catch (error) {
  console.error(`Vercel production smoke check failed: ${error?.message || error}`);
  process.exit(1);
}
