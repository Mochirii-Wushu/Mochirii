import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_FACT_KEYS,
  SHOPIFY_MAPPED_FACT_KEYS,
  SHOPIFY_PUBLICATION_MAPPING,
  validateProductFactsContract,
} from "./lib/product-facts-contract.mjs";

const expectedProducts = Array.from({ length: 20 }, (_, index) => ({
  handle: `example-product-${index + 1}`,
  title: `Example Product ${index + 1}`,
}));

function review(state = "approved") {
  return {
    formula_mapping: state,
    front_label: state,
    technical_panel: state,
    outer_box: state,
    brand_mark: {
      status: state,
      emblem_matches: state === "approved" ? true : null,
      wordmark_matches: state === "approved" ? true : null,
    },
    media_unit_match: state,
  };
}

function facts(index) {
  const next = ((index + 1) % 20) + 1;
  return {
    functional_identity: "Daily facial moisturizer",
    description: "This daily facial moisturizer uses a verified humectant to help skin feel moisturized after application.",
    seo_title: `Example Product ${index + 1} | Mochirii Cosmetics`,
    seo_description: "A daily facial moisturizer with a verified humectant for moisturized-feeling normal skin after application.",
    card_benefit: "Hydrates skin with a verified humectant after cleansing.",
    benefits: ["Helps skin feel moisturized after application."],
    skin_type: ["Normal"],
    appearance_concerns: ["Dry-looking skin"],
    routine_step: "Moisturize",
    usage_directions: {
      text: "Apply to clean facial skin and leave on.",
      frequency: "Use once daily.",
      amount: "Apply the label-directed amount.",
      routine_timing: ["AM"],
      rinse_behavior: "No rinse",
    },
    key_ingredients: [
      { name: "Example humectant", cosmetic_role: "Helps bind water at the skin surface" },
    ],
    ingredients_inci: "Aqua, Glycerin",
    warnings: {
      review_result: "approved-none",
      text: null,
      incompatibilities: [],
    },
    texture: "Lightweight cream",
    finish: "Soft skin feel after application",
    fragrance_status: "Fragrance status verified from the label",
    country_of_origin: "United States",
    package_details: "Pump container with an outer box",
    certifications: {
      review_result: "approved-none",
      items: [],
    },
    volume: {
      us_customary: "1 fl oz",
      metric: "30 mL",
      display: "1 fl oz / 30 mL",
    },
    collection_handles: ["example-collection"],
    complementary_products: [`example-product-${next}`],
    media: [
      {
        role: "front",
        public_reference: `/products/example-${index + 1}-front.webp`,
        alt_text: "Front of Mochirii Cosmetics example moisturizer packaging",
        approved_unit_match: true,
      },
      {
        role: "technical-panel",
        public_reference: `/products/example-${index + 1}-panel.webp`,
        alt_text: "Ingredient and direction panel on the example moisturizer package",
        approved_unit_match: true,
      },
    ],
  };
}

function completeContract() {
  return {
    $schema: "./product-facts.v3.schema.json",
    schema_version: 3,
    revision: "example-v3",
    locale: "en-US",
    brand: "Mochirii Cosmetics",
    market: { country: "US", currency: "USD" },
    brand_mark: {
      reference_version: "example-v1",
      canonical_emblem: {
        asset_path: "apps/web/public/assets/img/brand/emblem.webp",
        sha256: "a".repeat(64),
      },
      storefront_derivative: {
        asset_path: "apps/shopify-theme/assets/mochirii-emblem.webp",
        sha256: "b".repeat(64),
      },
      wordmark: "Mochirii Cosmetics",
    },
    shopify_publication: structuredClone(SHOPIFY_PUBLICATION_MAPPING),
    status: "complete",
    products: expectedProducts.map((product, index) => ({
      handle: product.handle,
      public_title: product.title,
      review_status: "complete",
      review: review(),
      facts: facts(index),
    })),
  };
}

const options = {
  expectedProducts,
  collectionHandles: ["example-collection"],
  canonicalEmblemAsset: "apps/web/public/assets/img/brand/emblem.webp",
  canonicalEmblemSha256: "a".repeat(64),
  storefrontEmblemAsset: "apps/shopify-theme/assets/mochirii-emblem.webp",
  storefrontEmblemSha256: "b".repeat(64),
};

test("accepts an exact-20 complete public-facts contract", () => {
  const result = validateProductFactsContract(completeContract(), { ...options, requireComplete: true });
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.summary, { total: 20, complete: 20, pending: 0, blocked: 0 });
});

test("maps every v3 fact to an exact Shopify product field, metafield, collection, or media readback", () => {
  assert.deepEqual([...SHOPIFY_MAPPED_FACT_KEYS].sort(), [...PRODUCT_FACT_KEYS].sort());
  assert.equal(SHOPIFY_PUBLICATION_MAPPING.metafields.usage_directions.type, "json");
  assert.equal(SHOPIFY_PUBLICATION_MAPPING.metafields.key_ingredients.type, "json");
  assert.equal(SHOPIFY_PUBLICATION_MAPPING.metafields.warnings.type, "json");
  assert.equal(SHOPIFY_PUBLICATION_MAPPING.metafields.certifications.type, "json");
  assert.equal(SHOPIFY_PUBLICATION_MAPPING.metafields.volume.type, "json");
  assert.equal(
    SHOPIFY_PUBLICATION_MAPPING.metafields.complementary_products.type,
    "list.product_reference",
  );
  assert.equal(
    SHOPIFY_PUBLICATION_MAPPING.native_fields.media.media_source,
    "facts.media[].public_reference",
  );
  assert.equal(
    SHOPIFY_PUBLICATION_MAPPING.product_fields.description.readback,
    "product.description_html",
  );

  const contract = completeContract();
  contract.shopify_publication.metafields.usage_directions.type = "multi_line_text_field";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("root.shopify-publication-mapping"), true);
});

test("requires evidence-reviewed v3 description and SEO copy instead of a historical fallback", () => {
  const contract = completeContract();
  delete contract.products[0].facts.description;
  contract.products[1].facts.seo_title = "Unbound title";
  contract.products[2].facts.seo_description = "A calm ritual.";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.keys"), true);
  assert.equal(result.issues.includes("products.1.facts.seo_title.identity"), true);
  assert.equal(result.issues.includes("products.2.facts.seo_description.mood-only"), true);
});

test("rejects provider and system language in every rendered product-fact group", () => {
  const contract = completeContract();
  contract.products[0].facts.routine_step = "Supplier backend step";
  contract.products[1].facts.skin_type = ["Vendor-managed skin type"];
  contract.products[2].facts.appearance_concerns = ["Warehouse metadata concern"];
  contract.products[3].facts.country_of_origin = "Internal system origin";
  contract.products[4].facts.volume.display = "Shopify integration size";
  const result = validateProductFactsContract(contract, options);
  for (const code of [
    "products.0.facts.routine_step.third-party-or-system-language",
    "products.1.facts.skin_type.0.third-party-or-system-language",
    "products.2.facts.appearance_concerns.0.third-party-or-system-language",
    "products.3.facts.country_of_origin.third-party-or-system-language",
    "products.4.facts.volume.display.third-party-or-system-language",
  ]) {
    assert.equal(result.issues.includes(code), true, code);
  }
});

test("keeps a structurally valid pending scaffold fail closed", () => {
  const contract = completeContract();
  contract.status = "pending-review";
  for (const product of contract.products) {
    product.review_status = "pending";
    product.review = review("pending");
    product.facts = null;
  }
  const integrity = validateProductFactsContract(contract, options);
  assert.deepEqual(integrity.issues, []);
  assert.equal(integrity.summary.pending, 20);

  const launchGate = validateProductFactsContract(contract, { ...options, requireComplete: true });
  assert.equal(launchGate.issues.some((issue) => issue.endsWith("launch-incomplete")), true);
});

test("blocks a product whose label does not match the canonical emblem or wordmark", () => {
  const contract = completeContract();
  contract.products[0].review.brand_mark.status = "failed";
  contract.products[0].review.brand_mark.emblem_matches = false;
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.failed-review-not-blocked"), true);
  assert.equal(result.issues.includes("products.0.complete-without-approved-review"), true);
});

test("requires label-matched warnings or an explicit approved-none review", () => {
  const contract = completeContract();
  contract.products[0].facts.warnings = {
    review_result: "label-matched",
    text: null,
    incompatibilities: [],
  };
  let result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.warnings.text.text"), true);

  contract.products[0].facts.warnings = {
    review_result: "approved-none",
    text: "No warning supplied",
    incompatibilities: [],
  };
  result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.warnings.approved-none-text"), true);
});

test("rejects unsupported, vague, mood-only, and sensory-only benefit language", () => {
  const contract = completeContract();
  contract.products[0].facts.benefits = ["A calm ritual that treats acne."];
  contract.products[1].facts.card_benefit = "Soft and velvety.";
  contract.products[2].facts.finish = "A refreshed finish";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.benefits.0.mood-only"), true);
  assert.equal(result.issues.includes("products.0.facts.benefits.0.unsupported-claim"), true);
  assert.equal(result.issues.includes("products.1.facts.card_benefit.sensory-only"), true);
  assert.equal(result.issues.includes("products.2.facts.finish.vague-result"), true);
});

test("allows temperature or sensory wording when a sentence still states a concrete fact", () => {
  const contract = completeContract();
  contract.products[0].facts.usage_directions.text = "Rinse with warm water after cleansing.";
  contract.products[1].facts.benefits = ["Leaves skin soft after application."];
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.some((issue) => issue.includes("products.0.facts.usage_directions.text.mood-only")), false);
  assert.equal(result.issues.some((issue) => issue.includes("products.1.facts.benefits.0.sensory-only")), false);
});

test("requires approved front and technical-panel media matching the reviewed unit", () => {
  const contract = completeContract();
  contract.products[0].facts.media = [
    {
      role: "front",
      public_reference: "/products/example-front.webp",
      alt_text: "Front of Mochirii Cosmetics example moisturizer packaging",
      approved_unit_match: false,
    },
  ];
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.media.count"), true);
});
