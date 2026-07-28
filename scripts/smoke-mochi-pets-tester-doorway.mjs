const args = process.argv.slice(2);
const baseUrl = readArg("--base-url", process.env.MOCHI_PETS_TEST_BASE_URL || "https://localhost:8765").replace(/\/$/, "");
const browserArg = readArg("--browser", "chromium");
const storageKey = readArg("--supabase-storage-key", "sb-localhost-auth-token");
const expectUnconfigured = args.includes("--expect-unconfigured");
const allowSelfSignedLocalhost = args.includes("--allow-self-signed-localhost");
const password = process.env.MOCHI_PETS_SMOKE_PASSWORD || "";
const ENDPOINT_PATHS = new Set([
  "/games/mochi-pets/member-access",
  "/games/mochi-pets/tester-login",
]);
const MEMBER_VERIFIER_PATH = "/functions/v1/verify-member-access";

if (allowSelfSignedLocalhost) {
  const smokeUrl = new URL(baseUrl);
  assert(
    smokeUrl.protocol === "https:" && ["localhost", "127.0.0.1"].includes(smokeUrl.hostname),
    "self-signed certificate bypass is restricted to local HTTPS smoke URLs",
  );
}
if (!expectUnconfigured && !password) {
  throw new Error("MOCHI_PETS_SMOKE_PASSWORD is required for the configured doorway smoke.");
}

const playwright = await import("playwright");
const browserNames = browserArg === "all" ? ["chromium", "firefox", "webkit"] : [browserArg];
const chromiumViewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
];
const representativeViewports = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
];
let memberOrdinal = 1;
let navigationOrdinal = 1;

await verifyEndpointGuards();

for (const browserName of browserNames) {
  const browserType = playwright[browserName];
  if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);
  const browser = await browserType.launch({ headless: true });
  const viewports = browserName === "chromium" ? chromiumViewports : representativeViewports;
  console.log(`- ${browserName}: ${viewports.length} viewport(s)`);

  try {
    for (const viewport of viewports) {
      console.log(`  - ${viewport.width}x${viewport.height}: running`);
      await verifyDoorway(browser, browserName, viewport);
      console.log(`  - ${viewport.width}x${viewport.height}: passed`);
    }
    if (!expectUnconfigured && browserName === "chromium") {
      await verifyRateLimit(browser);
      await verifyMalformedSuccessFailsClosed(browser);
    }
  } finally {
    await browser.close();
  }
}

console.log(`Mochi Pets tester doorway smoke passed (${browserNames.join(", ")}).`);

async function verifyEndpointGuards() {
  const origin = new URL(baseUrl).origin;
  const formHeaders = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    Origin: origin,
  };
  const jsonHeaders = { "Content-Type": "application/json", Origin: origin };

  const crossOriginLogin = await fetch(`${baseUrl}/games/mochi-pets/tester-login`, {
    method: "POST",
    redirect: "manual",
    headers: { ...formHeaders, Origin: "https://attacker.invalid" },
    body: new URLSearchParams({ testerPassword: "synthetic-valid-length-passcode" }),
  });
  assertResponse(crossOriginLogin, 400, "cross-origin login");
  assert(!crossOriginLogin.headers.get("set-cookie"), "cross-origin login changed the tester cookie");

  const crossOriginMember = await fetch(`${baseUrl}/games/mochi-pets/member-access`, {
    method: "POST",
    headers: { ...jsonHeaders, Origin: "https://attacker.invalid" },
    body: "{}",
  });
  assertResponse(crossOriginMember, 400, "cross-origin member check");
  assert(!crossOriginMember.headers.get("set-cookie"), "cross-origin member check changed the tester cookie");

  const crossOriginLogout = await fetch(`${baseUrl}/games/mochi-pets/tester-logout`, {
    method: "POST",
    redirect: "manual",
    headers: { Origin: "https://attacker.invalid" },
  });
  assertResponse(crossOriginLogout, 303, "cross-origin logout");
  assert(!crossOriginLogout.headers.get("set-cookie"), "cross-origin logout changed the tester cookie");

  for (const fixture of [
    {
      label: "wrong-content-type login",
      path: "/games/mochi-pets/tester-login",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: "{}",
    },
    {
      label: "oversized login",
      path: "/games/mochi-pets/tester-login",
      headers: formHeaders,
      body: new URLSearchParams({ testerPassword: "x".repeat(8_193) }).toString(),
    },
    {
      label: "nonempty member check",
      path: "/games/mochi-pets/member-access",
      headers: jsonHeaders,
      body: '{"unexpected":true}',
    },
    {
      label: "oversized member check",
      path: "/games/mochi-pets/member-access",
      headers: jsonHeaders,
      body: JSON.stringify({ value: "x".repeat(64) }),
    },
  ]) {
    const response = await fetch(`${baseUrl}${fixture.path}`, {
      method: "POST",
      headers: fixture.headers,
      body: fixture.body,
    });
    assertResponse(response, 400, fixture.label);
  }

  const noBearerMember = await fetch(`${baseUrl}/games/mochi-pets/member-access`, {
    method: "POST",
    headers: jsonHeaders,
    body: "{}",
  });
  assertResponse(noBearerMember, 401, "member check without bearer");
  const noBearerLogin = await fetch(`${baseUrl}/games/mochi-pets/tester-login`, {
    method: "POST",
    headers: formHeaders,
    body: new URLSearchParams({ testerPassword: "synthetic-valid-length-passcode" }),
  });
  assertResponse(noBearerLogin, 401, "login without bearer");

  if (expectUnconfigured) {
    const token = syntheticToken("member", nextMemberId());
    const unconfiguredMember = await fetch(`${baseUrl}/games/mochi-pets/member-access`, {
      method: "POST",
      headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
      body: "{}",
    });
    assertResponse(unconfiguredMember, 503, "unconfigured member check");
    const unconfiguredLogin = await fetch(`${baseUrl}/games/mochi-pets/tester-login`, {
      method: "POST",
      headers: { ...formHeaders, Authorization: `Bearer ${token}` },
      body: new URLSearchParams({ testerPassword: "synthetic-valid-length-passcode" }),
    });
    assertResponse(unconfiguredLogin, 503, "unconfigured login");
  } else {
    const token = syntheticToken("member", nextMemberId());
    const configuredLogin = await fetch(`${baseUrl}/games/mochi-pets/tester-login`, {
      method: "POST",
      headers: { ...formHeaders, Authorization: `Bearer ${token}` },
      body: new URLSearchParams({ testerPassword: password }),
    });
    assertResponse(configuredLogin, 200, "configured login");
    assertSessionCookieHeader(configuredLogin.headers.get("set-cookie"));
  }
}

async function verifyDoorway(browser, browserName, viewport) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
    ignoreHTTPSErrors: allowSelfSignedLocalhost,
  });
  await stubAnalytics(context);
  const page = await context.newPage();
  const diagnostics = { allowVerifierFailure: false };
  const errors = installDiagnostics(page, diagnostics);
  let privateRequestCount = 0;
  page.on("request", (request) => {
    if (ENDPOINT_PATHS.has(new URL(request.url()).pathname)) privateRequestCount += 1;
  });
  const contextLabel = label(browserName, viewport);

  try {
    const response = await page.goto(`${baseUrl}/games/mochi-pets`, { waitUntil: "domcontentloaded" });
    assert(response?.status() === 200, `${contextLabel} route did not return 200`);
    if (expectUnconfigured) {
      await page.getByRole("heading", { level: 1, name: "Mochi Pets" }).waitFor();
      await assertPublicConcept(page, contextLabel);
      const publicCopy = await page.locator(".mochi-game-shell").innerText();
      assert(!/\b(?:tester|passcode|sign in|access|unavailable|try again)\b/i.test(publicCopy), `${contextLabel} public-only concept exposes private doorway language`);
      assert(await page.locator("form, input, .mochi-gate-notes").count() === 0, `${contextLabel} public-only concept exposes private controls`);
      assert(privateRequestCount === 0, `${contextLabel} public-only concept requested a private access endpoint`);
      await page.waitForTimeout(1_750);
      await assertNoPrivateClientCode(page, contextLabel);
      await assertResponsiveLayout(page, contextLabel);
      await page.addStyleTag({ content: "html{font-size:200%!important}" });
      await assertResponsiveLayout(page, `${contextLabel} public-only at 200% text`);
      assert(errors.length === 0, `${contextLabel} browser errors: ${errors.join(" | ")}`);
      return;
    }

    await waitForHeading(page, "Website sign-in required");
    await assertPublicConcept(page, contextLabel);
    await assertResponsiveLayout(page, contextLabel);
    assert(await page.getByRole("link", { name: "Sign in to Mōchirīī" }).isVisible(), `${contextLabel} sign-in action is hidden`);
    assert(await page.locator('input[name="testerPassword"]').count() === 0, `${contextLabel} exposes the passcode form while signed out`);

    const nonmemberToken = syntheticToken("nonmember", nextMemberId());
    await setBrowserSession(page, nonmemberToken);
    await reloadDoorway(page);
    await waitForHeading(page, "Verified membership required");
    assert(await page.locator('input[name="testerPassword"]').count() === 0, `${contextLabel} nonmember sees the passcode form`);

    const memberA = nextMemberId();
    await setBrowserSession(page, syntheticToken("member", memberA));
    await reloadDoorway(page);
    await waitForHeading(page, "Enter the tester space");
    const input = page.getByLabel("Tester passcode");
    assert(await input.getAttribute("minlength") === "15", `${contextLabel} passcode minimum is not 15`);
    assert(await input.getAttribute("maxlength") === "128", `${contextLabel} passcode maximum is not 128`);
    await assertResponsiveLayout(page, `${contextLabel} passcode form`);
    const textScale = await page.addStyleTag({ content: "html{font-size:200%!important}" });
    await assertResponsiveLayout(page, `${contextLabel} passcode form at 200% text`);
    await textScale.evaluate((element) => element.remove());

    await input.fill("incorrect-smoke-passcode");
    await input.focus();
    const invalidResponse = await submitAndWait(page, { keyboard: true });
    assert(invalidResponse.status() === 403, `${contextLabel} invalid passcode was not rejected`);
    await page.getByText("That password did not work.", { exact: false }).waitFor();
    assert(await input.evaluate((element) => element === document.activeElement), `${contextLabel} invalid passcode did not preserve input focus`);
    assert(await page.locator('#mochi-pets-gate-error[role="alert"]').isVisible(), `${contextLabel} invalid passcode alert is not announced`);
    assert(!(await hasSessionCookie(context)), `${contextLabel} invalid passcode set a tester cookie`);

    await input.fill(password);
    const acceptedResponse = await submitAndWait(page);
    assert(acceptedResponse.status() === 200, `${contextLabel} valid passcode returned ${acceptedResponse.status()} instead of 200`);
    await waitForHeading(page, "Welcome to the tester space");
    await assertSessionCookie(context, contextLabel, browserName === "webkit");
    await assertWaitingRoomFocus(page, contextLabel);
    await assertResponsiveLayout(page, contextLabel);

    await reloadDoorway(page);
    await waitForHeading(page, "Welcome to the tester space");
    await assertWaitingRoomFocus(page, contextLabel);

    const memberB = nextMemberId();
    await setBrowserSession(page, syntheticToken("member", memberB));
    await reloadDoorway(page);
    await waitForHeading(page, "Enter the tester space");
    assert(!(await hasSessionCookie(context)), `${contextLabel} member-bound cookie survived an account change`);

    await setBrowserSession(page, syntheticToken("member", memberA));
    await reloadDoorway(page);
    await waitForHeading(page, "Enter the tester space");
    await page.getByLabel("Tester passcode").fill(password);
    const relockEntry = await submitAndWait(page);
    assert(relockEntry.status() === 200, `${contextLabel} could not reopen the tester space before logout`);
    await waitForHeading(page, "Welcome to the tester space");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Lock tester space" }).click(),
    ]);
    await waitForHeading(page, "Enter the tester space");
    assert(!(await hasSessionCookie(context)), `${contextLabel} logout did not expire the tester cookie`);

    diagnostics.allowVerifierFailure = true;
    try {
      await setBrowserSession(page, syntheticToken("provider-error", nextMemberId()));
      await reloadDoorway(page);
      await waitForHeading(page, "We couldn’t confirm your access");
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => null);
      assert(await page.locator('input[name="testerPassword"]').count() === 0, `${contextLabel} provider failure exposed the passcode form`);
    } finally {
      diagnostics.allowVerifierFailure = false;
    }

    await page.addStyleTag({ content: "html{font-size:200%!important}" });
    await assertResponsiveLayout(page, `${contextLabel} at 200% text`);
    assert(errors.length === 0, `${contextLabel} browser errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

async function verifyRateLimit(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: allowSelfSignedLocalhost });
  await stubAnalytics(context);
  const page = await context.newPage();
  const errors = installDiagnostics(page);
  try {
    await page.goto(`${baseUrl}/games/mochi-pets`, { waitUntil: "domcontentloaded" });
    await setBrowserSession(page, syntheticToken("member", nextMemberId()));
    await reloadDoorway(page);
    await waitForHeading(page, "Enter the tester space");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await page.getByLabel("Tester passcode").fill(`incorrect-rate-passcode-${attempt}`);
      const input = page.getByLabel("Tester passcode");
      await input.focus();
      const response = await submitAndWait(page, { keyboard: true });
      assert(response.status() === 403, `rate-limit fixture attempt ${attempt} was not rejected as invalid`);
      assert(await input.evaluate((element) => element === document.activeElement), `rate-limit fixture attempt ${attempt} lost input focus`);
    }
    await page.getByLabel("Tester passcode").fill("incorrect-rate-passcode-final");
    const limitedInput = page.getByLabel("Tester passcode");
    await limitedInput.focus();
    const limited = await submitAndWait(page, { keyboard: true });
    assert(limited.status() === 429, "sixth passcode attempt did not hit the real rate limiter");
    assert(Number(limited.headers()["retry-after"]) > 0, "rate-limited response lacks Retry-After");
    await page.getByText("Too many passcode attempts.", { exact: false }).waitFor();
    assert(await limitedInput.evaluate((element) => element === document.activeElement), "rate-limited response lost input focus");
    assert(await page.locator('#mochi-pets-gate-error[role="alert"]').isVisible(), "rate-limited alert is not announced");
    assert(errors.length === 0, `rate-limit browser errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

async function verifyMalformedSuccessFailsClosed(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: allowSelfSignedLocalhost });
  await stubAnalytics(context);
  await context.route("**/games/mochi-pets/member-access", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "private, no-store" },
        body: JSON.stringify({ memberAccess: false, testerAccess: true }),
      });
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  const errors = installDiagnostics(page);
  try {
    await page.goto(`${baseUrl}/games/mochi-pets`, { waitUntil: "domcontentloaded" });
    await setBrowserSession(page, syntheticToken("member", nextMemberId()));
    await reloadDoorway(page);
    await waitForHeading(page, "We couldn’t confirm your access");
    assert(await page.locator('input[name="testerPassword"]').count() === 0, "malformed success unlocked the passcode form");
    assert(await page.getByText("Welcome to the tester space", { exact: true }).count() === 0, "malformed success unlocked the waiting room");
    assert(errors.length === 0, `malformed-success browser errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

async function assertPublicConcept(page, contextLabel) {
  const title = page.getByRole("heading", { level: 1, name: "Mochi Pets" });
  assert(await title.isVisible(), `${contextLabel} public title is hidden`);
  assert(await page.locator(".mochi-game-brand img").count() === 1, `${contextLabel} Mochirii emblem is missing or repeated`);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  assert(canonical?.endsWith("/games/mochi-pets"), `${contextLabel} canonical URL is missing or incorrect`);
  const robots = await page.locator('meta[name="robots"]').getAttribute("content").catch(() => "");
  assert(!/noindex/i.test(robots || ""), `${contextLabel} public concept page is noindex`);
  assert(await page.locator("iframe").count() === 0, `${contextLabel} restored an iframe`);
  assert(await page.getByRole("link", { name: "Mochi Pets", exact: true }).count() >= 1, `${contextLabel} public navigation link is missing`);

  const copy = await page.locator(".mochi-game-shell").innerText();
  assert(
    !/\b(?:GitHub|Supabase|Vercel|Fly\.io|DigitalOcean|Unity|Pixelfed|backend|repository|artifact|runtime|protocol|contract|integration|development|coming soon)\b/i.test(copy),
    `${contextLabel} exposes provider, implementation, or status language`,
  );
  assert(
    (copy.match(/A shared 3D guild home beyond the Jianghu/g) || []).length === 1,
    `${contextLabel} public concept statement is missing or repeated`,
  );
}

async function assertResponsiveLayout(page, contextLabel) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${contextLabel} has horizontal page overflow`);
  const shell = page.locator(".mochi-game-shell");
  const shellBox = await shell.boundingBox();
  assert(shellBox && shellBox.width > 0 && shellBox.height > 0, `${contextLabel} shell collapsed`);
  assert(shellBox.x >= -1 && shellBox.x + shellBox.width <= metrics.clientWidth + 1, `${contextLabel} shell escapes the viewport`);
  const controls = page.locator(".mochi-game-shell a, .mochi-game-shell button, .mochi-game-shell input");
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    assert(box && box.width >= 44 && box.height >= 44, `${contextLabel} has an interactive target smaller than 44px`);
  }
}

async function assertWaitingRoomFocus(page, contextLabel) {
  const title = page.getByRole("heading", { level: 1, name: "Mochi Pets" });
  await page.waitForFunction(() => document.activeElement?.id === "mochi-pets-title");
  const outline = await title.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  assert(outline.style !== "none" && outline.width >= 2, `${contextLabel} unlocked focus indicator is not visible`);
}

async function assertNoPrivateClientCode(page, contextLabel) {
  const matches = await page.evaluate(async () => {
    const urls = [...new Set([
      ...Array.from(document.scripts, (script) => script.src).filter(Boolean),
      ...performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => /\/_next\/static\/.*\.js(?:\?|$)/.test(url)),
    ])];
    const privateSignatures = ["/games/mochi-pets/member-access", "Unlock tester space"];
    const hits = [];
    for (const url of urls) {
      const source = await fetch(url, { cache: "no-store" }).then((response) => response.text());
      if (privateSignatures.some((signature) => source.includes(signature))) {
        hits.push(new URL(url).pathname);
      }
    }
    return hits;
  });
  assert(matches.length === 0, `${contextLabel} public-only page loaded private client code: ${matches.join(", ")}`);
}

async function submitAndWait(page, { keyboard = false } = {}) {
  const responsePromise = page.waitForResponse((response) => (
    new URL(response.url()).pathname === "/games/mochi-pets/tester-login"
    && response.request().method() === "POST"
  ));
  if (keyboard) await page.getByLabel("Tester passcode").press("Enter");
  else await page.getByRole("button", { name: "Unlock tester space" }).click();
  return responsePromise;
}

async function waitForHeading(page, name) {
  await page.getByRole("heading", { name, exact: true }).waitFor({ state: "visible" });
}

async function reloadDoorway(page) {
  const url = `${baseUrl}/games/mochi-pets?smoke_navigation=${navigationOrdinal}`;
  navigationOrdinal += 1;
  await page.goto(url, { waitUntil: "commit", timeout: 45_000 });
}

async function setBrowserSession(page, token) {
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  const session = {
    access_token: token,
    refresh_token: "synthetic-refresh-token",
    token_type: "bearer",
    expires_in: 7_200,
    expires_at: claims.exp,
    user: {
      id: claims.sub,
      aud: "authenticated",
      role: "authenticated",
      email: "smoke-member@example.invalid",
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: "2026-01-01T00:00:00.000Z",
    },
  };
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify(session)]);
}

function syntheticToken(scenario, sub) {
  const now = Math.floor(Date.now() / 1_000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    aud: "authenticated",
    exp: now + 7_200,
    iat: now,
    role: "authenticated",
    scenario,
    sub,
  })).toString("base64url");
  return `${header}.${payload}.synthetic-signature`;
}

function nextMemberId() {
  const suffix = String(memberOrdinal).padStart(12, "0");
  memberOrdinal += 1;
  return `00000000-0000-4000-8000-${suffix}`;
}

async function hasSessionCookie(context) {
  return (await context.cookies(`${baseUrl}/games/mochi-pets`)).some((cookie) => cookie.name === "mochi_pets_tester_access");
}

async function assertSessionCookie(context, contextLabel, allowWebKitNormalization = false) {
  const cookie = (await context.cookies(`${baseUrl}/games/mochi-pets`)).find((entry) => entry.name === "mochi_pets_tester_access");
  assert(cookie, `${contextLabel} valid access did not set the tester cookie`);
  assert(cookie.httpOnly, `${contextLabel} tester cookie is not HttpOnly`);
  assert(cookie.secure, `${contextLabel} tester cookie is not Secure`);
  assert(
    cookie.sameSite === "Lax" || (allowWebKitNormalization && cookie.sameSite === "None"),
    `${contextLabel} tester cookie jar has an unexpected SameSite value`,
  );
  assert(cookie.path === "/games/mochi-pets", `${contextLabel} tester cookie path is too broad`);
  assert(cookie.expires > Date.now() / 1_000, `${contextLabel} tester cookie is expired`);
}

function assertSessionCookieHeader(header) {
  const cookie = header || "";
  assert(cookie.startsWith("mochi_pets_tester_access="), "configured login did not set the tester cookie header");
  assert(/;\s*HttpOnly(?:;|$)/i.test(cookie), "tester cookie header is missing HttpOnly");
  assert(/;\s*Secure(?:;|$)/i.test(cookie), "tester cookie header is missing Secure");
  assert(/;\s*SameSite=Lax(?:;|$)/i.test(cookie), "tester cookie header is missing SameSite=Lax");
  assert(/;\s*Path=\/games\/mochi-pets(?:;|$)/i.test(cookie), "tester cookie header path is too broad");
}

function assertResponse(response, expectedStatus, contextLabel) {
  assert(response.status === expectedStatus, `${contextLabel} returned ${response.status}, expected ${expectedStatus}`);
  assert(/no-store/i.test(response.headers.get("cache-control") || ""), `${contextLabel} response is cacheable`);
}

async function stubAnalytics(context) {
  await context.route("**/_vercel/insights/script.js", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/_vercel/speed-insights/script.js", (route) => route.fulfill({ status: 204, body: "" }));
}

function installDiagnostics(page, diagnostics = { allowVerifierFailure: false }) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location().url;
    if (location && diagnostics.allowVerifierFailure && new URL(location).pathname === MEMBER_VERIFIER_PATH) return;
    if (location && ENDPOINT_PATHS.has(new URL(location).pathname)) return;
    errors.push(`console:${message.text()}`);
  });
  page.on("pageerror", (error) => {
    const expectedWebKitPrefetchCancellation = /^\/localhost:\d+\/[^ ?]*\?_rsc=[^ ]+ due to access control checks\.$/.test(error.message);
    const expectedWebKitAuthCancellation = /^\/localhost:\d+\/auth\/v1\/user due to access control checks\.$/.test(error.message);
    if (expectedWebKitPrefetchCancellation || expectedWebKitAuthCancellation) return;
    errors.push(`page:${error.message}`);
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const failure = request.failure()?.errorText || "failed";
    const sameOriginNavigationCancellation = url.origin === new URL(baseUrl).origin && request.method() === "GET";
    const expectedCancellation = path === "/games/mochi-pets/member-access"
      || path === MEMBER_VERIFIER_PATH
      || path === "/auth/v1/user"
      || path === "/rest/v1/member_profiles"
      || sameOriginNavigationCancellation;
    if (expectedCancellation && /(?:aborted|cancelled)/i.test(failure)) return;
    errors.push(`request:${request.method()} ${request.url()} ${failure}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const path = new URL(response.url()).pathname;
    if (diagnostics.allowVerifierFailure && path === MEMBER_VERIFIER_PATH && response.status() === 500) return;
    if (ENDPOINT_PATHS.has(path) && [400, 401, 403, 429, 503].includes(response.status())) return;
    errors.push(`http:${response.status()} ${response.url()}`);
  });
  return errors;
}

function readArg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function label(browserName, viewport) {
  return `${browserName} ${viewport.width}x${viewport.height}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
