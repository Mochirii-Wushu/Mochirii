import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(appRoot, relativePath), "utf8");
}

function readThemeJson(relativePath) {
  return JSON.parse(read(relativePath).replace(/^\s*[/][*][\s\S]*?[*][/]\s*/u, ""));
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

const settings = readThemeJson("config/settings_data.json");
if (settings.current?.checkout_enabled !== false) {
  failures.push("config/settings_data.json: checkout_enabled must remain false");
}
for (const removedSetting of ["product_publication_approved", "show_internal_product_meta"]) {
  if (Object.hasOwn(settings.current ?? {}, removedSetting)) {
    failures.push(`config/settings_data.json: obsolete or unsafe setting is forbidden: ${removedSetting}`);
  }
}

const schema = readThemeJson("config/settings_schema.json");
const schemaSettings = schema.flatMap((group) => group.settings ?? []);
const checkoutControl = schemaSettings.find((setting) => setting.id === "checkout_enabled");
if (!checkoutControl || checkoutControl.type !== "checkbox" || checkoutControl.default !== false) {
  failures.push("config/settings_schema.json: checkout_enabled must be a false-by-default checkbox");
}
for (const removedSetting of ["product_publication_approved", "show_internal_product_meta"]) {
  if (schemaSettings.some((setting) => setting.id === removedSetting)) {
    failures.push(`config/settings_schema.json: obsolete or unsafe setting is forbidden: ${removedSetting}`);
  }
}

const liquidFiles = walk(appRoot)
  .filter((file) => path.extname(file) === ".liquid")
  .map((file) => ({
    relativePath: path.relative(appRoot, file).split(path.sep).join("/"),
    source: readFileSync(file, "utf8"),
  }));

const forbiddenRuntimePatterns = [
  ["internal product metadata setting", /show_internal_product_meta/iu],
  ["obsolete publication setting", /product_publication_approved/iu],
  ["internal SKU output", /selected_variant[.]sku|variant[.]sku/iu],
  ["internal weight output", /weight_with_unit|selected_variant[.]weight/iu],
  ["vendor identity output", /product[.]vendor/iu],
  ["HS code output", /hs[_ -]?code/iu],
];

for (const { relativePath, source } of liquidFiles) {
  for (const [label, pattern] of forbiddenRuntimePatterns) {
    if (pattern.test(source)) failures.push(`${relativePath}: contains forbidden ${label}`);
  }
  if (relativePath !== "sections/main-cart.liquid" && /name=["']checkout["']/iu.test(source)) {
    failures.push(`${relativePath}: checkout submission exists outside the guarded cart surface`);
  }
}

const cart = read("sections/main-cart.liquid");
for (const token of [
  "{% if settings.checkout_enabled %}",
  '<button class="button" type="submit" name="checkout">Checkout</button>',
  '<button class="button" type="button" disabled="disabled">Checkout opens when the store launches.</button>',
]) {
  requireText("sections/main-cart.liquid", cart, token);
}

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
  ".site-nav__sublist",
  ".site-nav__item--expanded > .site-nav__sublist",
  ".site-nav__toggle",
  ".mobile-menu__summary",
  ".mobile-menu__panel",
  '.field [aria-invalid="true"]',
  "@media (max-width: 960px)",
]) {
  requireText("assets/mochirii-theme.css", themeStyles, token);
}

const product = read("sections/main-product.liquid");
for (const token of [
  "Warning information is not available on this page. Review the product label before use.",
  "{% form 'product', product, class: 'product-form product-purchase' %}",
  'data-product-variant-status aria-live="polite" aria-atomic="true"',
  "Complete your routine",
]) {
  requireText("sections/main-product.liquid", product, token);
}
if (product.includes("No additional product-specific warnings are listed")) {
  failures.push("sections/main-product.liquid: empty warnings must fail closed");
}

const themeScript = read("assets/mochirii-theme.js");
for (const token of [
  "variantStatus.textContent",
  'field.setAttribute("aria-invalid", "true")',
  'field.setAttribute("aria-describedby", error.id)',
  'form.querySelector("[data-contact-error-summary]")',
  'document.querySelectorAll("[data-navigation-toggle]")',
]) {
  requireText("assets/mochirii-theme.js", themeScript, token);
}

const contactPage = read("sections/main-page.liquid");
for (const token of [
  "data-contact-error-summary",
  "data-contact-field",
  'aria-invalid="true" aria-describedby=',
  "data-contact-field-error",
]) {
  requireText("sections/main-page.liquid", contactPage, token);
}

const primaryNavigation = read("snippets/primary-navigation-links.liquid");
for (const token of [
  'class="site-nav__list"',
  "link.links.size > 0",
  "child_link.links.size > 0",
  "grandchild_link",
  "data-navigation-toggle",
  'aria-expanded="false"',
]) {
  requireText("snippets/primary-navigation-links.liquid", primaryNavigation, token);
}

for (const token of [
  "navigation_id: 'desktop-primary'",
  "navigation_id: 'mobile-primary'",
]) {
  requireText("sections/header.liquid", header, token);
}

if (themeStyles.includes(".site-nav__item:hover > .site-nav__sublist")) {
  failures.push("assets/mochirii-theme.css: disclosure state must exclusively control desktop nested navigation");
}

const footer = read("sections/footer.liquid");
requireText("sections/footer.liquid", footer, "{% if link.url != blank %}");
if (footer.includes("/pages/data-sharing-opt-out")) {
  failures.push("sections/footer.liquid: privacy choices must come from a configured provider menu link");
}

for (const relativePath of ["sections/main-index.liquid", "sections/main-collection.liquid"]) {
  const source = read(relativePath);
  if (/render 'product-card'[^\n]*(?:image_loading|image_fetchpriority)/u.test(source)) {
    failures.push(`${relativePath}: below-fold product cards must not be forced eager or high-priority`);
  }
}

const search = read("sections/main-search.liquid");
requireText(
  "sections/main-search.liquid",
  search,
  "Try another product name or ingredient, or browse all skincare.",
);

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

for (const [relativePath, source] of [
  ["scripts/lib/shopify-filter-metafield-csv.mjs", filterMetafieldTool],
  ["scripts/lib/shopify-product-copy-csv.mjs", productCopyTool],
]) {
  for (const [label, pattern] of [
    ["filesystem access", /(?:node:fs|from ["']fs["'])/iu],
    ["child-process execution", /(?:node:child_process|child_process)/iu],
    ["environment access", /process[.]env/iu],
    ["network access", /\bfetch\s*[(]|https?:\/\//iu],
    ["provider mutation operation", /\b(?:mutation|adminApi|graphql|productUpdate)\b/iu],
  ]) {
    if (pattern.test(source)) failures.push(`${relativePath}: generic tooling contains ${label}`);
  }
}

const seoMeta = read("snippets/seo-meta.liquid");
for (const token of [
  "settings.default_meta_description",
  "seo_title | replace: '&amp;', '&'",
  "seo_title | escape",
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

console.log(`Shopify release-safety check OK (${liquidFiles.length} Liquid files; products visible, checkout disabled).`);
