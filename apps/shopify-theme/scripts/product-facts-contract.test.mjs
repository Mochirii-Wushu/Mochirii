import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  expectedShopifyProjection,
  PRODUCT_FACT_KEYS,
  serializeShopifyPlainTextParagraphHtml,
  SHOPIFY_MAPPED_FACT_KEYS,
  SHOPIFY_PUBLICATION_MAPPING,
  validateProductFactsContract,
} from "./lib/product-facts-contract.mjs";

const expectedProducts = Array.from({ length: 20 }, (_, index) => ({
  handle: `example-product-${index + 1}`,
  title: `Example Product ${index + 1}`,
}));

function mediaAssetSha(index, offset) {
  return String((index * 3) + offset).padStart(64, "0");
}

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
    product_type: "Moisturizer",
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
    key_ingredients: ["Example humectant"],
    key_ingredient_details: [
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
      us_customary: { value: 1, unit: "fl oz" },
      metric: { value: 30, unit: "mL" },
      display: "1 fl oz / 30 mL",
    },
    collection_handles: ["mochirii-cosmetics", "example-collection"],
    complementary_products: [`example-product-${next}`],
    media: [
      {
        role: "front",
        public_reference: `/products/example-${index + 1}-front.webp`,
        asset_sha256: mediaAssetSha(index, 1),
        alt_text: "Front of Mochirii Cosmetics example moisturizer packaging",
        brand_mark_expectation: {
          emblem: "required",
          wordmark: "required",
          other_brand_absent: "required",
        },
        approved_unit_match: true,
      },
      {
        role: "technical-panel",
        public_reference: `/products/example-${index + 1}-panel.webp`,
        asset_sha256: mediaAssetSha(index, 2),
        alt_text: "Ingredient and direction panel on the example moisturizer package",
        brand_mark_expectation: {
          emblem: "required",
          wordmark: "required",
          other_brand_absent: "required",
        },
        approved_unit_match: true,
      },
      {
        role: "outer-box",
        public_reference: `/products/example-${index + 1}-box.webp`,
        asset_sha256: mediaAssetSha(index, 3),
        alt_text: "Outer box for the Mochirii Cosmetics example moisturizer",
        brand_mark_expectation: {
          emblem: "required",
          wordmark: "required",
          other_brand_absent: "required",
        },
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
  collectionHandles: ["mochirii-cosmetics", "example-collection"],
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
  assert.deepEqual(SHOPIFY_PUBLICATION_MAPPING.metafields.product_type, {
    source: "facts.product_type",
    namespace: "custom",
    key: "product_type",
    type: "single_line_text_field",
    readback: "product.metafields.custom.product_type",
  });
  assert.equal(
    SHOPIFY_PUBLICATION_MAPPING.metafields.key_ingredients.type,
    "list.single_line_text_field",
  );
  assert.equal(SHOPIFY_PUBLICATION_MAPPING.metafields.key_ingredient_details.type, "json");
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
  assert.deepEqual(SHOPIFY_PUBLICATION_MAPPING.native_fields.variant_presentation, {
    source: "$single_default_variant",
    has_only_default_variant: true,
    title: "Default Title",
    selected_options: [{ name: "Title", value: "Default Title" }],
    readback: {
      has_only_default_variant: "product.hasOnlyDefaultVariant",
      title: "product.variants.nodes[0].title",
      selected_options: "product.variants.nodes[0].selectedOptions",
    },
  });

  const contract = completeContract();
  contract.shopify_publication.metafields.usage_directions.type = "multi_line_text_field";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("root.shopify-publication-mapping"), true);
});

test("projects deterministic typed Shopify readback values from the publication mapping", () => {
  const contract = completeContract();
  const product = contract.products[0];
  product.facts.description = "A daily moisturizer with glycerin & hyaluronic acid for dry-feeling skin.";
  product.facts.collection_handles = ["z-collection", "a-collection"];
  product.facts.complementary_products = ["example-product-2", "example-product-3"];
  const ids = new Map(expectedProducts.map((item, index) => [
    item.handle,
    `gid://shopify/Product/${1000 + index}`,
  ]));
  const factsBeforeProjection = structuredClone(product.facts);

  const projection = expectedShopifyProjection(product, ids);
  const metafields = new Map(projection.metafields.map((item) => [item.key, item]));

  assert.equal(projection.handle, product.handle);
  assert.equal(projection.title, product.public_title);
  assert.equal(projection.vendor, "Mochirii Cosmetics");
  assert.equal(
    projection.description_html,
    "<p>A daily moisturizer with glycerin &amp; hyaluronic acid for dry-feeling skin.</p>",
  );
  assert.deepEqual(projection.seo, {
    title: product.facts.seo_title,
    description: product.facts.seo_description,
  });
  assert.deepEqual(projection.variant_presentation, {
    has_only_default_variant: true,
    title: "Default Title",
    selected_options: [{ name: "Title", value: "Default Title" }],
  });
  assert.deepEqual(projection.collection_handles, ["a-collection", "z-collection"]);
  assert.equal(projection.metafields.length, Object.keys(SHOPIFY_PUBLICATION_MAPPING.metafields).length);
  assert.deepEqual(
    projection.metafields.map((item) => `${item.namespace}\u0000${item.key}`),
    projection.metafields
      .map((item) => `${item.namespace}\u0000${item.key}`)
      .toSorted(),
  );
  assert.equal(metafields.get("functional_identity").json_value, product.facts.functional_identity);
  assert.deepEqual(metafields.get("benefits").json_value, product.facts.benefits);
  assert.deepEqual(metafields.get("usage_directions").json_value, product.facts.usage_directions);
  assert.deepEqual(metafields.get("complementary_products").json_value, [
    "gid://shopify/Product/1001",
    "gid://shopify/Product/1002",
  ]);
  assert.deepEqual(projection.media.map((item) => item.role), ["front", "technical-panel", "outer-box"]);
  assert.deepEqual(projection.media[0], {
    position: 1,
    role: "front",
    public_reference: "/products/example-1-front.webp",
    asset_sha256: mediaAssetSha(0, 1),
    alt_text: "Front of Mochirii Cosmetics example moisturizer packaging",
    brand_mark_expectation: {
      emblem: "required",
      wordmark: "required",
      other_brand_absent: "required",
    },
  });
  assert.deepEqual(product.facts, factsBeforeProjection);
});

test("uses one exact safe paragraph serializer and fails closed on unresolved product references", () => {
  assert.equal(
    serializeShopifyPlainTextParagraphHtml("A & <B>"),
    "<p>A &amp; &lt;B&gt;</p>",
  );
  assert.throws(
    () => expectedShopifyProjection(completeContract().products[0], new Map()),
    /Missing Shopify product ID for complementary product/u,
  );
});

test("keeps filterable ingredient names identical to structured PDP ingredient details", () => {
  const contract = completeContract();
  contract.products[0].facts.key_ingredients = ["Different ingredient"];
  const result = validateProductFactsContract(contract, options);
  assert.equal(
    result.issues.includes("products.0.facts.key_ingredients.details-mismatch"),
    true,
  );
});

test("requires a controlled product type fact on every complete product record", () => {
  const contract = completeContract();
  delete contract.products[7].facts.product_type;
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.7.facts.keys"), true);
});

test("rejects markup and control characters in customer-facing plain text", () => {
  const contract = completeContract();
  contract.products[0].facts.description = "A <strong>daily</strong> moisturizer.";
  contract.products[1].facts.warnings = {
    review_result: "label-matched",
    text: "Read [extra instructions](/internal).",
    incompatibilities: [],
  };
  contract.products[2].facts.media[0].alt_text = "Front package\u0000image";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.description.markup"), true);
  assert.equal(result.issues.includes("products.1.facts.warnings.text.markup"), true);
  assert.equal(result.issues.includes("products.2.facts.media.0.alt_text.control-character"), true);
});

test("requires structured positive net contents and an exact canonical dual-unit display", () => {
  const contract = completeContract();
  contract.products[0].facts.volume.display = "30 mL / 1 fl oz";
  contract.products[1].facts.volume = {
    us_customary: { value: 1.7, unit: "fl oz" },
    metric: { value: 50, unit: "g" },
    display: "1.7 fl oz / 50 g",
  };
  contract.products[2].facts.volume.us_customary.value = 0;
  contract.products[3].facts.volume.us_customary = "1 fl oz";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.volume.display-mismatch"), true);
  assert.equal(result.issues.includes("products.1.facts.volume.unit-pair"), true);
  assert.equal(result.issues.includes("products.2.facts.volume.us_customary.value"), true);
  assert.equal(result.issues.includes("products.3.facts.volume.us_customary.type"), true);
});

test("validates dual-unit numeric parity with normal label rounding tolerance", () => {
  const contract = completeContract();
  contract.products[0].facts.volume = {
    us_customary: { value: 1.7, unit: "fl oz" },
    metric: { value: 50, unit: "mL" },
    display: "1.7 fl oz / 50 mL",
  };
  contract.products[1].facts.volume = {
    us_customary: { value: 1.7, unit: "oz" },
    metric: { value: 50, unit: "g" },
    display: "1.7 oz / 50 g",
  };
  contract.products[2].facts.volume = {
    us_customary: { value: 1, unit: "fl oz" },
    metric: { value: 100, unit: "mL" },
    display: "1 fl oz / 100 mL",
  };
  contract.products[3].facts.volume = {
    us_customary: { value: 1, unit: "oz" },
    metric: { value: 100, unit: "g" },
    display: "1 oz / 100 g",
  };
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.volume.numeric-parity"), false);
  assert.equal(result.issues.includes("products.1.facts.volume.numeric-parity"), false);
  assert.equal(result.issues.includes("products.2.facts.volume.numeric-parity"), true);
  assert.equal(result.issues.includes("products.3.facts.volume.numeric-parity"), true);
});

test("authorizes collection filters by exact parameter and filter type, never display label", () => {
  const collectionTemplate = readFileSync(
    new URL("../sections/main-collection.liquid", import.meta.url),
    "utf8",
  );
  assert.match(
    collectionTemplate,
    /filter[.]param_name\s*[|]\s*append:\s*'\|'\s*[|]\s*append:\s*filter[.]type/u,
  );
  assert.doesNotMatch(collectionTemplate, /filter[.]label\s*[|]\s*handle/u);
  for (const signature of ["filter.v.availability|boolean", "filter.v.price|price_range"]) {
    assert.equal(collectionTemplate.split(signature).length - 1, 2, signature);
  }
  for (const [factKey, metafieldType] of [
    ["product_type", "single_line_text_field"],
    ["skin_type", "list.single_line_text_field"],
    ["appearance_concerns", "list.single_line_text_field"],
    ["routine_step", "single_line_text_field"],
    ["key_ingredients", "list.single_line_text_field"],
  ]) {
    const mapping = SHOPIFY_PUBLICATION_MAPPING.metafields[factKey];
    assert.deepEqual(
      { namespace: mapping.namespace, key: mapping.key, type: mapping.type },
      { namespace: "custom", key: factKey, type: metafieldType },
    );
    const signature = `filter.p.m.${mapping.namespace}.${mapping.key}|list`;
    assert.equal(collectionTemplate.split(signature).length - 1, 2, signature);
  }
  assert.doesNotMatch(
    collectionTemplate,
    /filter[.]p[.](?:product_type|vendor|tag)(?:[|'])/u,
  );
});

test("requires universal catalog membership and nonempty launch collections", () => {
  const contract = completeContract();
  contract.products[0].facts.collection_handles = ["example-collection"];
  for (const product of contract.products) {
    product.facts.collection_handles = product.facts.collection_handles
      .filter((handle) => handle !== "example-collection");
  }
  const result = validateProductFactsContract(contract, options);
  assert.equal(
    result.issues.includes("products.0.facts.collection_handles.missing-catalog"),
    true,
  );
  assert.equal(result.issues.includes("collections.example-collection.empty"), true);

  const baseline = completeContract();
  const ids = new Map(expectedProducts.map((product, index) => [
    product.handle,
    `gid://shopify/Product/${1000 + index}`,
  ]));
  assert.deepEqual(
    expectedShopifyProjection(baseline.products[0], ids).collection_handles,
    ["example-collection", "mochirii-cosmetics"],
  );
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

test("normalizes Unicode and separators before rejecting provider or system terms", () => {
  const contract = completeContract();
  contract.products[0].facts.description = "Product details appear in the plat·form record.";
  contract.products[1].facts.routine_step = "Pro·vider step";
  contract.products[2].facts.package_details = "Retailer package reference";
  contract.products[3].facts.country_of_origin = "Manu\u200bfacturer origin";
  contract.products[4].facts.description = "Product details appear in the a-p-p record.";
  contract.products[5].facts.description = `${["Self", "named"].join("‐")} product details appear here.`;
  contract.products[6].facts.description = "Ｓｈｏｐｉｆｙ product details appear here.";
  contract.products[7].facts.description = `${["MÁ", "DARA"].join("")} product details appear here.`;
  contract.products[8].facts.description = "Inter-nal sys-tem product details appear here.";
  const result = validateProductFactsContract(contract, options);
  for (const code of [
    "products.0.facts.description.third-party-or-system-language",
    "products.1.facts.routine_step.third-party-or-system-language",
    "products.2.facts.package_details.third-party-or-system-language",
    "products.3.facts.country_of_origin.third-party-or-system-language",
    "products.4.facts.description.third-party-or-system-language",
    "products.5.facts.description.third-party-or-system-language",
    "products.6.facts.description.third-party-or-system-language",
    "products.7.facts.description.third-party-or-system-language",
    "products.8.facts.description.third-party-or-system-language",
  ]) {
    assert.equal(result.issues.includes(code), true, code);
  }
});

test("reuses the shared company and exact Mochirii wordmark policy across product text", () => {
  const contract = completeContract();
  const additionalProvider = ["Kla", "viyo"].join("");
  contract.products[0].public_title = `${additionalProvider} facial moisturizer`;
  contract.products[1].facts.ingredients_inci = `Aqua, Glycerin, ${additionalProvider}`;
  contract.products[2].facts.media[0].alt_text = `Front of ${additionalProvider} example moisturizer packaging`;
  contract.products[3].public_title = "mochirii cosmetics facial moisturizer";
  contract.products[4].facts.description = "Mochirii-Cosmetics daily moisturizer for normal skin.";
  contract.products[5].facts.media[0].alt_text =
    "Front of Mochirii Cosmetics packaging with mochirii cosmetics text";
  contract.products[6].facts.ingredients_inci = "Mo\u0304chirii Cosmetics, Aqua, Glycerin";
  contract.products[7].facts.ingredients_inci = "Aqua, Example Active 2%";
  contract.products[8].facts.description =
    "Mochirii Cosmetics daily facial moisturizer for normal skin.";

  const result = validateProductFactsContract(contract, options);
  for (const code of [
    "products.0.public_title.third-party-or-system-language",
    "products.1.facts.ingredients_inci.third-party-or-system-language",
    "products.2.facts.media.0.alt_text.third-party-or-system-language",
    "products.3.public_title.inconsistent-brand",
    "products.4.facts.description.inconsistent-brand",
    "products.5.facts.media.0.alt_text.inconsistent-brand",
    "products.6.facts.ingredients_inci.inconsistent-brand",
  ]) {
    assert.equal(result.issues.includes(code), true, code);
  }
  assert.equal(
    result.issues.includes("products.7.facts.ingredients_inci.precise-commercial-promise"),
    true,
  );
  assert.equal(
    result.issues.includes("products.8.facts.description.inconsistent-brand"),
    false,
  );
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
  contract.products[3].facts.description = "Soft and velvety.";
  contract.products[4].facts.seo_description = "Gentle and silky.";
  contract.products[5].facts.description = "Soft for you.";
  contract.products[6].facts.seo_description = "Velvety with care.";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.benefits.0.mood-only"), true);
  assert.equal(result.issues.includes("products.0.facts.benefits.0.unsupported-claim"), true);
  assert.equal(result.issues.includes("products.1.facts.card_benefit.sensory-only"), true);
  assert.equal(result.issues.includes("products.2.facts.finish.vague-result"), true);
  assert.equal(result.issues.includes("products.3.facts.description.sensory-only"), true);
  assert.equal(result.issues.includes("products.4.facts.seo_description.sensory-only"), true);
  assert.equal(result.issues.includes("products.5.facts.description.sensory-only"), true);
  assert.equal(result.issues.includes("products.6.facts.seo_description.sensory-only"), true);
});

test("product facts consume every fail-closed shared customer-language category", () => {
  const contract = completeContract();
  contract.products[0].facts.description = "A cal&#109; feeling with daily use.";
  contract.products[1].facts.description = "He&#97;ls irritated skin.";
  contract.products[2].facts.description = "Unknown &concealedcopy; wording.";
  contract.products[3].facts.description = "Guaranteed results within 3 days.";
  contract.products[4].facts.description = "Fully accessible skincare.";
  contract.products[5].facts.description = "99% of users saw smoother skin.";
  contract.products[6].facts.card_benefit = "100% satisfaction.";
  contract.products[7].facts.ingredients_inci = "Aqua, 99% of users saw results";
  contract.products[8].facts.key_ingredients[0] = "100% satisfaction";
  contract.products[8].facts.key_ingredient_details[0].name = "100% satisfaction";
  const result = validateProductFactsContract(contract, options);
  assert.ok(result.issues.includes("products.0.facts.description.mood-only"));
  assert.ok(result.issues.includes("products.1.facts.description.unsupported-claim"));
  assert.ok(result.issues.includes("products.2.facts.description.unresolved-html-entity"));
  assert.ok(result.issues.includes("products.3.facts.description.precise-commercial-promise"));
  assert.ok(result.issues.includes("products.4.facts.description.legal-or-accessibility-promise"));
  assert.ok(result.issues.includes("products.5.facts.description.precise-commercial-promise"));
  assert.ok(result.issues.includes("products.6.facts.card_benefit.precise-commercial-promise"));
  assert.ok(result.issues.includes("products.7.facts.ingredients_inci.precise-commercial-promise"));
  assert.ok(result.issues.includes("products.8.facts.key_ingredients.0.precise-commercial-promise"));
  assert.ok(result.issues.includes("products.8.facts.key_ingredient_details.0.name.precise-commercial-promise"));
});

test("product-only language rules decode entities before evaluating customer copy", () => {
  const contract = completeContract();
  contract.products[0].facts.description = "Leaves skin nour&#105;shed.";
  contract.products[1].facts.description = "An eco-fr&#105;endly formula.";
  contract.products[2].facts.description = "A sustain&#97;ble formula.";
  contract.products[3].facts.card_benefit = "S&#111;ft and v&#101;lvety.";
  contract.products[4].facts.description = "Nat&#117;ral facial oil.";
  const result = validateProductFactsContract(contract, options);
  assert.ok(result.issues.includes("products.0.facts.description.vague-result"));
  assert.ok(result.issues.includes("products.1.facts.description.unsupported-positioning"));
  assert.ok(result.issues.includes("products.2.facts.description.unsupported-positioning"));
  assert.ok(result.issues.includes("products.3.facts.card_benefit.sensory-only"));
  assert.ok(result.issues.includes("products.4.facts.description.unsupported-natural"));
});

test("rejects prohibited mood terms even when generic factual anchors are present", () => {
  const contract = completeContract();
  const phrases = [
    "A calm moisturizer for daily use.",
    "A quiet finish after application.",
    "A dreamy texture with glycerin.",
    "A serene formula for normal skin.",
    "An escape during your routine.",
    "A ritual to use after cleansing.",
  ];
  for (const [index, phrase] of phrases.entries()) {
    contract.products[index].facts.description = phrase;
  }
  const result = validateProductFactsContract(contract, options);
  for (const index of phrases.keys()) {
    assert.equal(result.issues.includes(`products.${index}.facts.description.mood-only`), true);
  }
});

test("allows temperature or sensory wording when a sentence still states a concrete fact", () => {
  const contract = completeContract();
  contract.products[0].facts.usage_directions.text = "Rinse with warm water after cleansing.";
  contract.products[1].facts.benefits = ["Leaves skin soft after application."];
  contract.products[2].facts.benefits = ["Leaves skin warm after application."];
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.some((issue) => issue.includes("products.0.facts.usage_directions.text.mood-only")), false);
  assert.equal(result.issues.some((issue) => issue.includes("products.1.facts.benefits.0.sensory-only")), false);
  assert.equal(result.issues.includes("products.2.facts.benefits.0.mood-only"), true);
});

test("requires approved front, technical-panel, and outer-box media matching a complete reviewed unit", () => {
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
  assert.equal(result.issues.includes("products.0.facts.media.missing-technical-panel"), true);
  assert.equal(result.issues.includes("products.0.facts.media.missing-outer-box"), true);
});

test("requires unique media roles, unique controlled relative public references, and safe image paths", () => {
  const contract = completeContract();
  contract.products[0].facts.media[1].role = "front";
  contract.products[0].facts.media[1].public_reference = contract.products[0].facts.media[0].public_reference;
  contract.products[1].facts.media[0].public_reference = "https://cdn.example.test/front.webp";
  contract.products[2].facts.media[0].public_reference = "/products/../private/front.webp";
  contract.products[3].facts.media[0].public_reference = "//example.test/front.webp";
  contract.products[4].facts.media[0].public_reference = "/products/animated-front.gif";
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.media.duplicate-role"), true);
  assert.equal(result.issues.includes("products.0.facts.media.duplicate-reference"), true);
  for (const index of [1, 2, 3, 4]) {
    assert.equal(result.issues.includes(`products.${index}.facts.media.0.public-reference`), true);
  }
});

test("requires immutable media hashes and explicit universal brand-mark expectations", () => {
  const contract = completeContract();
  contract.products[0].facts.media[0].asset_sha256 = "A".repeat(64);
  contract.products[3].facts.media[0].asset_sha256 = "a".repeat(64);
  contract.products[0].facts.media[0].brand_mark_expectation.emblem = "not-applicable";
  contract.products[0].facts.media[0].brand_mark_expectation.wordmark = "not-applicable";
  contract.products[0].facts.media[0].brand_mark_expectation.other_brand_absent = "not-applicable";
  contract.products[1].facts.media[1].brand_mark_expectation.emblem = "optional";
  contract.products[1].facts.media[1].brand_mark_expectation.other_brand_absent = "not-applicable";
  contract.products[2].facts.media[1].asset_sha256 = contract.products[2].facts.media[0].asset_sha256;
  const result = validateProductFactsContract(contract, options);

  for (const issue of [
    "products.0.facts.media.0.asset_sha256",
    "products.3.facts.media.0.asset_sha256",
    "products.0.facts.media.0.brand_mark_expectation.emblem.universal-required",
    "products.0.facts.media.0.brand_mark_expectation.wordmark.universal-required",
    "products.0.facts.media.0.brand_mark_expectation.other_brand_absent.universal-required",
    "products.1.facts.media.1.brand_mark_expectation.emblem",
    "products.1.facts.media.1.brand_mark_expectation.other_brand_absent.universal-required",
    "products.2.facts.media.duplicate-asset",
  ]) {
    assert.equal(result.issues.includes(issue), true, issue);
  }
});

test("keeps the JSON Schema media identity and universal brand requirements aligned", () => {
  const schema = JSON.parse(readFileSync(
    new URL("../content/product-facts.v3.schema.json", import.meta.url),
    "utf8",
  ));
  const mediaItem = schema.$defs.facts.properties.media.items;
  assert.equal(schema.$defs.facts.properties.collection_handles.contains.const, "mochirii-cosmetics");
  const firstMediaItem = schema.$defs.facts.properties.media.prefixItems[0].allOf;
  assert.equal(firstMediaItem[0].$ref, "#/$defs/facts/properties/media/items");
  assert.equal(firstMediaItem[1].properties.role.const, "front");
  for (const key of ["asset_sha256", "brand_mark_expectation"]) {
    assert.equal(mediaItem.required.includes(key), true, key);
  }
  assert.equal(mediaItem.properties.asset_sha256.pattern, "^(?!([a-f0-9])\\1{63}$)[a-f0-9]{64}$");
  assert.equal(mediaItem.properties.public_reference.pattern.includes("gif"), false);
  const universalExpectation = mediaItem.properties.brand_mark_expectation;
  assert.deepEqual(universalExpectation.required, ["emblem", "wordmark", "other_brand_absent"]);
  for (const field of universalExpectation.required) {
    assert.equal(universalExpectation.properties[field].const, "required", field);
  }
});

test("requires deterministic media ordering with the front image first", () => {
  const contract = completeContract();
  [contract.products[0].facts.media[0], contract.products[0].facts.media[1]] =
    [contract.products[0].facts.media[1], contract.products[0].facts.media[0]];
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("products.0.facts.media.front-first"), true);
  assert.equal(result.issues.includes("products.0.facts.media.role-order"), true);
});

test("fails closed when the single default Shopify variant presentation contract drifts", () => {
  const contract = completeContract();
  contract.shopify_publication.native_fields.variant_presentation.has_only_default_variant = false;
  contract.shopify_publication.native_fields.variant_presentation.title = "Provider formula name";
  contract.shopify_publication.native_fields.variant_presentation.selected_options = [
    { name: "Formula", value: "Provider formula name" },
  ];
  const result = validateProductFactsContract(contract, options);
  assert.equal(result.issues.includes("root.shopify-publication-mapping"), true);
});

test("escapes any defensive cart variant title rendering", () => {
  const cartTemplate = readFileSync(
    new URL("../sections/main-cart.liquid", import.meta.url),
    "utf8",
  );
  assert.match(cartTemplate, /item[.]variant[.]title\s*[|]\s*escape/u);
  assert.doesNotMatch(cartTemplate, /\{\{\s*item[.]variant[.]title\s*\}\}/u);
});
