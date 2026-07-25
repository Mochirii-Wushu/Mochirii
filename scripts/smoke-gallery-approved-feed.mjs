import { readFile } from "node:fs/promises";

const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:8765").replace(/\/+$/, "");
const galleryDataUrl = new URL("../apps/web/public/data/gallery.json", import.meta.url);
const galleryData = JSON.parse(await readFile(galleryDataUrl, "utf8"));
const staticItems = (Array.isArray(galleryData?.albums) ? galleryData.albums : []).flatMap((album) =>
  Array.isArray(album?.items) ? album.items : [],
);

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is required for this optional smoke test.");
  console.error("Start a local server, then run this in an environment with Playwright available.");
  process.exit(1);
}

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getCategories = (item) => {
  const values = Array.isArray(item?.categories) && item.categories.length ? item.categories : [item?.category];
  return [...new Set(values.map(normalizeSlug).filter(Boolean))];
};

const text = (value, fallback = "") => {
  const clean = String(value ?? "").trim();
  return clean || fallback;
};

const sortTime = (item) => {
  const time = Date.parse(text(item?.galleryAddedAt));
  return Number.isFinite(time) ? time : 0;
};

const extractNumericSequence = (value) => {
  const clean = text(value);
  if (!clean) return null;

  const named = clean.match(/(?:^|[\\/_-])(?:shot|image|img)[-_]?(\d+)(?=$|[.\\/_-])/i);
  if (named) return Number.parseInt(named[1], 10);

  const matches = [...clean.matchAll(/(\d+)/g)];
  const fallback = matches.at(-1)?.[1];
  return fallback ? Number.parseInt(fallback, 10) : null;
};

const stableSequence = (item, originalIndex) => {
  for (const candidate of [item?.id, item?.full, item?.src, item?.thumb]) {
    const sequence = extractNumericSequence(candidate);
    if (sequence !== null && Number.isFinite(sequence)) return sequence;
  }

  return originalIndex + 1;
};

const stableKey = (item, originalIndex) =>
  text(item?.id || item?.full || item?.src || item?.thumb, `gallery-${originalIndex}`);

const orderItems = (items, mode) =>
  items
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      sortTimestamp: sortTime(item),
      stableKey: stableKey(item, originalIndex),
      stableSequence: stableSequence(item, originalIndex),
    }))
    .sort((a, b) => {
      const direction = mode === "newest" ? -1 : 1;
      const timeDelta = a.sortTimestamp - b.sortTimestamp;
      if (timeDelta !== 0) return direction * timeDelta;

      const sequenceDelta = a.stableSequence - b.stableSequence;
      if (sequenceDelta !== 0) return direction * sequenceDelta;

      const indexDelta = a.originalIndex - b.originalIndex;
      if (indexDelta !== 0) return direction * indexDelta;

      return a.stableKey.localeCompare(b.stableKey);
    })
    .map(({ item }) => item);

const publicPath = (value) => {
  const raw = text(value);
  if (!raw) return "";
  if (/^(https?:|\/)/i.test(raw)) return raw;
  if (raw.startsWith("./")) return `/${raw.slice(2)}`;
  return `/${raw}`;
};

const fullPath = (item) => publicPath(item?.full || item?.src);
const staticTotal = staticItems.length;
const portraitsTotal = staticItems.filter((item) => getCategories(item).includes("portraits")).length;
const galleryBatchSize = 24;
const initialStaticCount = Math.min(staticTotal, galleryBatchSize);
const initialPortraitsCount = Math.min(portraitsTotal, galleryBatchSize);
const newestFirst = fullPath(orderItems(staticItems, "newest")[0]);
const oldestFirst = fullPath(orderItems(staticItems, "oldest")[0]);

const mockSignedUrl = `${baseUrl}/assets/img/gallery/shot-01.webp?mockSignedUrl=approved-member`;
const mockApprovedTitle = "Approved Smoke Submission";
const mockApprovedCaption = "Shared from smoke automation";
const mockUploader = "QA Member";
const mockGalleryBackend = [
  {
    id: "approved-smoke-submission",
    status: "approved",
    signed_url: mockSignedUrl,
    title: mockApprovedTitle,
    caption: mockApprovedCaption,
    category: "portraits",
    uploader_display_name: mockUploader,
    created_at: "2030-01-02T03:04:05.000Z",
    reviewed_at: "2030-01-02T04:04:05.000Z",
  },
  {
    id: "pending-smoke-submission",
    status: "pending",
    signed_url: "pending-should-not-render",
    title: "Pending Should Not Render",
    caption: "Pending hidden caption",
    category: "portraits",
    created_at: "2030-01-03T03:04:05.000Z",
  },
  {
    id: "rejected-smoke-submission",
    status: "rejected",
    signed_url: "rejected-should-not-render",
    title: "Rejected Should Not Render",
    caption: "Rejected hidden caption",
    category: "portraits",
    created_at: "2030-01-04T03:04:05.000Z",
  },
];

const approvedSubmissions = mockGalleryBackend
  .filter((submission) => submission.status === "approved")
  .map(({ status: _status, ...submission }) => submission);

const feedFixtures = {
  empty: {
    ok: true,
    data: { submissions: [] },
    message: "Mock approved feed returned no submissions.",
  },
  success: {
    ok: true,
    data: { submissions: approvedSubmissions },
    message: "Mock approved feed returned approved submissions only.",
  },
  fail: {
    ok: false,
    data: null,
    message: "Mock approved feed failure.",
  },
};
const approvedFeedRoutePattern = "**/functions/v1/list-approved-gallery-submissions*";
const vercelAnalyticsScriptPaths = new Set([
  "/_vercel/insights/script.js",
  "/_vercel/speed-insights/script.js",
]);
const corsHeaders = {
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-origin": "*",
};

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function stubVercelAnalyticsScripts(context) {
  const appOrigin = new URL(baseUrl).origin;
  await context.route(
    (url) => url.origin === appOrigin && vercelAnalyticsScriptPaths.has(url.pathname),
    (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );
}

async function stubApprovedGalleryFeedFixture(page, fixture, feedRequests, onHandled) {
  await page.route(approvedFeedRoutePattern, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }

    feedRequests.push({
      method: request.method(),
      postData: request.postData() || "",
      url: request.url(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify(fixture),
    });
    onHandled();
  });
}

async function prepareContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await stubVercelAnalyticsScripts(context);
  return context;
}

async function newCheckedPage(context, feedMode = null) {
  const page = await context.newPage();
  const errors = [];
  const feedRequests = [];
  let resolveFixture;
  const fixtureHandled = new Promise((resolve) => {
    resolveFixture = resolve;
  });
  const fixture = feedFixtures[feedMode || "empty"];
  assert(fixture, `Unknown approved-feed fixture: ${feedMode}`);

  await stubApprovedGalleryFeedFixture(page, fixture, feedRequests, () => resolveFixture?.());

  page.on("pageerror", (err) => errors.push(`Page error: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`Console error: ${msg.text()}`);
  });
  page.on("requestfailed", (request) => {
    errors.push(
      `Failed request: ${request.method()} ${request.url()} (${request.failure()?.errorText || "unknown error"})`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
    }
  });

  const waitForFeedFixture = async (label) => {
    assert(feedMode, `${label}: no approved-feed fixture was configured.`);

    let timeout;
    try {
      await Promise.race([
        fixtureHandled,
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error(`${label}: approved-feed request timed out.`)), 10000);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }

    assertFeedRequestContract(feedRequests, label);
  };

  return { page, errors, feedRequests, waitForFeedFixture };
}

function assertFeedRequestContract(feedRequests, label) {
  assert(feedRequests.length === 1, `${label}: expected exactly one approved-feed POST, got ${feedRequests.length}.`);
  const [request] = feedRequests;
  assert(request.method === "POST", `${label}: expected approved-feed POST, got ${request.method}.`);
  assert(
    request.url.includes("/functions/v1/list-approved-gallery-submissions"),
    `${label}: unexpected approved-feed URL ${request.url}.`,
  );

  let body;
  try {
    body = JSON.parse(request.postData || "null");
  } catch {
    fail(`${label}: approved-feed request body was not valid JSON.`);
  }
  assert(body && typeof body === "object" && !Array.isArray(body), `${label}: approved-feed request body must be an object.`);
  assert(Object.keys(body).length === 0, `${label}: approved-feed request body must remain empty.`);
}

function normalizeAccessibleText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

async function assertGalleryFilterAccessibleNames(page) {
  const filters = page.locator("#galleryFilters .gallery-filter");
  for (let index = 0; index < await filters.count(); index += 1) {
    const filter = filters.nth(index);
    const expectedName = normalizeAccessibleText(await filter.textContent());
    assert(await filter.getAttribute("aria-label") === null, `Gallery filter ${index + 1} must use rendered content.`);
    assert(
      await filter.and(page.getByRole("button", { name: expectedName, exact: true })).count() === 1,
      `Gallery filter ${index + 1} computed accessible name mismatch: ${expectedName}.`,
    );
  }
}

async function waitForGalleryState(
  page,
  {
    activeCategory,
    expectedFirstFull = "",
    renderedCount,
    sortValue,
    totalCount,
  },
) {
  await page.waitForFunction(
    (expected) => {
      const thumbs = [...document.querySelectorAll("#galleryGrid .gallery-thumb")];
      const filters = [...document.querySelectorAll("#galleryFilters .gallery-filter")];
      const activeFilter = filters.find((filter) => filter.getAttribute("aria-pressed") === "true");
      const allFilter = filters.find((filter) => filter.dataset.category === "all");
      const allCount = Number.parseInt(allFilter?.textContent?.match(/(\d+)(?:\s+images?)?\s*$/)?.[1] || "", 10);
      const firstFull = thumbs[0]?.getAttribute("data-full") || "";
      const sort = document.querySelector("#gallerySort")?.value || "";
      const params = new URLSearchParams(window.location.search);
      const categoryParam = params.get("category") || "";
      const sortParam = params.get("sort") || "";
      const categoryUrlMatches = expected.activeCategory === "all"
        ? categoryParam === ""
        : categoryParam === expected.activeCategory;
      const sortUrlMatches = expected.sortValue === "random"
        ? sortParam === ""
        : sortParam === expected.sortValue;

      return thumbs.length === expected.renderedCount
        && allCount === expected.totalCount
        && sort === expected.sortValue
        && activeFilter?.dataset.category === expected.activeCategory
        && categoryUrlMatches
        && sortUrlMatches
        && (!expected.expectedFirstFull || firstFull === expected.expectedFirstFull);
    },
    { activeCategory, expectedFirstFull, renderedCount, sortValue, totalCount },
  );
  await assertGalleryFilterAccessibleNames(page);
}

async function waitForHomeGallery(page) {
  let previousSignature = "";
  let stablePolls = 0;

  for (let poll = 0; poll < 60; poll += 1) {
    const signature = await page.locator("#galleryGrid .home-thumb img[data-full]").evaluateAll((images) =>
      images.map((image) => `${image.getAttribute("src") || ""}|${image.getAttribute("data-full") || ""}`).join("||"),
    );

    if (signature && signature === previousSignature) stablePolls += 1;
    else stablePolls = 0;

    if (stablePolls >= 3 && signature.split("||").length === 4) return;
    previousSignature = signature;
    await page.waitForTimeout(100);
  }

  fail("Home Gallery Spotlight did not settle after hydration.");
}

async function visibleState(page) {
  return page.evaluate(() => {
    const thumbs = [...document.querySelectorAll("#galleryGrid .gallery-thumb")];
    const filters = [...document.querySelectorAll("#galleryFilters .gallery-filter")];

    return {
      count: thumbs.length,
      countText: document.querySelector("#galleryCount")?.textContent?.trim() || "",
      sortValue: document.querySelector("#gallerySort")?.value || "",
      bodyText: document.body.innerText,
      fulls: thumbs.map((button) => button.getAttribute("data-full") || ""),
      captions: thumbs.map((button) => button.getAttribute("data-caption") || ""),
      imageSrcs: thumbs.map((button) => button.querySelector("img")?.getAttribute("src") || ""),
      imageAlts: thumbs.map((button) => button.querySelector("img")?.getAttribute("alt") || ""),
      filters: filters.map((button) => ({
        slug: button.dataset.category || "",
        text: button.textContent.trim(),
        pressed: button.getAttribute("aria-pressed") || "",
      })),
    };
  });
}

async function assertNoErrors(errors, label) {
  if (errors.length) fail(`${label} browser errors: ${errors.join(" | ")}`);
}

async function waitForLightboxOpen(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("#lightbox");
    const img = document.querySelector("#lightboxImg");
    const close = document.querySelector("#lightboxClose");
    const rect = root?.getBoundingClientRect();

    return Boolean(
      root &&
        img instanceof HTMLImageElement &&
        img.getAttribute("src") &&
        img.complete &&
        img.naturalWidth > 0 &&
        img.naturalHeight > 0 &&
        !root.classList.contains("hidden") &&
        root.getAttribute("aria-hidden") === "false" &&
        rect?.width &&
        rect?.height &&
        document.activeElement === close,
    );
  });
}

const browser = await chromium.launch({ headless: true });

try {
  const context = await prepareContext(browser);

  {
    const { page, errors, feedRequests, waitForFeedFixture } = await newCheckedPage(context, "empty");
    await page.goto(`${baseUrl}/gallery`, { waitUntil: "domcontentloaded" });
    await waitForFeedFixture("static Gallery");
    await waitForGalleryState(page, {
      activeCategory: "all",
      renderedCount: initialStaticCount,
      sortValue: "random",
      totalCount: staticTotal,
    });

    let state = await visibleState(page);
    assert(state.count === initialStaticCount, `Static Gallery expected initial ${initialStaticCount} items, got ${state.count}.`);
    assert(state.countText === `Showing ${initialStaticCount} of ${staticTotal} images.`, `Unexpected static count text: ${state.countText}`);
    assert(state.sortValue === "random", `Expected default random sort, got ${state.sortValue}.`);
    assert(state.imageSrcs.every((src) => src.includes("/thumbs/")), "Static Gallery grid should use thumbnails.");

    await page.click("#galleryLoadMore");
    await page.waitForFunction(
      (expected) => document.querySelectorAll("#galleryGrid .gallery-thumb").length === expected,
      Math.min(staticTotal, galleryBatchSize * 2),
    );

    await page.selectOption("#gallerySort", "newest");
    await waitForGalleryState(page, {
      activeCategory: "all",
      expectedFirstFull: newestFirst,
      renderedCount: initialStaticCount,
      sortValue: "newest",
      totalCount: staticTotal,
    });
    state = await visibleState(page);
    assert(state.fulls[0] === newestFirst, `Newest sort first item mismatch. Expected ${newestFirst}, got ${state.fulls[0]}.`);

    await page.selectOption("#gallerySort", "oldest");
    await waitForGalleryState(page, {
      activeCategory: "all",
      expectedFirstFull: oldestFirst,
      renderedCount: initialStaticCount,
      sortValue: "oldest",
      totalCount: staticTotal,
    });
    state = await visibleState(page);
    assert(state.fulls[0] === oldestFirst, `Oldest sort first item mismatch. Expected ${oldestFirst}, got ${state.fulls[0]}.`);

    await page.click('#galleryFilters [data-category="portraits"]');
    await page.waitForURL(/category=portraits/);
    await waitForGalleryState(page, {
      activeCategory: "portraits",
      renderedCount: initialPortraitsCount,
      sortValue: "oldest",
      totalCount: staticTotal,
    });
    state = await visibleState(page);
    assert(state.count === initialPortraitsCount, `Portraits filter expected initial ${initialPortraitsCount} items, got ${state.count}.`);
    assert(state.filters.find((filter) => filter.slug === "portraits")?.pressed === "true", "Portraits filter was not active.");

    await page.click("#galleryGrid .gallery-thumb");
    await waitForLightboxOpen(page);
    const lightbox = await page.evaluate(() => ({
      src: document.querySelector("#lightboxImg")?.getAttribute("src") || "",
      focusId: document.activeElement?.id || "",
    }));
    assert(lightbox.src && !lightbox.src.includes("/thumbs/"), `Static lightbox should use full image path, got ${lightbox.src}.`);
    assert(lightbox.focusId === "lightboxClose", `Expected lightbox focus on close button, got ${lightbox.focusId}.`);

    assertFeedRequestContract(feedRequests, "static Gallery");
    await assertNoErrors(errors, "static Gallery");
    await page.close();
  }

  {
    const { page, errors, feedRequests, waitForFeedFixture } = await newCheckedPage(context, "success");
    await page.goto(`${baseUrl}/gallery?category=member-submissions&sort=newest`, {
      waitUntil: "domcontentloaded",
    });
    await waitForFeedFixture("approved feed success");
    await waitForGalleryState(page, {
      activeCategory: "member-submissions",
      expectedFirstFull: mockSignedUrl,
      renderedCount: 1,
      sortValue: "newest",
      totalCount: staticTotal + 1,
    });

    let state = await visibleState(page);
    assert(state.count === 1, `Member Submissions filter expected 1 approved item, got ${state.count}.`);
    assert(state.countText === "Showing 1 of 1 image in Member Submissions.", `Unexpected member count text: ${state.countText}`);
    const memberFilterText = state.filters.find((filter) => filter.slug === "member-submissions")?.text || "";
    assert(/^Member Submissions\s+\D\s+1\s+image$/.test(memberFilterText), `Member filter count was not rendered: ${memberFilterText}`);
    const allFilterText = state.filters.find((filter) => filter.slug === "all")?.text || "";
    assert(new RegExp(`^All\\s+\\D\\s+${staticTotal + 1}\\s+images$`).test(allFilterText), `All filter did not include the approved item: ${allFilterText}`);
    assert(state.fulls[0] === mockSignedUrl, "Approved item did not use signed_url as data-full.");
    assert(state.imageSrcs[0] === mockSignedUrl, "Approved item did not use signed_url as image source.");
    assert(state.imageAlts[0] === mockApprovedTitle, "Approved item alt text did not use the submitted title.");
    assert(state.captions[0].includes(mockApprovedTitle), "Approved caption did not include submitted title.");
    assert(state.captions[0].includes(mockApprovedCaption), "Approved caption did not include submitted caption.");
    assert(state.captions[0].includes(mockUploader), "Approved caption did not include uploader display name.");
    assert(!state.bodyText.includes("Pending Should Not Render"), "Pending mock submission leaked into public Gallery text.");
    assert(!state.bodyText.includes("Rejected Should Not Render"), "Rejected mock submission leaked into public Gallery text.");

    await page.click("#galleryGrid .gallery-thumb");
    await waitForLightboxOpen(page);
    const lightbox = await page.evaluate(() => ({
      src: document.querySelector("#lightboxImg")?.getAttribute("src") || "",
      caption: document.querySelector("#lightboxCaption")?.textContent?.trim() || "",
    }));
    assert(lightbox.src === mockSignedUrl, "Approved lightbox did not use signed_url as image source.");
    assert(lightbox.caption.includes(mockApprovedTitle), "Approved lightbox caption missed title.");
    assert(lightbox.caption.includes(mockApprovedCaption), "Approved lightbox caption missed caption.");
    assert(lightbox.caption.includes(mockUploader), "Approved lightbox caption missed uploader.");

    assertFeedRequestContract(feedRequests, "approved feed success");
    await assertNoErrors(errors, "approved feed success");
    await page.close();
  }

  {
    const { page, errors, feedRequests, waitForFeedFixture } = await newCheckedPage(context, "fail");
    await page.goto(`${baseUrl}/gallery?sort=newest`, { waitUntil: "domcontentloaded" });
    await waitForFeedFixture("approved feed failure fallback");
    await waitForGalleryState(page, {
      activeCategory: "all",
      expectedFirstFull: newestFirst,
      renderedCount: initialStaticCount,
      sortValue: "newest",
      totalCount: staticTotal,
    });

    const state = await visibleState(page);
    assert(state.count === initialStaticCount, `Approved-feed failure should fall back to initial ${initialStaticCount} static items, got ${state.count}.`);
    assert(state.filters.every((filter) => filter.slug !== "member-submissions"), "Member Submissions filter should not render when approved feed fails.");
    assert(state.fulls[0] === newestFirst, "Approved-feed failure should preserve static newest sort.");

    assertFeedRequestContract(feedRequests, "approved feed failure fallback");
    await assertNoErrors(errors, "approved feed failure fallback");
    await page.close();
  }

  {
    const { page, errors, feedRequests } = await newCheckedPage(context);
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await waitForHomeGallery(page);

    const state = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("#galleryGrid .home-thumb")];
      return {
        count: buttons.length,
        srcs: buttons.map((button) => button.querySelector("img")?.getAttribute("src") || ""),
        fulls: buttons.map((button) => button.querySelector("img")?.getAttribute("data-full") || ""),
      };
    });

    assert(state.count === 4, `Home Gallery Spotlight expected 4 buttons, got ${state.count}.`);
    assert(new Set(state.srcs).size === 4, "Home Gallery Spotlight should not render duplicate images.");
    assert(new Set(state.fulls).size === 4, "Home Gallery Spotlight should not render duplicate full images.");
    assert(state.srcs.every((src) => src.includes("/thumbs/")), "Home Gallery Spotlight should use thumbnails.");
    assert(state.fulls.every((full) => full && !full.includes("/thumbs/")), "Home Gallery Spotlight should open full images.");
    assert(state.fulls.every((full) => full !== mockSignedUrl), "Home Gallery Spotlight should remain static-data based.");
    assert(feedRequests.length === 0, "Home Gallery Spotlight should not request the approved member feed.");

    await assertNoErrors(errors, "Home Gallery Spotlight");
    await page.close();
  }

  await context.close();
  console.log("Gallery approved feed smoke OK.");
} finally {
  await browser.close();
}
