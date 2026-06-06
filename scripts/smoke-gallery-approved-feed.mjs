import { readFile } from "node:fs/promises";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8765";
const galleryDataUrl = new URL("../data/gallery.json", import.meta.url);
const galleryData = JSON.parse(await readFile(galleryDataUrl, "utf8"));
const staticItems = Array.isArray(galleryData?.albums?.[0]?.items) ? galleryData.albums[0].items : [];

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

const sortTime = (item) => {
  const time = Date.parse(item?.galleryAddedAt || item?.sortTimestamp || "");
  return Number.isFinite(time) ? time : 0;
};

const compareId = (a, b) => String(a?.id || "").localeCompare(String(b?.id || ""));

const orderItems = (items, mode) =>
  [...items].sort((a, b) => {
    const aTime = sortTime(a);
    const bTime = sortTime(b);
    if (aTime !== bTime) return mode === "newest" ? bTime - aTime : aTime - bTime;
    return compareId(a, b);
  });

const fullPath = (item) => String(item?.full || item?.src || "");
const staticTotal = staticItems.length;
const portraitsTotal = staticItems.filter((item) => getCategories(item).includes("portraits")).length;
const newestFirst = fullPath(orderItems(staticItems, "newest")[0]);
const oldestFirst = fullPath(orderItems(staticItems, "oldest")[0]);

const mockSignedUrl = `${baseUrl}/assets/img/gallery/shot-01.webp?mockSignedUrl=approved-member`;
const mockApprovedTitle = "Approved Smoke Submission";
const mockApprovedCaption = "Shared from smoke automation";
const mockUploader = "QA Member";
const mockSupabaseClient = `
window.__galleryApprovedFeedInvocations = [];
window.__galleryApprovedFeedBackend = [
  {
    id: "approved-smoke-submission",
    status: "approved",
    signed_url: ${JSON.stringify(mockSignedUrl)},
    title: ${JSON.stringify(mockApprovedTitle)},
    caption: ${JSON.stringify(mockApprovedCaption)},
    category: "portraits",
    uploader_display_name: ${JSON.stringify(mockUploader)},
    created_at: "2030-01-02T03:04:05.000Z",
    reviewed_at: "2030-01-02T04:04:05.000Z"
  },
  {
    id: "pending-smoke-submission",
    status: "pending",
    signed_url: "pending-should-not-render",
    title: "Pending Should Not Render",
    caption: "Pending hidden caption",
    category: "portraits",
    created_at: "2030-01-03T03:04:05.000Z"
  },
  {
    id: "rejected-smoke-submission",
    status: "rejected",
    signed_url: "rejected-should-not-render",
    title: "Rejected Should Not Render",
    caption: "Rejected hidden caption",
    category: "portraits",
    created_at: "2030-01-04T03:04:05.000Z"
  }
];
window.supabase = {
  createClient() {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      functions: {
        invoke: async (name, options = {}) => {
          window.__galleryApprovedFeedInvocations.push({ name, body: options.body || null });
          if (name !== "list-approved-gallery-submissions") {
            return { data: null, error: { message: "Unexpected mock function: " + name } };
          }
          if (window.__galleryApprovedFeedMode === "fail") {
            return {
              data: null,
              error: {
                message: "Mock approved feed failure",
                context: {
                  status: 503,
                  statusText: "Mock Failure",
                  json: async () => ({ message: "Mock approved feed failure" })
                }
              }
            };
          }
          const approved = window.__galleryApprovedFeedBackend
            .filter((submission) => submission.status === "approved")
            .map(({ status, ...submission }) => submission);
          return {
            data: {
              ok: true,
              data: { submissions: approved },
              message: "Mock approved feed returned approved submissions only."
            },
            error: null
          };
        }
      }
    };
  }
};
`;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
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

async function newCheckedPage(context, mode = "success") {
  const page = await context.newPage();
  const errors = [];

  await page.addInitScript((feedMode) => {
    window.__galleryApprovedFeedMode = feedMode;
  }, mode);

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !text.includes("Failed to load resource: net::ERR_FAILED")) {
      errors.push(text);
    }
  });

  return { page, errors };
}

async function waitForGallery(page) {
  await page.waitForSelector("#galleryGrid .gallery-thumb img", { timeout: 10000 });
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
      invocations: window.__galleryApprovedFeedInvocations || [],
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
    const rect = root?.getBoundingClientRect();

    return Boolean(
      root &&
        img?.getAttribute("src") &&
        !root.classList.contains("hidden") &&
        root.getAttribute("aria-hidden") === "false" &&
        rect?.width &&
        rect?.height,
    );
  });
}

const browser = await chromium.launch({ headless: true });

try {
  const context = await prepareContext(browser);

  {
    const { page, errors } = await newCheckedPage(context);
    await page.goto(`${baseUrl}/gallery.html`, { waitUntil: "domcontentloaded" });
    await waitForGallery(page);

    let state = await visibleState(page);
    assert(state.count === staticTotal, `Static Gallery expected ${staticTotal} items, got ${state.count}.`);
    assert(state.countText === `Showing ${staticTotal} of ${staticTotal} images.`, `Unexpected static count text: ${state.countText}`);
    assert(state.sortValue === "random", `Expected default random sort, got ${state.sortValue}.`);
    assert(state.invocations.length === 0, "Local static Gallery should not call the approved feed without approvedFeed=1.");
    assert(state.imageSrcs.every((src) => src.includes("/thumbs/")), "Static Gallery grid should use thumbnails.");

    await page.selectOption("#gallerySort", "newest");
    await page.waitForFunction(() => document.querySelector("#gallerySort")?.value === "newest");
    state = await visibleState(page);
    assert(state.fulls[0] === newestFirst, `Newest sort first item mismatch. Expected ${newestFirst}, got ${state.fulls[0]}.`);

    await page.selectOption("#gallerySort", "oldest");
    await page.waitForFunction(() => document.querySelector("#gallerySort")?.value === "oldest");
    state = await visibleState(page);
    assert(state.fulls[0] === oldestFirst, `Oldest sort first item mismatch. Expected ${oldestFirst}, got ${state.fulls[0]}.`);

    await page.click('#galleryFilters [data-category="portraits"]');
    await page.waitForURL(/category=portraits/);
    state = await visibleState(page);
    assert(state.count === portraitsTotal, `Portraits filter expected ${portraitsTotal} items, got ${state.count}.`);
    assert(state.filters.find((filter) => filter.slug === "portraits")?.pressed === "true", "Portraits filter was not active.");

    await page.click("#galleryGrid .gallery-thumb");
    await waitForLightboxOpen(page);
    const lightbox = await page.evaluate(() => ({
      src: document.querySelector("#lightboxImg")?.getAttribute("src") || "",
      focusId: document.activeElement?.id || "",
    }));
    assert(lightbox.src && !lightbox.src.includes("/thumbs/"), `Static lightbox should use full image path, got ${lightbox.src}.`);
    assert(lightbox.focusId === "lightboxClose", `Expected lightbox focus on close button, got ${lightbox.focusId}.`);

    await assertNoErrors(errors, "static Gallery");
    await page.close();
  }

  {
    const { page, errors } = await newCheckedPage(context, "success");
    await page.goto(`${baseUrl}/gallery.html?approvedFeed=1&category=member-submissions&sort=newest`, {
      waitUntil: "domcontentloaded",
    });
    await waitForGallery(page);

    let state = await visibleState(page);
    assert(state.invocations.some((entry) => entry.name === "list-approved-gallery-submissions"), "Approved feed was not invoked.");
    assert(state.count === 1, `Member Submissions filter expected 1 approved item, got ${state.count}.`);
    assert(state.countText === "Showing 1 image in Member Submissions.", `Unexpected member count text: ${state.countText}`);
    const memberFilterText = state.filters.find((filter) => filter.slug === "member-submissions")?.text || "";
    assert(/^Member Submissions\s+\D\s+1$/.test(memberFilterText), `Member filter count was not rendered: ${memberFilterText}`);
    const allFilterText = state.filters.find((filter) => filter.slug === "all")?.text || "";
    assert(new RegExp(`^All\\s+\\D\\s+${staticTotal + 1}$`).test(allFilterText), `All filter did not include the approved item: ${allFilterText}`);
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

    await assertNoErrors(errors, "approved feed success");
    await page.close();
  }

  {
    const { page, errors } = await newCheckedPage(context, "fail");
    await page.goto(`${baseUrl}/gallery.html?approvedFeed=1&sort=newest`, { waitUntil: "domcontentloaded" });
    await waitForGallery(page);

    const state = await visibleState(page);
    assert(state.count === staticTotal, `Approved-feed failure should fall back to ${staticTotal} static items, got ${state.count}.`);
    assert(state.filters.every((filter) => filter.slug !== "member-submissions"), "Member Submissions filter should not render when approved feed fails.");
    assert(state.fulls[0] === newestFirst, "Approved-feed failure should preserve static newest sort.");

    await assertNoErrors(errors, "approved feed failure fallback");
    await page.close();
  }

  {
    const { page, errors } = await newCheckedPage(context);
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#galleryGrid [data-home-gallery-link] img").length === 4);

    const state = await page.evaluate(() => {
      const links = [...document.querySelectorAll("#galleryGrid [data-home-gallery-link]")];
      return {
        count: links.length,
        srcs: links.map((link) => link.querySelector("img")?.getAttribute("src") || ""),
        hrefs: links.map((link) => link.getAttribute("href") || ""),
      };
    });

    assert(state.count === 4, `Home Gallery Spotlight expected 4 links, got ${state.count}.`);
    assert(new Set(state.srcs).size === 4, "Home Gallery Spotlight should not render duplicate images.");
    assert(state.srcs.every((src) => src.includes("/thumbs/")), "Home Gallery Spotlight should use thumbnails.");
    assert(state.hrefs.every((href) => /gallery\.html\?category=/.test(href)), "Home Gallery Spotlight links should resolve to Gallery category URLs.");
    assert(state.srcs.every((src) => !src.includes("mockSignedUrl")), "Home Gallery Spotlight should remain static-data based.");

    await assertNoErrors(errors, "Home Gallery Spotlight");
    await page.close();
  }

  await context.close();
  console.log("Gallery approved feed smoke OK.");
} finally {
  await browser.close();
}
