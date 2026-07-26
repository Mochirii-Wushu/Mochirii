const args = process.argv.slice(2);
const baseUrl = readArg("--base-url", process.env.MOCHI_PETS_TEST_BASE_URL || "http://127.0.0.1:8765").replace(/\/$/, "");
const browserBaseUrl = readArg("--browser-base-url", baseUrl).replace(/\/$/, "");
const browserArg = readArg("--browser", "chromium");
const expectUnconfigured = args.includes("--expect-unconfigured");
const allowSelfSignedLocalhost = args.includes("--allow-self-signed-localhost");
const password = process.env.MOCHI_PETS_TESTER_PASSWORD || "";
const DEFERRED_SHELL_SETTLE_MS = 1_750;

if (allowSelfSignedLocalhost) {
  const browserUrl = new URL(browserBaseUrl);
  assert(
    browserUrl.protocol === "https:" && ["localhost", "127.0.0.1"].includes(browserUrl.hostname),
    "self-signed certificate bypass is restricted to local HTTPS smoke URLs",
  );
}

if (!expectUnconfigured && !password) {
  throw new Error("MOCHI_PETS_TESTER_PASSWORD is required for the configured doorway smoke.");
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

await verifyCrossOriginRejection();
await verifyMalformedLoginRejection();
await verifyLoginEndpointState();

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
  } finally {
    await browser.close();
  }
}

console.log(`Mochi Pets tester doorway smoke passed (${browserNames.join(", ")}).`);

async function verifyCrossOriginRejection() {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://attacker.invalid",
  };
  const login = await fetch(`${baseUrl}/games/mochi-pets/tester-login`, {
    method: "POST",
    redirect: "manual",
    headers,
    body: "testerPassword=test-only-value",
  });
  assert(login.status === 303, "cross-origin login did not return the generic redirect");
  assert(!login.headers.get("set-cookie"), "cross-origin login set a cookie");

  const logout = await fetch(`${baseUrl}/games/mochi-pets/tester-logout`, {
    method: "POST",
    redirect: "manual",
    headers,
  });
  assert(logout.status === 303, "cross-origin logout did not return the generic redirect");
  assert(!logout.headers.get("set-cookie"), "cross-origin logout changed the cookie");
}

async function verifyMalformedLoginRejection() {
  const origin = new URL(baseUrl).origin;
  for (const testCase of [
    {
      label: "wrong content type",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ testerPassword: "test-only-value" }),
    },
    {
      label: "oversized form",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: origin },
      body: `testerPassword=${"x".repeat(4_097)}`,
    },
  ]) {
    const response = await fetch(`${baseUrl}/games/mochi-pets/tester-login`, {
      method: "POST",
      redirect: "manual",
      headers: testCase.headers,
      body: testCase.body,
    });
    assert(response.status === 303, `${testCase.label} login did not return the generic redirect`);
    assert(!response.headers.get("set-cookie"), `${testCase.label} login set a cookie`);
    assert(
      response.headers.get("cache-control") === "private, no-store",
      `${testCase.label} login response is cacheable`,
    );
  }
}

async function verifyLoginEndpointState() {
  const origin = new URL(baseUrl).origin;
  const response = await fetch(`${baseUrl}/games/mochi-pets/tester-login`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: origin,
    },
    body: new URLSearchParams({ testerPassword: password || "test-only-value" }),
  });
  const location = response.headers.get("location") ?? "";
  const cookie = response.headers.get("set-cookie") ?? "";
  assert(response.status === 303, "same-origin login endpoint did not redirect");
  assert(response.headers.get("cache-control") === "private, no-store", "login endpoint response is cacheable");

  if (expectUnconfigured) {
    assert(location.endsWith("?tester_error=unavailable"), "unconfigured login endpoint did not fail closed");
    assert(!cookie, "unconfigured login endpoint set a cookie");
    return;
  }

  const rejection = location.includes("tester_error=unavailable")
    ? "unavailable"
    : location.includes("tester_error=invalid") ? "invalid" : "unexpected redirect";
  assert(
    location.endsWith("/games/mochi-pets"),
    `valid login endpoint rejected the synthetic password (${rejection})`,
  );
  assertSessionCookieHeader(cookie, {
    expectedSecure: false,
    contextLabel: "direct HTTP login endpoint",
  });
}

async function verifyDoorway(browser, browserName, viewport) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
    ignoreHTTPSErrors: allowSelfSignedLocalhost,
  });
  await context.route("**/_vercel/insights/script.js", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/_vercel/speed-insights/script.js", (route) => route.fulfill({ status: 204, body: "" }));
  let page = await context.newPage();
  const errors = [];
  const diagnosticsByPage = new WeakMap();
  let intentionalNavigation = false;
  installDiagnostics(page);

  try {
    const response = await page.goto(`${browserBaseUrl}/games/mochi-pets`, { waitUntil: "networkidle" });
    assert(response?.status() === 200, `${label(browserName, viewport)} route did not return 200`);
    assert(
      response?.headers()["cache-control"]?.includes("no-store"),
      `${label(browserName, viewport)} doorway response is cacheable`,
    );
    assert(
      (await page.locator('meta[name="robots"]').getAttribute("content"))?.includes("noindex"),
      `${label(browserName, viewport)} doorway is missing noindex metadata`,
    );
    await settleDeferredShell(page);
    await assertLockedLayout(page, browserName, viewport);

    if (expectUnconfigured) {
      await page.locator("input[name=testerPassword]").fill("test-only-value");
      await submitAndWaitForNavigation(page.getByRole("button", { name: "Unlock tester space" }));
      assert(
        new URL(page.url()).searchParams.get("tester_error") === "unavailable",
        `${label(browserName, viewport)} unconfigured login did not return unavailable`,
      );
      assert(
        await page.locator("#mochi-pets-gate-error").isVisible(),
        `${label(browserName, viewport)} unavailable alert is hidden`,
      );
      assert(!(await hasSessionCookie(context)), `${label(browserName, viewport)} unconfigured login set a cookie`);
      assert(errors.length === 0, `${label(browserName, viewport)} browser errors: ${errors.join(" | ")}`);
      return;
    }

    await page.locator("input[name=testerPassword]").fill("incorrect-test-password");
    await submitAndWaitForNavigation(page.getByRole("button", { name: "Unlock tester space" }));
    assert(
      new URL(page.url()).searchParams.get("tester_error") === "invalid",
      `${label(browserName, viewport)} invalid login did not return invalid`,
    );
    assert(
      await page.locator("#mochi-pets-gate-error").isVisible(),
      `${label(browserName, viewport)} invalid alert is hidden`,
    );
    assert(!(await hasSessionCookie(context)), `${label(browserName, viewport)} invalid login set a cookie`);

    await page.locator("input[name=testerPassword]").fill(password);
    await submitAndWaitForNavigation(page.getByRole("button", { name: "Unlock tester space" }));
    assertDoorwayUrl(page, browserName, viewport);

    await waitForStyledShell();
    let connection = page.locator('[data-mochi-pets-connection-state="not-connected"]');
    assert(await connection.isVisible(), `${label(browserName, viewport)} waiting room is not connected`);
    assert((await page.locator("iframe").count()) === 0, `${label(browserName, viewport)} rendered an iframe`);
    await assertNoHorizontalOverflow(page, browserName, viewport);

    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "mochi_pets_tester_access");
    assert(session, `${label(browserName, viewport)} valid login did not set the session cookie`);
    assert(session.httpOnly, `${label(browserName, viewport)} session cookie is not HTTP-only`);
    assert(
      session.secure === (new URL(browserBaseUrl).protocol === "https:"),
      `${label(browserName, viewport)} session cookie Secure state does not match transport`,
    );
    // The HTTPS proxy validates the exact response header. Playwright WebKit
    // normalizes the resulting cookie to None even when SameSite=Lax was sent.
    const browserReportsExpectedSameSite = session.sameSite === "Lax"
      || (browserName === "webkit" && session.sameSite === "None");
    assert(
      browserReportsExpectedSameSite,
      `${label(browserName, viewport)} session cookie SameSite is ${session.sameSite || "missing"}, expected Lax`,
    );
    assert(session.path === "/games/mochi-pets", `${label(browserName, viewport)} session cookie path is wrong`);

    await replaceWithFreshDoorwayPage();
    await waitForStyledShell();
    connection = page.locator('[data-mochi-pets-connection-state="not-connected"]');
    assert(await connection.isVisible(), `${label(browserName, viewport)} valid session did not persist`);

    const replacement = session.value.startsWith("a") ? "b" : "a";
    const tamperedValue = `${replacement}${session.value.slice(1)}`;
    assert(tamperedValue !== session.value, `${label(browserName, viewport)} tamper fixture did not change`);
    await context.clearCookies();
    await context.addCookies([{
      name: session.name,
      value: tamperedValue,
      domain: session.domain,
      path: session.path,
      expires: session.expires,
      httpOnly: session.httpOnly,
      secure: session.secure,
      sameSite: session.sameSite,
    }]);
    const installedTamperedCookies = (await context.cookies())
      .filter((cookie) => cookie.name === "mochi_pets_tester_access");
    assert(
      installedTamperedCookies.length === 1 && installedTamperedCookies[0].value === tamperedValue,
      `${label(browserName, viewport)} tamper fixture was not installed exactly once`,
    );
    await replaceWithFreshDoorwayPage();
    await assertLockedLayout(page, browserName, viewport);

    await page.locator("input[name=testerPassword]").fill(password);
    await submitAndWaitForNavigation(page.getByRole("button", { name: "Unlock tester space" }));
    assertDoorwayUrl(page, browserName, viewport);
    await submitAndWaitForNavigation(page.getByRole("button", { name: "Lock tester space" }));
    assertDoorwayUrl(page, browserName, viewport);
    await assertLockedLayout(page, browserName, viewport);
    assert(
      !(await context.cookies()).some((cookie) => cookie.name === "mochi_pets_tester_access"),
      `${label(browserName, viewport)} logout did not expire the session cookie`,
    );

    await page.waitForTimeout(100);
    assert(errors.length === 0, `${label(browserName, viewport)} browser errors: ${errors.join(" | ")}`);
  } finally {
    uninstallDiagnostics(page);
    await context.close();
  }

  async function withIntentionalNavigation(action) {
    intentionalNavigation = true;
    try {
      return await action();
    } finally {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
      intentionalNavigation = false;
    }
  }

  async function submitAndWaitForNavigation(button) {
    await withIntentionalNavigation(async () => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }),
        button.click(),
      ]);
      await settleDeferredShell(page);
    });
  }

  async function replaceWithFreshDoorwayPage() {
    await withIntentionalNavigation(async () => {
      uninstallDiagnostics(page);
      await page.close();
      page = await context.newPage();
      installDiagnostics(page);
      const response = await page.goto(`${browserBaseUrl}/games/mochi-pets`, { waitUntil: "networkidle" });
      assert(response?.status() === 200, `${label(browserName, viewport)} revisit did not return 200`);
      await settleDeferredShell(page);
    });
  }

  async function waitForStyledShell() {
    await page.waitForFunction(() => {
      const shell = document.querySelector(".mochi-game-shell");
      const footerLink = document.querySelector(".footer-nav");
      return Boolean(
        shell
        && getComputedStyle(shell).display === "grid"
        && (!footerLink || getComputedStyle(footerLink).display === "flex")
      );
    });
  }

  function installDiagnostics(targetPage) {
    targetPage.setDefaultTimeout(15_000);
    targetPage.setDefaultNavigationTimeout(20_000);
    const onConsole = (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    };
    const onPageError = (error) => errors.push(`page: ${error.message}`);
    const onRequestFailed = (request) => {
      const errorText = request.failure()?.errorText ?? "failed";
      const url = new URL(request.url());
      const browserNavigationAbort = new Set([
        "net::ERR_ABORTED",
        "NS_BINDING_ABORTED",
        "Load request cancelled",
      ]).has(errorText);
      const expectedNavigationAbort = intentionalNavigation
        && request.method() === "GET"
        && request.isNavigationRequest()
        && url.origin === new URL(browserBaseUrl).origin
        && browserNavigationAbort;
      if (!expectedNavigationAbort) errors.push(`request: ${request.method()} ${request.url()} ${errorText}`);
    };
    const onResponse = (response) => {
      if (response.status() >= 400) errors.push(`http: ${response.status()} ${response.url()}`);
    };
    diagnosticsByPage.set(targetPage, { onConsole, onPageError, onRequestFailed, onResponse });
    targetPage.on("console", onConsole);
    targetPage.on("pageerror", onPageError);
    targetPage.on("requestfailed", onRequestFailed);
    targetPage.on("response", onResponse);
  }

  function uninstallDiagnostics(targetPage) {
    const handlers = diagnosticsByPage.get(targetPage);
    if (!handlers) return;
    targetPage.off("console", handlers.onConsole);
    targetPage.off("pageerror", handlers.onPageError);
    targetPage.off("requestfailed", handlers.onRequestFailed);
    targetPage.off("response", handlers.onResponse);
    diagnosticsByPage.delete(targetPage);
  }
}

async function settleDeferredShell(page) {
  // The shared header intentionally defers its signed-out auth runtime by up
  // to 1.5 seconds. Let that load finish before deliberate full-page forms.
  await page.waitForTimeout(DEFERRED_SHELL_SETTLE_MS);
  await page.waitForLoadState("networkidle");
}

function assertDoorwayUrl(page, browserName, viewport) {
  const url = new URL(page.url());
  assert(
    url.pathname === "/games/mochi-pets" && !url.search,
    `${label(browserName, viewport)} did not return to the canonical doorway URL`,
  );
}

async function hasSessionCookie(context) {
  return (await context.cookies()).some((cookie) => cookie.name === "mochi_pets_tester_access");
}

async function assertLockedLayout(page, browserName, viewport) {
  try {
    await page.waitForFunction(() => {
      const shell = document.querySelector(".mochi-game-shell");
      const footerLink = document.querySelector(".footer-nav");
      return Boolean(
        shell
        && getComputedStyle(shell).display === "grid"
        && (!footerLink || getComputedStyle(footerLink).display === "flex")
      );
    });
  } catch (error) {
    const snapshot = await page.evaluate(() => {
      const shell = document.querySelector(".mochi-game-shell");
      const footerLink = document.querySelector(".footer-nav");
      return {
        readyState: document.readyState,
        shellDisplay: shell ? getComputedStyle(shell).display : null,
        footerLinkDisplay: footerLink ? getComputedStyle(footerLink).display : null,
        stylesheets: [...document.styleSheets].map((sheet) => sheet.href || "inline"),
      };
    });
    throw new Error(`${label(browserName, viewport)} styles did not become ready: ${JSON.stringify(snapshot)}`, {
      cause: error,
    });
  }
  const input = page.locator("input[name=testerPassword]");
  try {
    await input.waitFor({ state: "visible" });
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      readyState: document.readyState,
      path: window.location.pathname,
      search: window.location.search,
      passwordInputs: document.querySelectorAll('input[name="testerPassword"]').length,
      waitingRooms: document.querySelectorAll("[data-mochi-pets-connection-state]").length,
    }));
    throw new Error(`${label(browserName, viewport)} tester password input did not become visible: ${JSON.stringify(snapshot)}`, {
      cause: error,
    });
  }
  assert((await page.locator("iframe").count()) === 0, `${label(browserName, viewport)} locked page rendered an iframe`);
  assert((await page.locator("[data-mochi-pets-connection-state]").count()) === 0, `${label(browserName, viewport)} locked page exposed the waiting room`);
  await input.focus();
  assert(await input.evaluate((element) => element.matches(":focus")), `${label(browserName, viewport)} password input cannot receive focus`);
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) >= 31);
  await assertNoHorizontalOverflow(page, browserName, viewport);
}

async function assertNoHorizontalOverflow(page, browserName, viewport) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) {
    const offenders = await page.evaluate(() => [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const parent = element.parentElement;
        const parentRect = parent?.getBoundingClientRect();
        const parentStyle = parent ? getComputedStyle(parent) : null;
        return {
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${[...element.classList].map((name) => `.${name}`).join("")}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          display: style.display,
          minWidth: style.minWidth,
          maxWidth: style.maxWidth,
          whiteSpace: style.whiteSpace,
          overflowWrap: style.overflowWrap,
          parent: parent ? `${parent.tagName.toLowerCase()}${parent.id ? `#${parent.id}` : ""}${[...parent.classList].map((name) => `.${name}`).join("")}` : null,
          parentLeft: parentRect ? Math.round(parentRect.left) : null,
          parentRight: parentRect ? Math.round(parentRect.right) : null,
          parentWidth: parentRect ? Math.round(parentRect.width) : null,
          parentDisplay: parentStyle?.display ?? null,
        };
      })
      .filter((entry) => entry.left < -1 || entry.right > document.documentElement.clientWidth + 1)
      .slice(0, 8));
    throw new Error(
      `${label(browserName, viewport)} has ${overflow}px horizontal overflow: ${JSON.stringify(offenders)}`,
    );
  }
}

function readArg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function label(browserName, viewport) {
  return `${browserName} ${viewport.width}x${viewport.height}`;
}

function assertSessionCookieHeader(header, { expectedSecure, contextLabel }) {
  const cookie = header ?? "";
  assert(cookie.includes("mochi_pets_tester_access="), `${contextLabel} did not set a session cookie`);
  assert(/;\s*HttpOnly(?:;|$)/i.test(cookie), `${contextLabel} cookie is missing HttpOnly`);
  assert(/;\s*SameSite=Lax(?:;|$)/i.test(cookie), `${contextLabel} cookie is missing SameSite=Lax`);
  assert(
    /;\s*Path=\/games\/mochi-pets(?:;|$)/i.test(cookie),
    `${contextLabel} cookie path is not /games/mochi-pets`,
  );
  assert(
    /;\s*Secure(?:;|$)/i.test(cookie) === expectedSecure,
    `${contextLabel} cookie Secure state does not match transport`,
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
