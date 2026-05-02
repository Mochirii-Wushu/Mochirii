const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8765";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is required for this optional smoke test.");
  console.error("Start a local server, then run this in an environment with Playwright available.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !text.includes("Failed to load resource: net::ERR_FAILED")) {
      errors.push(text);
    }
  });

  await page.goto(`${baseUrl}/gallery.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#galleryGrid .gallery-thumb img");

  const trigger = page.locator("#galleryGrid .gallery-thumb").first();
  const triggerState = await trigger.evaluate((el) => ({
    full: el.getAttribute("data-full") || "",
    thumb: el.querySelector("img")?.getAttribute("src") || "",
  }));

  if (!triggerState.full) {
    throw new Error("First gallery trigger is missing data-full.");
  }
  if (!triggerState.thumb.includes("/thumbs/")) {
    throw new Error(`Expected first gallery grid image to use a thumbnail path, got: ${triggerState.thumb}`);
  }

  await trigger.click();
  await page.waitForTimeout(250);

  const lightboxSrc = await page.locator("#lightboxImg").evaluate((img) => img.getAttribute("src") || img.currentSrc || "");
  if (!lightboxSrc) {
    throw new Error("Lightbox image source was empty.");
  }
  if (lightboxSrc.includes("/thumbs/")) {
    throw new Error(`Lightbox loaded thumbnail instead of full image: ${lightboxSrc}`);
  }
  if (!lightboxSrc.includes(triggerState.full.replace(/^\.\//, ""))) {
    throw new Error(`Lightbox did not use the trigger data-full path. Expected ${triggerState.full}, got ${lightboxSrc}`);
  }

  if (errors.length) {
    throw new Error(`Browser errors: ${errors.join(" | ")}`);
  }

  console.log("Gallery lightbox smoke OK.");
} finally {
  await browser.close();
}
