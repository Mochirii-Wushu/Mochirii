import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

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

const privateBrandPattern = new RegExp(
  `\\b(?:${["self" + "named", "ma" + "dara", "vele" + "sari"].join("|")})\\b`,
  "iu",
);

const bannedPatterns = [
  ["internal approval language", /\b(?:approved package|approved product|source verification|verified product facts?|product standards?)\b/iu],
  ["operator state language", /\b(?:being prepared|internal product(?: data| details| metadata)?)\b/iu],
  ["mood-only filler", /\b(?:calm|quiet|warm|thoughtful|considered|elevated|timeless|luxurious|ritual|curated|transform|unlock)\b/iu],
  ["supplier or legacy brand", privateBrandPattern],
  ["inconsistent skincare spelling", /\bskin care\b/iu],
  ["obsolete availability label", /\b(?:Available|Unavailable)\b/u],
  ["doubled page title", /\b(?:AboutAbout|ContactContact)\b/u],
];

for (const file of files) {
  const relativePath = path.relative(appRoot, file).split(path.sep).join("/");
  const source = readFileSync(file, "utf8");
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
