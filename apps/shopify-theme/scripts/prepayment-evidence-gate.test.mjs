import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { calculateRetailPriceUsd, redactedPriceVerification, verifyPrivatePriceLedger } from "./lib/private-price-rule.mjs";
import {
  EXPECTED_PRODUCT_HANDLES,
  PREPAYMENT_GATE_POLICY,
  REQUIRED_EVIDENCE_KINDS,
  REQUIRED_SEARCH_QUERIES,
  validatePrepaymentEvidenceBundle,
} from "./lib/prepayment-evidence-gate.mjs";
import { REQUIRED_RENDERED_ROUTE_CATEGORIES } from "./lib/launch-content-contracts.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appRoot, "../..");
const artifactsRoot = path.join(repositoryRoot, ".artifacts", "operations");
mkdirSync(artifactsRoot, { recursive: true });

const NOW = new Date("2026-07-19T13:00:00.000Z");
const CAPTURED_AT = "2026-07-19T12:00:00.000Z";
const COMMIT_SHA = "a".repeat(40);
const TREE_SHA = "b".repeat(40);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function priceLedger(capturedAt = CAPTURED_AT) {
  return {
    schema_version: 1,
    captured_at: capturedAt,
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
    variants: EXPECTED_PRODUCT_HANDLES.map((handle, index) => {
      const basePrice = `${20 + index}.00`;
      return {
        handle,
        product_id: `gid://shopify/Product/${1000 + index}`,
        variant_id: `gid://shopify/ProductVariant/${2000 + index}`,
        exact_mapping_confirmed: true,
        base_price_usd: basePrice,
        shopify_cost_per_item_usd: basePrice,
        retail_price_usd: calculateRetailPriceUsd(basePrice),
        compare_at_price_usd: null,
      };
    }),
  };
}

function shopifyPriceReadback(ledger) {
  return {
    schema_version: 1,
    captured_at: ledger.captured_at,
    market: "US",
    currency: "USD",
    readback_source: "authenticated-shopify-admin",
    variants: ledger.variants.map((variant) => ({
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

function operationalGate(assertions, evidenceRef) {
  return Object.fromEntries([
    ["captured_at", CAPTURED_AT],
    ["status", "pass"],
    ...assertions.map((field) => [field, true]),
    ["evidence_ref", evidenceRef],
  ]);
}

function buildFixture(directory) {
  const relativeDirectory = path.relative(repositoryRoot, directory).split(path.sep).join("/");
  const ledger = priceLedger();
  const shopifyReadback = shopifyPriceReadback(ledger);
  const report = redactedPriceVerification(verifyPrivatePriceLedger(ledger, shopifyReadback, {
    now: NOW,
    expectedProducts: EXPECTED_PRODUCT_HANDLES.map((handle) => ({ handle, title: handle })),
  }));
  const evidenceContents = new Map(REQUIRED_EVIDENCE_KINDS.map((kind) => [kind, `${kind} evidence\n`]));
  evidenceContents.set("theme-package", Buffer.from("synthetic theme package"));
  evidenceContents.set("private-price-ledger", `${JSON.stringify(ledger, null, 2)}\n`);
  evidenceContents.set("private-price-shopify-readback", `${JSON.stringify(shopifyReadback, null, 2)}\n`);
  evidenceContents.set("private-price-report", `${JSON.stringify(report, null, 2)}\n`);

  const evidenceFiles = [];
  for (const kind of REQUIRED_EVIDENCE_KINDS) {
    const extension = kind === "theme-package" ? "zip" : "json";
    const relativePath = `${relativeDirectory}/${kind}.${extension}`;
    const absolutePath = path.join(repositoryRoot, ...relativePath.split("/"));
    const content = evidenceContents.get(kind);
    writeFileSync(absolutePath, content);
    const buffer = readFileSync(absolutePath);
    evidenceFiles.push({ id: kind, kind, path: relativePath, sha256: sha256(buffer) });
  }
  const packageSha = evidenceFiles.find((entry) => entry.kind === "theme-package").sha256;

  const bundle = {
    schema_version: 1,
    gate: PREPAYMENT_GATE_POLICY.gate,
    captured_at: CAPTURED_AT,
    market: { country: "US", currency: "USD" },
    source: {
      captured_at: CAPTURED_AT,
      repository: PREPAYMENT_GATE_POLICY.repository,
      branch: "main",
      commit_sha: COMMIT_SHA,
      tree_sha: TREE_SHA,
      pull_request_merged: true,
      protected_main: true,
      accountable_human_review: true,
      required_checks_passed: true,
      package_sha256: packageSha,
      source_evidence_ref: "source-readback",
      package_evidence_ref: "theme-package",
    },
    candidate_theme: {
      captured_at: CAPTURED_AT,
      theme_id: "141514408011",
      status: "Draft",
      checkout_enabled: false,
      password_protected: true,
      published: false,
      dedicated_hero_pass: true,
      controlled_social_image_pass: true,
      source_commit_sha: COMMIT_SHA,
      source_tree_sha: TREE_SHA,
      package_sha256: packageSha,
      evidence_ref: "candidate-theme-readback",
    },
    rendered_routes: {
      captured_at: CAPTURED_AT,
      status: "pass",
      results: REQUIRED_RENDERED_ROUTE_CATEGORIES.map((category) => ({
        category,
        checked_route_count: category === "products" ? 20 : category === "collections" ? 5 :
          category === "search-and-filters" ? 7 : category === "policies-and-privacy" ? 5 :
            category === "errors" ? 2 : category === "notifications" ? 3 : 1,
        http_pass: true,
        readback_pass: true,
      })),
      search_queries: [...REQUIRED_SEARCH_QUERIES],
      sold_out_fixture_pass: true,
      zero_result_pass: true,
      server_error_pass: true,
      evidence_ref: "rendered-route-readback",
    },
    product_review: {
      captured_at: CAPTURED_AT,
      status: "pass",
      product_facts_schema_version: 3,
      canonical_emblem: {
        asset_path: PREPAYMENT_GATE_POLICY.canonical_emblem_asset,
        sha256: PREPAYMENT_GATE_POLICY.canonical_emblem_sha256,
      },
      storefront_emblem: {
        asset_path: PREPAYMENT_GATE_POLICY.storefront_emblem_asset,
        sha256: PREPAYMENT_GATE_POLICY.storefront_emblem_sha256,
      },
      wordmark: "Mochirii Cosmetics",
      products: EXPECTED_PRODUCT_HANDLES.map((handle, index) => ({
        handle,
        variant_record_id: `gid://shopify/ProductVariant/${2000 + index}`,
        active: true,
        facts_pass: true,
        formula_mapping_pass: true,
        front_label_pass: true,
        technical_panel_pass: true,
        outer_box_pass: true,
        media_pass: true,
        emblem_pass: true,
        wordmark_pass: true,
      })),
      evidence_ref: "product-review",
    },
    private_price: {
      ledger_captured_at: CAPTURED_AT,
      shopify_readback_captured_at: CAPTURED_AT,
      status: "pass",
      rule: "exact-2.20x-round-half-up",
      active_variant_count: 20,
      ledger_evidence_ref: "private-price-ledger",
      shopify_readback_evidence_ref: "private-price-shopify-readback",
      report_evidence_ref: "private-price-report",
    },
    launch_pages: {
      captured_at: CAPTURED_AT,
      status: "pass",
      content_revision: "2026-07-19-v1",
      applied_page_handles: ["faq", "ingredients-standards", "accessibility"],
      readback_pass: true,
      provider_write_authority: false,
      evidence_ref: "launch-pages-readback",
    },
    mandatory_name_review: {
      captured_at: CAPTURED_AT,
      status: "pass",
      reviewed_route_categories: [...REQUIRED_RENDERED_ROUTE_CATEGORIES],
      exception_register_reviewed: true,
      rendered_review_pass: true,
      unreviewed_name_count: 0,
      evidence_ref: "mandatory-name-review",
    },
    fulfillment_shipping: {
      captured_at: CAPTURED_AT,
      status: "pass",
      exact_20_mappings: true,
      stock_sync_enabled: true,
      shopify_inventory_tracking_disabled: true,
      intended_location_only: true,
      contiguous_us_only: true,
      shipping_rates_verified: true,
      unsupported_regions_verified: true,
      po_box_behavior_verified: true,
      policy_parity_verified: true,
      evidence_ref: "fulfillment-shipping-readback",
    },
    operational_gates: {
      tax: operationalGate(["nexus_review_complete", "configuration_readback_pass"], "operations-readback"),
      privacy: operationalGate(
        [
          "policy_review_complete",
          "consent_review_complete",
          "marketing_consent_review_complete",
          "network_intelligence_disclosure_review_complete",
          "privacy_choices_verified",
        ],
        "operations-readback",
      ),
      apps: operationalGate(
        ["permissions_review_complete", "pixel_inventory_review_complete", "unapproved_apps_absent"],
        "operations-readback",
      ),
      email: operationalGate(
        ["sender_domain_authenticated", "customer_notifications_reviewed", "notification_language_reviewed"],
        "operations-readback",
      ),
      domains: operationalGate(
        ["canonical_domain_verified", "legacy_domain_disposition_complete"],
        "operations-readback",
      ),
      account_security: operationalGate(
        [
          "owner_2fa_verified",
          "staff_2fa_verified",
          "access_review_complete",
          "customer_accounts_configuration_reviewed",
        ],
        "operations-readback",
      ),
    },
    quality_assurance: {
      captured_at: CAPTURED_AT,
      status: "pass",
      keyboard_pass: true,
      focus_pass: true,
      escape_pass: true,
      touch_pass: true,
      zoom_reflow_200_pass: true,
      nvda_chrome_pass: true,
      voiceover_safari_pass: true,
      automated_accessibility_critical: 0,
      automated_accessibility_serious: 0,
      responsive_viewports: ["360x800", "390x844", "768x1024", "1440x900"],
      lighthouse: ["home", "collection", "product", "cart"].map((routeType) => ({
        route_type: routeType,
        accessibility: 95,
        best_practices: 95,
        seo: 95,
        mobile_performance: 85,
      })),
      evidence_ref: "accessibility-performance-readback",
    },
    final_phase_exclusions: {
      payment_setup_completed: false,
      checkout_activated: false,
      theme_published: false,
      password_removed: false,
      orders_created: false,
    },
    evidence_files: evidenceFiles,
  };
  const bundlePath = path.join(directory, "prepayment-evidence-bundle.json");
  writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
  return { bundle, bundlePath };
}

function withFixture(callback) {
  const directory = mkdtempSync(path.join(artifactsRoot, "prepayment-gate-test-"));
  try {
    callback(buildFixture(directory), directory);
  } finally {
    const realArtifacts = path.resolve(artifactsRoot);
    const realDirectory = path.resolve(directory);
    assert.equal(realDirectory.startsWith(`${realArtifacts}${path.sep}`), true);
    rmSync(realDirectory, { recursive: true, force: true });
  }
}

function validate(bundle, bundlePath, now = NOW) {
  return validatePrepaymentEvidenceBundle(bundle, { repositoryRoot, bundlePath, now });
}

test("a fully synthetic ignored evidence bundle satisfies the aggregate prepayment gate", () => {
  withFixture(({ bundle, bundlePath }) => {
    const result = validate(bundle, bundlePath);
    assert.equal(result.ok, true, JSON.stringify(result.issues));
    assert.deepEqual(result.issues, []);
  });
});

test("missing and stale evidence fail closed", () => {
  withFixture(({ bundle, bundlePath }) => {
    const missing = structuredClone(bundle);
    missing.evidence_files.find((entry) => entry.kind === "product-review").path += ".missing";
    let result = validate(missing, bundlePath);
    assert.equal(result.ok, false);
    assert.equal(result.issues.some((issue) => issue.category === "file.missing"), true);

    const stale = structuredClone(bundle);
    stale.candidate_theme.captured_at = "2026-07-17T12:00:00.000Z";
    result = validate(stale, bundlePath);
    assert.equal(result.ok, false);
    assert.equal(result.issues.some((issue) => issue.gate === "candidate-theme" && issue.category === "capture.freshness"), true);
  });
});

test("public self-attestation without an ignored bundle cannot satisfy the gate", () => {
  withFixture(({ bundle }) => {
    const publicPath = path.join(appRoot, "scripts", "prepayment-public-self-attestation.tmp.json");
    try {
      writeFileSync(publicPath, `${JSON.stringify(bundle)}\n`);
      const result = validate(bundle, publicPath);
      assert.equal(result.ok, false);
      assert.equal(result.issues.some((issue) => issue.gate === "evidence" && issue.category === "bundle.boundary"), true);
    } finally {
      rmSync(publicPath, { force: true });
    }
  });
});

test("missing or hash-mismatched evidence and price identity drift fail closed", () => {
  withFixture(({ bundle, bundlePath }) => {
    const mismatched = structuredClone(bundle);
    mismatched.evidence_files.find((entry) => entry.kind === "rendered-route-readback").sha256 = "f".repeat(64);
    let result = validate(mismatched, bundlePath);
    assert.equal(result.ok, false);
    assert.equal(result.issues.some((issue) => issue.category === "file.hash-mismatch"), true);

    const identityDrift = structuredClone(bundle);
    identityDrift.product_review.products[0].variant_record_id = "different-variant";
    result = validate(identityDrift, bundlePath);
    assert.equal(result.ok, false);
    assert.equal(result.issues.some((issue) => issue.category === "variant-identity-linkage"), true);
  });
});

test("candidate, source, product, operational, and final-payment assertions are fail closed", () => {
  withFixture(({ bundle, bundlePath }) => {
    const changed = structuredClone(bundle);
    changed.candidate_theme.theme_id = "141422395467";
    changed.source.accountable_human_review = false;
    changed.product_review.products[0].emblem_pass = false;
    changed.operational_gates.email.sender_domain_authenticated = false;
    changed.final_phase_exclusions.payment_setup_completed = true;
    const result = validate(changed, bundlePath);
    assert.equal(result.ok, false);
    for (const expected of [
      ["candidate-theme", "theme-id"],
      ["source", "accountable_human_review"],
      ["product-review", "product.emblem_pass"],
      ["operations-email", "sender_domain_authenticated"],
      ["final-phase-exclusions", "payment_setup_completed"],
    ]) {
      assert.equal(result.issues.some((issue) => issue.gate === expected[0] && issue.category === expected[1]), true);
    }
  });
});
