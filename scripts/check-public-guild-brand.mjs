import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const expected = Object.freeze({
  publicGuild: "Mōchirīī",
  publicShort: "Mōchī",
  publicSocial: "Mōchirīī Social",
  technical: "Mochirii",
  commerce: "Mochirii Cosmetics",
});
const scanRoots = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
  "apps/web/public/data",
];
const extensions = new Set([".ts", ".tsx", ".json"]);
const exceptionPath = path.join(root, "scripts/public-brand-exceptions.json");

function filesUnder(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path.relative(root, absolute));
    return extensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

function maskApprovedFragments(line, applicableExceptions) {
  let masked = line;
  for (const { fragment } of applicableExceptions) {
    if (!masked.includes(fragment)) continue;
    masked = masked.replaceAll(fragment, " ".repeat(fragment.length));
  }
  return masked;
}

if (!existsSync(exceptionPath)) failures.push("scripts/public-brand-exceptions.json: missing exception register.");
const exceptions = existsSync(exceptionPath)
  ? JSON.parse(readFileSync(exceptionPath, "utf8"))
  : [];
const usedExceptions = new Set();

for (const absolute of scanRoots.flatMap(filesUnder)) {
  const relative = path.relative(root, absolute).replaceAll("\\", "/");
  const source = readFileSync(absolute, "utf8");
  source.split(/\r?\n/u).forEach((line, index) => {
    if (!/\bMochirii\b/u.test(line)) return;
    const applicableExceptions = exceptions.filter((entry) =>
      entry?.path === relative
      && typeof entry?.fragment === "string"
      && entry.fragment.length > 0
      && line.includes(entry.fragment)
      && typeof entry?.reason === "string"
      && entry.reason.trim().length >= 12);
    for (const match of applicableExceptions) {
      usedExceptions.add(exceptions.indexOf(match));
    }
    if (/\bMochirii\b/u.test(maskApprovedFragments(line, applicableExceptions))) {
      failures.push(`${relative}:${index + 1}: plain Mochirii is not approved on a public Website surface.`);
    }
  });

  for (const brand of [expected.publicGuild, expected.publicShort]) {
    const decomposed = brand.normalize("NFD");
    if (decomposed !== brand && source.includes(decomposed)) {
      failures.push(`${relative}: decomposed Unicode brand text must be normalized to NFC.`);
    }
  }
}

const occurrenceScopeCanary = maskApprovedFragments(
  "technical: Mochirii; visible: Mochirii",
  [{ fragment: "technical: Mochirii" }],
);
if (!/\bMochirii\b/u.test(occurrenceScopeCanary)) {
  failures.push("public-brand exception masking must not hide a second unapproved token on the same line.");
}

exceptions.forEach((entry, index) => {
  if (!usedExceptions.has(index)) {
    failures.push(`${entry?.path || "unknown"}: unused or duplicate public-brand exception: ${entry?.fragment || "missing fragment"}`);
  }
});

const contract = readFileSync(path.join(root, "apps/web/lib/brand.ts"), "utf8");
for (const [name, value] of Object.entries(expected)) {
  if (!contract.includes(`${name}: "${value}"`)) {
    failures.push(`apps/web/lib/brand.ts: missing exact ${name} value ${value}.`);
  }
  if (value !== value.normalize("NFC")) {
    failures.push(`brand contract: ${name} is not NFC normalized.`);
  }
}

if (failures.length) {
  console.error("Public guild brand contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Public guild brand contract OK.");
console.log("- Public guild surfaces use Mōchirīī and Mōchī in NFC form.");
console.log("- ASCII Mochirii remains limited to reviewed technical and commerce exceptions.");
