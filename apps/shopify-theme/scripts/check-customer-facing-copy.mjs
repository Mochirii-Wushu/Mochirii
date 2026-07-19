import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { customerLanguageIssueCategories } from "./lib/launch-content-contracts.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function withoutComments(source, { joinMarkupComments = false } = {}) {
  const markupReplacement = joinMarkupComments ? "" : " ";
  return source
    .replaceAll(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/giu, markupReplacement)
    .replaceAll(/<!--[\s\S]*?-->/gu, markupReplacement)
    .replaceAll(/\/\*[\s\S]*?\*\//gu, " ");
}

function quotedLiterals(source, { javascript = false } = {}) {
  const values = [];
  for (const match of source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/gu)) {
    const value = match[2].replaceAll(/\$\{[\s\S]*?\}/gu, " ").trim();
    if (!value || (javascript && value === "Escape")) continue;
    if (/^(?:[\w.-]+\/)*[\w.-]+[.](?:css|gif|jpe?g|js|json|liquid|png|svg|webp)$/iu.test(value)) continue;
    if (/^(?:%[A-Za-z](?:[\s,./:-]+|$))+$/u.test(value)) continue;
    if (/^(?:%[0-9A-F]{2})+$/iu.test(value)) continue;
    values.push(value);
  }
  return values;
}

function jsonStringValues(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => jsonStringValues(item, output));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => jsonStringValues(item, output));
  }
  return output;
}

function liquidCustomerTextVariant(source, { joinStructuralSeparators }) {
  const liquidLiterals = [];
  let markup = withoutComments(source, { joinMarkupComments: joinStructuralSeparators });
  markup = markup.replaceAll(
    /\{\{-?([\s\S]*?)-?\}\}|\{%-?([\s\S]*?)-?%\}/gu,
    (_match, outputBody, tagBody) => {
      const expression = (outputBody ?? tagBody ?? "").replaceAll(
        /\b(?:all_products|articles|blogs|collections|linklists|pages)\s*\[\s*(["'])(?:\\.|(?!\1)[\s\S])*?\1\s*\]/gu,
        " ",
      );
      liquidLiterals.push(...quotedLiterals(expression));
      return joinStructuralSeparators ? "" : " ";
    },
  );
  markup = markup
    .replaceAll(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replaceAll(/<script\b(?![^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/giu, " ");

  const attributeValues = [...markup.matchAll(
    /\b(?:alt|aria-label|content|placeholder|title)\s*=\s*(["'])([\s\S]*?)\1/giu,
  )].map((match) => match[2]);
  const visibleText = markup.replaceAll(/<[^>]*>/gu, joinStructuralSeparators ? "" : " ");
  return [...liquidLiterals, ...attributeValues, visibleText].join(" ");
}

function liquidCustomerText(source) {
  return [
    liquidCustomerTextVariant(source, { joinStructuralSeparators: false }),
    liquidCustomerTextVariant(source, { joinStructuralSeparators: true }),
  ].join(" ");
}

export function runtimeCustomerLanguageCategories(relativePath, source) {
  const extension = path.extname(relativePath).toLocaleLowerCase("en-US");
  let customerText;
  if (extension === ".liquid") {
    customerText = liquidCustomerText(source);
  } else if (extension === ".json") {
    const uncommented = withoutComments(source);
    try {
      customerText = jsonStringValues(JSON.parse(uncommented)).join(" ");
    } catch {
      customerText = quotedLiterals(uncommented).join(" ");
    }
  } else if (extension === ".js") {
    customerText = quotedLiterals(withoutComments(source), { javascript: true }).join(" ");
  } else {
    customerText = source;
  }
  return customerLanguageIssueCategories(customerText);
}

const bannedPatterns = [
  ["internal approval language", /\b(?:approved package|approved product|source verification|verified product facts?|product standards?)\b/iu],
  ["operator state language", /\b(?:being prepared|internal product(?: data| details| metadata)?)\b/iu],
  ["inconsistent skincare spelling", /\bskin care\b/iu],
  ["obsolete availability label", /\b(?:Available|Unavailable)\b/u],
  ["doubled page title", /\b(?:AboutAbout|ContactContact)\b/u],
];

function run() {
  const failures = [];
  const runtimeCopyRoots = [
    "assets",
    "blocks",
    "config",
    "layout",
    "locales",
    "sections",
    "snippets",
    "templates",
  ];
  const files = runtimeCopyRoots
    .flatMap((root) => walk(path.join(appRoot, root)))
    .filter((file) => [".js", ".json", ".liquid"].includes(path.extname(file)));

  for (const file of files) {
    const relativePath = path.relative(appRoot, file).split(path.sep).join("/");
    const source = readFileSync(file, "utf8");
    for (const category of runtimeCustomerLanguageCategories(relativePath, source)) {
      failures.push(`${relativePath}: contains customer-language policy category: ${category}`);
    }
    for (const [label, pattern] of bannedPatterns) {
      if (pattern.test(source)) failures.push(`${relativePath}: contains ${label}`);
    }
  }

  const layout = readFileSync(path.join(appRoot, "layout/theme.liquid"), "utf8");
  for (const token of [
    "page.title | append: page.title",
    "public_page_title | remove_first: page.title",
    "{% render 'seo-meta', seo_title_override: public_page_title, seo_description_override: public_page_description %}",
  ]) {
    if (!layout.includes(token)) failures.push(`layout/theme.liquid: missing title-safety token: ${token}`);
  }

  const seoMeta = readFileSync(path.join(appRoot, "snippets/seo-meta.liquid"), "utf8");
  if (!seoMeta.includes("seo_title | replace: '&amp;', '&'")) {
    failures.push("snippets/seo-meta.liquid: encoded title entities are not normalized before escaping");
  }

  if (failures.length > 0) {
    console.error("Customer-facing copy guard failed.");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Customer-facing copy guard OK (${files.length} runtime files).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
