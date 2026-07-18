import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS,
} from "./lib/shopify-product-copy-csv.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = (relativePath) => readFileSync(path.join(appRoot, relativePath), "utf8");
const json = (relativePath) => JSON.parse(
  read(relativePath).replace(/^\uFEFF?\s*\/\*[\s\S]*?\*\/\s*/u, ""),
);
const content = json("content/approved-customer-copy.json");
const approvedProjectionSha256 = "e0e6235da4db2ae1006ef8d5c524a6c6d41b477fbabfaf13eaef2ad22dee00c8";

function exactKeys(value, expected, label) {
  const actual = Object.keys(value ?? {}).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(`${label} keys must be exactly: ${wanted.join(", ")}`);
  }
}

function checkText(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    failures.push(`${label} must be a non-empty string without outer whitespace`);
  }
}

function checkSeo(title, description, label) {
  checkText(title, `${label}.seoTitle`);
  checkText(description, `${label}.seoDescription`);
  if (typeof title === "string" && title.length >= 60) {
    failures.push(`${label}.seoTitle must be under 60 characters`);
  }
  if (typeof description === "string" && (description.length < 70 || description.length >= 160)) {
    failures.push(`${label}.seoDescription must contain 70-159 characters`);
  }
}

function uniqueHandles(records, selector, label, expectedCount) {
  if (!Array.isArray(records) || records.length !== expectedCount) {
    failures.push(`${label} must contain exactly ${expectedCount} records`);
    return;
  }
  const handles = records.map(selector);
  if (new Set(handles).size !== handles.length) failures.push(`${label} handles must be unique`);
}

exactKeys(content, [
  "schemaVersion",
  "contentRevision",
  "locale",
  "brand",
  "approval",
  "provenance",
  "home",
  "collectionsIndex",
  "pages",
  "collections",
  "products",
], "root");
if (content.schemaVersion !== 1) failures.push("schemaVersion must be 1");
if (content.contentRevision !== "2026-07-18-v1") failures.push("contentRevision is unexpected");
if (content.locale !== "en-US") failures.push("locale must be en-US");
if (content.brand !== "Mochirii Cosmetics") failures.push("brand is unexpected");

exactKeys(content.approval, [
  "scope",
  "approvedOn",
  "publicationAuthorized",
  "providerMutationAuthorized",
  "commerceAuthorized",
], "approval");
if (content.approval?.scope !== "copy-only" || content.approval?.approvedOn !== "2026-07-18") {
  failures.push("approval must remain scoped to the recorded copy-only review");
}
for (const field of ["publicationAuthorized", "providerMutationAuthorized", "commerceAuthorized"]) {
  if (content.approval?.[field] !== false) failures.push(`approval.${field} must remain false`);
}

exactKeys(content.provenance, [
  "sourceRepository",
  "sourcePullRequest",
  "sourceRevision",
  "approvalRecord",
], "provenance");
if (content.provenance?.sourceRepository !== "Mochirii-Wushu/mochirii-shopify-theme" ||
    content.provenance?.sourcePullRequest !== "https://github.com/Mochirii-Wushu/mochirii-shopify-theme/pull/9") {
  failures.push("provenance must identify the approved public source review");
}

exactKeys(content.home, ["seoTitle", "seoDescription"], "home");
checkSeo(content.home?.seoTitle, content.home?.seoDescription, "home");
exactKeys(content.collectionsIndex, ["eyebrow", "heading", "intro"], "collectionsIndex");
for (const field of ["eyebrow", "heading", "intro"]) {
  checkText(content.collectionsIndex?.[field], `collectionsIndex.${field}`);
}

uniqueHandles(content.pages, (record) => record.handle, "pages", 2);
if (JSON.stringify((content.pages ?? []).map(({ handle }) => handle).sort()) !== JSON.stringify(["about", "contact"])) {
  failures.push("pages must contain only About and Contact");
}
for (const page of content.pages ?? []) {
  exactKeys(page, ["handle", "title", "bodyHtml", "seoTitle", "seoDescription"], `pages.${page.handle}`);
  for (const field of ["handle", "title", "bodyHtml"]) checkText(page[field], `pages.${page.handle}.${field}`);
  checkSeo(page.seoTitle, page.seoDescription, `pages.${page.handle}`);
  const nonParagraphMarkup = page.bodyHtml?.replaceAll(/<\/?p>/gu, "").match(/<[^>]+>/u);
  if (nonParagraphMarkup) failures.push(`pages.${page.handle}.bodyHtml may contain paragraph tags only`);
}

uniqueHandles(content.collections, (record) => record.handle, "collections", 5);
for (const collection of content.collections ?? []) {
  exactKeys(
    collection,
    ["handle", "title", "description", "seoTitle", "seoDescription"],
    `collections.${collection.handle}`,
  );
  for (const field of ["handle", "title", "description"]) {
    checkText(collection[field], `collections.${collection.handle}.${field}`);
  }
  checkSeo(collection.seoTitle, collection.seoDescription, `collections.${collection.handle}`);
}

uniqueHandles(content.products, (record) => record.identity?.handle, "products", 20);
for (const [index, product] of (content.products ?? []).entries()) {
  exactKeys(product, ["identity", "copy"], `products[${index}]`);
  exactKeys(product.identity, ["handle", "title"], `products[${index}].identity`);
  exactKeys(
    product.copy,
    ["description", "seoTitle", "seoDescription"],
    `products[${index}].copy`,
  );
  checkText(product.identity?.handle, `products[${index}].identity.handle`);
  checkText(product.identity?.title, `products[${index}].identity.title`);
  checkText(product.copy?.description, `products[${index}].copy.description`);
  checkSeo(product.copy?.seoTitle, product.copy?.seoDescription, `products[${index}].copy`);
}

const serialized = JSON.stringify(content);
const projectionSha256 = createHash("sha256").update(serialized).digest("hex");
if (projectionSha256 !== approvedProjectionSha256) {
  failures.push("approved public-copy projection does not match the reviewed source record");
}
if (/\b[0-9a-f]{40}\b/iu.test(serialized)) failures.push("copy contract must not expose raw Git object IDs");
for (const pattern of [
  /private-evidence/iu,
  /supplier/iu,
  /"(?:price|cost|inventory|sku|barcode|variant|payment|secret|credential|publicSourceUrl|selectionBasis|providerStatus)"\s*:/iu,
]) {
  if (pattern.test(serialized)) failures.push(`copy contract contains forbidden private or commerce data: ${pattern}`);
}

const settingsData = json("config/settings_data.json");
const settingsSchema = json("config/settings_schema.json");
const schemaSettings = settingsSchema.flatMap((group) => group.settings ?? []);
for (const [id, expected] of Object.entries({
  default_meta_description: content.home.seoDescription,
  storefront_mode_text: "Skincare, step by step",
  empty_catalog_heading: "No products match these filters.",
  empty_catalog_body: "Clear a filter or browse the full collection.",
  footer_summary: "Skincare organized by routine step, skin type, and formula.",
})) {
  if (settingsData.current?.[id] !== expected) failures.push(`settings_data ${id} does not match approved copy`);
  if (schemaSettings.find((setting) => setting.id === id)?.default !== expected) {
    failures.push(`settings_schema ${id} does not match approved copy`);
  }
}

const expectedRuntimeCopy = new Map([
  ["config/settings_data.json", [
    content.home.seoDescription,
    "Skincare, step by step",
    "No products match these filters.",
    "Clear a filter or browse the full collection.",
    "Skincare organized by routine step, skin type, and formula.",
  ]],
  ["config/settings_schema.json", [
    content.home.seoDescription,
    "Skincare, step by step",
    "No products match these filters.",
    "Clear a filter or browse the full collection.",
    "Skincare organized by routine step, skin type, and formula.",
  ]],
  ["locales/en.default.json", ["Your cart is empty."]],
  ["sections/footer.liquid", [
    "skincare storefront home",
    '<span class="brand-subtext">Skincare</span>',
    "Questions about a product or order? Contact {{ settings.corporate_display_name }}.",
    "Shipping &amp; delivery",
    "Returns &amp; refunds",
    '"default": "Skincare organized by routine step, skin type, and formula."',
  ]],
  ["sections/header.liquid", [
    ">Mochirii Home</a>",
    "skincare storefront home",
    '<span class="brand-subtext">Skincare</span>',
  ]],
  ["sections/main-404.liquid", [
    "We couldn't find the page you were looking for.",
    "Explore the collection",
    "Search by product or ingredient, or return to all skincare.",
    ">Product or ingredient</label>",
    ">Shop skincare</a>",
  ]],
  ["sections/main-cart.liquid", [
    ">Shop skincare</a>",
    "Shipping and taxes are shown before payment.",
    ">Shipping &amp; delivery</a>",
    ">Returns &amp; refunds</a>",
  ]],
  ["sections/main-index.liquid", [
    ">Shop by routine</a>",
    ">Featured formulas</p>",
    ">Routine step</p>",
    ">Product details</p>",
    ">Shipping &amp; delivery</a>",
    ">Returns &amp; refunds</a>",
    '"default": "Build your routine"',
    '"default": "Shop cleansers, serums, moisturizers, and facial oils organized by routine step and skin type."',
    '"default": "Shop skincare"',
    '"default": "Six formulas to start with"',
    '"default": "Choose your next step"',
    '"default": "Compare every formula"',
    '"default": "Review skin types, ingredients, directions, and warnings on every product page."',
    '"default": "Product media shows the approved Mochirii package and matching formula."',
    '"default": "Each page lists size, skin types, directions, full INCI, and warnings."',
    '"default": "Verified origin details"',
    '"default": "Origin and product-specific certifications appear only when they are verified for that formula."',
    '"default": "Review shipping and returns before ordering."',
  ]],
  ["sections/main-list-collections.liquid", [
    `>${content.collectionsIndex.eyebrow}</p>`,
    ">Routine step</p>",
    `"default": "${content.collectionsIndex.heading}"`,
    `"default": "${content.collectionsIndex.intro}"`,
  ]],
  ["sections/main-page.liquid", [">Shop skincare</a>"]],
  ["sections/main-password.liquid", [
    '<span class="brand-subtext">Skincare</span>',
    ">Enter shop</button>",
    '"default": "Enter the storefront password to preview Mochirii Cosmetics."',
  ]],
  ["sections/main-product.liquid", [
    "default: 'Skincare'",
    ">Skin types</dt>",
    ">About this formula</summary>",
    ">Routine details</summary>",
    ">Shipping &amp; delivery</a>",
    ">Returns &amp; refunds</a>",
    ">Build the routine</p>",
    ">Explore this routine</a>",
  ]],
  ["sections/main-search.liquid", [
    ">Search skincare</h1>",
    ">Product or ingredient</label>",
    ">No matching products</h2>",
    "Check the spelling or try a broader product or ingredient name.",
  ]],
  ["snippets/product-card.liquid", [
    "default: 'Skincare'",
    ">See details</a>",
  ]],
]);
for (const [relativePath, expected] of expectedRuntimeCopy) {
  const source = read(relativePath);
  for (const value of expected) {
    const occurrences = source.split(value).length - 1;
    if (occurrences !== 1) {
      failures.push(`${relativePath} must contain the approved copy exactly once: ${value}`);
    }
  }
}

if (!read(".shopifyignore").split(/\r?\n/u).includes("content/**")) {
  failures.push(".shopifyignore must exclude the nondeployable public-copy contract");
}

if (JSON.stringify(SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS) !== JSON.stringify([
  "URL handle",
  "Title",
  "Option1 name",
  "Option1 value",
  "Description",
  "SEO title",
  "SEO description",
])) {
  failures.push("copy-only CSV contract must preserve current option identity");
}

if (failures.length > 0) {
  console.error("Approved customer-copy check failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Approved customer-copy check OK (2 pages, 5 collections, 20 products; publication and commerce remain disabled).");
