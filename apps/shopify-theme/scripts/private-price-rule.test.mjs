import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  calculateRetailPriceUsd,
  multiplyDecimalRoundHalfUp,
  PRICE_GATE_POLICY,
  PRICE_RULE,
  redactedPriceVerification,
  verifyPrivatePriceLedger,
} from "./lib/private-price-rule.mjs";

const expectedProducts = Array.from({ length: 20 }, (_, index) => ({
  handle: `example-product-${index + 1}`,
  title: `Example Product ${index + 1}`,
}));

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

const connectedAccountPlanRecordSha256 = digest("sanitized-connected-account-plan-record");
const catalogSnapshotSha256 = digest("authenticated-manufacturing-partner-us-usd-catalog-snapshot");

function catalogRecords() {
  return expectedProducts.map((product, index) => ({
    handle: product.handle,
    formula_identity_sha256: digest(`formula:${product.handle}`),
    source_catalog_record_sha256: digest(`catalog-source-record:${product.handle}`),
    base_price_usd: `${10 + index}.01`,
  }));
}

function ledger() {
  const records = catalogRecords();
  return {
    schema_version: 2,
    captured_at: "2026-07-19T12:00:00.000Z",
    market: "US",
    currency: "USD",
    basis: {
      connected_account_plan_record_sha256: connectedAccountPlanRecordSha256,
      shipping_included: false,
      tax_included: false,
      optional_services_included: false,
      ambiguity_resolved: true,
    },
    catalog_readback: {
      schema_version: 1,
      captured_at: "2026-07-19T12:00:00.000Z",
      provider: "manufacturing-partner",
      market: "US",
      currency: "USD",
      readback_source: "authenticated-manufacturing-partner-connected-account",
      authentication_evidence_sha256: digest("authenticated-session-evidence"),
      connected_account_plan_record_sha256: connectedAccountPlanRecordSha256,
      snapshot_artifact:
        ".artifacts/operations/shopify/2026-07-19/private-pricing/manufacturing-partner-usd-catalog.json",
      snapshot_sha256: catalogSnapshotSha256,
      snapshot_format: "canonical-json",
      snapshot_record_count: 20,
      record_hash_scope: "provider-record-including-formula-plan-and-base-price",
      records,
    },
    variants: records.map((record, index) => {
      const base = record.base_price_usd;
      return {
        handle: record.handle,
        product_id: `gid://shopify/Product/${1001 + index}`,
        variant_id: `gid://shopify/ProductVariant/${2001 + index}`,
        exact_mapping_confirmed: true,
        formula_identity_sha256: record.formula_identity_sha256,
        source_catalog_record_sha256: record.source_catalog_record_sha256,
        catalog_snapshot_sha256: catalogSnapshotSha256,
        base_price_usd: base,
        shopify_cost_per_item_usd: base,
        retail_price_usd: calculateRetailPriceUsd(base),
        compare_at_price_usd: null,
      };
    }),
  };
}

function shopifyReadback(sourceLedger = ledger()) {
  return {
    schema_version: 1,
    captured_at: "2026-07-19T12:05:00.000Z",
    market: "US",
    currency: "USD",
    readback_source: "authenticated-shopify-admin",
    variants: sourceLedger.variants.map((variant) => ({
      handle: variant.handle,
      product_id: variant.product_id,
      variant_id: variant.variant_id,
      status: "active",
      shopify_cost_per_item_usd: variant.shopify_cost_per_item_usd,
      retail_price_usd: variant.retail_price_usd,
      compare_at_price_usd: variant.compare_at_price_usd,
    })),
  };
}

function verify(sourceLedger, readback = shopifyReadback(sourceLedger), options = {}) {
  return verifyPrivatePriceLedger(sourceLedger, readback, {
    expectedProducts,
    now: new Date("2026-07-20T11:59:59.000Z"),
    ...options,
  });
}

test("uses exact decimal ROUND_HALF_UP behavior without binary floating point", () => {
  assert.deepEqual(PRICE_RULE, {
    multiplier: "2.20",
    markup_on_cost_percent: "120",
    gross_margin_percent_before_shipping_tax_and_services: "54.5454545454545",
    rounding: "ROUND_HALF_UP",
    currency_scale: 2,
  });
  assert.equal(multiplyDecimalRoundHalfUp("1.005", "1", 2), "1.01");
  assert.equal(multiplyDecimalRoundHalfUp("1.004", "1", 2), "1.00");
  assert.equal(calculateRetailPriceUsd("10.00"), "22.00");
  assert.equal(calculateRetailPriceUsd("10.01"), "22.02");
  assert.equal(calculateRetailPriceUsd("10.03"), "22.07");
});

test("accepts costs bound to fresh authenticated partner and commerce readbacks", () => {
  const sourceLedger = ledger();
  const result = verify(sourceLedger);
  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(PRICE_GATE_POLICY, {
    expected_variant_count: 20,
    maximum_capture_age_hours: 24,
    catalog_provider: "manufacturing-partner",
    catalog_readback_source: "authenticated-manufacturing-partner-connected-account",
    catalog_snapshot_format: "canonical-json",
    catalog_record_hash_scope: "provider-record-including-formula-plan-and-base-price",
    shopify_readback_source: "authenticated-shopify-admin",
  });
});

test("fails closed for an ambiguous basis or stale ledger and readback captures", () => {
  const sourceLedger = ledger();
  sourceLedger.basis.ambiguity_resolved = false;
  const readback = shopifyReadback(sourceLedger);
  const result = verify(sourceLedger, readback, {
    now: new Date("2026-07-20T12:05:01.000Z"),
  });
  assert.equal(result.ok, false);
  assert.equal(result.issues.includes("ledger.ambiguity"), true);
  assert.equal(result.issues.includes("ledger.capture-freshness"), true);
  assert.equal(result.issues.includes("catalog-readback.capture-freshness"), true);
  assert.equal(result.issues.includes("shopify-readback.capture-freshness"), true);
});

test("rejects legacy boolean-only and placeholder catalog provenance", () => {
  const legacyLedger = ledger();
  legacyLedger.schema_version = 1;
  delete legacyLedger.catalog_readback;
  legacyLedger.basis = {
    connected_account_plan_confirmed: true,
    current_catalog_confirmed: true,
    shipping_included: false,
    tax_included: false,
    optional_services_included: false,
    ambiguity_resolved: true,
  };
  assert.equal(verify(legacyLedger).issues.includes("ledger.contract"), true);

  const inventedLedger = ledger();
  inventedLedger.catalog_readback.authentication_evidence_sha256 = "a".repeat(64);
  inventedLedger.catalog_readback.snapshot_sha256 = "b".repeat(64);
  inventedLedger.basis.connected_account_plan_record_sha256 = "c".repeat(64);
  inventedLedger.catalog_readback.connected_account_plan_record_sha256 = "c".repeat(64);
  inventedLedger.catalog_readback.records[0].formula_identity_sha256 = "d".repeat(64);
  inventedLedger.catalog_readback.records[0].source_catalog_record_sha256 = "e".repeat(64);
  inventedLedger.variants[0].formula_identity_sha256 = "d".repeat(64);
  inventedLedger.variants[0].source_catalog_record_sha256 = "e".repeat(64);
  inventedLedger.variants.forEach((variant) => {
    variant.catalog_snapshot_sha256 = "b".repeat(64);
  });
  const inventedResult = verify(inventedLedger, shopifyReadback(inventedLedger));
  for (const category of [
    "ledger.account-plan-record",
    "catalog-readback.authentication-evidence",
    "catalog-readback.account-plan-record",
    "catalog-readback.snapshot",
    "catalog-readback.record.formula-identity",
    "catalog-readback.record.source-record",
    "variant.formula-identity",
    "variant.source-record",
    "variant.catalog-snapshot",
  ]) {
    assert.equal(inventedResult.issues.includes(category), true);
  }

  const reusedHashLedger = ledger();
  const reusedHash = digest("one-invented-record-reused-for-all-provenance");
  reusedHashLedger.basis.connected_account_plan_record_sha256 = reusedHash;
  reusedHashLedger.catalog_readback.authentication_evidence_sha256 = reusedHash;
  reusedHashLedger.catalog_readback.connected_account_plan_record_sha256 = reusedHash;
  reusedHashLedger.catalog_readback.snapshot_sha256 = reusedHash;
  reusedHashLedger.variants.forEach((variant) => {
    variant.catalog_snapshot_sha256 = reusedHash;
  });
  const reusedHashResult = verify(reusedHashLedger, shopifyReadback(reusedHashLedger));
  assert.equal(
    reusedHashResult.issues.includes("catalog-readback.provenance-hash-separation"),
    true,
  );
});

test("rejects unauthenticated, wrong-market, stale, or capture-after-ledger catalogs", () => {
  const sourceLedger = ledger();
  sourceLedger.catalog_readback.readback_source = "operator-entered-public-catalog";
  sourceLedger.catalog_readback.market = "CA";
  sourceLedger.catalog_readback.captured_at = "2026-07-19T12:01:00.000Z";
  const result = verify(sourceLedger, shopifyReadback(sourceLedger));
  assert.equal(result.issues.includes("catalog-readback.source"), true);
  assert.equal(result.issues.includes("catalog-readback.market-currency"), true);
  assert.equal(result.issues.includes("catalog-readback.capture-order"), true);

  const staleLedger = ledger();
  staleLedger.catalog_readback.captured_at = "2026-07-18T11:59:59.000Z";
  const staleResult = verify(staleLedger, shopifyReadback(staleLedger));
  assert.equal(staleResult.issues.includes("catalog-readback.capture-freshness"), true);
});

test("rejects mismatched plan, snapshot, formula, source record, and source base price", () => {
  const sourceLedger = ledger();
  sourceLedger.catalog_readback.connected_account_plan_record_sha256 = digest("different-account-plan");
  sourceLedger.variants[0].catalog_snapshot_sha256 = digest("different-snapshot");
  sourceLedger.variants[1].formula_identity_sha256 = digest("different-formula");
  sourceLedger.variants[2].source_catalog_record_sha256 = digest("different-source-record");
  sourceLedger.catalog_readback.records[3].base_price_usd = "88.88";
  const result = verify(sourceLedger, shopifyReadback(sourceLedger));
  for (const category of [
    "ledger-catalog.account-plan-parity",
    "variant.catalog-snapshot-parity",
    "variant.catalog-formula-parity",
    "variant.catalog-source-record-parity",
    "variant.catalog-base-price-parity",
  ]) {
    assert.equal(result.issues.includes(category), true);
  }
});

test("rejects an untrusted catalog artifact identity and duplicate source records", () => {
  const sourceLedger = ledger();
  sourceLedger.catalog_readback.snapshot_artifact =
    ".artifacts/operations/shopify/../private-pricing/invented.json";
  sourceLedger.catalog_readback.records[1].source_catalog_record_sha256 =
    sourceLedger.catalog_readback.records[0].source_catalog_record_sha256;
  sourceLedger.variants[1].source_catalog_record_sha256 =
    sourceLedger.catalog_readback.records[1].source_catalog_record_sha256;
  const result = verify(sourceLedger, shopifyReadback(sourceLedger));
  assert.equal(result.issues.includes("catalog-readback.snapshot"), true);
  assert.equal(result.issues.includes("catalog-readback.record.source-record"), true);
});

test("rejects aesthetic pricing, cost mismatch, compare-at values, and uncertain mappings", () => {
  const sourceLedger = ledger();
  const readback = shopifyReadback(sourceLedger);
  sourceLedger.variants[0].retail_price_usd = "21.99";
  sourceLedger.variants[1].shopify_cost_per_item_usd = "99.99";
  sourceLedger.variants[2].compare_at_price_usd = "49.99";
  sourceLedger.variants[3].exact_mapping_confirmed = false;
  const result = verify(sourceLedger, readback);
  assert.equal(result.ok, false);
  for (const category of [
    "variant.price-rule",
    "variant.cost-parity",
    "variant.compare-at-not-blank",
    "variant.mapping",
    "ledger-readback.commerce-parity",
  ]) {
    assert.equal(result.issues.includes(category), true);
  }
});

test("rejects arbitrary handles and legacy arbitrary record identifiers", () => {
  const sourceLedger = ledger();
  const readback = shopifyReadback(sourceLedger);
  sourceLedger.variants[0].handle = "arbitrary-product";
  readback.variants[0].handle = "arbitrary-product";
  const handleResult = verify(sourceLedger, readback);
  assert.equal(handleResult.issues.includes("ledger.variants.public-handle-set"), true);
  assert.equal(handleResult.issues.includes("shopify-readback.variants.public-handle-set"), true);

  const legacyLedger = ledger();
  const legacyReadback = shopifyReadback(legacyLedger);
  legacyLedger.variants = legacyLedger.variants.map((variant, index) => {
    const { product_id: ignoredProductId, variant_id: ignoredVariantId, ...rest } = variant;
    return { ...rest, record_id: `private-record-${index + 1}` };
  });
  const legacyResult = verify(legacyLedger, legacyReadback);
  assert.equal(legacyResult.issues.includes("variant.contract"), true);
  assert.equal(legacyResult.issues.includes("ledger-readback.identity-parity"), true);
});

test("requires unique Shopify GIDs, active status, and exact ledger/readback identity parity", () => {
  const sourceLedger = ledger();
  const readback = shopifyReadback(sourceLedger);
  sourceLedger.variants[0].variant_id = "gid://shopify/ProductVariant/9999";
  readback.variants[1].product_id = readback.variants[0].product_id;
  readback.variants[2].status = "draft";
  const result = verify(sourceLedger, readback);
  assert.equal(result.issues.includes("ledger-readback.identity-parity"), true);
  assert.equal(result.issues.includes("shopify-readback.variant.product-id"), true);
  assert.equal(result.issues.includes("shopify-readback.variant.active-status"), true);
});

test("requires the authenticated US/USD Shopify readback source", () => {
  const sourceLedger = ledger();
  const readback = shopifyReadback(sourceLedger);
  readback.readback_source = "operator-entered-export";
  readback.market = "CA";
  const result = verify(sourceLedger, readback);
  assert.equal(result.issues.includes("shopify-readback.source"), true);
  assert.equal(result.issues.includes("shopify-readback.market-currency"), true);
});

test("redacted output never contains handles, Shopify IDs, costs, or retail amounts", () => {
  const sourceLedger = ledger();
  const readback = shopifyReadback(sourceLedger);
  sourceLedger.variants[0].retail_price_usd = "21.99";
  const redacted = redactedPriceVerification(verify(sourceLedger, readback));
  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes("example-product-1"), false);
  assert.equal(serialized.includes("gid://shopify"), false);
  assert.equal(serialized.includes(connectedAccountPlanRecordSha256), false);
  assert.equal(serialized.includes(catalogSnapshotSha256), false);
  assert.equal(serialized.includes("manufacturing-partner-usd-catalog.json"), false);
  assert.equal(serialized.includes("10.01"), false);
  assert.equal(serialized.includes("21.99"), false);
  assert.equal(redacted.schema_version, 2);
  assert.deepEqual(redacted.failures, [
    { category: "ledger-readback.commerce-parity", count: 1 },
    { category: "variant.price-rule", count: 1 },
  ]);
});

test("requires decimal strings and never rounds to merchandising endings", () => {
  assert.throws(() => calculateRetailPriceUsd(10.01), /two-decimal USD string/);
  assert.throws(() => calculateRetailPriceUsd("10"), /two-decimal USD string/);
  assert.throws(() => calculateRetailPriceUsd("0.00"), /greater than zero/);
});
