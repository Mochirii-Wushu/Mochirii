const BASE_URL = "https://mochirii.com";
const TIMEOUT_MS = 30000;

const pageUrls = [
  "/",
  "/gallery.html",
  "/recruitment.html",
  "/join.html",
  "/events.html",
  "/robots.txt",
  "/sitemap.xml",
];

function absoluteUrl(path) {
  return new URL(path, BASE_URL).href;
}

async function fetchText(path) {
  const url = absoluteUrl(path);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return {
    url,
    contentType: response.headers.get("content-type") || "",
    text: await response.text(),
  };
}

function assertIncludes(text, pattern, label) {
  if (!pattern.test(text)) throw new Error(`Missing ${label}`);
}

function extractMetaContent(html, selector) {
  const match = html.match(selector);
  return match?.[1] || "";
}

async function checkUrlAvailability() {
  for (const path of pageUrls) {
    const result = await fetchText(path);
    if (path.endsWith(".html") || path === "/") {
      assertIncludes(result.contentType, /text\/html/i, `${path} HTML content type`);
    }
    if (path.endsWith(".xml")) {
      assertIncludes(result.contentType, /xml/i, `${path} XML content type`);
    }
    if (path.endsWith(".txt")) {
      assertIncludes(result.contentType, /text\/plain/i, `${path} text content type`);
    }
  }
}

async function checkMetadata() {
  const home = await fetchText("/");
  assertIncludes(home.text, /<title>[^<]*Mōchirīī[^<]*Where Winds Meet/i, "homepage title");
  assertIncludes(home.text, /<meta\s+name="description"\s+content="[^"]+"/i, "homepage description");
  assertIncludes(home.text, /<link\s+rel="canonical"\s+href="https:\/\/mochirii\.com\/"/i, "homepage canonical");
  assertIncludes(home.text, /property="og:title"/i, "homepage OG title");
  assertIncludes(home.text, /property="og:image"/i, "homepage OG image");

  const ogImage = extractMetaContent(home.text, /property="og:image"\s+content="([^"]+)"/i);
  if (!ogImage) throw new Error("Homepage OG image URL was not found");

  const ogResponse = await fetch(ogImage, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!ogResponse.ok) throw new Error(`${ogImage} returned HTTP ${ogResponse.status}`);
  const ogContentType = ogResponse.headers.get("content-type") || "";
  assertIncludes(ogContentType, /^image\//i, "homepage OG image content type");

  const recruitment = await fetchText("/recruitment.html");
  assertIncludes(recruitment.text, /Recruitment/i, "recruitment page content");
  assertIncludes(
    recruitment.text,
    /<link\s+rel="canonical"\s+href="https:\/\/mochirii\.com\/recruitment\.html"/i,
    "recruitment canonical"
  );
}

async function checkDiscoveryFiles() {
  const sitemap = await fetchText("/sitemap.xml");
  assertIncludes(sitemap.text, /<urlset[\s>]/i, "sitemap urlset");
  assertIncludes(sitemap.text, /https:\/\/mochirii\.com\/gallery\.html/i, "gallery sitemap entry");

  const robots = await fetchText("/robots.txt");
  assertIncludes(robots.text, /Sitemap:\s*https:\/\/mochirii\.com\/sitemap\.xml/i, "robots sitemap entry");
}

try {
  await checkUrlAvailability();
  await checkMetadata();
  await checkDiscoveryFiles();
  console.log("Production smoke check OK.");
} catch (error) {
  console.error(`Production smoke check failed: ${error?.message || error}`);
  process.exit(1);
}
