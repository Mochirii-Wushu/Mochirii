const LEDGER_KEYS = Object.freeze([
  "schema_version",
  "captured_at",
  "market",
  "currency",
  "basis",
  "catalog_readback",
  "variants",
]);

const BASIS_KEYS = Object.freeze([
  "connected_account_plan_record_sha256",
  "shipping_included",
  "tax_included",
  "optional_services_included",
  "ambiguity_resolved",
]);

const CATALOG_READBACK_KEYS = Object.freeze([
  "schema_version",
  "captured_at",
  "provider",
  "market",
  "currency",
  "readback_source",
  "authentication_evidence_sha256",
  "connected_account_plan_record_sha256",
  "snapshot_artifact",
  "snapshot_sha256",
  "snapshot_format",
  "snapshot_record_count",
  "record_hash_scope",
  "records",
]);

const CATALOG_RECORD_KEYS = Object.freeze([
  "handle",
  "formula_identity_sha256",
  "source_catalog_record_sha256",
  "base_price_usd",
]);

const LEDGER_VARIANT_KEYS = Object.freeze([
  "handle",
  "product_id",
  "variant_id",
  "exact_mapping_confirmed",
  "formula_identity_sha256",
  "source_catalog_record_sha256",
  "catalog_snapshot_sha256",
  "base_price_usd",
  "shopify_cost_per_item_usd",
  "retail_price_usd",
  "compare_at_price_usd",
]);

const SHOPIFY_READBACK_KEYS = Object.freeze([
  "schema_version",
  "captured_at",
  "market",
  "currency",
  "readback_source",
  "variants",
]);

const SHOPIFY_READBACK_VARIANT_KEYS = Object.freeze([
  "handle",
  "product_id",
  "variant_id",
  "status",
  "shopify_cost_per_item_usd",
  "retail_price_usd",
  "compare_at_price_usd",
]);

const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PRODUCT_ID_PATTERN = /^gid:\/\/shopify\/Product\/[1-9]\d*$/u;
const VARIANT_ID_PATTERN = /^gid:\/\/shopify\/ProductVariant\/[1-9]\d*$/u;
const USD_PATTERN = /^(?:0|[1-9]\d*)\.\d{2}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const PLACEHOLDER_SHA256_PATTERN = /^([a-f0-9])\1{63}$/u;
const SNAPSHOT_ARTIFACT_PATTERN =
  /^\.artifacts\/operations\/shopify\/[a-zA-Z0-9][a-zA-Z0-9._/-]*\.json$/u;

export const PRICE_RULE = Object.freeze({
  multiplier: "2.20",
  markup_on_cost_percent: "120",
  gross_margin_percent_before_shipping_tax_and_services: "54.5454545454545",
  rounding: "ROUND_HALF_UP",
  currency_scale: 2,
});

export const PRICE_GATE_POLICY = Object.freeze({
  expected_variant_count: 20,
  maximum_capture_age_hours: 24,
  catalog_provider: "manufacturing-partner",
  catalog_readback_source: "authenticated-manufacturing-partner-connected-account",
  catalog_snapshot_format: "canonical-json",
  catalog_record_hash_scope: "provider-record-including-formula-plan-and-base-price",
  shopify_readback_source: "authenticated-shopify-admin",
});

function parseUnsignedDecimal(value, field) {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) {
    throw new TypeError(`${field} must be an unsigned decimal string`);
  }
  const [integer, fraction = ""] = value.split(".");
  return {
    coefficient: BigInt(`${integer}${fraction}`),
    scale: fraction.length,
  };
}

function powerOfTen(exponent) {
  return 10n ** BigInt(exponent);
}

function formatFixed(coefficient, scale) {
  const digits = coefficient.toString().padStart(scale + 1, "0");
  if (scale === 0) return digits;
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function multiplyDecimalRoundHalfUp(value, multiplier, outputScale = 2) {
  if (!Number.isSafeInteger(outputScale) || outputScale < 0) {
    throw new TypeError("outputScale must be a non-negative safe integer");
  }
  const left = parseUnsignedDecimal(value, "value");
  const right = parseUnsignedDecimal(multiplier, "multiplier");
  let coefficient = left.coefficient * right.coefficient;
  const sourceScale = left.scale + right.scale;

  if (sourceScale < outputScale) {
    coefficient *= powerOfTen(outputScale - sourceScale);
  } else if (sourceScale > outputScale) {
    const divisor = powerOfTen(sourceScale - outputScale);
    const quotient = coefficient / divisor;
    const remainder = coefficient % divisor;
    coefficient = quotient + (remainder * 2n >= divisor ? 1n : 0n);
  }
  return formatFixed(coefficient, outputScale);
}

export function calculateRetailPriceUsd(basePriceUsd) {
  if (typeof basePriceUsd !== "string" || !USD_PATTERN.test(basePriceUsd)) {
    throw new TypeError("base price must use a two-decimal USD string");
  }
  if (basePriceUsd === "0.00") throw new RangeError("base price must be greater than zero");
  return multiplyDecimalRoundHalfUp(basePriceUsd, PRICE_RULE.multiplier, PRICE_RULE.currency_scale);
}

function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function add(issues, category) {
  issues.push(category);
}

function validateCaptureTime(value, category, now, issues) {
  const captured = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(captured) || new Date(captured).toISOString() !== value) {
    add(issues, `${category}.capture-time`);
    return null;
  }
  const maximumAge = PRICE_GATE_POLICY.maximum_capture_age_hours * 60 * 60 * 1000;
  if (captured > now || now - captured > maximumAge) add(issues, `${category}.capture-freshness`);
  return value;
}

function validEvidenceSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value) &&
    !PLACEHOLDER_SHA256_PATTERN.test(value);
}

function validSnapshotArtifact(value) {
  return typeof value === "string" && value.length <= 512 &&
    SNAPSHOT_ARTIFACT_PATTERN.test(value) &&
    !value.includes("//") && !value.includes("/./") && !value.includes("/../");
}

function expectedHandleSet(expectedProducts, issues) {
  if (!Array.isArray(expectedProducts) ||
      expectedProducts.length !== PRICE_GATE_POLICY.expected_variant_count) {
    add(issues, "expected-products.exact-count");
    return new Set();
  }
  const handles = [];
  for (const product of expectedProducts) {
    if (!exactKeys(product, ["handle", "title"]) ||
        typeof product.handle !== "string" || !HANDLE_PATTERN.test(product.handle) ||
        typeof product.title !== "string" || product.title.length === 0) {
      add(issues, "expected-products.contract");
      continue;
    }
    handles.push(product.handle);
  }
  if (new Set(handles).size !== handles.length) add(issues, "expected-products.duplicate-handle");
  return new Set(handles);
}

function exactHandleSet(variants, expectedHandles, issues, category) {
  const actual = variants.map((variant) => variant?.handle).filter((handle) => typeof handle === "string");
  if (new Set(actual).size !== actual.length) add(issues, `${category}.duplicate-handle`);
  if (expectedHandles.size === PRICE_GATE_POLICY.expected_variant_count &&
      JSON.stringify([...actual].sort()) !== JSON.stringify([...expectedHandles].sort())) {
    add(issues, `${category}.public-handle-set`);
  }
}

function identityKey(variant) {
  return `${variant.handle}\u0000${variant.product_id}\u0000${variant.variant_id}`;
}

function validateIdentity(variant, seenProductIds, seenVariantIds, issues, category) {
  if (typeof variant.handle !== "string" || !HANDLE_PATTERN.test(variant.handle)) {
    add(issues, `${category}.handle`);
  }
  if (typeof variant.product_id !== "string" || !PRODUCT_ID_PATTERN.test(variant.product_id) ||
      seenProductIds.has(variant.product_id)) {
    add(issues, `${category}.product-id`);
  } else {
    seenProductIds.add(variant.product_id);
  }
  if (typeof variant.variant_id !== "string" || !VARIANT_ID_PATTERN.test(variant.variant_id) ||
      seenVariantIds.has(variant.variant_id)) {
    add(issues, `${category}.variant-id`);
  } else {
    seenVariantIds.add(variant.variant_id);
  }
}

function blankCompareAt(value) {
  return value === null || value === "";
}

function sameIdentitySet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

export function verifyPrivatePriceLedger(ledger, shopifyReadback, options = {}) {
  const issues = [];
  const now = options.now instanceof Date ? options.now.getTime() : Date.now();
  const expectedHandles = expectedHandleSet(options.expectedProducts, issues);

  const ledgerContractValid = exactKeys(ledger, LEDGER_KEYS);
  if (!ledgerContractValid) add(issues, "ledger.contract");
  const readbackContractValid = exactKeys(shopifyReadback, SHOPIFY_READBACK_KEYS);
  if (!readbackContractValid) add(issues, "shopify-readback.contract");

  const ledgerCapturedAt = ledgerContractValid
    ? validateCaptureTime(ledger.captured_at, "ledger", now, issues)
    : null;
  const catalogContractValid = ledgerContractValid && exactKeys(
    ledger.catalog_readback,
    CATALOG_READBACK_KEYS,
  );
  if (ledgerContractValid && !catalogContractValid) add(issues, "catalog-readback.contract");
  const catalogCapturedAt = catalogContractValid
    ? validateCaptureTime(ledger.catalog_readback.captured_at, "catalog-readback", now, issues)
    : null;
  const readbackCapturedAt = readbackContractValid
    ? validateCaptureTime(shopifyReadback.captured_at, "shopify-readback", now, issues)
    : null;

  if (ledgerContractValid) {
    if (ledger.schema_version !== 2) add(issues, "ledger.schema-version");
    if (ledger.market !== "US" || ledger.currency !== "USD") add(issues, "ledger.market-currency");
    if (!exactKeys(ledger.basis, BASIS_KEYS)) {
      add(issues, "ledger.basis-contract");
    } else {
      if (!validEvidenceSha256(ledger.basis.connected_account_plan_record_sha256)) {
        add(issues, "ledger.account-plan-record");
      }
      if (ledger.basis.shipping_included !== false) add(issues, "ledger.shipping-exclusion");
      if (ledger.basis.tax_included !== false) add(issues, "ledger.tax-exclusion");
      if (ledger.basis.optional_services_included !== false) add(issues, "ledger.optional-services-exclusion");
      if (ledger.basis.ambiguity_resolved !== true) add(issues, "ledger.ambiguity");
    }
  }

  const catalogRecords = catalogContractValid && Array.isArray(ledger.catalog_readback.records)
    ? ledger.catalog_readback.records
    : [];
  const catalogByHandle = new Map();
  if (catalogContractValid) {
    const catalog = ledger.catalog_readback;
    if (catalog.schema_version !== 1) add(issues, "catalog-readback.schema-version");
    if (catalog.provider !== PRICE_GATE_POLICY.catalog_provider ||
        catalog.readback_source !== PRICE_GATE_POLICY.catalog_readback_source) {
      add(issues, "catalog-readback.source");
    }
    if (catalog.market !== "US" || catalog.currency !== "USD" ||
        catalog.market !== ledger.market || catalog.currency !== ledger.currency) {
      add(issues, "catalog-readback.market-currency");
    }
    if (!validEvidenceSha256(catalog.authentication_evidence_sha256)) {
      add(issues, "catalog-readback.authentication-evidence");
    }
    if (!validEvidenceSha256(catalog.connected_account_plan_record_sha256)) {
      add(issues, "catalog-readback.account-plan-record");
    } else if (catalog.connected_account_plan_record_sha256 !==
        ledger.basis?.connected_account_plan_record_sha256) {
      add(issues, "ledger-catalog.account-plan-parity");
    }
    if (!validSnapshotArtifact(catalog.snapshot_artifact) ||
        !validEvidenceSha256(catalog.snapshot_sha256) ||
        catalog.snapshot_format !== PRICE_GATE_POLICY.catalog_snapshot_format) {
      add(issues, "catalog-readback.snapshot");
    }
    const topLevelProvenanceHashes = [
      catalog.authentication_evidence_sha256,
      catalog.connected_account_plan_record_sha256,
      catalog.snapshot_sha256,
    ].filter(validEvidenceSha256);
    if (new Set(topLevelProvenanceHashes).size !== topLevelProvenanceHashes.length) {
      add(issues, "catalog-readback.provenance-hash-separation");
    }
    if (catalog.record_hash_scope !== PRICE_GATE_POLICY.catalog_record_hash_scope) {
      add(issues, "catalog-readback.record-hash-scope");
    }
    if (catalog.snapshot_record_count !== PRICE_GATE_POLICY.expected_variant_count ||
        catalog.snapshot_record_count !== catalogRecords.length) {
      add(issues, "catalog-readback.records.exact-count");
    }
    if (catalogCapturedAt && ledgerCapturedAt &&
        Date.parse(catalogCapturedAt) > Date.parse(ledgerCapturedAt)) {
      add(issues, "catalog-readback.capture-order");
    }

    exactHandleSet(catalogRecords, expectedHandles, issues, "catalog-readback.records");
    const sourceRecordHashes = new Set();
    for (const record of catalogRecords) {
      if (!exactKeys(record, CATALOG_RECORD_KEYS)) {
        add(issues, "catalog-readback.record.contract");
        continue;
      }
      if (typeof record.handle !== "string" || !HANDLE_PATTERN.test(record.handle)) {
        add(issues, "catalog-readback.record.handle");
      }
      if (!validEvidenceSha256(record.formula_identity_sha256)) {
        add(issues, "catalog-readback.record.formula-identity");
      }
      if (!validEvidenceSha256(record.source_catalog_record_sha256) ||
          sourceRecordHashes.has(record.source_catalog_record_sha256) ||
          topLevelProvenanceHashes.includes(record.source_catalog_record_sha256) ||
          record.source_catalog_record_sha256 === record.formula_identity_sha256) {
        add(issues, "catalog-readback.record.source-record");
      } else {
        sourceRecordHashes.add(record.source_catalog_record_sha256);
      }
      if (!USD_PATTERN.test(record.base_price_usd ?? "") || record.base_price_usd === "0.00") {
        add(issues, "catalog-readback.record.base-price-format");
      }
      if (typeof record.handle === "string" && catalogByHandle.has(record.handle)) {
        add(issues, "catalog-readback.record.duplicate-handle");
      } else if (typeof record.handle === "string") {
        catalogByHandle.set(record.handle, record);
      }
    }
  }

  if (readbackContractValid) {
    if (shopifyReadback.schema_version !== 1) add(issues, "shopify-readback.schema-version");
    if (shopifyReadback.market !== "US" || shopifyReadback.currency !== "USD") {
      add(issues, "shopify-readback.market-currency");
    }
    if (shopifyReadback.readback_source !== PRICE_GATE_POLICY.shopify_readback_source) {
      add(issues, "shopify-readback.source");
    }
  }

  const ledgerVariants = ledgerContractValid && Array.isArray(ledger.variants) ? ledger.variants : [];
  const readbackVariants = readbackContractValid && Array.isArray(shopifyReadback.variants)
    ? shopifyReadback.variants
    : [];
  if (ledgerVariants.length !== PRICE_GATE_POLICY.expected_variant_count) {
    add(issues, "ledger.variants.exact-count");
  }
  if (readbackVariants.length !== PRICE_GATE_POLICY.expected_variant_count) {
    add(issues, "shopify-readback.variants.exact-count");
  }
  exactHandleSet(ledgerVariants, expectedHandles, issues, "ledger.variants");
  exactHandleSet(readbackVariants, expectedHandles, issues, "shopify-readback.variants");

  const ledgerIdentities = new Set();
  const ledgerProductIds = new Set();
  const ledgerVariantIds = new Set();
  for (const variant of ledgerVariants) {
    if (!exactKeys(variant, LEDGER_VARIANT_KEYS)) {
      add(issues, "variant.contract");
      continue;
    }
    validateIdentity(variant, ledgerProductIds, ledgerVariantIds, issues, "variant");
    ledgerIdentities.add(identityKey(variant));
    if (variant.exact_mapping_confirmed !== true) add(issues, "variant.mapping");
    if (!validEvidenceSha256(variant.formula_identity_sha256)) {
      add(issues, "variant.formula-identity");
    }
    if (!validEvidenceSha256(variant.source_catalog_record_sha256)) {
      add(issues, "variant.source-record");
    }
    if (!validEvidenceSha256(variant.catalog_snapshot_sha256)) {
      add(issues, "variant.catalog-snapshot");
    }

    const catalogRecord = catalogByHandle.get(variant.handle);
    if (!catalogRecord) {
      add(issues, "variant.catalog-record");
    } else {
      if (variant.formula_identity_sha256 !== catalogRecord.formula_identity_sha256) {
        add(issues, "variant.catalog-formula-parity");
      }
      if (variant.source_catalog_record_sha256 !== catalogRecord.source_catalog_record_sha256) {
        add(issues, "variant.catalog-source-record-parity");
      }
      if (variant.base_price_usd !== catalogRecord.base_price_usd) {
        add(issues, "variant.catalog-base-price-parity");
      }
    }
    if (catalogContractValid &&
        variant.catalog_snapshot_sha256 !== ledger.catalog_readback.snapshot_sha256) {
      add(issues, "variant.catalog-snapshot-parity");
    }

    let expectedRetail;
    try {
      expectedRetail = calculateRetailPriceUsd(variant.base_price_usd);
    } catch {
      add(issues, "variant.base-price-format");
      continue;
    }
    if (variant.shopify_cost_per_item_usd !== variant.base_price_usd) {
      add(issues, "variant.cost-parity");
    }
    if (variant.retail_price_usd !== expectedRetail) add(issues, "variant.price-rule");
    if (!blankCompareAt(variant.compare_at_price_usd)) add(issues, "variant.compare-at-not-blank");
  }

  const readbackIdentities = new Set();
  const readbackProductIds = new Set();
  const readbackVariantIds = new Set();
  for (const variant of readbackVariants) {
    if (!exactKeys(variant, SHOPIFY_READBACK_VARIANT_KEYS)) {
      add(issues, "shopify-readback.variant.contract");
      continue;
    }
    validateIdentity(
      variant,
      readbackProductIds,
      readbackVariantIds,
      issues,
      "shopify-readback.variant",
    );
    readbackIdentities.add(identityKey(variant));
    if (variant.status !== "active") add(issues, "shopify-readback.variant.active-status");
    if (!USD_PATTERN.test(variant.shopify_cost_per_item_usd ?? "") ||
        variant.shopify_cost_per_item_usd === "0.00") {
      add(issues, "shopify-readback.variant.cost-format");
    }
    if (!USD_PATTERN.test(variant.retail_price_usd ?? "") || variant.retail_price_usd === "0.00") {
      add(issues, "shopify-readback.variant.price-format");
    }
    if (!blankCompareAt(variant.compare_at_price_usd)) {
      add(issues, "shopify-readback.variant.compare-at-not-blank");
    }
  }

  if (!sameIdentitySet(ledgerIdentities, readbackIdentities)) {
    add(issues, "ledger-readback.identity-parity");
  }
  const readbackByIdentity = new Map(readbackVariants
    .filter((variant) => exactKeys(variant, SHOPIFY_READBACK_VARIANT_KEYS))
    .map((variant) => [identityKey(variant), variant]));
  for (const variant of ledgerVariants.filter((item) => exactKeys(item, LEDGER_VARIANT_KEYS))) {
    const readback = readbackByIdentity.get(identityKey(variant));
    if (!readback) continue;
    if (variant.shopify_cost_per_item_usd !== readback.shopify_cost_per_item_usd ||
        variant.retail_price_usd !== readback.retail_price_usd ||
        variant.compare_at_price_usd !== readback.compare_at_price_usd) {
      add(issues, "ledger-readback.commerce-parity");
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      active_variant_count: readbackVariants.filter((variant) => variant?.status === "active").length,
      catalog_readback_captured_at: catalogCapturedAt,
      ledger_captured_at: ledgerCapturedAt,
      shopify_readback_captured_at: readbackCapturedAt,
    },
  };
}

export function redactedPriceVerification(result) {
  const counts = new Map();
  for (const category of result.issues ?? []) counts.set(category, (counts.get(category) ?? 0) + 1);
  return {
    schema_version: 2,
    rule: "exact-2.20x-round-half-up",
    status: result.ok ? "pass" : "fail",
    catalog_readback_captured_at: result.summary?.catalog_readback_captured_at ?? null,
    ledger_captured_at: result.summary?.ledger_captured_at ?? null,
    shopify_readback_captured_at: result.summary?.shopify_readback_captured_at ?? null,
    active_variant_count: result.summary?.active_variant_count ?? 0,
    failures: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, count]) => ({ category, count })),
  };
}
