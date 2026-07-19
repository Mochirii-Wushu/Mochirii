import assert from "node:assert/strict";
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

function ledger() {
  return {
    schema_version: 1,
    captured_at: "2026-07-19T12:00:00.000Z",
    market: "US",
    currency: "USD",
    basis: {
      connected_account_plan_confirmed: true,
      current_catalog_confirmed: true,
      shipping_included: false,
      tax_included: false,
      optional_services_included: false,
      ambiguity_resolved: true,
    },
    variants: expectedProducts.map((product, index) => {
      const base = `${10 + index}.01`;
      return {
        handle: product.handle,
        product_id: `gid://shopify/Product/${1001 + index}`,
        variant_id: `gid://shopify/ProductVariant/${2001 + index}`,
        exact_mapping_confirmed: true,
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

test("accepts exact public identities bound to a fresh authenticated Shopify readback", () => {
  const sourceLedger = ledger();
  const result = verify(sourceLedger);
  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(PRICE_GATE_POLICY, {
    expected_variant_count: 20,
    maximum_capture_age_hours: 24,
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
  assert.equal(result.issues.includes("shopify-readback.capture-freshness"), true);
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
  assert.equal(serialized.includes("10.01"), false);
  assert.equal(serialized.includes("21.99"), false);
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
