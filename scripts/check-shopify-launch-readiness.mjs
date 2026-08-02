import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const readThemeJson = (relativePath) =>
  JSON.parse(read(relativePath).replace(/^\s*[/][*][\s\S]*?[*][/]\s*/u, ""));

const summary = readJson("docs/operations/shopify-launch-readiness.v1.json");
const ledger = read("docs/operations/SHOPIFY-LAUNCH-READINESS.md").replaceAll("\r\n", "\n");
const productFacts = readJson("apps/shopify-theme/content/product-facts.v3.json");
const launchPages = readJson("apps/shopify-theme/content/launch-pages.v1.json");
const searchExpectations = readJson("apps/shopify-theme/content/storefront-search-expectations.v1.json");
const mandatoryNameExceptions = readJson("apps/shopify-theme/content/mandatory-name-exceptions.v1.json");
const themeSettings = readThemeJson("apps/shopify-theme/config/settings_data.json");

const normalizeDisposition = (value) => value.split(" —", 1)[0].trim().toLowerCase().replaceAll(" ", "-");
const rowFor = (prefix) => ledger.split("\n").find((line) => line.startsWith(`| ${prefix} |`));
const dispositionFor = (prefix) => {
  const row = rowFor(prefix);
  assert.ok(row, `Missing launch-readiness ledger row: ${prefix}`);
  const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
  return normalizeDisposition(cells.at(-1));
};
const exactKeys = (actual, expected, label) =>
  assert.deepEqual(Object.keys(actual).sort(), [...expected].sort(), `${label} keys drifted`);

exactKeys(
  summary,
  [
    "schema_version",
    "updated",
    "status",
    "sources",
    "product_evidence",
    "public_contracts",
    "ledger_sections",
    "gates",
    "phase_4_evidence",
    "assertions",
  ],
  "summary",
);

assert.equal(summary.schema_version, 1);
assert.equal(summary.status, "blocked");
const ledgerUpdated = ledger.match(/^Updated: (\d{4}-\d{2}-\d{2}) P[DS]T$/m)?.[1];
assert.ok(ledgerUpdated, "Launch-readiness ledger must carry a dated Pacific update marker");
assert.equal(summary.updated, ledgerUpdated, "Machine-readable summary date drifted from ledger");
assert.deepEqual(summary.sources, {
  ledger: "docs/operations/SHOPIFY-LAUNCH-READINESS.md",
  product_facts: "apps/shopify-theme/content/product-facts.v3.json",
  launch_pages: "apps/shopify-theme/content/launch-pages.v1.json",
  search_expectations: "apps/shopify-theme/content/storefront-search-expectations.v1.json",
  mandatory_name_exceptions: "apps/shopify-theme/content/mandatory-name-exceptions.v1.json",
  theme_settings: "apps/shopify-theme/config/settings_data.json",
});

const reviewStatuses = Object.groupBy(productFacts.products, (product) => product.review_status);
const factsPresent = productFacts.products.filter((product) => product.facts !== null).length;
const failedBrandMarks = productFacts.products
  .filter((product) => product.review?.brand_mark?.status === "failed")
  .map((product) => product.handle)
  .sort();
const pendingBrandMarks = productFacts.products.filter(
  (product) => product.review?.brand_mark?.status === "pending",
).length;

assert.equal(productFacts.status, "pending-review");
exactKeys(
  summary.product_evidence,
  [
    "total",
    "complete",
    "pending",
    "blocked",
    "facts_present",
    "release_rows_ready",
    "release_rows_pending",
    "release_rows_blocked",
    "release_rows_na_reviewed",
    "brand_mark",
  ],
  "product evidence",
);
exactKeys(summary.product_evidence.brand_mark, ["failed", "pending", "failed_handles"], "brand mark");
assert.equal(summary.product_evidence.total, 20, "The launch assortment must remain exactly twenty products");
assert.equal(productFacts.products.length, summary.product_evidence.total);
assert.equal(reviewStatuses.complete?.length ?? 0, summary.product_evidence.complete);
assert.equal(reviewStatuses.pending?.length ?? 0, summary.product_evidence.pending);
assert.equal(reviewStatuses.blocked?.length ?? 0, summary.product_evidence.blocked);
assert.equal(factsPresent, summary.product_evidence.facts_present);
assert.deepEqual(failedBrandMarks, summary.product_evidence.brand_mark.failed_handles);
assert.equal(failedBrandMarks.length, summary.product_evidence.brand_mark.failed);
assert.equal(pendingBrandMarks, summary.product_evidence.brand_mark.pending);

const productRows = ledger.split("\n").filter((line) => /^\| \d+ \| .+ \([a-z0-9-]+\) \|/.test(line));
assert.equal(productRows.length, summary.product_evidence.total);
const productRowHandles = productRows.map((line) => line.match(/\(([a-z0-9-]+)\) \|/)?.[1]);
assert.deepEqual(productRowHandles, productFacts.products.map((product) => product.handle));
const releaseRowDispositions = productRows.map((line) =>
  normalizeDisposition(line.split("|").slice(1, -1).at(-1)),
);
const allowedReleaseRowDispositions = new Set(["ready", "pending", "blocked", "n/a-(reviewed)"]);
for (const disposition of releaseRowDispositions) {
  assert.ok(allowedReleaseRowDispositions.has(disposition), `Unexpected release-row disposition: ${disposition}`);
}
const releaseRowCount = (disposition) =>
  releaseRowDispositions.filter((candidate) => candidate === disposition).length;
assert.equal(releaseRowCount("ready"), summary.product_evidence.release_rows_ready);
assert.equal(releaseRowCount("pending"), summary.product_evidence.release_rows_pending);
assert.equal(releaseRowCount("blocked"), summary.product_evidence.release_rows_blocked);
assert.equal(releaseRowCount("n/a-(reviewed)"), summary.product_evidence.release_rows_na_reviewed);

assert.deepEqual(summary.public_contracts, {
  launch_pages: { status: launchPages.status, count: launchPages.pages.length },
  search_expectations: { status: searchExpectations.status, count: searchExpectations.queries.length },
  mandatory_name_exceptions: { status: mandatoryNameExceptions.status },
  checkout_cta_enabled: themeSettings.current.checkout_cta_enabled,
});

const expectedLedgerSections = {
  product_compliance: ["PC-01", "PC-02", "PC-03", "PC-04", "PC-05", "PC-06"],
  non_payment_commerce: ["CF-01", "CF-02", "CF-03", "CF-04", "CF-05", "CF-06", "CF-07"],
  privacy_and_safety: ["PS-01", "PS-02", "PS-03", "PS-04", "PS-05"],
  theme_and_storefront_qa: ["QA-01", "QA-02", "QA-03", "QA-04", "QA-05", "QA-06", "QA-07", "QA-08", "QA-09"],
};
const checklistDispositions = new Set(["ready", "pending", "blocked", "n/a-(reviewed)"]);
exactKeys(summary.ledger_sections, Object.keys(expectedLedgerSections), "ledger sections");
for (const [sectionName, expectedIds] of Object.entries(expectedLedgerSections)) {
  const section = summary.ledger_sections[sectionName];
  exactKeys(section, expectedIds, sectionName);
  for (const id of expectedIds) {
    assert.ok(checklistDispositions.has(section[id]), `${id} has an unsupported disposition`);
    assert.equal(dispositionFor(id), section[id], `${id} drifted`);
  }
}
const expectedChecklistIds = Object.values(expectedLedgerSections).flat();
const ledgerChecklistIds = [...ledger.matchAll(/^\| ((?:PC|CF|PS|QA)-\d{2}) \|/gm)].map((match) => match[1]);
assert.deepEqual(ledgerChecklistIds, expectedChecklistIds, "Checklist rows drifted from the exact inventory");

const gateLabels = {
  A: "A — Product evidence",
  B: "B — Non-payment commerce",
  C: "C — Privacy and safety operations",
  D: "D — Theme and storefront QA",
  E: "E — Release and rollback preparation",
  F: "F — Final payment setup and order lifecycle",
  G: "G — Public soft launch",
};
exactKeys(summary.gates, Object.keys(gateLabels), "gates");
for (const [gate, label] of Object.entries(gateLabels)) {
  assert.equal(dispositionFor(label), summary.gates[gate], `Gate ${gate} drifted`);
}

const expectedPhase4Ids = [
  "browse-search-collections",
  "product-variant-pricing",
  "availability-inventory-fulfillment",
  "cart-errors-cancel-returns",
  "checkout-payment-order-lifecycle",
  "webhook-authenticity-replay-idempotency-retries-redaction",
  "responsive-accessibility",
  "cache-privacy-security-performance",
];
assert.deepEqual(summary.phase_4_evidence.map((entry) => entry.id), expectedPhase4Ids);
const phase4Section = ledger.match(/## Terminal Phase 4 Evidence Map\n([\s\S]*?)(?=\n## )/)?.[1];
assert.ok(phase4Section, "Missing Terminal Phase 4 Evidence Map section");
const phase4Rows = phase4Section
  .split("\n")
  .filter((line) => /^\| `[a-z0-9-]+` \|/.test(line))
  .map((line) => {
    const [id, evidenceOwner, disposition] = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return { id: id.slice(1, -1), evidence_owner: evidenceOwner, status: normalizeDisposition(disposition) };
  });
assert.deepEqual(phase4Rows, summary.phase_4_evidence, "Terminal Phase 4 evidence map drifted");
assert.ok(summary.phase_4_evidence.every((entry) => entry.status === "blocked"));

assert.deepEqual(summary.assertions, {
  prepayment_complete: false,
  candidate_package_final: false,
  provider_readback_current: false,
  storefront_publication_authorized: false,
  checkout_or_payment_activation_authorized: false,
});

console.log(
  "Shopify launch-readiness parity passed " +
    `(${summary.product_evidence.total} products; ` +
    `${summary.product_evidence.complete} complete, ` +
    `${summary.product_evidence.pending} pending, ` +
    `${summary.product_evidence.blocked} blocked; ` +
    `gates A-E/G ${summary.gates.A}; F deferred).`,
);
