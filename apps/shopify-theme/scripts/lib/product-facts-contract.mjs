import {
  customerLanguageIssueCategories,
  normalizeCustomerLanguageForPolicy,
} from "./launch-content-contracts.mjs";

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
  "product_type",
  "skin_type",
  "appearance_concerns",
  "routine_step",
  "usage_directions",
  "key_ingredients",
  "key_ingredient_details",
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
    vendor: {
      source: "$brand",
      write_target: "product.vendor",
      readback: "product.vendor",
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
    product_type: {
      source: "facts.product_type",
      namespace: "custom",
      key: "product_type",
      type: "single_line_text_field",
      readback: "product.metafields.custom.product_type",
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
      type: "list.single_line_text_field",
      readback: "product.metafields.custom.key_ingredients",
    },
    key_ingredient_details: {
      source: "facts.key_ingredient_details",
      namespace: "custom",
      key: "key_ingredient_details",
      type: "json",
      readback: "product.metafields.custom.key_ingredient_details",
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
    variant_presentation: {
      source: "$single_default_variant",
      has_only_default_variant: true,
      title: "Default Title",
      selected_options: [{ name: "Title", value: "Default Title" }],
      readback: {
        has_only_default_variant: "product.hasOnlyDefaultVariant",
        title: "product.variants.nodes[0].title",
        selected_options: "product.variants.nodes[0].selectedOptions",
      },
    },
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
    .filter((entry) => entry.source.startsWith("facts."))
    .map((entry) => entry.source.slice("facts.".length)),
]);

const REVIEW_STATES = new Set(["pending", "approved", "failed"]);
const PRODUCT_STATES = new Set(["pending", "complete", "blocked"]);
const MEDIA_ROLES = new Set(["front", "technical-panel", "outer-box", "texture", "scale", "use"]);
const MEDIA_ROLE_SEQUENCE = Object.freeze(["front", "technical-panel", "outer-box", "texture", "scale", "use"]);
const ALL_PRODUCTS_COLLECTION_HANDLE = "mochirii-cosmetics";
const BRAND_MARK_EXPECTATIONS = new Set(["required"]);
const TIMINGS = new Set(["AM", "PM", "As needed"]);
const RINSE_BEHAVIORS = new Set(["Rinse", "No rinse"]);
const US_CUSTOMARY_UNITS = new Set(["fl oz", "oz"]);
const METRIC_UNITS = new Set(["mL", "g"]);

const vagueResultPattern = /\b(?:refreshed finish|more rested|simple place in routines?|nourished)\b/iu;
const unsupportedClaimPattern = /\b(?:heals?|healing|anti-inflammatory|repairs? skin|treats? (?:acne|eczema)|builds? collagen|hypoallergenic|chemical-free|non-toxic|clinically proven|dermatologist approved)\b/iu;
const unsupportedPositioningPattern = /(?:^|\s)(?:clean\s*beauty|green\s*beauty|eco\s*friendly|environmentally\s*friendly|sustainable)(?=\s|$)/u;
const sensoryPattern = /\b(?:soft|silky|velvety|gentle)\b/iu;
const factualAnchorPattern = /(?:^|\s)(?:helps?\s+skin|leaves?\s+skin|skin\s+(?:feels?|looks?|appears?)|cleans(?:e|es)|removes?|rinses?|hydrates?|moisturiz(?:e|es)|smooths?|appearance|skin\s+feel|texture|finish|ingredients?|appl(?:y|ies|ied|ying|ication))(?=\s|$)/u;
const privateReferencePattern = /(?:private-evidence|\.private-evidence|\.artifacts[\\/]operations|label-artwork|mockup|source[-_ ]?id)/iu;
const publicMediaReferencePattern = /^\/(?!\/)(?:[a-z0-9][a-z0-9._~-]*\/)*[a-z0-9][a-z0-9._~-]*[.](?:avif|jpe?g|png|webp)$/iu;
const sha256Pattern = /^[a-f0-9]{64}$/u;
const repeatedSha256Pattern = /^([a-f0-9])\1{63}$/u;

function validSha256(value) {
  return typeof value === "string" &&
    sha256Pattern.test(value) &&
    !repeatedSha256Pattern.test(value);
}
const controlCharacterPattern = /[\p{Cc}\p{Cf}]/u;
const markupPattern = /[<>]|\[[^\]\r\n]+\]\([^\)\r\n]+\)|`|(?:^|\s)(?:#{1,6}\s|[*_~]{2,})/u;
const MILLILITERS_PER_FLUID_OUNCE = 29.5735295625;
const GRAMS_PER_OUNCE = 28.349523125;

function separatorTolerantWord(word) {
  return [...word].map((character) => character.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s*");
}

function normalizedTermPattern(words) {
  return new RegExp(
    `(?:^|\\s)(?:${words.map(separatorTolerantWord).join("|")})(?=\\s|$)`,
    "u",
  );
}

const prohibitedMoodPattern = normalizedTermPattern([
  "calm",
  "calming",
  "quiet",
  "dreamy",
  "serene",
  "escape",
  "ritual",
]);
const warmPattern = normalizedTermPattern(["warm"]);
const warmWaterPattern = /(?:^|\s)warm\s+water(?=\s|$)/gu;

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

function sourceValue(record, source) {
  if (source === "$brand") return "Mochirii Cosmetics";
  const value = source.split(".").reduce((current, key) => current?.[key], record);
  if (value === undefined) throw new TypeError(`Missing Shopify publication source: ${source}`);
  return value;
}

function asciiCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUniqueStrings(values, field) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    throw new TypeError(`${field} must be an array of strings`);
  }
  if (new Set(values).size !== values.length) throw new TypeError(`${field} must not contain duplicates`);
  return [...values].sort(asciiCompare);
}

export function serializeShopifyPlainTextParagraphHtml(value) {
  if (typeof value !== "string") throw new TypeError("Shopify description source must be a string");
  const escaped = value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<p>${escaped}</p>`;
}

function projectedMetafieldValue(mapping, value, productIdByHandle) {
  switch (mapping.type) {
    case "single_line_text_field":
    case "multi_line_text_field":
      if (typeof value !== "string") throw new TypeError(`${mapping.namespace}.${mapping.key} must be a string`);
      return value;
    case "list.single_line_text_field":
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new TypeError(`${mapping.namespace}.${mapping.key} must be a string list`);
      }
      return [...value];
    case "json":
      return canonicalJson(value);
    case "list.product_reference":
      if (!Array.isArray(value) || value.some((handle) => typeof handle !== "string")) {
        throw new TypeError(`${mapping.namespace}.${mapping.key} must be a product-handle list`);
      }
      return value.map((handle) => {
        const productId = productIdByHandle.get(handle);
        if (typeof productId !== "string" || productId.length === 0) {
          throw new TypeError(`Missing Shopify product ID for complementary product: ${handle}`);
        }
        return productId;
      });
    default:
      throw new TypeError(`Unsupported Shopify metafield type: ${mapping.type}`);
  }
}

export function expectedShopifyProjection(product, productIdByHandle = new Map()) {
  if (!product || typeof product !== "object" || Array.isArray(product) || !product.facts) {
    throw new TypeError("A product with reviewed facts is required for Shopify projection");
  }
  if (!(productIdByHandle instanceof Map)) {
    throw new TypeError("productIdByHandle must be a Map");
  }

  const productFields = Object.fromEntries(
    Object.entries(SHOPIFY_PUBLICATION_MAPPING.product_fields).map(([field, mapping]) => {
      const value = sourceValue(product, mapping.source);
      return [field, field === "description" ? serializeShopifyPlainTextParagraphHtml(value) : value];
    }),
  );
  const metafields = Object.values(SHOPIFY_PUBLICATION_MAPPING.metafields)
    .map((mapping) => ({
      namespace: mapping.namespace,
      key: mapping.key,
      type: mapping.type,
      json_value: projectedMetafieldValue(
        mapping,
        sourceValue(product, mapping.source),
        productIdByHandle,
      ),
    }))
    .sort((left, right) => asciiCompare(
      `${left.namespace}\u0000${left.key}`,
      `${right.namespace}\u0000${right.key}`,
    ));

  return {
    handle: productFields.handle,
    title: productFields.title,
    vendor: productFields.vendor,
    description_html: productFields.description,
    seo: {
      title: productFields.seo_title,
      description: productFields.seo_description,
    },
    variant_presentation: {
      has_only_default_variant:
        SHOPIFY_PUBLICATION_MAPPING.native_fields.variant_presentation.has_only_default_variant,
      title: SHOPIFY_PUBLICATION_MAPPING.native_fields.variant_presentation.title,
      selected_options: canonicalJson(
        SHOPIFY_PUBLICATION_MAPPING.native_fields.variant_presentation.selected_options,
      ),
    },
    metafields,
    collection_handles: sortedUniqueStrings(
      sourceValue(product, SHOPIFY_PUBLICATION_MAPPING.native_fields.collection_handles.source),
      "collection_handles",
    ),
    media: sourceValue(product, SHOPIFY_PUBLICATION_MAPPING.native_fields.media.source)
      .map((media, index) => ({
        position: index + 1,
        role: media.role,
        public_reference: media.public_reference,
        asset_sha256: media.asset_sha256,
        alt_text: media.alt_text,
        brand_mark_expectation: canonicalJson(media.brand_mark_expectation),
      })),
  };
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

function plainText(value, issues, code) {
  if (!text(value, issues, code)) return false;
  if (controlCharacterPattern.test(value)) addIssue(issues, `${code}.control-character`);
  if (markupPattern.test(value)) addIssue(issues, `${code}.markup`);
  return !controlCharacterPattern.test(value) && !markupPattern.test(value);
}

function textList(
  value,
  issues,
  code,
  { min = 1, max = Number.POSITIVE_INFINITY, plain = false } = {},
) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    addIssue(issues, `${code}.count`);
    return false;
  }
  const normalized = [];
  for (const item of value) {
    const valid = plain
      ? plainText(item, issues, `${code}.item`)
      : text(item, issues, `${code}.item`);
    if (valid) normalized.push(item.toLocaleLowerCase("en-US"));
  }
  if (new Set(normalized).size !== normalized.length) addIssue(issues, `${code}.duplicate`);
  return true;
}

function canonicalNumber(value) {
  return Number.isFinite(value) ? String(value) : "";
}

function normalizeLanguageForPolicy(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

function hasUnapprovedWarmLanguage(normalized, context) {
  if (!warmPattern.test(normalized)) return false;
  if (context !== "directions") return true;
  return warmPattern.test(normalized.replace(warmWaterPattern, " "));
}

function metricConversionIsWithinLabelTolerance(usCustomary, metric) {
  const conversionFactor = usCustomary.unit === "fl oz"
    ? MILLILITERS_PER_FLUID_OUNCE
    : GRAMS_PER_OUNCE;
  const expectedMetricValue = usCustomary.value * conversionFactor;
  const labelRoundingTolerance = Math.max(1, expectedMetricValue * 0.05);
  return Math.abs(metric.value - expectedMetricValue) <= labelRoundingTolerance;
}

function validateMeasurement(value, allowedUnits, issues, code) {
  if (!exactKeys(value, ["value", "unit"], issues, code)) return false;
  if (typeof value.value !== "number" || !Number.isFinite(value.value) || value.value <= 0) {
    addIssue(issues, `${code}.value`);
  }
  if (!allowedUnits.has(value.unit)) addIssue(issues, `${code}.unit`);
  return typeof value.value === "number" && Number.isFinite(value.value) && value.value > 0 &&
    allowedUnits.has(value.unit);
}

function validateLanguage(value, issues, code, context) {
  if (typeof value !== "string" || value.length === 0) return;
  const normalized = normalizeLanguageForPolicy(value);
  const sharedCategories = new Set(customerLanguageIssueCategories(value));
  const sharedNormalized = normalizeCustomerLanguageForPolicy(value, { joinInternalSeparators: true });
  const sharedMoodAfterApprovedWarmWater = context === "directions"
    ? new Set(customerLanguageIssueCategories(sharedNormalized.replace(warmWaterPattern, " ")))
    : sharedCategories;
  if (
    prohibitedMoodPattern.test(normalized)
    || hasUnapprovedWarmLanguage(normalized, context)
    || sharedMoodAfterApprovedWarmWater.has("mood-only-language")
  ) {
    addIssue(issues, `${code}.mood-only`);
  }
  if (vagueResultPattern.test(sharedNormalized)) addIssue(issues, `${code}.vague-result`);
  if (unsupportedClaimPattern.test(value) || sharedCategories.has("unsupported-claim")) {
    addIssue(issues, `${code}.unsupported-claim`);
  }
  if (unsupportedPositioningPattern.test(sharedNormalized) && context !== "certification") {
    addIssue(issues, `${code}.unsupported-positioning`);
  }
  if (sharedCategories.has("third-party-name") || sharedCategories.has("system-language")) {
    addIssue(issues, `${code}.third-party-or-system-language`);
  }
  if (sharedCategories.has("unresolved-html-entity")) {
    addIssue(issues, `${code}.unresolved-html-entity`);
  }
  // Percent concentrations need their own structured, evidence-bound field.
  // Until that contract exists, a percent sign in any free-text fact fails
  // closed so efficacy/satisfaction claims cannot masquerade as ingredients.
  if (sharedCategories.has("precise-commercial-promise")) {
    addIssue(issues, `${code}.precise-commercial-promise`);
  }
  if (sharedCategories.has("legal-or-accessibility-promise")) {
    addIssue(issues, `${code}.legal-or-accessibility-promise`);
  }
  if (sharedCategories.has("inconsistent-brand")) addIssue(issues, `${code}.inconsistent-brand`);
  const sensoryAnchorRequired = !["identity", "texture", "finish", "certification"].includes(context);
  if (sensoryAnchorRequired && sensoryPattern.test(sharedNormalized) && !factualAnchorPattern.test(sharedNormalized)) {
    addIssue(issues, `${code}.sensory-only`);
  }
  if (context !== "identity" && context !== "texture" && context !== "finish" &&
      context !== "certification" && /(?:^|\s)natural(?=\s|$)/u.test(sharedNormalized)) {
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
    "product_type",
    "routine_step",
    "ingredients_inci",
    "texture",
    "finish",
    "fragrance_status",
    "country_of_origin",
    "package_details",
  ]) {
    plainText(facts[field], issues, `${code}.${field}`);
  }
  validateLanguage(facts.functional_identity, issues, `${code}.functional_identity`, "identity");
  validateLanguage(facts.description, issues, `${code}.description`, "fact");
  validateLanguage(facts.seo_title, issues, `${code}.seo_title`, "identity");
  validateLanguage(facts.seo_description, issues, `${code}.seo_description`, "fact");
  validateLanguage(facts.card_benefit, issues, `${code}.card_benefit`, "benefit");
  validateLanguage(facts.product_type, issues, `${code}.product_type`, "identity");
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
    benefits: { min: 1, max: 3, plain: true },
    skin_type: { min: 1, plain: true },
    appearance_concerns: { min: 1, plain: true },
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
  textList(facts.key_ingredients, issues, `${code}.key_ingredients`, { min: 1, plain: true });
  for (const [index, ingredient] of (facts.key_ingredients ?? []).entries()) {
    validateLanguage(ingredient, issues, `${code}.key_ingredients.${index}`, "identity");
  }
  if (!Array.isArray(facts.key_ingredient_details) || facts.key_ingredient_details.length === 0) {
    addIssue(issues, `${code}.key_ingredient_details.count`);
  } else {
    const ingredientKeys = new Set();
    for (const [index, ingredient] of facts.key_ingredient_details.entries()) {
      const ingredientCode = `${code}.key_ingredient_details.${index}`;
      if (!exactKeys(ingredient, ["name", "cosmetic_role"], issues, ingredientCode)) continue;
      plainText(ingredient.name, issues, `${ingredientCode}.name`);
      plainText(ingredient.cosmetic_role, issues, `${ingredientCode}.cosmetic_role`);
      validateLanguage(ingredient.name, issues, `${ingredientCode}.name`, "identity");
      validateLanguage(ingredient.cosmetic_role, issues, `${ingredientCode}.cosmetic_role`, "fact");
      const normalized = `${ingredient.name}\u0000${ingredient.cosmetic_role}`.toLocaleLowerCase("en-US");
      if (ingredientKeys.has(normalized)) addIssue(issues, `${code}.key_ingredient_details.duplicate`);
      ingredientKeys.add(normalized);
    }
  }
  const ingredientNames = (facts.key_ingredient_details ?? []).map((ingredient) => ingredient?.name);
  if (Array.isArray(facts.key_ingredients) &&
      JSON.stringify(facts.key_ingredients) !== JSON.stringify(ingredientNames)) {
    addIssue(issues, `${code}.key_ingredients.details-mismatch`);
  }

  if (exactKeys(
    facts.usage_directions,
    ["text", "frequency", "amount", "routine_timing", "rinse_behavior"],
    issues,
    `${code}.usage_directions`,
  )) {
    for (const field of ["text", "frequency", "amount"]) {
      plainText(facts.usage_directions[field], issues, `${code}.usage_directions.${field}`);
      const languageContext = field === "text" ? "directions" : "fact";
      validateLanguage(facts.usage_directions[field], issues, `${code}.usage_directions.${field}`, languageContext);
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
      plainText(facts.warnings.text, issues, `${code}.warnings.text`);
    } else if (facts.warnings.review_result === "approved-none") {
      if (facts.warnings.text !== null) addIssue(issues, `${code}.warnings.approved-none-text`);
      if (Array.isArray(facts.warnings.incompatibilities) && facts.warnings.incompatibilities.length !== 0) {
        addIssue(issues, `${code}.warnings.approved-none-incompatibilities`);
      }
    } else {
      addIssue(issues, `${code}.warnings.review_result`);
    }
    textList(facts.warnings.incompatibilities, issues, `${code}.warnings.incompatibilities`, { min: 0, plain: true });
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
    textList(facts.certifications.items, issues, `${code}.certifications.items`, { min: minimum, plain: true });
    if (facts.certifications.review_result === "approved-none" &&
        Array.isArray(facts.certifications.items) && facts.certifications.items.length !== 0) {
      addIssue(issues, `${code}.certifications.approved-none-items`);
    }
    for (const [index, item] of (facts.certifications.items ?? []).entries()) {
      validateLanguage(item, issues, `${code}.certifications.items.${index}`, "certification");
    }
  }

  if (exactKeys(facts.volume, ["us_customary", "metric", "display"], issues, `${code}.volume`)) {
    const validUs = validateMeasurement(
      facts.volume.us_customary,
      US_CUSTOMARY_UNITS,
      issues,
      `${code}.volume.us_customary`,
    );
    const validMetric = validateMeasurement(
      facts.volume.metric,
      METRIC_UNITS,
      issues,
      `${code}.volume.metric`,
    );
    plainText(facts.volume.display, issues, `${code}.volume.display`);
    validateLanguage(facts.volume.display, issues, `${code}.volume.display`, "identity");
    if (validUs && validMetric) {
      const expectedMetricUnit = facts.volume.us_customary.unit === "fl oz" ? "mL" : "g";
      if (facts.volume.metric.unit !== expectedMetricUnit) {
        addIssue(issues, `${code}.volume.unit-pair`);
      } else if (!metricConversionIsWithinLabelTolerance(
        facts.volume.us_customary,
        facts.volume.metric,
      )) {
        addIssue(issues, `${code}.volume.numeric-parity`);
      }
      const canonicalDisplay = `${canonicalNumber(facts.volume.us_customary.value)} ${facts.volume.us_customary.unit} / ${canonicalNumber(facts.volume.metric.value)} ${facts.volume.metric.unit}`;
      if (facts.volume.display !== canonicalDisplay) {
        addIssue(issues, `${code}.volume.display-mismatch`);
      }
    }
  }

  const allowedCollections = new Set(context.collectionHandles ?? []);
  if (Array.isArray(facts.collection_handles) &&
      !facts.collection_handles.includes(ALL_PRODUCTS_COLLECTION_HANDLE)) {
    addIssue(issues, `${code}.collection_handles.missing-catalog`);
  }
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
  }
  if (Array.isArray(facts.media)) {
    const roles = [];
    const references = [];
    const assetHashes = [];
    for (const [index, item] of facts.media.entries()) {
      const mediaCode = `${code}.media.${index}`;
      if (!exactKeys(
        item,
        ["role", "public_reference", "asset_sha256", "alt_text", "brand_mark_expectation", "approved_unit_match"],
        issues,
        mediaCode,
      )) continue;
      if (!MEDIA_ROLES.has(item.role)) addIssue(issues, `${mediaCode}.role`);
      roles.push(item.role);
      text(item.public_reference, issues, `${mediaCode}.public_reference`);
      references.push(item.public_reference);
      if (!validSha256(item.asset_sha256)) {
        addIssue(issues, `${mediaCode}.asset_sha256`);
      }
      assetHashes.push(item.asset_sha256);
      plainText(item.alt_text, issues, `${mediaCode}.alt_text`);
      validateLanguage(item.alt_text, issues, `${mediaCode}.alt_text`, "fact");
      if (exactKeys(
        item.brand_mark_expectation,
        ["emblem", "wordmark", "other_brand_absent"],
        issues,
        `${mediaCode}.brand_mark_expectation`,
      )) {
        for (const field of ["emblem", "wordmark", "other_brand_absent"]) {
          if (!BRAND_MARK_EXPECTATIONS.has(item.brand_mark_expectation[field])) {
            addIssue(issues, `${mediaCode}.brand_mark_expectation.${field}`);
          }
          if (item.brand_mark_expectation[field] !== "required") {
            addIssue(issues, `${mediaCode}.brand_mark_expectation.${field}.universal-required`);
          }
        }
      }
      if (item.approved_unit_match !== true) addIssue(issues, `${mediaCode}.approved_unit_match`);
      if (privateReferencePattern.test(item.public_reference ?? "")) {
        addIssue(issues, `${mediaCode}.private-reference`);
      }
      if (!publicMediaReferencePattern.test(item.public_reference ?? "")) {
        addIssue(issues, `${mediaCode}.public-reference`);
      }
    }
    if (new Set(roles).size !== roles.length) addIssue(issues, `${code}.media.duplicate-role`);
    if (roles[0] !== "front") addIssue(issues, `${code}.media.front-first`);
    if (roles.every((role) => MEDIA_ROLES.has(role))) {
      const orderedRoles = [...roles].sort((left, right) =>
        MEDIA_ROLE_SEQUENCE.indexOf(left) - MEDIA_ROLE_SEQUENCE.indexOf(right));
      if (JSON.stringify(roles) !== JSON.stringify(orderedRoles)) {
        addIssue(issues, `${code}.media.role-order`);
      }
    }
    if (new Set(references).size !== references.length) addIssue(issues, `${code}.media.duplicate-reference`);
    if (new Set(assetHashes).size !== assetHashes.length) addIssue(issues, `${code}.media.duplicate-asset`);
    for (const requiredRole of ["front", "technical-panel"]) {
      if (!roles.includes(requiredRole)) addIssue(issues, `${code}.media.missing-${requiredRole}`);
    }
    if (context.requireOuterBox === true && !roles.includes("outer-box")) {
      addIssue(issues, `${code}.media.missing-outer-box`);
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
    plainText(product.public_title, issues, `${code}.public_title`);
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
        requireOuterBox: product.review_status === "complete",
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
  if (products.length === 20 && products.every((product) =>
    product?.facts && typeof product.facts === "object" && !Array.isArray(product.facts))) {
    const membershipCounts = new Map((options.collectionHandles ?? []).map((handle) => [handle, 0]));
    for (const product of products) {
      for (const handle of product.facts.collection_handles ?? []) {
        if (membershipCounts.has(handle)) membershipCounts.set(handle, membershipCounts.get(handle) + 1);
      }
    }
    for (const [handle, count] of membershipCounts) {
      if (handle !== ALL_PRODUCTS_COLLECTION_HANDLE && count === 0) {
        addIssue(issues, `collections.${handle}.empty`);
      }
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
