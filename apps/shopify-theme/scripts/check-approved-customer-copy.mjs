import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS } from "./lib/shopify-product-copy-csv.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = (relativePath) => readFileSync(path.join(appRoot, relativePath), "utf8");
const json = (relativePath) => JSON.parse(
  read(relativePath).replace(/^\uFEFF?\s*\/\*[\s\S]*?\*\/\s*/u, ""),
);
const content = json("content/approved-customer-copy.json");

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

function requireRuntimeCopy(relativePath, values) {
  const source = read(relativePath);
  for (const value of values) {
    const occurrences = source.split(value).length - 1;
    if (occurrences !== 1) {
      failures.push(`${relativePath} must contain the customer copy exactly once: ${value}`);
    }
  }
}

exactKeys(content, [
  "schemaVersion",
  "contentRevision",
  "locale",
  "brand",
  "provenance",
  "theme",
  "home",
  "collectionsIndex",
  "pages",
  "collections",
  "products",
], "root");
if (content.schemaVersion !== 2) failures.push("schemaVersion must be 2");
if (content.contentRevision !== "2026-07-18-v2") failures.push("contentRevision is unexpected");
if (content.locale !== "en-US") failures.push("locale must be en-US");
if (content.brand !== "Mochirii Cosmetics") failures.push("brand is unexpected");

exactKeys(content.provenance, [
  "sourceRepository",
  "sourcePullRequest",
  "sourceRevision",
  "providerWriteHistory",
], "provenance");
if (content.provenance?.sourceRepository !== "Mochirii-Wushu/Mochirii" ||
    content.provenance?.sourcePullRequest !== "https://github.com/Mochirii-Wushu/Mochirii/pull/459" ||
    content.provenance?.sourceRevision !== "2026-07-18-v2" ||
    content.provenance?.providerWriteHistory !== "content/customer-facing-copy-approval-packet.md") {
  failures.push("provenance must identify the immutable public content source and separate provider-write history");
}

exactKeys(content.theme, [
  "headerStrip",
  "mainSiteLink",
  "brandSubtext",
  "heroIntroduction",
  "featuredHeading",
  "collectionsHeading",
  "detailsEyebrow",
  "detailsHeading",
  "detailsIntroduction",
  "detailItems",
  "policyBand",
  "footerSummary",
  "footerSupport",
  "states",
  "productPage",
], "theme");
for (const field of [
  "headerStrip",
  "mainSiteLink",
  "brandSubtext",
  "heroIntroduction",
  "featuredHeading",
  "collectionsHeading",
  "detailsEyebrow",
  "detailsHeading",
  "detailsIntroduction",
  "policyBand",
  "footerSummary",
  "footerSupport",
]) {
  checkText(content.theme?.[field], `theme.${field}`);
}
if (!Array.isArray(content.theme?.detailItems) || content.theme.detailItems.length !== 3) {
  failures.push("theme.detailItems must contain exactly three records");
} else {
  content.theme.detailItems.forEach((item, index) => {
    exactKeys(item, ["heading", "text"], `theme.detailItems[${index}]`);
    checkText(item.heading, `theme.detailItems[${index}].heading`);
    checkText(item.text, `theme.detailItems[${index}].text`);
  });
}
exactKeys(content.theme?.states, [
  "emptyCart",
  "disabledCheckout",
  "emptyCollectionHeading",
  "emptyCollectionBody",
  "notFoundHeading",
  "notFoundBody",
  "passwordHeading",
  "passwordBody",
], "theme.states");
exactKeys(content.theme?.productPage, [
  "description",
  "directions",
  "ingredients",
  "warnings",
  "origin",
  "routine",
  "shipping",
  "available",
  "unavailable",
  "recommendations",
], "theme.productPage");

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
  exactKeys(collection, ["handle", "title", "description", "seoTitle", "seoDescription"], `collections.${collection.handle}`);
  for (const field of ["handle", "title", "description"]) checkText(collection[field], `collections.${collection.handle}.${field}`);
  checkSeo(collection.seoTitle, collection.seoDescription, `collections.${collection.handle}`);
}

uniqueHandles(content.products, (record) => record.identity?.handle, "products", 20);
const sentenceOwners = new Map();
const openingCounts = new Map();
for (const [index, product] of (content.products ?? []).entries()) {
  exactKeys(product, ["identity", "copy"], `products[${index}]`);
  exactKeys(product.identity, ["handle", "title"], `products[${index}].identity`);
  exactKeys(product.copy, ["description", "seoTitle", "seoDescription"], `products[${index}].copy`);
  checkText(product.identity?.handle, `products[${index}].identity.handle`);
  checkText(product.identity?.title, `products[${index}].identity.title`);
  checkText(product.copy?.description, `products[${index}].copy.description`);
  checkSeo(product.copy?.seoTitle, product.copy?.seoDescription, `products[${index}].copy`);

  const sentences = product.copy?.description?.match(/[^.!?]+[.!?]+/gu)?.map((sentence) => sentence.trim()) ?? [];
  if (sentences.length !== 2 || sentences.join(" ") !== product.copy?.description) {
    failures.push(`products[${index}].copy.description must contain exactly two complete sentences`);
  }
  for (const sentence of sentences) {
    const normalized = sentence.toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
    if (sentenceOwners.has(normalized)) {
      failures.push(`duplicate product sentence: ${sentenceOwners.get(normalized)} and ${product.identity?.handle}`);
    } else {
      sentenceOwners.set(normalized, product.identity?.handle);
    }
  }
  const opening = product.copy?.description?.toLocaleLowerCase("en-US").match(/[a-z0-9]+(?:[-'][a-z0-9]+)?/gu)?.slice(0, 2).join(" ");
  if (opening) openingCounts.set(opening, (openingCounts.get(opening) ?? 0) + 1);
}
for (const [opening, count] of openingCounts) {
  if (count > 5) failures.push(`product opening pattern appears ${count} times: ${opening}`);
}

const serialized = JSON.stringify(content);
const privateBrandPattern = new RegExp(
  `\\b(?:${["self" + "named", "ma" + "dara", "vele" + "sari"].join("|")})\\b`,
  "iu",
);
if (/\b[0-9a-f]{40}\b/iu.test(serialized)) failures.push("copy contract must not expose raw Git object IDs");
for (const pattern of [
  /private-evidence/iu,
  privateBrandPattern,
  /"(?:price|cost|inventory|sku|barcode|variant|payment|secret|credential|publicSourceUrl|selectionBasis|providerStatus)"\s*:/iu,
]) {
  if (pattern.test(serialized)) failures.push(`copy contract contains forbidden private, supplier, or commerce data: ${pattern}`);
}

const settingsData = json("config/settings_data.json");
const settingsSchema = json("config/settings_schema.json");
const schemaSettings = settingsSchema.flatMap((group) => group.settings ?? []);
for (const [id, expected] of Object.entries({
  default_meta_description: content.home.seoDescription,
  storefront_mode_text: content.theme.headerStrip,
  empty_catalog_heading: content.theme.states.emptyCollectionHeading,
  empty_catalog_body: content.theme.states.emptyCollectionBody,
  footer_summary: content.theme.footerSummary,
})) {
  if (settingsData.current?.[id] !== expected) failures.push(`settings_data ${id} does not match the copy contract`);
  if (schemaSettings.find((setting) => setting.id === id)?.default !== expected) {
    failures.push(`settings_schema ${id} does not match the copy contract`);
  }
}

requireRuntimeCopy("sections/header.liquid", [
  `<span class="brand-subtext">${content.theme.brandSubtext}</span>`,
]);
requireRuntimeCopy("sections/footer.liquid", [
  `>Visit ${content.theme.mainSiteLink}</a>`,
  content.theme.footerSupport.replace("Contact Mochirii Cosmetics.", '<a href="{{ contact_page.url }}">Contact Mochirii Cosmetics.</a>'),
  `"default": "${content.theme.footerSummary}"`,
]);
requireRuntimeCopy("sections/main-index.liquid", [
  `>${content.theme.detailsEyebrow}</p>`,
  `"default": "${content.theme.heroIntroduction}"`,
  `"default": "${content.theme.featuredHeading}"`,
  `"default": "${content.theme.collectionsHeading}"`,
  `"default": "${content.theme.detailsHeading}"`,
  `"default": "${content.theme.detailsIntroduction}"`,
  ...content.theme.detailItems.flatMap((item) => [`"default": "${item.heading}"`, `"default": "${item.text}"`]),
  `"default": "${content.theme.policyBand}"`,
]);
requireRuntimeCopy("locales/en.default.json", [content.theme.states.emptyCart]);
requireRuntimeCopy("sections/main-cart.liquid", [content.theme.states.disabledCheckout]);
requireRuntimeCopy("sections/main-404.liquid", [content.theme.states.notFoundHeading, content.theme.states.notFoundBody]);
requireRuntimeCopy("sections/main-password.liquid", [
  `"default": "${content.theme.states.passwordHeading}"`,
  `"default": "${content.theme.states.passwordBody}"`,
]);
requireRuntimeCopy("sections/main-list-collections.liquid", [
  `"default": "${content.collectionsIndex.heading}"`,
  `"default": "${content.collectionsIndex.intro}"`,
]);
if (!read(".shopifyignore").split(/\r?\n/u).includes("content/**")) {
  failures.push(".shopifyignore must exclude the nondeployable customer-copy contract");
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
  console.error("Customer-copy contract check failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Customer-copy contract check OK (content-only v2: 2 pages, 5 collections, 20 varied product descriptions; no reusable provider authority). ");
