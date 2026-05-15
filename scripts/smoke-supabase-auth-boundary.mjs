const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8765";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is required for this optional smoke test.");
  console.error("Start a local server, then run this in an environment with Playwright available.");
  process.exit(1);
}

const mockSupabaseClient = `
window.__supabaseAuthBoundaryCalls = [];
window.supabase = {
  createClient() {
    const calls = window.__supabaseAuthBoundaryCalls;
    const record = (type, details = {}) => calls.push({ type, ...details });

    const queryBuilder = (table) => ({
      select: () => queryBuilder(table),
      eq: () => queryBuilder(table),
      order: () => queryBuilder(table),
      limit: () => queryBuilder(table),
      maybeSingle: async () => {
        record("db.maybeSingle", { table });
        return { data: null, error: { message: "Signed-out mock blocked profile read" }, status: 401, statusText: "Unauthorized" };
      },
      then(resolve) {
        record("db.then", { table });
        return Promise.resolve({ data: null, error: { message: "Signed-out mock blocked query" } }).then(resolve);
      }
    });

    return {
      auth: {
        getSession: async () => {
          record("auth.getSession");
          return { data: { session: null }, error: null };
        },
        getUser: async () => {
          record("auth.getUser");
          return { data: { user: null }, error: null };
        },
        onAuthStateChange: (callback) => {
          record("auth.onAuthStateChange");
          window.setTimeout(() => callback("INITIAL_SESSION", null), 0);
          return { data: { subscription: { unsubscribe() {} } }, error: null };
        },
        signInWithOAuth: async (options) => {
          record("auth.signInWithOAuth", { provider: options?.provider || "" });
          return { data: { url: "mock-discord-oauth-url" }, error: null };
        },
        signOut: async () => {
          record("auth.signOut");
          return { error: null };
        }
      },
      from(table) {
        record("db.from", { table });
        return queryBuilder(table);
      },
      functions: {
        invoke: async (name) => {
          record("functions.invoke", { name });
          return { data: null, error: { message: "Signed-out mock blocked function invocation" } };
        }
      },
      storage: {
        from(bucket) {
          record("storage.from", { bucket });
          return {
            upload: async () => {
              record("storage.upload", { bucket });
              return { data: null, error: { message: "Signed-out mock blocked upload" } };
            }
          };
        }
      }
    };
  }
};
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function prepareContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route("**/@supabase/supabase-js@2*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: mockSupabaseClient,
    }),
  );
  return context;
}

async function newCheckedPage(context) {
  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !text.includes("Failed to load resource: net::ERR_FAILED")) {
      errors.push(text);
    }
  });

  return { page, errors };
}

async function loadPage(context, path) {
  const { page, errors } = await newCheckedPage(context);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#site-header");
  await page.waitForSelector("#footer");
  return { page, errors };
}

async function assertShellSignedOut(page, label) {
  const state = await page.evaluate(() => ({
    loginVisible: [...document.querySelectorAll("[data-auth-signed-out]")].some((el) => !el.hidden),
    signedInVisible: [...document.querySelectorAll("[data-auth-signed-in]")].some((el) => !el.hidden),
    verifiedVisible: [...document.querySelectorAll("[data-auth-verified]")].some((el) => !el.hidden),
    headerReady: Boolean(document.querySelector("#site-header")),
    footerReady: Boolean(document.querySelector("#footer")),
  }));

  assert(state.headerReady, `${label}: header did not render.`);
  assert(state.footerReady, `${label}: footer did not render.`);
  assert(state.loginVisible, `${label}: signed-out Login links should be visible.`);
  assert(!state.signedInVisible, `${label}: signed-in Account links should stay hidden.`);
  assert(!state.verifiedVisible, `${label}: verified Submit Image links should stay hidden.`);
}

async function assertNoErrors(errors, label) {
  if (errors.length) throw new Error(`${label} browser errors: ${errors.join(" | ")}`);
}

async function assertNoMutationCalls(page, label) {
  const calls = await page.evaluate(() => window.__supabaseAuthBoundaryCalls || []);
  const forbidden = calls.filter((call) =>
    ["db.from", "db.then", "db.maybeSingle", "functions.invoke", "storage.from", "storage.upload"].includes(call.type),
  );

  assert(!forbidden.length, `${label}: signed-out page made protected data/function/storage calls: ${JSON.stringify(forbidden)}`);
}

const browser = await chromium.launch({ headless: true });

try {
  const context = await prepareContext(browser);

  {
    const { page, errors } = await loadPage(context, "/auth.html");
    await page.waitForFunction(() => document.querySelector("#authState")?.textContent?.trim() === "Signed out");
    await assertShellSignedOut(page, "auth");

    const state = await page.evaluate(() => ({
      authState: document.querySelector("#authState")?.textContent?.trim() || "",
      status: document.querySelector("#authStatus")?.textContent?.trim() || "",
      loginVisible: !document.querySelector("#discordLogin")?.hidden,
      accountHidden: document.querySelector("#accountLink")?.hidden,
      signOutHidden: document.querySelector("#signOutButton")?.hidden,
      errorHidden: document.querySelector("#authError")?.hidden,
    }));

    assert(state.authState === "Signed out", `auth: expected Signed out state, got ${state.authState}.`);
    assert(state.status.includes("Use Discord to sign in"), `auth: unexpected status text: ${state.status}`);
    assert(state.loginVisible, "auth: Discord login button should be visible.");
    assert(state.accountHidden, "auth: Account link should be hidden.");
    assert(state.signOutHidden, "auth: Sign out button should be hidden.");
    assert(state.errorHidden, "auth: Error panel should stay hidden.");

    await page.click("#discordLogin");
    await page.waitForFunction(() =>
      (window.__supabaseAuthBoundaryCalls || []).some((call) => call.type === "auth.signInWithOAuth" && call.provider === "discord"),
    );
    await assertNoMutationCalls(page, "auth");
    await assertNoErrors(errors, "auth");
    await page.close();
  }

  {
    const { page, errors } = await loadPage(context, "/account.html");
    await page.waitForSelector("#signedOutPanel:not([hidden])");
    await assertShellSignedOut(page, "account");

    const state = await page.evaluate(() => ({
      signedOutText: document.querySelector("#signedOutPanel")?.innerText || "",
      accountHidden: document.querySelector("#accountPanel")?.hidden,
      leaderLinkHidden: document.querySelector("#leaderDashboardLink")?.hidden,
    }));

    assert(state.signedOutText.includes("Login with Discord"), "account: signed-out panel should ask for Discord login.");
    assert(state.accountHidden, "account: account panel should stay hidden while signed out.");
    assert(state.leaderLinkHidden, "account: leader dashboard link should stay hidden while signed out.");
    await assertNoMutationCalls(page, "account");
    await assertNoErrors(errors, "account");
    await page.close();
  }

  {
    const { page, errors } = await loadPage(context, "/gallery-submit.html");
    await page.waitForFunction(() => document.querySelector("#uploadGateState")?.textContent?.trim() === "Signed out");
    await assertShellSignedOut(page, "gallery-submit");

    const state = await page.evaluate(() => ({
      gateTitle: document.querySelector("#uploadGateTitle")?.textContent?.trim() || "",
      gateMessage: document.querySelector("#uploadGateMessage")?.textContent?.trim() || "",
      loginVisible: !document.querySelector("#uploadLoginLink")?.hidden,
      uploadPanelHidden: document.querySelector("#uploadPanel")?.hidden,
      refreshHidden: document.querySelector("#refreshVerification")?.hidden,
    }));

    assert(state.gateTitle === "Login Required", `gallery-submit: expected Login Required, got ${state.gateTitle}.`);
    assert(state.gateMessage.includes("Login with Discord"), `gallery-submit: unexpected gate message: ${state.gateMessage}`);
    assert(state.loginVisible, "gallery-submit: Login link should be visible.");
    assert(state.uploadPanelHidden, "gallery-submit: upload panel should stay hidden while signed out.");
    assert(state.refreshHidden, "gallery-submit: refresh verification button should stay hidden while signed out.");
    await assertNoMutationCalls(page, "gallery-submit");
    await assertNoErrors(errors, "gallery-submit");
    await page.close();
  }

  {
    const { page, errors } = await loadPage(context, "/leader-dashboard.html");
    await page.waitForSelector("#signedOutPanel:not([hidden])");
    await assertShellSignedOut(page, "leader-dashboard");

    const state = await page.evaluate(() => ({
      signedOutText: document.querySelector("#signedOutPanel")?.innerText || "",
      accessDeniedHidden: document.querySelector("#accessDeniedPanel")?.hidden,
      reviewHidden: document.querySelector("#reviewPanel")?.hidden,
    }));

    assert(state.signedOutText.includes("Login with Discord"), "leader-dashboard: signed-out panel should ask for Discord login.");
    assert(state.accessDeniedHidden, "leader-dashboard: access denied panel should not show before sign-in.");
    assert(state.reviewHidden, "leader-dashboard: review panel should stay hidden while signed out.");
    await assertNoMutationCalls(page, "leader-dashboard");
    await assertNoErrors(errors, "leader-dashboard");
    await page.close();
  }

  {
    const { page, errors } = await loadPage(context, "/gallery.html");
    await page.waitForSelector("#galleryGrid .gallery-thumb img");
    await assertShellSignedOut(page, "gallery");

    const state = await page.evaluate(() => ({
      galleryCount: document.querySelectorAll("#galleryGrid .gallery-thumb").length,
      bodyText: document.body.innerText,
    }));

    assert(state.galleryCount > 0, "gallery: public Gallery should render static images.");
    assert(!state.bodyText.includes("Signed-out mock blocked"), "gallery: public Gallery should not surface signed-out mock errors.");
    await assertNoMutationCalls(page, "gallery");
    await assertNoErrors(errors, "gallery");
    await page.close();
  }

  await context.close();
  console.log("Supabase auth boundary smoke OK.");
} finally {
  await browser.close();
}
