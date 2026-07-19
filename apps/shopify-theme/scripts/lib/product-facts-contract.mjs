const ROOT_KEYS = Object.freeze([
  "$schema",
  "schema_version",
  "revision",
  "locale",
  "brand",
  "market",
  "brand_mark",
  "shopify_publication",
  "status",
  "products",
]);

const PRODUCT_KEYS = Object.freeze([
  "handle",
  "public_title",
  "review_status",
  "review",
  "facts",
]);

const REVIEW_KEYS = Object.freeze([
  "formula_mapping",
  "front_label",
  "technical_panel",
  "outer_box",
  "brand_mark",
  "media_unit_match",
]);

export const PRODUCT_FACT_KEYS = Object.freeze([
  "functional_identity",
  "description",
  "seo_title",
  "seo_description",
  "card_benefit",
  "benefits",
  "skin_type",
  "appearance_concerns",
  "routine_step",
  "usage_directions",
  "key_ingredients",
  "ingredients_inci",
  "warnings",
  "texture",
  "finish",
  "fragrance_status",
  "country_of_origin",
  "package_details",
  "certifications",
  "volume",
  "collection_handles",
  "complementary_products",
  "media",
]);

export const SHOPIFY_PUBLICATION_MAPPING = Object.freeze({
  schema_version: 1,
  product_fields: {
    handle: {
      source: "handle",
      write_target: "product.handle",
      readback: "product.handle",
    },
    title: {
      source: "public_title",
      write_target: "product.title",
      readback: "product.title",
    },
    description: {
      source: "facts.description",
      write_target: "product.description_html",
      readback: "product.description_html",
    },
    seo_title: {
      source: "facts.seo_title",
      write_target: "product.seo.title",
      readback: "product.seo.title",
    },
    seo_description: {
      source: "facts.seo_description",
      write_target: "product.seo.description",
      readback: "product.seo.description",
    },
  },
  metafields: {
    functional_identity: {
      source: "facts.functional_identity",
      namespace: "custom",
      key: "functional_identity",
      type: "single_line_text_field",
      readback: "product.metafields.custom.functional_identity",
    },
    card_benefit: {
      source: "facts.card_benefit",
      namespace: "custom",
      key: "card_benefit",
      type: "single_line_text_field",
      readback: "product.metafields.custom.card_benefit",
    },
    benefits: {
      source: "facts.benefits",
      namespace: "custom",
      key: "benefits",
      type: "list.single_line_text_field",
      readback: "product.metafields.custom.benefits",
    },
    skin_type: {
      source: "facts.skin_type",
      namespace: "custom",
      key: "skin_type",
      type: "list.single_line_text_field",
      readback: "product.metafields.custom.skin_type",
    },
    appearance_concerns: {
      source: "facts.appearance_concerns",
      namespace: "custom",
      key: "appearance_concerns",
      type: "list.single_line_text_field",
      readback: "product.metafields.custom.appearance_concerns",
    },
    routine_step: {
      source: "facts.routine_step",
      namespace: "custom",
      key: "routine_step",
      type: "single_line_text_field",
      readback: "product.metafields.custom.routine_step",
    },
    usage_directions: {
      source: "facts.usage_directions",
      namespace: "custom",
      key: "usage_directions",
      type: "json",
      readback: "product.metafields.custom.usage_directions",
    },
    key_ingredients: {
      source: "facts.key_ingredients",
      namespace: "custom",
      key: "key_ingredients",
      type: "json",
      readback: "product.metafields.custom.key_ingredients",
    },
    ingredients_inci: {
      source: "facts.ingredients_inci",
      namespace: "custom",
      key: "ingredients_inci",
      type: "multi_line_text_field",
      readback: "product.metafields.custom.ingredients_inci",
    },
    warnings: {
      source: "facts.warnings",
      namespace: "custom",
      key: "warnings",
      type: "json",
      readback: "product.metafields.custom.warnings",
    },
    texture: {
      source: "facts.texture",
      namespace: "custom",
      key: "texture",
      type: "single_line_text_field",
      readback: "product.metafields.custom.texture",
    },
    finish: {
      source: "facts.finish",
      namespace: "custom",
      key: "finish",
      type: "single_line_text_field",
      readback: "product.metafields.custom.finish",
    },
    fragrance_status: {
      source: "facts.fragrance_status",
      namespace: "custom",
      key: "fragrance_status",
      type: "single_line_text_field",
      readback: "product.metafields.custom.fragrance_status",
    },
    country_of_origin: {
      source: "facts.country_of_origin",
      namespace: "custom",
      key: "country_of_origin",
      type: "single_line_text_field",
      readback: "product.metafields.custom.country_of_origin",
    },
    package_details: {
      source: "facts.package_details",
      namespace: "custom",
      key: "package_details",
      type: "multi_line_text_field",
      readback: "product.metafields.custom.package_details",
    },
    certifications: {
      source: "facts.certifications",
      namespace: "custom",
      key: "certifications",
      type: "json",
      readback: "product.metafields.custom.certifications",
    },
    volume: {
      source: "facts.volume",
      namespace: "custom",
      key: "volume",
      type: "json",
      readback: "product.metafields.custom.volume",
    },
    complementary_products: {
      source: "facts.complementary_products",
      namespace: "custom",
      key: "complementary_products",
      type: "list.product_reference",
      readback: "product.metafields.custom.complementary_products",
    },
  },
  native_fields: {
    collection_handles: {
      source: "facts.collection_handles",
      write_target: "product.collections[].handle",
      readback: "product.collections[].handle",
    },
    media: {
      source: "facts.media",
      media_source: "facts.media[].public_reference",
      alt_text_source: "facts.media[].alt_text",
      write_target: "product.media[].original_source",
      readback: "product.media[]",
    },
  },
});

export const SHOPIFY_MAPPED_FACT_KEYS = Object.freeze([
  ...Object.values(SHOPIFY_PUBLICATION_MAPPING.product_fields)
    .map((entry) => entry.source)
    .filter((source) => source.startsWith("facts."))
    .map((source) => source.slice("facts.".length)),
  ...Object.values(SHOPIFY_PUBLICATION_MAPPING.metafields)
    .map((entry) => entry.source.slice("facts.".length)),
  ...Object.values(SHOPIFY_PUBLICATION_MAPPING.native_fields)
    .map((entry) => entry.source.slice("facts.".length)),
]);

const REVIEW_STATES = new Set(["pending", "approved", "failed"]);
const PRODUCT_STATES = new Set(["pending", "complete", "blocked"]);
const MEDIA_ROLES = new Set(["front", "technical-panel", "outer-box", "texture", "scale", "use"]);
const TIMINGS = new Set(["AM", "PM", "As needed"]);
const RINSE_BEHAVIORS = new Set(["Rinse", "No rinse"]);

const moodOnlyPattern = /\b(?:calm|quiet|warm|dreamy|serene|escape|ritual)\b/iu;
const vagueResultPattern = /\b(?:refreshed finish|more rested|simple place in routines?|nourished)\b/iu;
const unsupportedClaimPattern = /\b(?:heals?|healing|anti-inflammatory|repairs? skin|treats? (?:acne|eczema)|builds? collagen|hypoallergenic|chemical-free|non-toxic|clinically proven|dermatologist approved)\b/iu;
const unsupportedPositioningPattern = /\b(?:clean beauty|green beauty|eco-friendly|environmentally friendly|sustainable)\b/iu;
const sensoryPattern = /\b(?:soft|silky|velvety|gentle)\b/iu;
const factualAnchorPattern = /\b(?:after|with|for|helps?|leaves?|cleans(?:e|es)|removes?|rinses?|hydrates?|moisturiz(?:e|es)|smooths?|appearance|feel|texture|finish|ingredient|during|before|apply|use)\b/iu;
const internalLanguagePattern = /\b(?:supplier|vendor|warehouse|fulfillment|integration|backend|internal system|internal metadata|source mapping)\b/iu;
const inconsistentBrandPattern = /\bMōchirīī Cosmetics\b/u;
const privateReferencePattern = /(?:private-evidence|\.private-evidence|\.artifacts[\\/]operations|label-artwork|mockup|source[-_ ]?id)/iu;
const namedProviderPattern = new RegExp(
  `\\b(?:${["self" + "named", "shop" + "ify", "ma" + "dara", "vele" + "sari"].join("|")})\\b`,
  "iu",
);

function addIssue(issues, code) {
  issues.push(code);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]),
  );
}

function exactJson(value, expected) {
  return JSON.stringify(canonicalJson(value)) === JSON.stringify(canonicalJson(expected));
}

function exactKeys(value, expected, issues, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addIssue(issues, `${code}.type`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    addIssue(issues, `${code}.keys`);
    return false;
  }
  return true;
}

function text(value, issues, code) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    addIssue(issues, `${code}.text`);
    return false;
  }
  return true;
}

function textList(value, issues, code, { min = 1, max = Number.POSITIVE_INFINITY } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    addIssue(issues, `${code}.count`);
    return false;
  }
  const normalized = [];
  for (const item of value) {
    if (text(item, issues, `${code}.item`)) normalized.push(item.toLocaleLowerCase("en-US"));
  }
  if (new Set(normalized).size !== normalized.length) addIssue(issues, `${code}.duplicate`);
  return true;
}

function validateLanguage(value, issues, code, context) {
  if (typeof value !== "string" || value.length === 0) return;
  if (moodOnlyPattern.test(value) && !factualAnchorPattern.test(value)) {
    addIssue(issues, `${code}.mood-only`);
  }
  if (vagueResultPattern.test(value)) addIssue(issues, `${code}.vague-result`);
  if (unsupportedClaimPattern.test(value)) addIssue(issues, `${code}.unsupported-claim`);
  if (unsupportedPositioningPattern.test(value) && context !== "certification") {
    addIssue(issues, `${code}.unsupported-positioning`);
  }
  if (internalLanguagePattern.test(value) || namedProviderPattern.test(value)) {
    addIssue(issues, `${code}.third-party-or-system-language`);
  }
  if (inconsistentBrandPattern.test(value)) addIssue(issues, `${code}.inconsistent-brand`);
  if (context === "benefit" && sensoryPattern.test(value) && !factualAnchorPattern.test(value)) {
    addIssue(issues, `${code}.sensory-only`);
  }
  if (context !== "identity" && context !== "texture" && context !== "finish" &&
      context !== "certification" && /\bnatural\b/iu.test(value)) {
    addIssue(issues, `${code}.unsupported-natural`);
  }
}

function validateFacts(facts, issues, code, context) {
  if (!exactKeys(facts, PRODUCT_FACT_KEYS, issues, code)) return;
  for (const field of [
    "functional_identity",
    "description",
    "seo_title",
    "seo_description",
    "card_benefit",
    "routine_step",
    "ingredients_inci",
    "texture",
    "finish",
    "fragrance_status",
    "country_of_origin",
    "package_details",
  ]) {
    text(facts[field], issues, `${code}.${field}`);
  }
  validateLanguage(facts.functional_identity, issues, `${code}.functional_identity`, "identity");
  validateLanguage(facts.description, issues, `${code}.description`, "fact");
  validateLanguage(facts.seo_title, issues, `${code}.seo_title`, "identity");
  validateLanguage(facts.seo_description, issues, `${code}.seo_description`, "fact");
  validateLanguage(facts.card_benefit, issues, `${code}.card_benefit`, "benefit");
  validateLanguage(facts.routine_step, issues, `${code}.routine_step`, "fact");
  validateLanguage(facts.ingredients_inci, issues, `${code}.ingredients_inci`, "identity");
  validateLanguage(facts.texture, issues, `${code}.texture`, "texture");
  validateLanguage(facts.finish, issues, `${code}.finish`, "finish");
  validateLanguage(facts.fragrance_status, issues, `${code}.fragrance_status`, "fact");
  validateLanguage(facts.country_of_origin, issues, `${code}.country_of_origin`, "fact");
  validateLanguage(facts.package_details, issues, `${code}.package_details`, "fact");
  if (facts.seo_title !== `${context.publicTitle} | Mochirii Cosmetics`) {
    addIssue(issues, `${code}.seo_title.identity`);
  }
  if (typeof facts.seo_title === "string" && facts.seo_title.length > 70) {
    addIssue(issues, `${code}.seo_title.length`);
  }
  if (typeof facts.seo_description === "string" && facts.seo_description.length > 160) {
    addIssue(issues, `${code}.seo_description.length`);
  }

  for (const [field, limits] of Object.entries({
    benefits: { min: 1, max: 3 },
    skin_type: { min: 1 },
    appearance_concerns: { min: 1 },
    collection_handles: { min: 1 },
    complementary_products: { min: 1, max: 4 },
  })) {
    textList(facts[field], issues, `${code}.${field}`, limits);
  }
  for (const [index, benefit] of (facts.benefits ?? []).entries()) {
    validateLanguage(benefit, issues, `${code}.benefits.${index}`, "benefit");
  }
  for (const field of ["skin_type", "appearance_concerns"]) {
    for (const [index, item] of (facts[field] ?? []).entries()) {
      validateLanguage(item, issues, `${code}.${field}.${index}`, "fact");
    }
  }
  if (!Array.isArray(facts.key_ingredients) || facts.key_ingredients.length === 0) {
    addIssue(issues, `${code}.key_ingredients.count`);
  } else {
    const ingredientKeys = new Set();
    for (const [index, ingredient] of facts.key_ingredients.entries()) {
      const ingredientCode = `${code}.key_ingredients.${index}`;
      if (!exactKeys(ingredient, ["name", "cosmetic_role"], issues, ingredientCode)) continue;
      text(ingredient.name, issues, `${ingredientCode}.name`);
      text(ingredient.cosmetic_role, issues, `${ingredientCode}.cosmetic_role`);
      validateLanguage(ingredient.name, issues, `${ingredientCode}.name`, "identity");
      validateLanguage(ingredient.cosmetic_role, issues, `${ingredientCode}.cosmetic_role`, "fact");
      const normalized = `${ingredient.name}\u0000${ingredient.cosmetic_role}`.toLocaleLowerCase("en-US");
      if (ingredientKeys.has(normalized)) addIssue(issues, `${code}.key_ingredients.duplicate`);
      ingredientKeys.add(normalized);
    }
  }

  if (exactKeys(
    facts.usage_directions,
    ["text", "frequency", "amount", "routine_timing", "rinse_behavior"],
    issues,
    `${code}.usage_directions`,
  )) {
    for (const field of ["text", "frequency", "amount"]) {
      text(facts.usage_directions[field], issues, `${code}.usage_directions.${field}`);
      validateLanguage(facts.usage_directions[field], issues, `${code}.usage_directions.${field}`, "fact");
    }
    const timing = facts.usage_directions.routine_timing;
    if (!Array.isArray(timing) || timing.length === 0 || timing.some((item) => !TIMINGS.has(item)) ||
        new Set(timing).size !== timing.length) {
      addIssue(issues, `${code}.usage_directions.routine_timing`);
    }
    if (!RINSE_BEHAVIORS.has(facts.usage_directions.rinse_behavior)) {
      addIssue(issues, `${code}.usage_directions.rinse_behavior`);
    }
  }

  if (exactKeys(facts.warnings, ["review_result", "text", "incompatibilities"], issues, `${code}.warnings`)) {
    if (facts.warnings.review_result === "label-matched") {
      text(facts.warnings.text, issues, `${code}.warnings.text`);
    } else if (facts.warnings.review_result === "approved-none") {
      if (facts.warnings.text !== null) addIssue(issues, `${code}.warnings.approved-none-text`);
      if (Array.isArray(facts.warnings.incompatibilities) && facts.warnings.incompatibilities.length !== 0) {
        addIssue(issues, `${code}.warnings.approved-none-incompatibilities`);
      }
    } else {
      addIssue(issues, `${code}.warnings.review_result`);
    }
    textList(facts.warnings.incompatibilities, issues, `${code}.warnings.incompatibilities`, { min: 0 });
    validateLanguage(facts.warnings.text, issues, `${code}.warnings.text`, "fact");
    for (const [index, item] of (facts.warnings.incompatibilities ?? []).entries()) {
      validateLanguage(item, issues, `${code}.warnings.incompatibilities.${index}`, "fact");
    }
  }

  if (exactKeys(facts.certifications, ["review_result", "items"], issues, `${code}.certifications`)) {
    if (!["verified-wording", "approved-none"].includes(facts.certifications.review_result)) {
      addIssue(issues, `${code}.certifications.review_result`);
    }
    const minimum = facts.certifications.review_result === "verified-wording" ? 1 : 0;
    textList(facts.certifications.items, issues, `${code}.certifications.items`, { min: minimum });
    if (facts.certifications.review_result === "approved-none" &&
        Array.isArray(facts.certifications.items) && facts.certifications.items.length !== 0) {
      addIssue(issues, `${code}.certifications.approved-none-items`);
    }
    for (const [index, item] of (facts.certifications.items ?? []).entries()) {
      validateLanguage(item, issues, `${code}.certifications.items.${index}`, "certification");
    }
  }

  if (exactKeys(facts.volume, ["us_customary", "metric", "display"], issues, `${code}.volume`)) {
    for (const field of ["us_customary", "metric", "display"]) {
      text(facts.volume[field], issues, `${code}.volume.${field}`);
      validateLanguage(facts.volume[field], issues, `${code}.volume.${field}`, "identity");
    }
    if (!/\b(?:fl oz|oz)\b/iu.test(facts.volume.us_customary ?? "")) {
      addIssue(issues, `${code}.volume.us_customary-unit`);
    }
    if (!/\b(?:mL|g)\b/u.test(facts.volume.metric ?? "")) {
      addIssue(issues, `${code}.volume.metric-unit`);
    }
  }

  const allowedCollections = new Set(context.collectionHandles ?? []);
  if (allowedCollections.size > 0 &&
      (facts.collection_handles ?? []).some((handle) => !allowedCollections.has(handle))) {
    addIssue(issues, `${code}.collection_handles.unknown`);
  }
  const allowedProducts = new Set(context.productHandles ?? []);
  if ((facts.complementary_products ?? []).some((handle) => !allowedProducts.has(handle))) {
    addIssue(issues, `${code}.complementary_products.unknown`);
  }
  if ((facts.complementary_products ?? []).includes(context.currentHandle)) {
    addIssue(issues, `${code}.complementary_products.self`);
  }

  if (!Array.isArray(facts.media) || facts.media.length < 2) {
    addIssue(issues, `${code}.media.count`);
  } else {
    const roles = [];
    for (const [index, item] of facts.media.entries()) {
      const mediaCode = `${code}.media.${index}`;
      if (!exactKeys(item, ["role", "public_reference", "alt_text", "approved_unit_match"], issues, mediaCode)) continue;
      if (!MEDIA_ROLES.has(item.role)) addIssue(issues, `${mediaCode}.role`);
      roles.push(item.role);
      text(item.public_reference, issues, `${mediaCode}.public_reference`);
      text(item.alt_text, issues, `${mediaCode}.alt_text`);
      validateLanguage(item.alt_text, issues, `${mediaCode}.alt_text`, "fact");
      if (item.approved_unit_match !== true) addIssue(issues, `${mediaCode}.approved_unit_match`);
      if (privateReferencePattern.test(item.public_reference ?? "")) {
        addIssue(issues, `${mediaCode}.private-reference`);
      }
    }
    for (const requiredRole of ["front", "technical-panel"]) {
      if (!roles.includes(requiredRole)) addIssue(issues, `${code}.media.missing-${requiredRole}`);
    }
  }
}

export function validateProductFactsContract(contract, options = {}) {
  const issues = [];
  const expectedProducts = options.expectedProducts ?? [];
  const expectedByHandle = new Map(expectedProducts.map((product) => [product.handle, product.title]));
  const expectedHandles = [...expectedByHandle.keys()];

  if (!exactKeys(contract, ROOT_KEYS, issues, "root")) {
    return { issues, summary: { total: 0, complete: 0, pending: 0, blocked: 0 } };
  }
  if (contract.$schema !== "./product-facts.v3.schema.json") addIssue(issues, "root.schema-reference");
  if (contract.schema_version !== 3) addIssue(issues, "root.schema-version");
  text(contract.revision, issues, "root.revision");
  if (contract.locale !== "en-US") addIssue(issues, "root.locale");
  if (contract.brand !== "Mochirii Cosmetics") addIssue(issues, "root.brand");
  if (!exactKeys(contract.market, ["country", "currency"], issues, "root.market") ||
      contract.market?.country !== "US" || contract.market?.currency !== "USD") {
    addIssue(issues, "root.market-values");
  }
  if (contract.status !== "pending-review" && contract.status !== "complete") {
    addIssue(issues, "root.status");
  }
  if (!exactJson(contract.shopify_publication, SHOPIFY_PUBLICATION_MAPPING)) {
    addIssue(issues, "root.shopify-publication-mapping");
  }
  if (JSON.stringify([...SHOPIFY_MAPPED_FACT_KEYS].sort()) !==
      JSON.stringify([...PRODUCT_FACT_KEYS].sort())) {
    addIssue(issues, "root.shopify-publication-coverage");
  }

  if (exactKeys(
    contract.brand_mark,
    ["reference_version", "canonical_emblem", "storefront_derivative", "wordmark"],
    issues,
    "root.brand_mark",
  )) {
    text(contract.brand_mark.reference_version, issues, "root.brand_mark.reference_version");
    for (const [field, expectedPath, expectedSha] of [
      ["canonical_emblem", options.canonicalEmblemAsset, options.canonicalEmblemSha256],
      ["storefront_derivative", options.storefrontEmblemAsset, options.storefrontEmblemSha256],
    ]) {
      if (!exactKeys(contract.brand_mark[field], ["asset_path", "sha256"], issues, `root.brand_mark.${field}`)) continue;
      if (contract.brand_mark[field].asset_path !== expectedPath) addIssue(issues, `root.brand_mark.${field}.asset-path`);
      if (contract.brand_mark[field].sha256 !== expectedSha) addIssue(issues, `root.brand_mark.${field}.sha256`);
    }
    if (contract.brand_mark.wordmark !== "Mochirii Cosmetics") addIssue(issues, "root.brand_mark.wordmark");
  }

  if (!Array.isArray(contract.products) || contract.products.length !== 20) {
    addIssue(issues, "products.exact-count");
  }
  if (expectedProducts.length !== 20) addIssue(issues, "expected-products.exact-count");

  const products = Array.isArray(contract.products) ? contract.products : [];
  const handles = products.map((product) => product?.handle);
  if (new Set(handles).size !== handles.length) addIssue(issues, "products.duplicate-handle");
  if (expectedHandles.length === 20 &&
      JSON.stringify([...handles].sort()) !== JSON.stringify([...expectedHandles].sort())) {
    addIssue(issues, "products.identity-set");
  }

  const summary = { total: products.length, complete: 0, pending: 0, blocked: 0 };
  for (const [index, product] of products.entries()) {
    const code = `products.${index}`;
    if (!exactKeys(product, PRODUCT_KEYS, issues, code)) continue;
    text(product.handle, issues, `${code}.handle`);
    text(product.public_title, issues, `${code}.public_title`);
    validateLanguage(product.public_title, issues, `${code}.public_title`, "identity");
    if (expectedByHandle.has(product.handle) && expectedByHandle.get(product.handle) !== product.public_title) {
      addIssue(issues, `${code}.identity-title`);
    }
    if (!PRODUCT_STATES.has(product.review_status)) addIssue(issues, `${code}.review_status`);
    if (Object.hasOwn(summary, product.review_status)) summary[product.review_status] += 1;

    let reviewPassed = false;
    let reviewFailed = false;
    if (exactKeys(product.review, REVIEW_KEYS, issues, `${code}.review`)) {
      for (const field of ["formula_mapping", "front_label", "technical_panel", "outer_box", "media_unit_match"]) {
        if (!REVIEW_STATES.has(product.review[field])) addIssue(issues, `${code}.review.${field}`);
      }
      if (exactKeys(
        product.review.brand_mark,
        ["status", "emblem_matches", "wordmark_matches"],
        issues,
        `${code}.review.brand_mark`,
      )) {
        if (!REVIEW_STATES.has(product.review.brand_mark.status)) addIssue(issues, `${code}.review.brand_mark.status`);
        if (![true, false, null].includes(product.review.brand_mark.emblem_matches)) {
          addIssue(issues, `${code}.review.brand_mark.emblem_matches`);
        }
        if (![true, false, null].includes(product.review.brand_mark.wordmark_matches)) {
          addIssue(issues, `${code}.review.brand_mark.wordmark_matches`);
        }
      }
      const flatReview = [
        product.review.formula_mapping,
        product.review.front_label,
        product.review.technical_panel,
        product.review.outer_box,
        product.review.media_unit_match,
        product.review.brand_mark?.status,
      ];
      reviewPassed = flatReview.every((state) => state === "approved") &&
        product.review.brand_mark?.emblem_matches === true &&
        product.review.brand_mark?.wordmark_matches === true;
      reviewFailed = flatReview.includes("failed") ||
        product.review.brand_mark?.emblem_matches === false ||
        product.review.brand_mark?.wordmark_matches === false;
    }

    if (product.facts === null) {
      if (product.review_status === "complete") addIssue(issues, `${code}.facts.missing-for-complete`);
    } else {
      validateFacts(product.facts, issues, `${code}.facts`, {
        collectionHandles: options.collectionHandles,
        productHandles: handles,
        currentHandle: product.handle,
        publicTitle: product.public_title,
      });
    }
    if (product.review_status === "complete" && (!reviewPassed || product.facts === null)) {
      addIssue(issues, `${code}.complete-without-approved-review`);
    }
    if (reviewFailed && product.review_status !== "blocked") {
      addIssue(issues, `${code}.failed-review-not-blocked`);
    }
    if (product.review_status === "blocked" && !reviewFailed) {
      addIssue(issues, `${code}.blocked-without-failed-review`);
    }
    if (options.requireComplete === true && product.review_status !== "complete") {
      addIssue(issues, `${code}.launch-incomplete`);
    }
  }

  if (contract.status === "complete" && summary.complete !== 20) addIssue(issues, "root.complete-with-incomplete-products");
  if (contract.status === "pending-review" && summary.complete === 20) addIssue(issues, "root.pending-with-complete-products");
  if (options.requireComplete === true && contract.status !== "complete") addIssue(issues, "root.launch-incomplete");

  return { issues, summary };
}

export function summarizeIssueCodes(issues) {
  const counts = new Map();
  for (const issue of issues) {
    const category = issue
      .replace(/^products[.]\d+[.]/u, "product.")
      .replace(/[.]\d+(?=[.]|$)/gu, ".item");
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, count]) => ({ category, count }));
}
