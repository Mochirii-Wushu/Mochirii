import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8765";
const screenshotDirectory = path.resolve(
  process.env.SMOKE_SCREENSHOT_DIR || ".artifacts/operations/universal-lightbox",
);

const viewportMatrix = [
  { label: "400-percent short-height stress", width: 320, height: 256 },
  { label: "320px reflow", width: 320, height: 568 },
  { label: "compact Android portrait", width: 360, height: 800 },
  { label: "compact iPhone portrait", width: 375, height: 812 },
  { label: "modern iPhone portrait", width: 390, height: 844 },
  { label: "modern iPhone alternate", width: 393, height: 852 },
  { label: "large Android portrait", width: 412, height: 915 },
  { label: "200-percent reflow", width: 640, height: 360 },
  { label: "phone landscape", width: 844, height: 390 },
  { label: "tablet portrait", width: 768, height: 1024 },
  { label: "tablet landscape", width: 1024, height: 768 },
  { label: "compact desktop", width: 1280, height: 720 },
  { label: "common laptop", width: 1366, height: 768 },
  { label: "desktop", width: 1440, height: 900 },
  { label: "large laptop", width: 1536, height: 864 },
  { label: "full HD desktop", width: 1920, height: 1080 },
  { label: "ultrawide desktop", width: 2560, height: 1080 },
  { label: "QHD desktop", width: 2560, height: 1440 },
];

const crossEngineViewportLabels = new Set([
  "400-percent short-height stress",
  "modern iPhone portrait",
  "phone landscape",
  "tablet portrait",
  "desktop",
  "ultrawide desktop",
]);
const interactionViewportLabels = new Set(["modern iPhone portrait", "desktop"]);
const syntheticShapeViewportLabels = new Set([
  "400-percent short-height stress",
  "320px reflow",
  "phone landscape",
  "desktop",
]);
const longCaptionViewportLabels = new Set([
  "400-percent short-height stress",
  "320px reflow",
]);
const screenshotViewportLabels = new Set([
  "modern iPhone portrait",
  "phone landscape",
  "desktop",
  "QHD desktop",
]);
const touchViewports = viewportMatrix.filter(({ label }) =>
  ["modern iPhone portrait", "phone landscape"].includes(label),
);

const surfaces = [
  {
    key: "home",
    label: "Home Screenshot Spotlight",
    path: "/",
    trigger: "#galleryGrid .home-thumb",
    minimumTriggers: 4,
    dialog: "#modalRoot",
    shell: "#modalRoot .lightbox-shell",
    card: "#modalRoot .lightbox-card",
    image: "#modalImage",
    caption: "#modalCaption",
    close: "#modalClose",
    backdrop: "#modalBackdrop",
  },
  {
    key: "gallery",
    label: "Gallery",
    path: "/gallery?sort=newest",
    trigger: "#galleryGrid .gallery-thumb",
    minimumTriggers: 1,
    dialog: "#lightbox",
    shell: "#lightbox .lightbox-shell",
    card: "#lightbox .lightbox-card",
    image: "#lightboxImg",
    caption: "#lightboxCaption",
    close: "#lightboxClose",
    backdrop: "#lightboxBackdrop",
  },
];

const geometryTolerance = 1.5;
const triggerMarker = "data-lightbox-smoke-trigger";
const vercelAnalyticsScriptPaths = new Set([
  "/_vercel/insights/script.js",
  "/_vercel/speed-insights/script.js",
]);
const approvedGalleryFeedFixturePattern = "**/functions/v1/list-approved-gallery-submissions*";

let playwright;
try {
  playwright = await import("playwright");
} catch {
  console.error("Playwright is required for this smoke test.");
  console.error("Install the locked dependencies and run npm run setup:playwright.");
  process.exit(1);
}

const engines = [
  { key: "chromium", label: "Chromium", launcher: playwright.chromium, fullMatrix: true },
  { key: "firefox", label: "Firefox", launcher: playwright.firefox, fullMatrix: false },
  { key: "webkit", label: "WebKit", launcher: playwright.webkit, fullMatrix: false },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function within(value, minimum, maximum, tolerance = geometryTolerance) {
  return value >= minimum - tolerance && value <= maximum + tolerance;
}

function engineViewports(engine) {
  return engine.fullMatrix
    ? viewportMatrix
    : viewportMatrix.filter(({ label }) => crossEngineViewportLabels.has(label));
}

function viewportSize({ width, height }) {
  return { width, height };
}

async function stubVercelAnalyticsScripts(context, appBaseUrl = baseUrl) {
  const appOrigin = new URL(appBaseUrl).origin;
  await context.route(
    (url) => url.origin === appOrigin && vercelAnalyticsScriptPaths.has(url.pathname),
    (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );
}

async function stubEmptyApprovedGalleryFeed(context) {
  await context.route(approvedGalleryFeedFixturePattern, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: { submissions: [] },
        message: "Deterministic universal-lightbox smoke fixture.",
      }),
    }),
  );
}

function navigationBaseUrl(engine) {
  if (engine.key !== "webkit") return baseUrl;

  const url = new URL(baseUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    return baseUrl;
  }

  url.protocol = "https:";
  return url.href.replace(/\/$/, "");
}

async function bridgeWebKitLocalHttps(context, secureBaseUrl) {
  if (secureBaseUrl === baseUrl) return;

  const secureOrigin = new URL(secureBaseUrl).origin;
  await context.route(`${secureOrigin}/**`, async (route) => {
    const localUrl = new URL(route.request().url());
    localUrl.protocol = "http:";
    const response = await route.fetch({ url: localUrl.href });
    await route.fulfill({ response });
  });
}

function watchBrowserErrors(page, surfaceLabel, engineLabel) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${surfaceLabel} page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${surfaceLabel} console error: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    errors.push(
      `${surfaceLabel} failed request: ${request.method()} ${request.url()} (${request.failure()?.errorText || "unknown error"})`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${surfaceLabel} HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
    }
  });
  return () => {
    assert(errors.length === 0, `${engineLabel} browser errors:\n${errors.join("\n")}`);
  };
}

function normalizeAccessibleText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertComputedAccessibleName(page, locator, role, expectedName, context, exact = true) {
  assert(await locator.count() === 1, `${context}: expected one target element.`);
  assert(await locator.getAttribute("aria-label") === null, `${context}: aria-label must not override rendered content.`);

  const expected = normalizeAccessibleText(expectedName);
  const name = exact
    ? expected
    : new RegExp(escapeRegExp(expected).replace(/ /g, "\\s+"), "i");
  const namedLocator = locator.and(page.getByRole(role, { name, exact }));
  assert(await namedLocator.count() === 1, `${context}: computed accessible name did not match rendered content: ${expected}.`);
}

async function verifyAccessibleNames(page, surface) {
  if (surface.key === "gallery") {
    const filters = page.locator("#galleryFilters .gallery-filter");
    for (let index = 0; index < await filters.count(); index += 1) {
      const filter = filters.nth(index);
      await assertComputedAccessibleName(
        page,
        filter,
        "button",
        await filter.textContent(),
        `Gallery filter ${index + 1}`,
      );
    }
    return;
  }

  const brandName = "Mōchirīī Asia Pacific Guild";
  await assertComputedAccessibleName(
    page,
    page.locator("#site-header .header-wrap > .brand"),
    "link",
    brandName,
    "Desktop header brand",
  );
  await assertComputedAccessibleName(
    page,
    page.locator(".footer-brand-link"),
    "link",
    brandName,
    "Footer brand",
  );

  const featured = page.locator("#featuredBulletin");
  await assertComputedAccessibleName(
    page,
    featured,
    "link",
    await featured.innerText(),
    "Featured bulletin",
    false,
  );

  await page.locator("#menu-btn").click();
  await page.locator("#mobile-menu").waitFor({ state: "visible" });
  await assertComputedAccessibleName(
    page,
    page.locator("#mobile-menu .brand--mobile"),
    "link",
    brandName,
    "Mobile header brand",
  );
  await page.locator('#mobile-menu [aria-label="Close menu"]').click();
  await page.locator("#mobile-menu").waitFor({ state: "hidden" });
}

async function triggerSignature(page, surface) {
  return page.locator(surface.trigger).evaluateAll((elements) =>
    elements
      .map((element) => {
        const image = element.querySelector("img");
        return element.getAttribute("data-full") || image?.getAttribute("data-full") || "";
      })
      .join("|"),
  );
}

async function waitForStableTriggers(page, surface) {
  let previous = "";
  let stablePolls = 0;

  for (let poll = 0; poll < 60; poll += 1) {
    const signature = await triggerSignature(page, surface);
    if (signature && signature === previous) stablePolls += 1;
    else stablePolls = 0;

    if (stablePolls >= 3) return;
    previous = signature;
    await page.waitForTimeout(100);
  }

  throw new Error(`${surface.label}: trigger sources did not settle after hydration.`);
}

async function selectLandscapeTriggerIndex(page, surface) {
  const triggers = page.locator(surface.trigger);
  const count = await triggers.count();

  for (let index = 0; index < count; index += 1) {
    const image = triggers.nth(index).locator("img").first();
    if (await image.count() === 0) continue;

    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => new Promise((resolve) => {
      if (element.complete && element.naturalWidth > 0) {
        resolve();
        return;
      }

      const finish = () => resolve();
      element.addEventListener("load", finish, { once: true });
      element.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 5_000);
    }));

    const dimensions = await image.evaluate((element) => ({
      width: element.naturalWidth,
      height: element.naturalHeight,
    }));
    if (dimensions.width > dimensions.height) return index;
  }

  throw new Error(`${surface.label}: no loaded live landscape image is available for the lightbox contract.`);
}

async function waitForImage(page, surface) {
  await page.waitForFunction(
    (selector) => {
      const image = document.querySelector(selector);
      return image instanceof HTMLImageElement
        && image.complete
        && image.naturalWidth > 0
        && image.naturalHeight > 0;
    },
    surface.image,
  );
  await page.locator(surface.image).evaluate(async (image) => {
    if (typeof image.decode === "function") await image.decode();
  });
}

async function waitForOpen(page, surface) {
  await page.waitForSelector(surface.dialog, { state: "visible" });
  await waitForImage(page, surface);
  await page.waitForFunction(
    (selector) => document.activeElement === document.querySelector(selector),
    surface.close,
  );
}

async function waitForProbeClosed(page, surface) {
  await page.waitForFunction(
    (selector) => {
      const dialog = document.querySelector(selector);
      return !dialog
        || dialog.hidden
        || dialog.getAttribute("aria-hidden") === "true"
        || getComputedStyle(dialog).display === "none";
    },
    surface.dialog,
  );
  await page.waitForFunction(
    () => document.body.style.overflow !== "hidden" && document.body.style.position !== "fixed",
  );
}

async function waitUntilInteractive(page, surface) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (await page.locator(surface.dialog).isVisible().catch(() => false)) {
      await waitForOpen(page, surface);
      await page.keyboard.press("Escape");
      await waitForProbeClosed(page, surface);
      return;
    }

    const trigger = page.locator(surface.trigger).first();
    await trigger.evaluate((element, marker) => element.setAttribute(marker, "true"), triggerMarker);
    await trigger.focus();
    await trigger.click();

    try {
      await page.waitForSelector(surface.dialog, { state: "visible", timeout: 2_000 });
      await waitForOpen(page, surface);
      await page.keyboard.press("Escape");
      await waitForProbeClosed(page, surface);
      return;
    } catch {
      await page.waitForTimeout(100);
    }
  }

  throw new Error(`${surface.label}: controls never became interactive after hydration.`);
}

async function prepareSurfacePage(context, surface, engineLabel, resolvedBaseUrl = baseUrl) {
  const page = await context.newPage();
  const assertNoBrowserErrors = watchBrowserErrors(page, surface.label, engineLabel);
  const approvedFeedRequest = surface.key === "gallery"
    ? page.waitForRequest((request) =>
        new URL(request.url()).pathname.endsWith("/functions/v1/list-approved-gallery-submissions"),
      )
    : null;
  await page.goto(`${resolvedBaseUrl}${surface.path}`, { waitUntil: "domcontentloaded" });
  if (approvedFeedRequest) await approvedFeedRequest;
  await page.waitForFunction(
    ({ selector, minimum }) => document.querySelectorAll(selector).length >= minimum,
    { selector: surface.trigger, minimum: surface.minimumTriggers },
  );
  await waitUntilInteractive(page, surface);
  await waitForStableTriggers(page, surface);
  await verifyAccessibleNames(page, surface);
  const triggerIndex = await selectLandscapeTriggerIndex(page, surface);
  return { page, surface, triggerIndex, assertNoBrowserErrors };
}

async function bodyState(page) {
  return page.evaluate(() => ({
    scrollY: window.scrollY,
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    paddingRight: document.body.style.paddingRight,
  }));
}

async function waitForScrollSettled(page) {
  let previous = await page.evaluate(() => window.scrollY);
  let stablePolls = 0;

  for (let poll = 0; poll < 40; poll += 1) {
    await page.waitForTimeout(50);
    const current = await page.evaluate(() => window.scrollY);
    if (Math.abs(current - previous) <= 0.5) stablePolls += 1;
    else stablePolls = 0;
    if (stablePolls >= 3) return;
    previous = current;
  }

  throw new Error("Page scroll did not settle before the lightbox opened.");
}

async function positionTriggerAtNonzeroScroll(page, surface, triggerIndex) {
  const target = await page.locator(surface.trigger).nth(triggerIndex).evaluate((trigger) => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    const rect = trigger.getBoundingClientRect();
    const absoluteCenter = window.scrollY + rect.top + rect.height / 2;
    const maximum = Math.max(0, root.scrollHeight - window.innerHeight);
    const next = Math.min(maximum, Math.max(1, absoluteCenter - window.innerHeight / 2));
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, next);
    root.style.scrollBehavior = previousScrollBehavior;
    return next;
  });

  assert(target > 0, `${surface.label}: page is not tall enough to exercise nonzero scroll restoration.`);
  await waitForScrollSettled(page);
}

async function selectedTriggerState(page, surface, triggerIndex = 0) {
  const trigger = page.locator(surface.trigger).nth(triggerIndex);
  await page.locator(`[${triggerMarker}]`).evaluateAll((elements, marker) => {
    elements.forEach((element) => element.removeAttribute(marker));
  }, triggerMarker);
  await trigger.evaluate((element, marker) => element.setAttribute(marker, "true"), triggerMarker);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await waitForScrollSettled(page);

  const source = await trigger.evaluate((element) => {
    const image = element.querySelector("img");
    const full = element.getAttribute("data-full") || image?.getAttribute("data-full") || "";
    const thumbnail = image?.getAttribute("src") || "";
    const resolve = (value) => value ? new URL(value, document.baseURI).href : "";
    return { full: resolve(full), thumbnail: resolve(thumbnail) };
  });

  assert(source.full, `${surface.label}: selected trigger is missing its full-image source.`);
  assert(source.thumbnail.includes("/thumbs/"), `${surface.label}: grid image is not a thumbnail.`);
  return { trigger, source, before: await bodyState(page) };
}

async function openFromTrigger(page, surface, method = "keyboard", triggerIndex = 0) {
  const state = await selectedTriggerState(page, surface, triggerIndex);

  if (method === "keyboard") await page.keyboard.press("Enter");
  else if (method === "touch") await state.trigger.tap();
  else await state.trigger.click();

  await waitForOpen(page, surface);
  state.before.triggerScrollY = state.before.scrollY;
  state.before.scrollY = await page.evaluate(() => {
    const lockedTop = Number.parseFloat(document.body.style.top);
    return Number.isFinite(lockedTop) ? Math.abs(lockedTop) : window.scrollY;
  });
  return state;
}

async function waitForClosed(page, surface, before, context = surface.label) {
  const argumentsForPage = { selector: surface.dialog, marker: triggerMarker, previous: before };
  const readRestorationState = ({ selector, marker, previous }) => {
    const dialog = document.querySelector(selector);
    const style = document.body.style;
    const actualBody = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      paddingRight: style.paddingRight,
    };
    const closed = !dialog
      || dialog.hidden
      || dialog.getAttribute("aria-hidden") === "true"
      || getComputedStyle(dialog).display === "none";
    const bodyRestored = Object.keys(actualBody).every((key) => actualBody[key] === previous[key]);
    const focusRestored = document.activeElement?.getAttribute(marker) === "true";
    const scrollRestored = Math.abs(window.scrollY - previous.scrollY) <= 1;
    return {
      ready: closed && bodyRestored && focusRestored && scrollRestored,
      closed,
      bodyRestored,
      focusRestored,
      scrollRestored,
      actualBody,
      expectedScrollY: previous.scrollY,
      actualScrollY: window.scrollY,
      activeElement: document.activeElement?.outerHTML || "",
    };
  };

  try {
    await page.waitForFunction(
      ({ selector, marker, previous }) => {
        const dialog = document.querySelector(selector);
        const style = document.body.style;
        const closed = !dialog
          || dialog.hidden
          || dialog.getAttribute("aria-hidden") === "true"
          || getComputedStyle(dialog).display === "none";
        const bodyRestored = style.overflow === previous.overflow
          && style.position === previous.position
          && style.top === previous.top
          && style.left === previous.left
          && style.right === previous.right
          && style.paddingRight === previous.paddingRight;
        const focusRestored = document.activeElement?.getAttribute(marker) === "true";
        const scrollRestored = Math.abs(window.scrollY - previous.scrollY) <= 1;
        return closed && bodyRestored && focusRestored && scrollRestored;
      },
      argumentsForPage,
    );
  } catch (error) {
    const state = await page.evaluate(readRestorationState, argumentsForPage);
    throw new Error(`${context}: close restoration timed out: ${JSON.stringify(state)}. ${error.message}`);
  }
}

async function measure(page, surface) {
  return page.evaluate((selectors) => {
    const dialog = document.querySelector(selectors.dialog);
    const shell = document.querySelector(selectors.shell);
    const card = document.querySelector(selectors.card);
    const image = document.querySelector(selectors.image);
    const caption = document.querySelector(selectors.caption);
    const close = document.querySelector(selectors.close);

    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
        width: box.width,
        height: box.height,
      };
    };

    const dialogStyle = getComputedStyle(dialog);
    const shellStyle = getComputedStyle(shell);
    const cardStyle = getComputedStyle(card);
    const imageStyle = getComputedStyle(image);
    const closeStyle = getComputedStyle(close);

    return {
      viewport: { width: innerWidth, height: innerHeight },
      dialog: rect(dialog),
      card: {
        ...rect(card),
        clientWidth: card.clientWidth,
        clientHeight: card.clientHeight,
        scrollWidth: card.scrollWidth,
        scrollHeight: card.scrollHeight,
        padding: {
          top: Number.parseFloat(cardStyle.paddingTop) || 0,
          right: Number.parseFloat(cardStyle.paddingRight) || 0,
          bottom: Number.parseFloat(cardStyle.paddingBottom) || 0,
          left: Number.parseFloat(cardStyle.paddingLeft) || 0,
        },
      },
      image: rect(image),
      caption: {
        ...rect(caption),
        clientWidth: caption.clientWidth,
        scrollWidth: caption.scrollWidth,
      },
      close: rect(close),
      natural: { width: image.naturalWidth, height: image.naturalHeight },
      semantics: {
        role: dialog.getAttribute("role"),
        ariaModal: dialog.getAttribute("aria-modal"),
      },
      contract: {
        dialogPadding: [
          dialogStyle.paddingTop,
          dialogStyle.paddingRight,
          dialogStyle.paddingBottom,
          dialogStyle.paddingLeft,
        ],
        shellPadding: [
          shellStyle.paddingTop,
          shellStyle.paddingRight,
          shellStyle.paddingBottom,
          shellStyle.paddingLeft,
        ],
        cardMaxWidth: cardStyle.maxWidth,
        cardMaxHeight: cardStyle.maxHeight,
        cardOverflowX: cardStyle.overflowX,
        cardOverflowY: cardStyle.overflowY,
        cardOverscrollBehavior: cardStyle.getPropertyValue("overscroll-behavior"),
        cardOverscrollBehaviorSupported: CSS.supports("overscroll-behavior", "contain"),
        imageMaxWidth: imageStyle.maxWidth,
        imageMaxHeight: imageStyle.maxHeight,
        imageObjectFit: imageStyle.objectFit,
        imageFlexShrink: imageStyle.flexShrink,
        closeWidth: closeStyle.width,
        closeHeight: closeStyle.height,
      },
      body: {
        overflow: getComputedStyle(document.body).overflow,
        position: document.body.style.position,
      },
      pageScrollWidth: document.documentElement.scrollWidth,
      imageSource: image.currentSrc || image.src || "",
    };
  }, surface);
}

function assertGeometry(engineLabel, surface, viewport, state) {
  const context = `${engineLabel} ${surface.label} at ${viewport.width}x${viewport.height}`;
  const { card, caption, close, dialog, image, natural, contract } = state;

  assert(Math.abs(dialog.left) <= geometryTolerance, `${context}: overlay does not start at the left viewport edge.`);
  assert(Math.abs(dialog.top) <= geometryTolerance, `${context}: overlay does not start at the top viewport edge.`);
  assert(Math.abs(dialog.width - viewport.width) <= geometryTolerance, `${context}: overlay width differs from the viewport.`);
  assert(Math.abs(dialog.height - viewport.height) <= geometryTolerance, `${context}: overlay height differs from the viewport.`);

  assert(within(card.left, 0, viewport.width), `${context}: card starts outside the viewport.`);
  assert(within(card.right, 0, viewport.width), `${context}: card ends outside the viewport.`);
  assert(within(card.top, 0, viewport.height), `${context}: card starts outside the viewport height.`);
  assert(within(card.bottom, 0, viewport.height), `${context}: card ends outside the viewport height.`);
  assert(card.width <= 1160 + geometryTolerance, `${context}: card exceeded the 1160px cap.`);
  assert(card.scrollWidth <= card.clientWidth + geometryTolerance, `${context}: card has horizontal overflow.`);

  assert(image.width > 0 && image.height > 0, `${context}: image collapsed to zero size.`);
  assert(within(image.left, card.left, card.right), `${context}: image starts outside the card.`);
  assert(within(image.right, card.left, card.right), `${context}: image ends outside the card.`);
  assert(within(image.top, card.top, card.bottom), `${context}: image starts outside the card height.`);
  assert(within(image.bottom, card.top, card.bottom), `${context}: image ends outside the card height.`);
  assert(contract.imageObjectFit === "contain", `${context}: expected object-fit contain.`);
  assert(contract.imageFlexShrink === "0", `${context}: image is allowed to collapse under flex pressure.`);
  assert(contract.cardOverflowX === "hidden", `${context}: horizontal card overflow is not contained.`);
  assert(contract.cardOverflowY === "auto", `${context}: vertical card overflow is not scrollable.`);
  assert(
    !contract.cardOverscrollBehaviorSupported || contract.cardOverscrollBehavior.includes("contain"),
    `${context}: card overscroll is not contained in an engine that supports overscroll-behavior.`,
  );
  assert(contract.cardMaxWidth === "100%", `${context}: expected card max-width 100%.`);
  assert(contract.imageMaxWidth === "100%", `${context}: expected image max-width 100%.`);

  const renderedRatio = image.width / image.height;
  const naturalRatio = natural.width / natural.height;
  assert(
    Math.abs(renderedRatio - naturalRatio) / naturalRatio < 0.005,
    `${context}: rendered ratio ${renderedRatio.toFixed(4)} differs from natural ratio ${naturalRatio.toFixed(4)}.`,
  );

  const availableWidth = card.clientWidth - card.padding.left - card.padding.right;
  const imageMaxHeight = Number.parseFloat(contract.imageMaxHeight);
  assert(Number.isFinite(imageMaxHeight), `${context}: image max-height did not resolve to pixels.`);
  const expectedScale = Math.min(1, availableWidth / natural.width, imageMaxHeight / natural.height);
  const expectedWidth = natural.width * expectedScale;
  const expectedHeight = natural.height * expectedScale;
  assert(
    Math.abs(image.width - expectedWidth) <= 2.5 && Math.abs(image.height - expectedHeight) <= 2.5,
    `${context}: image did not reach its intended contain size (${image.width.toFixed(1)}x${image.height.toFixed(1)} vs ${expectedWidth.toFixed(1)}x${expectedHeight.toFixed(1)}).`,
  );

  assert(caption.scrollWidth <= caption.clientWidth + geometryTolerance, `${context}: caption has horizontal overflow.`);
  assert(within(caption.left, card.left, card.right), `${context}: caption starts outside the card.`);
  assert(within(caption.right, card.left, card.right), `${context}: caption ends outside the card.`);
  assert(
    close.width >= 44 - geometryTolerance && close.height >= 44 - geometryTolerance,
    `${context}: close target is smaller than the 44x44px CSS contract (${close.width.toFixed(2)}x${close.height.toFixed(2)}).`,
  );
  assert(within(close.left, 0, viewport.width), `${context}: close target starts outside the viewport.`);
  assert(within(close.right, 0, viewport.width), `${context}: close target ends outside the viewport.`);
  assert(within(close.top, 0, viewport.height), `${context}: close target starts outside the viewport height.`);
  assert(within(close.bottom, 0, viewport.height), `${context}: close target ends outside the viewport height.`);
  const overlapWidth = Math.max(0, Math.min(close.right, image.right) - Math.max(close.left, image.left));
  const overlapHeight = Math.max(0, Math.min(close.bottom, image.bottom) - Math.max(close.top, image.top));
  assert(overlapWidth * overlapHeight <= 0.5, `${context}: close target overlaps the image.`);
  assert(state.semantics.role === "dialog", `${context}: dialog role is missing.`);
  assert(state.semantics.ariaModal === "true", `${context}: aria-modal is not true.`);
  assert(state.body.overflow === "hidden", `${context}: body scroll was not locked.`);
  assert(state.body.position === "fixed", `${context}: body position was not fixed during scroll lock.`);
  assert(state.pageScrollWidth <= viewport.width + geometryTolerance, `${context}: page has horizontal overflow.`);
}

async function assertCaptionReachable(page, surface, context) {
  const result = await page.evaluate(({ cardSelector, captionSelector }) => {
    const card = document.querySelector(cardSelector);
    const caption = document.querySelector(captionSelector);

    card.scrollTop = 0;
    const initialCardRect = card.getBoundingClientRect();
    const initialCaptionRect = caption.getBoundingClientRect();
    card.scrollTop = Math.max(0, initialCaptionRect.top - initialCardRect.top);
    const startCardRect = card.getBoundingClientRect();
    const startCaptionRect = caption.getBoundingClientRect();
    const startReachable = startCaptionRect.top >= startCardRect.top - 1
      && startCaptionRect.top <= startCardRect.bottom + 1;

    card.scrollTop = card.scrollHeight;
    const endCardRect = card.getBoundingClientRect();
    const endCaptionRect = caption.getBoundingClientRect();
    const endReachable = endCaptionRect.bottom <= endCardRect.bottom + 1
      && endCaptionRect.bottom >= endCardRect.top - 1;
    card.scrollTop = 0;
    return {
      reachable: startReachable && endReachable,
      startReachable,
      endReachable,
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
    };
  }, { cardSelector: surface.card, captionSelector: surface.caption });

  assert(
    result.reachable,
    `${context}: caption cannot be reached by vertical scrolling (start=${result.startReachable}, end=${result.endReachable}).`,
  );
  return result;
}

async function assertKeyboardCaptionScroll(page, surface, context) {
  const card = page.locator(surface.card);
  await card.evaluate((element) => {
    element.scrollTop = 0;
  });
  await card.focus();
  assert(
    await card.evaluate((element) => document.activeElement === element),
    `${context}: scrollable image card is not keyboard focusable.`,
  );

  await page.keyboard.press("PageDown");
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.scrollTop > 0,
    surface.card,
  );
  const pageDownScrollTop = await card.evaluate((element) => element.scrollTop);
  assert(pageDownScrollTop > 0, `${context}: PageDown did not scroll the focused image card.`);

  await page.keyboard.press("End");
  await page.waitForFunction(
    (selector) => {
      const element = document.querySelector(selector);
      return element && element.scrollTop >= element.scrollHeight - element.clientHeight - 2;
    },
    surface.card,
  );
  const endState = await card.evaluate((element) => ({
    scrollTop: element.scrollTop,
    maximum: element.scrollHeight - element.clientHeight,
  }));
  assert(
    endState.scrollTop >= endState.maximum - 2,
    `${context}: End did not make the full caption keyboard reachable.`,
  );
}

function assertSameContract(engineLabel, viewport, homeState, galleryState) {
  const context = `${engineLabel} at ${viewport.width}x${viewport.height}`;
  assert(
    Math.abs(homeState.card.width - galleryState.card.width) <= geometryTolerance,
    `${context}: Home and Gallery card widths diverged (${homeState.card.width}px vs ${galleryState.card.width}px).`,
  );

  for (const property of Object.keys(homeState.contract)) {
    const homeValue = JSON.stringify(homeState.contract[property]);
    const galleryValue = JSON.stringify(galleryState.contract[property]);
    assert(homeValue === galleryValue, `${context}: shared ${property} contract diverged (${homeValue} vs ${galleryValue}).`);
  }
}

function syntheticImageSource(width, height) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#203040"/></svg>`,
  )}`;
}

async function setSyntheticImage(page, surface, width, height) {
  const source = syntheticImageSource(width, height);
  await page.locator(surface.image).evaluate((image, nextSource) => {
    image.src = nextSource;
  }, source);
  await page.waitForFunction(
    ({ selector, expectedWidth, expectedHeight }) => {
      const image = document.querySelector(selector);
      return image instanceof HTMLImageElement
        && image.complete
        && image.naturalWidth === expectedWidth
        && image.naturalHeight === expectedHeight;
    },
    { selector: surface.image, expectedWidth: width, expectedHeight: height },
  );
}

async function verifySyntheticShapes(page, engineLabel, surface, viewport) {
  const shapes = [
    { label: "portrait", width: 600, height: 900 },
    { label: "square", width: 800, height: 800 },
  ];

  for (const shape of shapes) {
    await setSyntheticImage(page, surface, shape.width, shape.height);
    const state = await measure(page, surface);
    const fixtureSurface = { ...surface, label: `${surface.label} ${shape.label} fixture` };
    assertGeometry(engineLabel, fixtureSurface, viewport, state);
    await assertCaptionReachable(
      page,
      surface,
      `${engineLabel} ${fixtureSurface.label} at ${viewport.width}x${viewport.height}`,
    );
  }
}

async function verifyLongCaption(page, engineLabel, surface, viewport) {
  const style = await page.addStyleTag({ content: ":root{font-size:200% !important;}" });
  const longCaption = "A deliberately long descriptive caption verifies that enlarged text and narrow viewports do not clip important guild image context or force horizontal scrolling. ".repeat(4);

  try {
    await setSyntheticImage(page, surface, 600, 900);
    await page.locator(surface.caption).evaluate((caption, text) => {
      caption.textContent = text;
    }, longCaption);
    const state = await measure(page, surface);
    const fixtureSurface = { ...surface, label: `${surface.label} long-caption fixture` };
    assertGeometry(engineLabel, fixtureSurface, viewport, state);
    const scrollState = await assertCaptionReachable(
      page,
      surface,
      `${engineLabel} ${fixtureSurface.label} at ${viewport.width}x${viewport.height}`,
    );
    assert(
      scrollState.scrollHeight > scrollState.clientHeight,
      `${engineLabel} ${fixtureSurface.label}: stress fixture did not exercise vertical scrolling.`,
    );
    await assertKeyboardCaptionScroll(
      page,
      surface,
      `${engineLabel} ${fixtureSurface.label} at ${viewport.width}x${viewport.height}`,
    );
  } finally {
    await style.evaluate((element) => element.remove());
  }
}

async function verifyFocusTrap(page, surface, context) {
  await page.keyboard.press("Tab");
  assert(
    await page.locator(surface.card).evaluate((element) => document.activeElement === element),
    `${context}: Tab did not reach the keyboard-scrollable image card.`,
  );
  await page.keyboard.press("Tab");
  assert(
    await page.locator(surface.close).evaluate((element) => document.activeElement === element),
    `${context}: forward Tab escaped the dialog.`,
  );
  await page.keyboard.press("Shift+Tab");
  assert(
    await page.locator(surface.card).evaluate((element) => document.activeElement === element),
    `${context}: reverse Tab did not reach the keyboard-scrollable image card.`,
  );
  await page.keyboard.press("Shift+Tab");
  assert(
    await page.locator(surface.close).evaluate((element) => document.activeElement === element),
    `${context}: reverse Tab escaped the dialog.`,
  );
}

async function closeWithEscape(page, surface, opened, context) {
  await page.keyboard.press("Escape");
  await waitForClosed(page, surface, opened.before, `${context} Escape close`);
}

async function verifyAlternativeClosures(page, surface, context, triggerIndex) {
  const backdropOpen = await openFromTrigger(page, surface, "pointer", triggerIndex);
  await page.locator(surface.backdrop).click({ position: { x: 4, y: 4 } });
  await waitForClosed(page, surface, backdropOpen.before, `${context} backdrop close`);

  const buttonOpen = await openFromTrigger(page, surface, "pointer", triggerIndex);
  await page.locator(surface.close).click();
  await waitForClosed(page, surface, buttonOpen.before, `${context} close button`);
  console.log(`${context}: Escape, backdrop, and close-button behavior OK.`);
}

async function captureScreenshot(page, engine, surface, viewport) {
  if (engine.key !== "chromium" || !screenshotViewportLabels.has(viewport.label)) return;
  await mkdir(screenshotDirectory, { recursive: true });
  const fileName = `${surface.key}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: path.join(screenshotDirectory, fileName) });
}

async function verifyEngine(engine) {
  let browser;
  try {
    browser = await engine.launcher.launch({ headless: true });
  } catch (error) {
    throw new Error(`${engine.label} could not launch. Run npm run setup:playwright. ${error.message}`);
  }

  const viewports = engineViewports(engine);
  const context = await browser.newContext({ viewport: viewportSize(viewports[0]) });
  const resolvedBaseUrl = navigationBaseUrl(engine);
  await bridgeWebKitLocalHttps(context, resolvedBaseUrl);
  await stubVercelAnalyticsScripts(context, resolvedBaseUrl);
  await stubEmptyApprovedGalleryFeed(context);

  try {
    const prepared = [];
    const selectedSources = new Map();
    for (const surface of surfaces) {
      prepared.push(await prepareSurfacePage(context, surface, engine.label, resolvedBaseUrl));
    }

    for (const viewport of viewports) {
      await Promise.all(prepared.map(({ page }) => page.setViewportSize(viewportSize(viewport))));
      const states = [];

      for (const entry of prepared) {
        const { page, surface, triggerIndex } = entry;
        const interactionViewport = interactionViewportLabels.has(viewport.label);
        if (interactionViewport) {
          await positionTriggerAtNonzeroScroll(page, surface, triggerIndex);
        }

        const opened = await openFromTrigger(page, surface, "keyboard", triggerIndex);
        const selectedSource = selectedSources.get(surface.key);
        if (selectedSource) {
          assert(
            opened.source.full === selectedSource,
            `${engine.label} ${surface.label}: selected image changed during the viewport matrix.`,
          );
        } else {
          selectedSources.set(surface.key, opened.source.full);
        }
        if (interactionViewport) {
          assert(
            opened.before.scrollY > 0,
            `${engine.label} ${surface.label} at ${viewport.width}x${viewport.height}: scroll restoration fixture did not start from a nonzero scroll position.`,
          );
        }
        const state = await measure(page, surface);
        assertGeometry(engine.label, surface, viewport, state);
        assert(
          state.natural.width > state.natural.height,
          `${engine.label} ${surface.label}: selected live image is not landscape (${state.natural.width}x${state.natural.height}).`,
        );
        await assertCaptionReachable(
          page,
          surface,
          `${engine.label} ${surface.label} at ${viewport.width}x${viewport.height}`,
        );
        assert(
          state.imageSource === opened.source.full,
          `${engine.label} ${surface.label}: expected ${opened.source.full}, got ${state.imageSource}.`,
        );
        assert(!state.imageSource.includes("/thumbs/"), `${engine.label} ${surface.label}: lightbox rendered a thumbnail.`);

        if (interactionViewport) {
          await verifyFocusTrap(
            page,
            surface,
            `${engine.label} ${surface.label} at ${viewport.width}x${viewport.height}`,
          );
        }

        await captureScreenshot(page, engine, surface, viewport);

        if (syntheticShapeViewportLabels.has(viewport.label)) {
          await verifySyntheticShapes(page, engine.label, surface, viewport);
        }
        if (longCaptionViewportLabels.has(viewport.label)) {
          await verifyLongCaption(page, engine.label, surface, viewport);
        }

        await closeWithEscape(
          page,
          surface,
          opened,
          `${engine.label} ${surface.label} at ${viewport.width}x${viewport.height}`,
        );

        if (interactionViewport) {
          await verifyAlternativeClosures(
            page,
            surface,
            `${engine.label} ${surface.label} at ${viewport.width}x${viewport.height}`,
            triggerIndex,
          );
        }

        states.push(state);
      }

      assertSameContract(engine.label, viewport, states[0], states[1]);
      console.log(`${engine.label} lightbox viewport OK: ${viewport.label} (${viewport.width}x${viewport.height}).`);
    }

    prepared.forEach(({ assertNoBrowserErrors }) => assertNoBrowserErrors());
  } finally {
    await context.close();
    await browser.close();
  }
}

async function verifyTouch(browser) {
  const context = await browser.newContext({
    viewport: viewportSize(touchViewports[0]),
    hasTouch: true,
    isMobile: true,
  });
  await stubVercelAnalyticsScripts(context);
  await stubEmptyApprovedGalleryFeed(context);

  try {
    const prepared = [];
    for (const surface of surfaces) {
      prepared.push(await prepareSurfacePage(context, surface, "Chromium touch"));
    }

    for (const viewport of touchViewports) {
      await Promise.all(prepared.map(({ page }) => page.setViewportSize(viewportSize(viewport))));

      for (const { page, surface, triggerIndex } of prepared) {
        const opened = await openFromTrigger(page, surface, "touch", triggerIndex);
        const state = await measure(page, surface);
        assertGeometry("Chromium touch", surface, viewport, state);
        assert(
          state.natural.width > state.natural.height,
          `Chromium touch ${surface.label}: selected live image is not landscape (${state.natural.width}x${state.natural.height}).`,
        );
        await page.locator(surface.close).tap();
        await waitForClosed(
          page,
          surface,
          opened.before,
          `Chromium touch ${surface.label} at ${viewport.width}x${viewport.height} close button`,
        );
      }

      console.log(`Chromium touch lightbox OK: ${viewport.label} (${viewport.width}x${viewport.height}).`);
    }

    prepared.forEach(({ assertNoBrowserErrors }) => assertNoBrowserErrors());
  } finally {
    await context.close();
  }
}

for (const engine of engines) {
  await verifyEngine(engine);
}

let touchBrowser;
try {
  touchBrowser = await playwright.chromium.launch({ headless: true });
  await verifyTouch(touchBrowser);
} finally {
  await touchBrowser?.close();
}

console.log(
  `Universal Home/Gallery lightbox smoke OK across ${viewportMatrix.length} Chromium viewports, representative Firefox/WebKit viewports, and touch orientations.`,
);
