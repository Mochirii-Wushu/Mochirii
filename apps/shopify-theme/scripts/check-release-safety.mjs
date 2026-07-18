import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const commerceStart = "{% comment %} release-safety:commerce:start {% endcomment %}";
const commerceEnd = "{% comment %} release-safety:commerce:end {% endcomment %}";
const publicationStart = "{% comment %} release-safety:publication:start {% endcomment %}";
const publicationEnd = "{% comment %} release-safety:publication:end {% endcomment %}";

function read(relativePath) {
  return readFileSync(path.join(appRoot, relativePath), "utf8");
}

function readThemeJson(relativePath) {
  return JSON.parse(read(relativePath).replace(/^\s*[/][*][\s\S]*?[*][/]\s*/, ""));
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function requireText(relativePath, source, expected) {
  if (!source.includes(expected)) {
    failures.push(`${relativePath}: missing release-safety contract: ${expected}`);
  }
}

function contentOutsideMarkedSegments(relativePath, source, startMarker, endMarker, requiredCondition) {
  const unguarded = [];
  let cursor = 0;
  let segmentCount = 0;

  while (cursor < source.length) {
    const start = source.indexOf(startMarker, cursor);
    if (start === -1) {
      unguarded.push(source.slice(cursor));
      break;
    }
    unguarded.push(source.slice(cursor, start));
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end === -1) {
      failures.push(`${relativePath}: unpaired ${startMarker}`);
      return source;
    }
    const guarded = source.slice(start + startMarker.length, end);
    if (!guarded.includes(requiredCondition)) {
      failures.push(`${relativePath}: marked segment does not contain ${requiredCondition}`);
    }
    segmentCount += 1;
    cursor = end + endMarker.length;
  }

  if (source.includes(endMarker) && segmentCount === 0) {
    failures.push(`${relativePath}: unpaired ${endMarker}`);
  }
  return unguarded.join("\n");
}

const commerceCanaryPattern = /[|]\s*money\b/i;
const guardedCanary = `${commerceStart}{% if settings.checkout_enabled %}{{ product.price | money }}{% endif %}${commerceEnd}`;
const unguardedCanary = "{{ product.price | money }}";
if (commerceCanaryPattern.test(contentOutsideMarkedSegments(
  "release-safety guarded canary",
  guardedCanary,
  commerceStart,
  commerceEnd,
  "settings.checkout_enabled",
)) || !commerceCanaryPattern.test(contentOutsideMarkedSegments(
  "release-safety unguarded canary",
  unguardedCanary,
  commerceStart,
  commerceEnd,
  "settings.checkout_enabled",
))) {
  failures.push("release-safety commerce-marker canary did not distinguish guarded and unguarded output");
}

const settings = readThemeJson("config/settings_data.json");
if (settings.current?.product_publication_approved !== false) {
  failures.push("config/settings_data.json: product_publication_approved must remain false");
}
if (settings.current?.checkout_enabled !== false) {
  failures.push("config/settings_data.json: checkout_enabled must remain false");
}
if (settings.current?.corporate_display_name !== "") {
  failures.push("config/settings_data.json: corporate_display_name must remain blank until verified");
}
if (Object.hasOwn(settings.current ?? {}, "show_internal_product_meta")) {
  failures.push("config/settings_data.json: internal product metadata control is forbidden");
}

const schema = readThemeJson("config/settings_schema.json");
const schemaSettings = schema.flatMap((group) => group.settings ?? []);
for (const id of ["product_publication_approved", "checkout_enabled"]) {
  const control = schemaSettings.find((setting) => setting.id === id);
  if (!control || control.type !== "checkbox" || control.default !== false) {
    failures.push(`config/settings_schema.json: ${id} must be a false-by-default checkbox`);
  }
}
const corporateName = schemaSettings.find((setting) => setting.id === "corporate_display_name");
if (!corporateName || Object.hasOwn(corporateName, "default")) {
  failures.push("config/settings_schema.json: corporate_display_name must not have a default");
}
if (schemaSettings.some((setting) => setting.id === "show_internal_product_meta")) {
  failures.push("config/settings_schema.json: internal product metadata control is forbidden");
}

const liquidFiles = walk(appRoot)
  .filter((file) => path.extname(file) === ".liquid")
  .map((file) => ({
    relativePath: path.relative(appRoot, file).split(path.sep).join("/"),
    source: readFileSync(file, "utf8"),
  }));

const forbiddenRuntimePatterns = [
  ["internal SKU", /selected_variant[.]sku|variant[.]sku/i],
  ["internal weight", /weight_with_unit|selected_variant[.]weight/i],
  ["vendor identity", /product[.]vendor/i],
  ["HS code", /hs[_ -]?code/i],
  ["Shopify full product structured-data filter", /product\s*[|]\s*structured_data/i],
];

for (const { relativePath, source } of liquidFiles) {
  for (const [label, pattern] of forbiddenRuntimePatterns) {
    if (pattern.test(source)) failures.push(`${relativePath}: contains forbidden ${label}`);
  }

  const unguardedCommerce = contentOutsideMarkedSegments(
    relativePath,
    source,
    commerceStart,
    commerceEnd,
    "settings.checkout_enabled",
  );
  const commercePatterns = [
    /[|]\s*money(?:_without_currency)?\b/i,
    /\bcart[.]/i,
    /routes[.]cart_url/i,
    /{%\s*form\s+'product'/i,
    /name="(?:add|checkout|update)"/i,
    /url_to_remove/i,
    /(?:selected_variant|product)[.]available/i,
  ];
  for (const pattern of commercePatterns) {
    if (pattern.test(unguardedCommerce)) {
      failures.push(`${relativePath}: commerce output exists outside a checkout approval marker`);
      break;
    }
  }

  const unguardedPublication = contentOutsideMarkedSegments(
    relativePath,
    source,
    publicationStart,
    publicationEnd,
    "settings.product_publication_approved",
  );
  const publicationPatterns = [
    /(?:{{|{%)[^}\n]*\bproduct[.]/i,
    /(?:{{|{%)[^}\n]*\bcollection[.]/i,
    /(?:{{|{%)[^}\n]*\bcollections\[/i,
    /(?:{{|{%)[^}\n]*\bsearch[.]/i,
    /(?:{{|{%)[^}\n]*\bselected_variant\b/i,
  ];
  for (const pattern of publicationPatterns) {
    if (pattern.test(unguardedPublication)) {
      failures.push(`${relativePath}: product or collection data exists outside a publication approval marker`);
      break;
    }
  }
}

for (const relativePath of [
  "sections/main-index.liquid",
  "sections/main-collection.liquid",
  "sections/main-list-collections.liquid",
  "sections/main-product.liquid",
  "sections/main-search.liquid",
  "snippets/product-card.liquid",
]) {
  const source = read(relativePath);
  requireText(relativePath, source, publicationStart);
  requireText(relativePath, source, publicationEnd);
  requireText(relativePath, source, "settings.product_publication_approved");
}

const cart = read("sections/main-cart.liquid");
requireText(
  "sections/main-cart.liquid",
  cart,
  "{% if settings.product_publication_approved and settings.checkout_enabled %}",
);
const header = read("sections/header.liquid");
for (const token of [
  "site-nav--desktop",
  "mobile-menu__summary",
  "mobile-menu__panel",
  "primary-navigation-links",
]) {
  requireText("sections/header.liquid", header, token);
}
const themeStyles = read("assets/mochirii-theme.css");
for (const token of [
  ".site-nav--desktop",
  ".mobile-menu__summary",
  ".mobile-menu__panel",
  "@media (max-width: 960px)",
]) {
  requireText("assets/mochirii-theme.css", themeStyles, token);
}
const primaryNavigation = read("snippets/primary-navigation-links.liquid");
requireText(
  "snippets/primary-navigation-links.liquid",
  primaryNavigation,
  "{% if settings.product_publication_approved and settings.checkout_enabled %}",
);
const footer = read("sections/footer.liquid");
if (/corporate_display_name\s*[|]\s*default/i.test(footer)) {
  failures.push("sections/footer.liquid: legal entity name must not use a fallback");
}
requireText(
  "sections/footer.liquid",
  footer,
  "{% if settings.corporate_display_name != blank %}",
);

const productStructuredData = read("snippets/structured-data.liquid");
requireText(
  "snippets/structured-data.liquid",
  productStructuredData,
  "request.page_type == 'product' and settings.product_publication_approved",
);
for (const forbiddenField of ['"offers"', '"brand"', '"sku"', '"price"']) {
  if (productStructuredData.toLowerCase().includes(forbiddenField)) {
    failures.push(`snippets/structured-data.liquid: minimal Product JSON-LD must not contain ${forbiddenField}`);
  }
}

const product = read("sections/main-product.liquid");
requireText(
  "sections/main-product.liquid",
  product,
  "Warning information is not available on this page. Review the product label before use.",
);
if (product.includes("No additional product-specific warnings are listed")) {
  failures.push("sections/main-product.liquid: must not infer that an empty warning field means no additional warnings");
}

const filterMetafieldTool = read("scripts/lib/shopify-filter-metafield-csv.mjs");
for (const token of [
  "SHOPIFY_FILTER_METAFIELD_DEFINITIONS",
  "buildShopifyFilterMetafieldInputs",
  "Exactly 20 manifest products are required",
  "skin_type_options",
  "concern_options",
  "list.single_line_text_field",
]) {
  requireText("scripts/lib/shopify-filter-metafield-csv.mjs", filterMetafieldTool, token);
}
const productCopyTool = read("scripts/lib/shopify-product-copy-csv.mjs");
for (const token of [
  "SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS",
  "buildShopifyProductCopyRows",
  "serializeShopifyProductCopyRows",
  "Exactly 20 approved public-copy products are required",
  "does not match the approved copy-only columns",
]) {
  requireText("scripts/lib/shopify-product-copy-csv.mjs", productCopyTool, token);
}
const genericTools = [
  ["scripts/lib/shopify-filter-metafield-csv.mjs", filterMetafieldTool],
  ["scripts/lib/shopify-product-copy-csv.mjs", productCopyTool],
];
for (const [label, pattern] of [
  ["filesystem access", /(?:node:fs|from ["']fs["'])/i],
  ["child-process execution", /(?:node:child_process|child_process)/i],
  ["environment access", /process[.]env/i],
  ["network access", /\bfetch\s*[(]|https?:\/\//i],
  ["provider mutation operation", /\b(?:mutation|adminApi|graphql|productUpdate)\b/i],
]) {
  for (const [relativePath, source] of genericTools) {
    if (pattern.test(source)) {
      failures.push(`${relativePath}: generic tooling contains ${label}`);
    }
  }
}

const giftCard = read("templates/gift_card.liquid");
for (const token of [
  commerceStart,
  commerceEnd,
  "settings.product_publication_approved and settings.checkout_enabled",
  '<meta name="robots" content="noindex, nofollow">',
]) {
  requireText("templates/gift_card.liquid", giftCard, token);
}

const seoMeta = read("snippets/seo-meta.liquid");
for (const token of [
  "settings.default_meta_description",
  "seo_title | escape_once",
  "social_image_width",
  "social_image_height",
]) {
  requireText("snippets/seo-meta.liquid", seoMeta, token);
}

const themeLayout = read("layout/theme.liquid");
for (const token of [
  "request.page_type == 'page'",
  "page.title | append: page.title",
  "public_page_title | slice: 0, duplicated_page_title_prefix_length",
  "public_page_title | remove_first: page.title",
]) {
  requireText("layout/theme.liquid", themeLayout, token);
}

if (failures.length) {
  console.error("Shopify release-safety check failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Shopify release-safety check OK (${liquidFiles.length} Liquid files).`);
