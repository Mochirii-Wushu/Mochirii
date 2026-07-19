import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import {
  redactedPriceVerification,
  verifyPrivatePriceLedger,
} from "./private-price-rule.mjs";
import { REQUIRED_RENDERED_ROUTE_CATEGORIES } from "./launch-content-contracts.mjs";

export const PREPAYMENT_GATE_POLICY = Object.freeze({
  gate: "mochirii-prepayment-complete",
  schema_version: 1,
  maximum_capture_age_hours: 24,
  repository: "Mochirii-Wushu/Mochirii",
  branch: "main",
  market_country: "US",
  market_currency: "USD",
  candidate_theme_id: "141514408011",
  candidate_theme_status: "Draft",
  canonical_emblem_asset: "apps/web/public/assets/img/brand/emblem.webp",
  canonical_emblem_sha256: "ed9fe4c522bc2b0d1c2072c1c098f241ee52f0ceec0307cb531ce440e730bb60",
  storefront_emblem_asset: "apps/shopify-theme/assets/mochirii-emblem.webp",
  storefront_emblem_sha256: "ad96d3428572404d9f5c1d7387669b5680920079cdf8cc637fdebfa217d00df4",
  wordmark: "Mochirii Cosmetics",
});

export const EXPECTED_PRODUCT_HANDLES = Object.freeze([
  "peptide-smoothing-serum",
  "natural-retinol-alternative-oil-serum",
  "vitamin-c-serum",
  "hyaluronic-day-cream",
  "moisturising-day-cream",
  "double-hydration-boost-gel",
  "sensitive-skin-oil-to-milk-cleanser",
  "biphasic-makeup-remover-fragrance-free",
  "collagen-night-cream",
  "ceramide-barrier-night-cream",
  "niacinamide-gel-moisturiser",
  "gentle-cleansing-milk",
  "aha-exfoliating-concentrate",
  "all-in-one-facial-oil",
  "retinol-alternative-moisturiser",
  "hydrating-toner",
  "sensitive-face-body-cleanser",
  "cleansing-foam",
  "caffeine-gel-booster",
  "smoothing-eye-cream",
]);

export const REQUIRED_EVIDENCE_KINDS = Object.freeze([
  "source-readback",
  "theme-package",
  "candidate-theme-readback",
  "rendered-route-readback",
  "product-review",
  "private-price-ledger",
  "private-price-shopify-readback",
  "private-price-report",
  "launch-pages-readback",
  "mandatory-name-review",
  "fulfillment-shipping-readback",
  "operations-readback",
  "accessibility-performance-readback",
]);

export const REQUIRED_SEARCH_QUERIES = Object.freeze([
  "moisturizer",
  "moisturiser",
  "niacinimide",
  "hyaluronic",
  "retinol",
  "cleanser",
]);

const ROOT_KEYS = Object.freeze([
  "schema_version",
  "gate",
  "captured_at",
  "market",
  "source",
  "candidate_theme",
  "rendered_routes",
  "product_review",
  "private_price",
  "launch_pages",
  "mandatory_name_review",
  "fulfillment_shipping",
  "operational_gates",
  "quality_assurance",
  "final_phase_exclusions",
  "evidence_files",
]);

const PRODUCT_RECORD_KEYS = Object.freeze([
  "handle",
  "variant_record_id",
  "active",
  "facts_pass",
  "formula_mapping_pass",
  "front_label_pass",
  "technical_panel_pass",
  "outer_box_pass",
  "media_pass",
  "emblem_pass",
  "wordmark_pass",
]);

const ROUTE_RESULT_KEYS = Object.freeze([
  "category",
  "checked_route_count",
  "http_pass",
  "readback_pass",
]);

const EVIDENCE_FILE_KEYS = Object.freeze(["id", "kind", "path", "sha256"]);
const SHA1_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const ROUTE_COUNT_REQUIREMENTS = Object.freeze(new Map([
  ["home", 1],
  ["collections", 5],
  ["products", 20],
  ["search-and-filters", 7],
  ["cart", 1],
  ["contact", 1],
  ["policies-and-privacy", 5],
  ["accounts", 1],
  ["errors", 2],
  ["password", 1],
  ["notifications", 3],
]));

function add(issues, gate, category) {
  issues.push({ gate, category });
}

function exactKeys(value, keys, issues, gate, category) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    add(issues, gate, `${category}.type`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    add(issues, gate, `${category}.keys`);
    return false;
  }
  return true;
}

function nonemptyString(value, issues, gate, category) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    add(issues, gate, `${category}.text`);
    return false;
  }
  return true;
}

function exactBoolean(value, expected, issues, gate, category) {
  if (value !== expected) add(issues, gate, category);
}

function exactValue(value, expected, issues, gate, category) {
  if (value !== expected) add(issues, gate, category);
}

function sameSet(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function captureMilliseconds(value) {
  if (typeof value !== "string") return Number.NaN;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) return Number.NaN;
  return parsed;
}

function requireFreshCapture(value, issues, gate, category, now) {
  const captured = captureMilliseconds(value);
  if (!Number.isFinite(captured)) {
    add(issues, gate, `${category}.format`);
    return;
  }
  const maximumAge = PREPAYMENT_GATE_POLICY.maximum_capture_age_hours * 60 * 60 * 1000;
  if (captured > now || now - captured > maximumAge) add(issues, gate, `${category}.freshness`);
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function evidencePathIsSafe(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || relativePath.includes("\\")) return false;
  if (path.posix.isAbsolute(relativePath) || relativePath.split("/").includes("..")) return false;
  return relativePath.startsWith(".artifacts/operations/") && path.posix.normalize(relativePath) === relativePath;
}

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readJsonEvidence(record, issues, gate, category) {
  if (!record?.buffer) return null;
  try {
    return JSON.parse(record.buffer.toString("utf8"));
  } catch {
    add(issues, gate, `${category}.parse`);
    return null;
  }
}

function validateEvidenceBoundary(bundlePath, repositoryRoot, issues) {
  const gate = "evidence";
  const allowedRoot = path.join(repositoryRoot, ".artifacts", "operations");
  const gitignorePath = path.join(repositoryRoot, ".gitignore");
  if (!existsSync(gitignorePath) ||
      !readFileSync(gitignorePath, "utf8").split(/\r?\n/u).includes(".artifacts/operations/")) {
    add(issues, gate, "ignored-boundary.configuration");
  }
  if (typeof bundlePath !== "string" || !existsSync(bundlePath) || !existsSync(allowedRoot)) {
    add(issues, gate, "bundle.boundary");
    return null;
  }
  try {
    const realAllowedRoot = realpathSync(allowedRoot);
    const realBundle = realpathSync(bundlePath);
    if (!lstatSync(realBundle).isFile() || !isInside(realBundle, realAllowedRoot)) {
      add(issues, gate, "bundle.boundary");
      return null;
    }
    return { allowedRoot, realAllowedRoot, realBundle };
  } catch {
    add(issues, gate, "bundle.boundary");
    return null;
  }
}

function validateEvidenceFiles(files, context, issues) {
  const gate = "evidence";
  const records = new Map();
  if (!Array.isArray(files) || files.length !== REQUIRED_EVIDENCE_KINDS.length) {
    add(issues, gate, "files.exact-count");
    return records;
  }
  const ids = [];
  const kinds = [];
  const paths = [];
  for (const entry of files) {
    if (!exactKeys(entry, EVIDENCE_FILE_KEYS, issues, gate, "file")) continue;
    if (!SLUG_PATTERN.test(entry.id ?? "")) add(issues, gate, "file.id");
    if (!REQUIRED_EVIDENCE_KINDS.includes(entry.kind)) add(issues, gate, "file.kind");
    if (!evidencePathIsSafe(entry.path)) add(issues, gate, "file.path");
    if (!SHA256_PATTERN.test(entry.sha256 ?? "")) add(issues, gate, "file.sha256");
    ids.push(entry.id);
    kinds.push(entry.kind);
    paths.push(entry.path);
    if (!evidencePathIsSafe(entry.path)) continue;
    const absolute = path.resolve(context.repositoryRoot, ...entry.path.split("/"));
    try {
      const realFile = realpathSync(absolute);
      if (!lstatSync(realFile).isFile() || !isInside(realFile, context.boundary.realAllowedRoot) ||
          realFile === context.boundary.realBundle) {
        add(issues, gate, "file.boundary");
        continue;
      }
      const buffer = readFileSync(realFile);
      if (digest(buffer) !== entry.sha256) add(issues, gate, "file.hash-mismatch");
      records.set(entry.id, { ...entry, buffer });
    } catch {
      add(issues, gate, "file.missing");
    }
  }
  if (new Set(ids).size !== ids.length) add(issues, gate, "file.duplicate-id");
  if (new Set(paths).size !== paths.length) add(issues, gate, "file.duplicate-path");
  if (!sameSet(kinds, REQUIRED_EVIDENCE_KINDS)) add(issues, gate, "file.kind-set");
  return records;
}

function requireEvidenceReference(reference, expectedKind, evidence, referencedIds, issues, gate, category) {
  if (!nonemptyString(reference, issues, gate, category)) return null;
  referencedIds.add(reference);
  const record = evidence.get(reference);
  if (!record) {
    add(issues, gate, `${category}.missing`);
    return null;
  }
  if (record.kind !== expectedKind) add(issues, gate, `${category}.kind`);
  return record;
}

function validateSource(source, evidence, referencedIds, issues, now) {
  const gate = "source";
  const keys = [
    "captured_at",
    "repository",
    "branch",
    "commit_sha",
    "tree_sha",
    "pull_request_merged",
    "protected_main",
    "accountable_human_review",
    "required_checks_passed",
    "package_sha256",
    "source_evidence_ref",
    "package_evidence_ref",
  ];
  if (!exactKeys(source, keys, issues, gate, "contract")) return;
  requireFreshCapture(source.captured_at, issues, gate, "capture", now);
  exactValue(source.repository, PREPAYMENT_GATE_POLICY.repository, issues, gate, "repository");
  exactValue(source.branch, PREPAYMENT_GATE_POLICY.branch, issues, gate, "branch");
  if (!SHA1_PATTERN.test(source.commit_sha ?? "")) add(issues, gate, "commit-sha");
  if (!SHA1_PATTERN.test(source.tree_sha ?? "")) add(issues, gate, "tree-sha");
  for (const field of ["pull_request_merged", "protected_main", "accountable_human_review", "required_checks_passed"]) {
    exactBoolean(source[field], true, issues, gate, field);
  }
  if (!SHA256_PATTERN.test(source.package_sha256 ?? "")) add(issues, gate, "package-sha256");
  requireEvidenceReference(source.source_evidence_ref, "source-readback", evidence, referencedIds, issues, gate, "source-evidence");
  const packageRecord = requireEvidenceReference(
    source.package_evidence_ref,
    "theme-package",
    evidence,
    referencedIds,
    issues,
    gate,
    "package-evidence",
  );
  if (packageRecord && packageRecord.sha256 !== source.package_sha256) add(issues, gate, "package-linkage");
}

function validateCandidate(candidate, source, evidence, referencedIds, issues, now) {
  const gate = "candidate-theme";
  const keys = [
    "captured_at",
    "theme_id",
    "status",
    "checkout_enabled",
    "password_protected",
    "published",
    "dedicated_hero_pass",
    "controlled_social_image_pass",
    "source_commit_sha",
    "source_tree_sha",
    "package_sha256",
    "evidence_ref",
  ];
  if (!exactKeys(candidate, keys, issues, gate, "contract")) return;
  requireFreshCapture(candidate.captured_at, issues, gate, "capture", now);
  exactValue(candidate.theme_id, PREPAYMENT_GATE_POLICY.candidate_theme_id, issues, gate, "theme-id");
  exactValue(candidate.status, PREPAYMENT_GATE_POLICY.candidate_theme_status, issues, gate, "status");
  exactBoolean(candidate.checkout_enabled, false, issues, gate, "checkout-enabled");
  exactBoolean(candidate.password_protected, true, issues, gate, "password-protected");
  exactBoolean(candidate.published, false, issues, gate, "published");
  exactBoolean(candidate.dedicated_hero_pass, true, issues, gate, "dedicated-hero");
  exactBoolean(candidate.controlled_social_image_pass, true, issues, gate, "controlled-social-image");
  if (candidate.source_commit_sha !== source?.commit_sha) add(issues, gate, "commit-linkage");
  if (candidate.source_tree_sha !== source?.tree_sha) add(issues, gate, "tree-linkage");
  if (candidate.package_sha256 !== source?.package_sha256) add(issues, gate, "package-linkage");
  requireEvidenceReference(candidate.evidence_ref, "candidate-theme-readback", evidence, referencedIds, issues, gate, "evidence");
}

function validateRenderedRoutes(rendered, evidence, referencedIds, issues, now) {
  const gate = "rendered-routes";
  if (!exactKeys(rendered, [
    "captured_at",
    "status",
    "results",
    "search_queries",
    "sold_out_fixture_pass",
    "zero_result_pass",
    "server_error_pass",
    "evidence_ref",
  ], issues, gate, "contract")) return;
  requireFreshCapture(rendered.captured_at, issues, gate, "capture", now);
  exactValue(rendered.status, "pass", issues, gate, "status");
  if (!Array.isArray(rendered.results) || rendered.results.length !== REQUIRED_RENDERED_ROUTE_CATEGORIES.length) {
    add(issues, gate, "results.exact-count");
  }
  const categories = [];
  for (const result of Array.isArray(rendered.results) ? rendered.results : []) {
    if (!exactKeys(result, ROUTE_RESULT_KEYS, issues, gate, "result")) continue;
    categories.push(result.category);
    if (!REQUIRED_RENDERED_ROUTE_CATEGORIES.includes(result.category)) add(issues, gate, "result.category");
    const requiredCount = ROUTE_COUNT_REQUIREMENTS.get(result.category);
    if (!Number.isSafeInteger(result.checked_route_count) || result.checked_route_count < (requiredCount ?? 1)) {
      add(issues, gate, "result.route-count");
    }
    exactBoolean(result.http_pass, true, issues, gate, "result.http");
    exactBoolean(result.readback_pass, true, issues, gate, "result.readback");
  }
  if (!sameSet(categories, REQUIRED_RENDERED_ROUTE_CATEGORIES)) add(issues, gate, "results.category-set");
  if (!sameSet(rendered.search_queries, REQUIRED_SEARCH_QUERIES)) add(issues, gate, "search-query-set");
  exactBoolean(rendered.sold_out_fixture_pass, true, issues, gate, "sold-out-fixture");
  exactBoolean(rendered.zero_result_pass, true, issues, gate, "zero-result");
  exactBoolean(rendered.server_error_pass, true, issues, gate, "server-error");
  requireEvidenceReference(rendered.evidence_ref, "rendered-route-readback", evidence, referencedIds, issues, gate, "evidence");
}

function validateProductReview(review, evidence, referencedIds, issues, now) {
  const gate = "product-review";
  const keys = [
    "captured_at",
    "status",
    "product_facts_schema_version",
    "canonical_emblem",
    "storefront_emblem",
    "wordmark",
    "products",
    "evidence_ref",
  ];
  if (!exactKeys(review, keys, issues, gate, "contract")) return { variantIds: [] };
  requireFreshCapture(review.captured_at, issues, gate, "capture", now);
  exactValue(review.status, "pass", issues, gate, "status");
  exactValue(review.product_facts_schema_version, 3, issues, gate, "facts-schema-version");
  for (const [field, asset, sha] of [
    ["canonical_emblem", PREPAYMENT_GATE_POLICY.canonical_emblem_asset, PREPAYMENT_GATE_POLICY.canonical_emblem_sha256],
    ["storefront_emblem", PREPAYMENT_GATE_POLICY.storefront_emblem_asset, PREPAYMENT_GATE_POLICY.storefront_emblem_sha256],
  ]) {
    if (!exactKeys(review[field], ["asset_path", "sha256"], issues, gate, field)) continue;
    exactValue(review[field].asset_path, asset, issues, gate, `${field}.asset-path`);
    exactValue(review[field].sha256, sha, issues, gate, `${field}.sha256`);
  }
  exactValue(review.wordmark, PREPAYMENT_GATE_POLICY.wordmark, issues, gate, "wordmark");
  if (!Array.isArray(review.products) || review.products.length !== 20) add(issues, gate, "products.exact-count");
  const handles = [];
  const variantIds = [];
  for (const product of Array.isArray(review.products) ? review.products : []) {
    if (!exactKeys(product, PRODUCT_RECORD_KEYS, issues, gate, "product")) continue;
    if (!HANDLE_PATTERN.test(product.handle ?? "")) add(issues, gate, "product.handle");
    if (!nonemptyString(product.variant_record_id, issues, gate, "product.variant-record-id")) continue;
    handles.push(product.handle);
    variantIds.push(product.variant_record_id);
    for (const field of PRODUCT_RECORD_KEYS.slice(2)) exactBoolean(product[field], true, issues, gate, `product.${field}`);
  }
  if (!sameSet(handles, EXPECTED_PRODUCT_HANDLES)) add(issues, gate, "products.identity-set");
  if (new Set(variantIds).size !== variantIds.length) add(issues, gate, "products.variant-identity");
  requireEvidenceReference(review.evidence_ref, "product-review", evidence, referencedIds, issues, gate, "evidence");
  return { variantIds };
}

function validatePrivatePrice(price, productVariantIds, evidence, referencedIds, issues, now) {
  const gate = "private-price";
  const keys = [
    "ledger_captured_at",
    "shopify_readback_captured_at",
    "status",
    "rule",
    "active_variant_count",
    "ledger_evidence_ref",
    "shopify_readback_evidence_ref",
    "report_evidence_ref",
  ];
  if (!exactKeys(price, keys, issues, gate, "contract")) return;
  requireFreshCapture(price.ledger_captured_at, issues, gate, "ledger-capture", now);
  requireFreshCapture(price.shopify_readback_captured_at, issues, gate, "shopify-readback-capture", now);
  exactValue(price.status, "pass", issues, gate, "status");
  exactValue(price.rule, "exact-2.20x-round-half-up", issues, gate, "rule");
  exactValue(price.active_variant_count, 20, issues, gate, "active-variant-count");
  const ledgerRecord = requireEvidenceReference(
    price.ledger_evidence_ref,
    "private-price-ledger",
    evidence,
    referencedIds,
    issues,
    gate,
    "ledger-evidence",
  );
  const reportRecord = requireEvidenceReference(
    price.report_evidence_ref,
    "private-price-report",
    evidence,
    referencedIds,
    issues,
    gate,
    "report-evidence",
  );
  const shopifyReadbackRecord = requireEvidenceReference(
    price.shopify_readback_evidence_ref,
    "private-price-shopify-readback",
    evidence,
    referencedIds,
    issues,
    gate,
    "shopify-readback-evidence",
  );
  const ledger = readJsonEvidence(ledgerRecord, issues, gate, "ledger");
  const shopifyReadback = readJsonEvidence(shopifyReadbackRecord, issues, gate, "shopify-readback");
  const report = readJsonEvidence(reportRecord, issues, gate, "report");
  if (!ledger || !shopifyReadback || !report) return;
  let result;
  try {
    result = verifyPrivatePriceLedger(ledger, shopifyReadback, {
      now: new Date(now),
      expectedProducts: EXPECTED_PRODUCT_HANDLES.map((handle) => ({ handle, title: handle })),
    });
  } catch {
    add(issues, gate, "ledger.validation");
    return;
  }
  if (!result.ok) add(issues, gate, "ledger.failed");
  const expectedReport = redactedPriceVerification(result);
  if (JSON.stringify(report) !== JSON.stringify(expectedReport)) add(issues, gate, "report.parity");
  if (report.status !== "pass" || report.active_variant_count !== 20 ||
      !Array.isArray(report.failures) || report.failures.length !== 0) {
    add(issues, gate, "report.failed");
  }
  if (price.ledger_captured_at !== ledger.captured_at ||
      price.ledger_captured_at !== report.ledger_captured_at ||
      price.shopify_readback_captured_at !== shopifyReadback.captured_at ||
      price.shopify_readback_captured_at !== report.shopify_readback_captured_at) {
    add(issues, gate, "capture-linkage");
  }
  const ledgerIds = Array.isArray(ledger.variants) ? ledger.variants.map((variant) => variant?.variant_id) : [];
  if (!sameSet(ledgerIds, productVariantIds)) add(issues, gate, "variant-identity-linkage");
}

function validateLaunchPages(launchPages, evidence, referencedIds, issues, now) {
  const gate = "launch-pages";
  const keys = [
    "captured_at",
    "status",
    "content_revision",
    "applied_page_handles",
    "readback_pass",
    "provider_write_authority",
    "evidence_ref",
  ];
  if (!exactKeys(launchPages, keys, issues, gate, "contract")) return;
  requireFreshCapture(launchPages.captured_at, issues, gate, "capture", now);
  exactValue(launchPages.status, "pass", issues, gate, "status");
  nonemptyString(launchPages.content_revision, issues, gate, "content-revision");
  if (!sameSet(launchPages.applied_page_handles, ["faq", "ingredients-standards", "accessibility"])) {
    add(issues, gate, "page-identity-set");
  }
  exactBoolean(launchPages.readback_pass, true, issues, gate, "readback");
  exactBoolean(launchPages.provider_write_authority, false, issues, gate, "provider-write-authority");
  requireEvidenceReference(launchPages.evidence_ref, "launch-pages-readback", evidence, referencedIds, issues, gate, "evidence");
}

function validateMandatoryNameReview(review, evidence, referencedIds, issues, now) {
  const gate = "mandatory-name-review";
  const keys = [
    "captured_at",
    "status",
    "reviewed_route_categories",
    "exception_register_reviewed",
    "rendered_review_pass",
    "unreviewed_name_count",
    "evidence_ref",
  ];
  if (!exactKeys(review, keys, issues, gate, "contract")) return;
  requireFreshCapture(review.captured_at, issues, gate, "capture", now);
  exactValue(review.status, "pass", issues, gate, "status");
  if (!sameSet(review.reviewed_route_categories, REQUIRED_RENDERED_ROUTE_CATEGORIES)) {
    add(issues, gate, "route-category-set");
  }
  exactBoolean(review.exception_register_reviewed, true, issues, gate, "exception-register");
  exactBoolean(review.rendered_review_pass, true, issues, gate, "rendered-review");
  exactValue(review.unreviewed_name_count, 0, issues, gate, "unreviewed-name-count");
  requireEvidenceReference(review.evidence_ref, "mandatory-name-review", evidence, referencedIds, issues, gate, "evidence");
}

function validateFulfillmentShipping(section, evidence, referencedIds, issues, now) {
  const gate = "fulfillment-shipping";
  const keys = [
    "captured_at",
    "status",
    "exact_20_mappings",
    "stock_sync_enabled",
    "shopify_inventory_tracking_disabled",
    "intended_location_only",
    "contiguous_us_only",
    "shipping_rates_verified",
    "unsupported_regions_verified",
    "po_box_behavior_verified",
    "policy_parity_verified",
    "evidence_ref",
  ];
  if (!exactKeys(section, keys, issues, gate, "contract")) return;
  requireFreshCapture(section.captured_at, issues, gate, "capture", now);
  exactValue(section.status, "pass", issues, gate, "status");
  for (const field of keys.slice(2, -1)) exactBoolean(section[field], true, issues, gate, field);
  requireEvidenceReference(
    section.evidence_ref,
    "fulfillment-shipping-readback",
    evidence,
    referencedIds,
    issues,
    gate,
    "evidence",
  );
}

const OPERATIONAL_GATE_CONTRACTS = Object.freeze({
  tax: ["nexus_review_complete", "configuration_readback_pass"],
  privacy: [
    "policy_review_complete",
    "consent_review_complete",
    "marketing_consent_review_complete",
    "network_intelligence_disclosure_review_complete",
    "privacy_choices_verified",
  ],
  apps: ["permissions_review_complete", "pixel_inventory_review_complete", "unapproved_apps_absent"],
  email: ["sender_domain_authenticated", "customer_notifications_reviewed", "notification_language_reviewed"],
  domains: ["canonical_domain_verified", "legacy_domain_disposition_complete"],
  account_security: [
    "owner_2fa_verified",
    "staff_2fa_verified",
    "access_review_complete",
    "customer_accounts_configuration_reviewed",
  ],
});

function validateOperationalGates(gates, evidence, referencedIds, issues, now) {
  const rootGate = "operational-gates";
  if (!exactKeys(gates, Object.keys(OPERATIONAL_GATE_CONTRACTS), issues, rootGate, "contract")) return;
  for (const [name, assertions] of Object.entries(OPERATIONAL_GATE_CONTRACTS)) {
    const gate = `operations-${name}`;
    const section = gates[name];
    const keys = ["captured_at", "status", ...assertions, "evidence_ref"];
    if (!exactKeys(section, keys, issues, gate, "contract")) continue;
    requireFreshCapture(section.captured_at, issues, gate, "capture", now);
    exactValue(section.status, "pass", issues, gate, "status");
    for (const assertion of assertions) exactBoolean(section[assertion], true, issues, gate, assertion);
    requireEvidenceReference(section.evidence_ref, "operations-readback", evidence, referencedIds, issues, gate, "evidence");
  }
}

function validateQualityAssurance(quality, evidence, referencedIds, issues, now) {
  const gate = "quality-assurance";
  const keys = [
    "captured_at",
    "status",
    "keyboard_pass",
    "focus_pass",
    "escape_pass",
    "touch_pass",
    "zoom_reflow_200_pass",
    "nvda_chrome_pass",
    "voiceover_safari_pass",
    "automated_accessibility_critical",
    "automated_accessibility_serious",
    "responsive_viewports",
    "lighthouse",
    "evidence_ref",
  ];
  if (!exactKeys(quality, keys, issues, gate, "contract")) return;
  requireFreshCapture(quality.captured_at, issues, gate, "capture", now);
  exactValue(quality.status, "pass", issues, gate, "status");
  for (const field of [
    "keyboard_pass",
    "focus_pass",
    "escape_pass",
    "touch_pass",
    "zoom_reflow_200_pass",
    "nvda_chrome_pass",
    "voiceover_safari_pass",
  ]) {
    exactBoolean(quality[field], true, issues, gate, field);
  }
  exactValue(quality.automated_accessibility_critical, 0, issues, gate, "automated-critical");
  exactValue(quality.automated_accessibility_serious, 0, issues, gate, "automated-serious");
  if (!sameSet(quality.responsive_viewports, ["360x800", "390x844", "768x1024", "1440x900"])) {
    add(issues, gate, "responsive-viewport-set");
  }
  if (!Array.isArray(quality.lighthouse) || quality.lighthouse.length !== 4) {
    add(issues, gate, "lighthouse.exact-count");
  }
  const routeTypes = [];
  for (const result of Array.isArray(quality.lighthouse) ? quality.lighthouse : []) {
    if (!exactKeys(result, [
      "route_type",
      "accessibility",
      "best_practices",
      "seo",
      "mobile_performance",
    ], issues, gate, "lighthouse.result")) continue;
    routeTypes.push(result.route_type);
    if (!Number.isFinite(result.accessibility) || result.accessibility < 90) add(issues, gate, "lighthouse.accessibility");
    if (!Number.isFinite(result.best_practices) || result.best_practices < 90) add(issues, gate, "lighthouse.best-practices");
    if (!Number.isFinite(result.seo) || result.seo < 90) add(issues, gate, "lighthouse.seo");
    if (!Number.isFinite(result.mobile_performance) || result.mobile_performance < 80) {
      add(issues, gate, "lighthouse.mobile-performance");
    }
  }
  if (!sameSet(routeTypes, ["home", "collection", "product", "cart"])) {
    add(issues, gate, "lighthouse.route-set");
  }
  requireEvidenceReference(
    quality.evidence_ref,
    "accessibility-performance-readback",
    evidence,
    referencedIds,
    issues,
    gate,
    "evidence",
  );
}

function validateFinalPhaseExclusions(exclusions, issues) {
  const gate = "final-phase-exclusions";
  const keys = [
    "payment_setup_completed",
    "checkout_activated",
    "theme_published",
    "password_removed",
    "orders_created",
  ];
  if (!exactKeys(exclusions, keys, issues, gate, "contract")) return;
  for (const field of keys) exactBoolean(exclusions[field], false, issues, gate, field);
}

export function validatePrepaymentEvidenceBundle(bundle, options = {}) {
  const issues = [];
  const repositoryRoot = path.resolve(options.repositoryRoot ?? ".");
  const bundlePath = typeof options.bundlePath === "string" ? path.resolve(options.bundlePath) : null;
  const now = options.now instanceof Date ? options.now.getTime() : Date.now();
  if (!Number.isFinite(now)) throw new TypeError("now must be a valid Date");
  const boundary = validateEvidenceBoundary(bundlePath, repositoryRoot, issues);

  if (!exactKeys(bundle, ROOT_KEYS, issues, "prepayment", "root")) return { ok: false, issues };
  exactValue(bundle.schema_version, PREPAYMENT_GATE_POLICY.schema_version, issues, "prepayment", "schema-version");
  exactValue(bundle.gate, PREPAYMENT_GATE_POLICY.gate, issues, "prepayment", "gate-name");
  requireFreshCapture(bundle.captured_at, issues, "prepayment", "capture", now);
  if (exactKeys(bundle.market, ["country", "currency"], issues, "prepayment", "market")) {
    exactValue(bundle.market.country, PREPAYMENT_GATE_POLICY.market_country, issues, "prepayment", "market.country");
    exactValue(bundle.market.currency, PREPAYMENT_GATE_POLICY.market_currency, issues, "prepayment", "market.currency");
  }

  if (!boundary) return { ok: false, issues };
  const context = { repositoryRoot, boundary };
  const evidence = validateEvidenceFiles(bundle.evidence_files, context, issues);
  const referencedIds = new Set();
  validateSource(bundle.source, evidence, referencedIds, issues, now);
  validateCandidate(bundle.candidate_theme, bundle.source, evidence, referencedIds, issues, now);
  validateRenderedRoutes(bundle.rendered_routes, evidence, referencedIds, issues, now);
  const { variantIds } = validateProductReview(bundle.product_review, evidence, referencedIds, issues, now);
  validatePrivatePrice(bundle.private_price, variantIds, evidence, referencedIds, issues, now);
  validateLaunchPages(bundle.launch_pages, evidence, referencedIds, issues, now);
  validateMandatoryNameReview(bundle.mandatory_name_review, evidence, referencedIds, issues, now);
  validateFulfillmentShipping(bundle.fulfillment_shipping, evidence, referencedIds, issues, now);
  validateOperationalGates(bundle.operational_gates, evidence, referencedIds, issues, now);
  validateQualityAssurance(bundle.quality_assurance, evidence, referencedIds, issues, now);
  validateFinalPhaseExclusions(bundle.final_phase_exclusions, issues);

  const evidenceIds = new Set((Array.isArray(bundle.evidence_files) ? bundle.evidence_files : []).map((entry) => entry?.id));
  if (!sameSet([...referencedIds], [...evidenceIds])) add(issues, "evidence", "references.exact-set");
  return { ok: issues.length === 0, issues };
}

export function summarizePrepaymentGateIssues(issues) {
  const counts = new Map();
  for (const issue of issues ?? []) {
    const gate = typeof issue?.gate === "string" ? issue.gate : "prepayment";
    const category = typeof issue?.category === "string" ? issue.category : "invalid";
    const key = `${gate}\u0000${category}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [gate, category] = key.split("\u0000");
      return { gate, category, count };
    })
    .sort((left, right) => left.gate.localeCompare(right.gate) || left.category.localeCompare(right.category));
}
