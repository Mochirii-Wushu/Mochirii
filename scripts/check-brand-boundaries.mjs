import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const formerCompanyBrand = ["vele", "sari"].join("");
const formerRepositoryOwner = ["anthy", "phera"].join("");
const formerManufacturingPartner = ["self", "named"].join("");
const formerManufacturerBrand = ["ma", "dara"].join("");
const personalAccountIdentity = ["xart", "aiusx"].join("");
const privateWorkstationIdentity = ["xty", "ty"].join("");
const legacyPersonalIdentity = ["ar", "taius"].join("");
const forbiddenTokens = [
  { label: "former company brand", value: formerCompanyBrand },
  { label: "former repository owner", value: formerRepositoryOwner },
  { label: "manufacturing-partner identity or domain", value: formerManufacturingPartner },
  { label: "manufacturer brand identity or domain", value: formerManufacturerBrand },
  { label: "personal account identity", value: personalAccountIdentity },
  { label: "private workstation identity", value: privateWorkstationIdentity },
  {
    label: "legacy personal identity",
    value: legacyPersonalIdentity,
    allowInApprovedImmutableEvidence: true,
  },
];
const forbiddenContentPatterns = [
  { label: "internal price multiplier", pattern: /\b2[.]2\s*(?:x|times)\b/i },
  { label: "internal margin target", pattern: /\b45\s*%\s*(?:contribution[- ]?)?margin\b/i },
  { label: "private source-portal path", pattern: /\bprofile\/my-products\b/i },
  { label: "private supplier-side catalog evidence", pattern: /\bsupplier[- ]side product (?:set|list|entries)\b/i },
];
const separationMetadataPaths = new Set([
  "apps/shopify-theme/ACTIVE-SOURCE-MANIFEST.v1.json",
  "apps/shopify-theme/MIGRATION-MANIFEST.json",
  "apps/shopify-theme/README.md",
  "docs/shopify-theme-migration-2026-07-16.md",
]);
const forbiddenSeparationMetadataPatterns = [
  { label: "private source-reference field", pattern: /\b(?:sourcecheckpoint|receivingrepositorybase)\b/i },
  { label: "raw Git object ID", pattern: /\b[0-9a-f]{40}\b/i },
  {
    label: "provider operational identifier",
    pattern: /\b(?:deployment|project|environment|installation|workflow|theme)[-_ ]?(?:id|identifier)\s*[:=]\s*["']?[a-z0-9][a-z0-9._:-]{3,}/i,
  },
];

const ignoredFiles = new Set(["scripts/check-brand-boundaries.mjs"]);
// Evidence exceptions are exact and reviewable; a date-shaped filename alone never bypasses a guard.
const approvedImmutableDatedEvidenceDigests = new Map([
  [
    "docs/operations/history/REPOSITORY-RENAME-2026-07-28.md",
    "f29ad6ef7d1410e164c059101881ce44be0c587626c6723f9bc8ce7d6e76e07c",
  ],
]);
const placeholderHomeSegments = new Set([
  "example",
  "example-user",
  "user",
  "username",
  "your-user",
  "your-username",
]);
const forbiddenPathPrefixes = [
  "private-evidence/",
  "tmp/",
  ".vercel/",
  ".env/",
];
const forbiddenFilePatterns = [
  /(^|\/)\.env(?:\.[^/]+)?$/i,
  /(^|\/)(?:credentials?|secrets?)(?:\.[^/]+)?$/i,
  /\.(?:key|p12|pfx|pem)$/i,
];
const allowedCredentialExamples = new Set([
  "services/social/.env.docker.example",
  "services/social/.env.testing",
]);
const textExtensions = new Set([
  ".css",
  ".c",
  ".conf",
  ".config",
  ".cpp",
  ".cs",
  ".csv",
  ".fs",
  ".fsx",
  ".go",
  ".gql",
  ".graphql",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".liquid",
  ".lock",
  ".md",
  ".mjs",
  ".php",
  ".ps1",
  ".psd1",
  ".psm1",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svg",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml",
  ".zsh",
]);
const extensionlessTextFiles = new Set([
  ".env.example",
  ".gitattributes",
  ".gitignore",
  ".node-version",
  ".nvmrc",
  ".shopifyignore",
  "artisan",
  "Caddyfile",
  "CNAME",
  "CODEOWNERS",
  "Dockerfile",
  "LICENSE",
]);
const reviewedLargeTextBudgets = new Map([
  ["services/social/storage/app/cities.json", 13 * 1024 * 1024],
]);
const failures = [];

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function normalized(value) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

function shouldIgnore(relativePath) {
  return ignoredFiles.has(relativePath);
}

function isTextCandidate(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  const basename = path.basename(relativePath);
  return textExtensions.has(extension) || extensionlessTextFiles.has(basename);
}

function separationMetadataFailures(line) {
  return forbiddenSeparationMetadataPatterns
    .filter((rule) => rule.pattern.test(line))
    .map((rule) => rule.label);
}

function isApprovedImmutableDatedEvidence(relativePath) {
  return approvedImmutableDatedEvidenceDigests.has(relativePath);
}

function isPlaceholderHomeSegment(segment) {
  const unwrapped = normalized(segment).replace(/^[${<%]+|[}>%]+$/gu, "");
  return placeholderHomeSegments.has(unwrapped);
}

function forbiddenTokenFailures(value, relativePath) {
  const normalizedValue = normalized(value);
  return forbiddenTokens
    .filter((rule) => !(rule.allowInApprovedImmutableEvidence && isApprovedImmutableDatedEvidence(relativePath)))
    .filter((rule) => normalizedValue.includes(rule.value))
    .map((rule) => rule.label);
}

function personalHomePathFailures(line, relativePath) {
  if (isApprovedImmutableDatedEvidence(relativePath)) return [];

  const matches = [];
  const rules = [
    {
      label: "non-placeholder Windows user-home path",
      pattern: /\b[a-z]:[\\/]+users[\\/]+([^\\/\s"'<>`]+)/giu,
    },
    {
      label: "non-placeholder POSIX user-home path",
      pattern: /(?:^|[\s"'(`=])\/home\/([^/\s"'<>`]+)/giu,
    },
    {
      label: "non-placeholder file-URI user-home path",
      pattern: /\bfile:\/{3}(?:home|users)\/([^/\s"'<>`]+)/giu,
    },
    {
      label: "non-placeholder WSL user-home path",
      pattern: /(?:^|[\s"'(`=])\/mnt\/[a-z]\/users\/([^/\s"'<>`]+)/giu,
    },
    {
      label: "non-placeholder macOS user-home path",
      pattern: /(?:^|[\s"'(`=])\/Users\/([^/\s"'<>`]+)/gu,
    },
  ];
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of String(line || "").matchAll(rule.pattern)) {
      if (!isPlaceholderHomeSegment(match[1])) matches.push(rule.label);
    }
  }
  return matches;
}

if (!existsSync(repoRoot)) {
  console.error("Brand boundary check failed: repository root not found.");
  process.exit(1);
}

const trackedFiles = [...new Set(execFileSync(
  "git",
  ["-C", repoRoot, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
  },
).split("\0").filter(Boolean))];

const sourceReferenceCanary = `sourceCheckpoint: "${"a".repeat(40)}"`;
const providerIdentifierCanary = "deploymentId: preview-1234";
const extensionlessGovernanceCanary = {
  path: ".github/CODEOWNERS",
  content: `* @${["xart", "aiusx"].join("")}`,
};
const privateWorkstationCanary = `C:/Users/${["xty", "ty"].join("")}/workspace`;
const windowsUserHomeCanary = "C:/Users/real-person/workspace";
const posixUserHomeCanary = "/home/real-person/workspace";
const backtickedPosixHomeCanary = "`/home/real-person/workspace`";
const fileUriHomeCanary = "file:///home/real-person/workspace";
const wslUserHomeCanary = "/mnt/c/Users/real-person/workspace";
const macUserHomeCanary = "/Users/real-person/workspace";
const placeholderPosixHomeCanary = "/home/username/workspace";
const ordinaryHomeUrlCanary = "https://example.com/home/member/profile";
const immutableEvidenceHomeCanary = "/home/evidence-operator/workspace";
const legacyPersonalIdentityCanary = ["ar", "taius"].join("");
const immutableEvidenceLegacyIdentityCanary = ["ar", "taius"].join("");
if (separationMetadataFailures(sourceReferenceCanary).length < 2 ||
    separationMetadataFailures(providerIdentifierCanary).length !== 1) {
  console.error("Brand boundary check failed: separation-metadata canary did not trigger.");
  process.exit(1);
}
if (
  !isTextCandidate(extensionlessGovernanceCanary.path)
  || !forbiddenTokenFailures(extensionlessGovernanceCanary.content, extensionlessGovernanceCanary.path)
    .includes("personal account identity")
) {
  console.error("Brand boundary check failed: extensionless governance canary was not scanned.");
  process.exit(1);
}
if (forbiddenTokenFailures(privateWorkstationCanary, "docs/example.md").length !== 1) {
  console.error("Brand boundary check failed: private workstation canary was not scanned.");
  process.exit(1);
}
if (
  personalHomePathFailures(windowsUserHomeCanary, "docs/example.md").length !== 1
  || personalHomePathFailures(posixUserHomeCanary, "docs/example.md").length !== 1
  || personalHomePathFailures(backtickedPosixHomeCanary, "docs/example.md").length !== 1
  || personalHomePathFailures(fileUriHomeCanary, "docs/example.md").length !== 1
  || personalHomePathFailures(wslUserHomeCanary, "docs/example.md").length !== 1
  || personalHomePathFailures(macUserHomeCanary, "docs/example.md").length !== 1
  || personalHomePathFailures(placeholderPosixHomeCanary, "docs/example.md").length !== 0
  || personalHomePathFailures(
    immutableEvidenceHomeCanary,
    "docs/operations/history/REPOSITORY-RENAME-2026-07-28.md",
  ).length !== 0
  || personalHomePathFailures(ordinaryHomeUrlCanary, "docs/example.md").length !== 0
) {
  console.error("Brand boundary check failed: personal home-path canary contract did not hold.");
  process.exit(1);
}

for (const [relativePath, expectedDigest] of approvedImmutableDatedEvidenceDigests) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: approved immutable evidence is missing`);
    continue;
  }
  const actualDigest = createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
  if (actualDigest !== expectedDigest) {
    failures.push(`${relativePath}: approved immutable evidence digest changed`);
  }
}
if (!["scripts/example.sh", "app/example.php", "supabase/example.sql", "config/example.toml"].every(isTextCandidate)) {
  failures.push("brand boundary text-extension canary did not cover operational source formats");
}
if (
  forbiddenTokenFailures(legacyPersonalIdentityCanary, "docs/example.md").length !== 1
  || forbiddenTokenFailures(
    immutableEvidenceLegacyIdentityCanary,
    "docs/operations/history/REPOSITORY-RENAME-2026-07-28.md",
  ).length !== 0
) {
  console.error("Brand boundary check failed: legacy personal identity canary was not scanned.");
  process.exit(1);
}

for (const relativePath of trackedFiles) {
  if (shouldIgnore(relativePath)) continue;

  const lowerPath = normalized(relativePath);
  for (const label of forbiddenTokenFailures(relativePath, relativePath)) {
    failures.push(`${relativePath}: path contains ${label}`);
  }
  if (forbiddenPathPrefixes.some((prefix) => lowerPath.startsWith(prefix))) {
    failures.push("tracked private-evidence or provider-output path is forbidden");
    continue;
  }
  if (
    forbiddenFilePatterns.some((pattern) => pattern.test(relativePath))
    && !relativePath.endsWith(".env.example")
    && !allowedCredentialExamples.has(lowerPath)
  ) {
    failures.push("tracked credential-shaped file path is forbidden");
    continue;
  }

  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) continue;
  if (!isTextCandidate(relativePath)) continue;
  const fileSize = statSync(absolutePath).size;
  if (fileSize > 5 * 1024 * 1024) {
    const reviewedBudget = reviewedLargeTextBudgets.get(relativePath);
    if (reviewedBudget === undefined || fileSize > reviewedBudget) {
      failures.push(`${relativePath}: text candidate exceeds its reviewed size budget`);
      continue;
    }
  }

  const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const lowerLine = normalized(line);
    for (const label of forbiddenTokenFailures(line, relativePath)) {
      failures.push(`${relativePath}:${index + 1}: contains ${label}`);
    }
    for (const label of personalHomePathFailures(line, relativePath)) {
      failures.push(`${relativePath}:${index + 1}: contains ${label}`);
    }
    for (const rule of forbiddenContentPatterns) {
      if (rule.pattern.test(lowerLine)) {
        failures.push(`${relativePath}:${index + 1}: contains ${rule.label}`);
      }
    }
    if (separationMetadataPaths.has(relativePath)) {
      for (const label of separationMetadataFailures(lowerLine)) {
        failures.push(`${relativePath}:${index + 1}: contains ${label}`);
      }
    }
  });
}

if (failures.length) {
  console.error("Brand boundary check failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Brand boundary check OK.");
