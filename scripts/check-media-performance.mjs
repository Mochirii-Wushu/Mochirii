import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function publicAssetPath(value) {
  const clean = String(value || "").trim().replace(/^\.?\//, "");
  return clean.startsWith("/") ? clean.slice(1) : clean;
}

function assertFileExists(label, relativePath) {
  assert(existsSync(path.join(root, relativePath)), `${label}: missing ${relativePath}`);
}

function assertIncludes(label, text, snippet) {
  assert(text.includes(snippet), `${label}: expected snippet not found: ${snippet}`);
}

function extractStaticImageBlock(source, id) {
  const idIndex = source.indexOf(`id="${id}"`);
  if (idIndex < 0) return "";
  const start = source.lastIndexOf("<StaticImage", idIndex);
  const end = source.indexOf("/>", idIndex);
  if (start < 0 || end < 0) return "";
  return source.slice(start, end + 2);
}

const galleryData = JSON.parse(read("data/gallery.json"));
const galleryItems = (Array.isArray(galleryData.albums) ? galleryData.albums : []).flatMap((album) =>
  Array.isArray(album.items) ? album.items : [],
);

assert(galleryItems.length > 0, "data/gallery.json: expected at least one gallery item.");

for (const item of galleryItems) {
  const id = String(item.id || item.full || item.src || "gallery item");
  const thumb = publicAssetPath(item.thumb);
  const full = publicAssetPath(item.full || item.src);

  assert(thumb.includes("assets/img/gallery/thumbs/"), `${id}: grid thumbnail must use assets/img/gallery/thumbs/.`);
  assert(!full.includes("/thumbs/"), `${id}: full/lightbox image must not use a thumbnail path.`);
  assert(thumb !== full, `${id}: thumbnail and full image paths must be different.`);

  if (thumb) {
    assertFileExists(`${id} thumbnail`, thumb);
    assertFileExists(`${id} public thumbnail`, path.join("apps/web/public", thumb).split(path.sep).join("/"));
  }

  if (full) {
    assertFileExists(`${id} full image`, full);
    assertFileExists(`${id} public full image`, path.join("apps/web/public", full).split(path.sep).join("/"));
  }
}

const galleryBrowser = read("apps/web/components/public-pages/GalleryBrowser.tsx");
const gallerySubmissions = read("apps/web/lib/supabase/gallery-submissions.ts");
const galleryTypes = read("apps/web/lib/supabase/types.ts");
const approvedFunction = read("supabase/functions/list-approved-gallery-submissions/index.ts");
const homePage = read("apps/web/app/page.tsx");
const sharedPublicComponents = read("apps/web/components/public-pages/common.tsx");
const siteHeader = read("apps/web/components/SiteHeader.tsx");
const siteFooter = read("apps/web/components/SiteFooter.tsx");
const spotifyBrowser = read("apps/web/components/public-pages/SpotifyBrowser.tsx");
const staticGallery = read("gallery.js");
const staticGalleryHtml = read("gallery.html");
const staticStyles = read("styles.css");
const sidePagesGuide = read("docs/side-pages-guide.md");

[
  "const galleryRenderBatchSize = 24;",
  "const renderedItems = useMemo(() => visibleItems.slice(0, effectiveRenderLimit)",
  'id="galleryLoadMore"',
  "<img src={item.thumb} alt={item.alt} loading=\"lazy\" decoding=\"async\" />",
  "src={openItem.full}",
  "const signedUrl = text(submission.signed_url);",
  "full: signedUrl,",
  "thumb: signedUrl,",
  "submission.preview_error",
].forEach((snippet) => assertIncludes("GalleryBrowser media contract", galleryBrowser, snippet));

assert(!galleryBrowser.includes("storage_path"), "GalleryBrowser must not read raw Supabase storage paths.");
assert(!galleryBrowser.includes("storage_bucket"), "GalleryBrowser must not read raw Supabase storage buckets.");
assertIncludes("approved gallery client", gallerySubmissions, "list-approved-gallery-submissions");
assertIncludes("approved gallery client", gallerySubmissions, "method: \"POST\"");

const approvedTypeMatch = galleryTypes.match(/export type ApprovedGallerySubmission = \{[\s\S]*?\n\};/);
assert(Boolean(approvedTypeMatch), "ApprovedGallerySubmission type was not found.");
if (approvedTypeMatch) {
  const approvedType = approvedTypeMatch[0];
  assertIncludes("ApprovedGallerySubmission", approvedType, "signed_url?: string | null;");
  assert(!approvedType.includes("storage_path"), "ApprovedGallerySubmission must not expose storage_path.");
  assert(!approvedType.includes("storage_bucket"), "ApprovedGallerySubmission must not expose storage_bucket.");
}

const responseItemMatch = approvedFunction.match(/const item: JsonRecord = \{[\s\S]*?\n    \};/);
assert(Boolean(responseItemMatch), "list-approved-gallery-submissions response item was not found.");
if (responseItemMatch) {
  const responseItem = responseItemMatch[0];
  assertIncludes("approved gallery response item", responseItem, "signed_url: signedData?.signedUrl || null,");
  assert(!responseItem.includes("storage_path"), "Approved gallery response item must not expose storage_path.");
  assert(!responseItem.includes("storage_bucket"), "Approved gallery response item must not expose storage_bucket.");
}

const heroBlock = extractStaticImageBlock(homePage, "heroImage");
const sealBlock = extractStaticImageBlock(homePage, "sealImage");
assertIncludes("Home hero image", heroBlock, "priority");
assert(sealBlock && !sealBlock.includes("priority"), "Home guild seal must not use priority preload.");

const homePriorityCount = [...homePage.matchAll(/\bpriority\b/g)].length;
assert(homePriorityCount === 1, `Home page should have exactly one priority image, found ${homePriorityCount}.`);

assertIncludes("shared PageHero", sharedPublicComponents, "className=\"page-hero__img\"");
assertIncludes("shared PageHero", sharedPublicComponents, "priority");
assertIncludes("shared image LCP hint", sharedPublicComponents, "resolvedFetchPriority");
assertIncludes("shared image LCP hint", sharedPublicComponents, "fetchPriority={resolvedFetchPriority}");

[
  'import Image from "next/image";',
  'src="/assets/img/brand/emblem.webp"',
  'sizes="56px"',
  'fetchPriority="low"',
].forEach((snippet) => assertIncludes("optimized header emblem", siteHeader, snippet));

[
  'import Image from "next/image";',
  'src="/assets/img/brand/emblem.webp"',
  'sizes="56px"',
].forEach((snippet) => assertIncludes("optimized footer emblem", siteFooter, snippet));

[
  "function SpotifyEmbed",
  "IntersectionObserver",
  'data-deferred-spotify-embed="true"',
  'rootMargin: "640px 0px"',
  'loading="lazy"',
  "title={`Spotify embed: ${title}`}",
  'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"',
  'url.hostname !== "open.spotify.com"',
  "const allowedKinds = new Set",
  "<SpotifyEmbed",
].forEach((snippet) => assertIncludes("Spotify deferred embed contract", spotifyBrowser, snippet));

[
  "Spotify iframe embeds are deferred",
  "IntersectionObserver",
  "loading=\"lazy\"",
  "open.spotify.com",
].forEach((snippet) => assertIncludes("Spotify performance docs", sidePagesGuide, snippet));

[
  "const GALLERY_RENDER_BATCH_SIZE = 24;",
  "const renderedItems = visibleItems.slice(0, renderLimit);",
  "renderLimit = GALLERY_RENDER_BATCH_SIZE;",
  "renderLimit = Math.min(renderLimit + GALLERY_RENDER_BATCH_SIZE, visibleItems.length);",
  "renderGrid(grid, renderedItems);",
].forEach((snippet) => assertIncludes("rollback Gallery media contract", staticGallery, snippet));

[
  'id="galleryLoadMoreRow"',
  'id="galleryLoadMore"',
  "Show more images",
  "gallery.js?v=2026-06-media-performance",
  "styles.css?v=2026-06-media-performance",
].forEach((snippet) => assertIncludes("rollback Gallery markup", staticGalleryHtml, snippet));

[
  ".gallery-load-more-row",
  ".gallery-load-more",
].forEach((snippet) => assertIncludes("rollback Gallery styles", staticStyles, snippet));

if (failures.length) {
  console.error("Media performance validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Media performance validation OK (${galleryItems.length} gallery items checked).`);
