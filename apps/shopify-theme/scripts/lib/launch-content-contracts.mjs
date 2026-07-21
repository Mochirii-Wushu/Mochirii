export const REQUIRED_LAUNCH_PAGES = Object.freeze(new Map([
  ["faq", "Frequently Asked Questions"],
  ["ingredients-standards", "Ingredients & Standards"],
  ["accessibility", "Accessibility"],
]));

export const REQUIRED_RENDERED_ROUTE_CATEGORIES = Object.freeze([
  "home",
  "collections",
  "products",
  "search-and-filters",
  "cart",
  "contact",
  "policies-and-privacy",
  "accounts",
  "errors",
  "password",
  "notifications",
]);

export const REQUIRED_STOREFRONT_SEARCH_EXPECTATIONS = Object.freeze(new Map([
  ["moisturizer", [
    "hyaluronic-day-cream",
    "moisturising-day-cream",
    "collagen-night-cream",
    "ceramide-barrier-night-cream",
    "niacinamide-gel-moisturiser",
    "retinol-alternative-moisturiser",
  ]],
  ["moisturiser", [
    "hyaluronic-day-cream",
    "moisturising-day-cream",
    "collagen-night-cream",
    "ceramide-barrier-night-cream",
    "niacinamide-gel-moisturiser",
    "retinol-alternative-moisturiser",
  ]],
  ["niacinimide", ["niacinamide-gel-moisturiser"]],
  ["hyaluronic", ["hyaluronic-day-cream"]],
  ["retinol", ["natural-retinol-alternative-oil-serum", "retinol-alternative-moisturiser"]],
  ["cleanser", [
    "sensitive-skin-oil-to-milk-cleanser",
    "gentle-cleansing-milk",
    "sensitive-face-body-cleanser",
    "cleansing-foam",
  ]],
]));

const SEARCH_ROOT_KEYS = Object.freeze([
  "$schema",
  "schema_version",
  "revision",
  "product_facts_revision",
  "locale",
  "brand",
  "status",
  "queries",
]);

const SEARCH_QUERY_KEYS = Object.freeze(["query", "review_basis", "expected_handles"]);

const LAUNCH_PAGE_ROOT_KEYS = Object.freeze([
  "$schema",
  "schema_version",
  "revision",
  "locale",
  "brand",
  "status",
  "lifecycle",
  "pages",
]);

const PAGE_KEYS = Object.freeze([
  "handle",
  "title",
  "body_html",
  "seo_title",
  "seo_description",
]);

const LIFECYCLE_KEYS = Object.freeze([
  "preparation_status",
  "application_status",
  "readback_status",
  "provider_write_authority",
]);

const EXCEPTION_ROOT_KEYS = Object.freeze([
  "$schema",
  "schema_version",
  "revision",
  "locale",
  "brand",
  "status",
  "required_rendered_route_categories",
  "rendered_review",
  "entries",
]);

const RENDERED_REVIEW_KEYS = Object.freeze([
  "status",
  "reviewer",
  "review_date",
  "reviewed_route_categories",
]);

export const MANDATORY_NAME_EXCEPTION_KEYS = Object.freeze([
  "surface",
  "route",
  "exact_name",
  "legal_or_contractual_reason",
  "exact_approved_wording",
  "reviewer",
  "review_date",
]);

const allowedCustomerRoutes = new Set([
  "/policies/shipping-policy",
  "/policies/refund-policy",
  "/pages/contact",
]);

const manufacturingPartnerName = ["Self", "named"].join("");
const manufacturerReferenceName = ["MÁ", "DARA"].join("");
const formerCompanyName = ["Vele", "sari"].join("");

export const CUSTOMER_LANGUAGE_COMPANY_INVENTORY = Object.freeze([
  { name: manufacturingPartnerName, aliases: [manufacturingPartnerName, ["self", " named"].join("")] },
  { name: "Shopify", aliases: ["shopify"] },
  { name: manufacturerReferenceName, aliases: [manufacturerReferenceName] },
  { name: "The Ordinary", aliases: ["the ordinary"] },
  { name: formerCompanyName, aliases: [formerCompanyName] },
  { name: "Klaviyo", aliases: ["klaviyo"] },
  { name: "Google", aliases: ["google"] },
  { name: "Facebook", aliases: ["facebook"] },
  { name: "Instagram", aliases: ["instagram"] },
  { name: "TikTok", aliases: ["tiktok", "tik tok"] },
  { name: "Meta Pixel", aliases: ["meta pixel"] },
  { name: "PayPal", aliases: ["paypal", "pay pal"] },
  { name: "Stripe", aliases: ["stripe"] },
  { name: "Shop Pay", aliases: ["shop pay"] },
  { name: "Apple Pay", aliases: ["apple pay"] },
  { name: "Google Pay", aliases: ["google pay"] },
  { name: "Amazon Pay", aliases: ["amazon pay"] },
  { name: "Klarna", aliases: ["klarna"] },
  { name: "Afterpay", aliases: ["afterpay", "after pay"] },
  { name: "FedEx", aliases: ["fedex", "fed ex"] },
  { name: "UPS", aliases: ["ups"] },
  { name: "USPS", aliases: ["usps"] },
  { name: "DHL", aliases: ["dhl"] },
  { name: "GitHub", aliases: ["github", "git hub"] },
  { name: "Vercel", aliases: ["vercel"] },
  { name: "Supabase", aliases: ["supabase", "supa base"] },
].map((entry) => Object.freeze({
  name: entry.name,
  aliases: Object.freeze([...entry.aliases]),
})));

const SYSTEM_LANGUAGE_TERMS = Object.freeze([
  "supplier",
  "vendor",
  "manufacturer",
  "platform",
  "provider",
  "integration",
  "retailer",
  "warehouse",
  "fulfillment",
  "backend",
  "app",
  "api",
  "webhook",
  "database",
  "server",
  "admin",
  "dashboard",
  "inventory",
  "metafield",
  "metadata",
  "sync",
  "system",
  "systems",
  "internal system",
  "internal metadata",
  "store owner",
  "source mapping",
]);
const MOOD_ONLY_TERMS = Object.freeze([
  "calm",
  "calming",
  "quiet",
  "warm",
  "dreamy",
  "serene",
  "escape",
  "ritual",
  "thoughtful",
  "considered",
  "elevated",
  "timeless",
  "luxurious",
  "curated",
  "transform",
  "unlock",
]);
const UNSUPPORTED_CLAIM_TERMS = Object.freeze([
  "heal",
  "heals",
  "healing",
  "anti-inflammatory",
  "repair skin",
  "repairs skin",
  "treat acne",
  "treats acne",
  "treat eczema",
  "treats eczema",
  "build collagen",
  "builds collagen",
  "hypoallergenic",
  "chemical-free",
  "non-toxic",
  "clinically proven",
  "dermatologist approved",
  "clean beauty",
  "green beauty",
]);
const exactCommerceWordmark = "Mochirii Cosmetics";

// Keep this deliberately small and audited. Customer copy may use these common
// HTML character references; any other reference fails closed so an encoded
// provider name, claim, or altered wordmark cannot bypass the language policy.
const APPROVED_HTML_NAMED_CHARACTER_REFERENCES = Object.freeze(new Map([
  ["amp", "&"],
  ["AMP", "&"],
  ["apos", "'"],
  ["bull", "•"],
  ["copy", "©"],
  ["eacute", "é"],
  ["emsp", "\u2003"],
  ["ensp", "\u2002"],
  ["gt", ">"],
  ["GT", ">"],
  ["hellip", "…"],
  ["ldquo", "“"],
  ["lsquo", "‘"],
  ["lt", "<"],
  ["LT", "<"],
  ["mdash", "—"],
  ["middot", "·"],
  ["nbsp", "\u00a0"],
  ["ndash", "–"],
  ["NewLine", "\n"],
  ["quot", "\""],
  ["QUOT", "\""],
  ["rdquo", "”"],
  ["reg", "®"],
  ["rsquo", "’"],
  ["shy", "\u00ad"],
  ["Tab", "\t"],
  ["thinsp", "\u2009"],
  ["trade", "™"],
]));

const htmlCharacterReferenceCandidatePattern = /&(?:#(?:[xX][0-9A-Za-z]+|[0-9A-Za-z]+)|[A-Za-z][A-Za-z0-9]{0,31});?/gu;

function decodedHtmlCharacterReferences(value) {
  let hasUnresolvedReference = false;
  const decoded = value.replaceAll(htmlCharacterReferenceCandidatePattern, (reference) => {
    const token = reference.slice(1, reference.endsWith(";") ? -1 : undefined);
    if (token.startsWith("#")) {
      const numeric = token.slice(1);
      const hexadecimal = numeric.startsWith("x") || numeric.startsWith("X");
      const digits = hexadecimal ? numeric.slice(1) : numeric;
      const validDigits = hexadecimal ? /^[0-9A-Fa-f]+$/u : /^[0-9]+$/u;
      if (!validDigits.test(digits)) {
        hasUnresolvedReference = true;
        return ` ${token} `;
      }
      const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
      if (
        !Number.isSafeInteger(codePoint)
        || codePoint <= 0
        || codePoint > 0x10ffff
        || (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        hasUnresolvedReference = true;
        return ` ${token} `;
      }
      return String.fromCodePoint(codePoint);
    }
    const named = APPROVED_HTML_NAMED_CHARACTER_REFERENCES.get(token);
    if (named === undefined) {
      hasUnresolvedReference = true;
      return ` ${token} `;
    }
    return named;
  });
  return { decoded, hasUnresolvedReference };
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function customerLanguageRenderedCandidates(value) {
  if (typeof value !== "string") return [];
  const commentsJoined = value.replaceAll(/<!--[\s\S]*?-->/gu, "");
  const commentsSpaced = value.replaceAll(/<!--[\s\S]*?-->/gu, " ");
  return [...new Set([
    value,
    commentsJoined.replaceAll(/<[^>]*>/gu, ""),
    commentsSpaced.replaceAll(/<[^>]*>/gu, " "),
  ])];
}

function normalizedCustomerLanguageForms(value) {
  return [...new Set(customerLanguageRenderedCandidates(value).flatMap((candidate) => [
    normalizeCustomerLanguageForPolicy(candidate),
    normalizeCustomerLanguageForPolicy(candidate, { joinInternalSeparators: true }),
  ]).filter(Boolean))];
}

export function normalizeCustomerLanguageForPolicy(value, { joinInternalSeparators = false } = {}) {
  if (typeof value !== "string") return "";
  let normalized = decodedHtmlCharacterReferences(value).decoded
    .normalize("NFKD")
    .replaceAll(/\p{Mark}+/gu, "")
    .replaceAll(/\p{Format}+/gu, "")
    .toLocaleLowerCase("en-US");
  if (joinInternalSeparators) {
    normalized = normalized.replaceAll(
      /(?<=[\p{Letter}\p{Number}])[\p{Punctuation}\p{Symbol}]+(?=[\p{Letter}\p{Number}])/gu,
      "",
    );
  }
  return normalized
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function normalizedTermPattern(terms) {
  const alternatives = [...new Set(terms.map((term) => normalizeCustomerLanguageForPolicy(term)))]
    .filter(Boolean)
    .map((term) => term.split(" ").map(escapePattern).join("\\s*"));
  return new RegExp(`(?:^|\\s)(?:${alternatives.join("|")})(?=\\s|$)`, "u");
}

const companyMatchers = Object.freeze(CUSTOMER_LANGUAGE_COMPANY_INVENTORY.map((entry) => {
  const exactAliases = new Set(entry.aliases.flatMap((alias) => [
    normalizeCustomerLanguageForPolicy(alias),
    normalizeCustomerLanguageForPolicy(alias, { joinInternalSeparators: true }),
  ]).filter(Boolean));
  return Object.freeze({
    name: entry.name,
    pattern: normalizedTermPattern(entry.aliases),
    exactAliases,
  });
}));
const systemLanguagePattern = normalizedTermPattern(SYSTEM_LANGUAGE_TERMS);
const moodOnlyPattern = normalizedTermPattern(MOOD_ONLY_TERMS);
const unsupportedClaimPattern = normalizedTermPattern(UNSUPPORTED_CLAIM_TERMS);
const precisePromisePattern = /(?:^|\s)(?:free\s*shipping|guaranteed|ships?\s*within|delivers?\s*within|arrives?\s*within|refunds?\s*within|returns?\s*within|[0-9]+\s*(?:(?:business|calendar)\s*)?days?)(?=\s|$)/u;
const legalPromisePattern = /(?:^|\s)(?:fully\s*accessible|complies?\s*with\s*all|wcag(?:\s*[0-9.]+)?\s*compliant)(?=\s|$)/u;

export function customerLanguageCompanyMatches(value) {
  if (typeof value !== "string") return [];
  const forms = normalizedCustomerLanguageForms(value);
  return companyMatchers
    .filter((entry) => forms.some((form) => entry.pattern.test(form)))
    .map((entry) => entry.name);
}

export function exactCustomerLanguageCompanyName(value) {
  if (typeof value !== "string") return null;
  const forms = new Set([
    normalizeCustomerLanguageForPolicy(value),
    normalizeCustomerLanguageForPolicy(value, { joinInternalSeparators: true }),
  ].filter(Boolean));
  const matches = companyMatchers
    .filter((entry) => [...forms].some((form) => entry.exactAliases.has(form)))
    .map((entry) => entry.name);
  return matches.length === 1 ? matches[0] : null;
}

function containsInconsistentCommerceWordmark(value) {
  if (typeof value !== "string") return false;
  const joinedVisibleValue = customerLanguageRenderedCandidates(value)[1] ?? value;
  const decodedValue = decodedHtmlCharacterReferences(joinedVisibleValue).decoded;
  const exactAllowedPattern = /(?<![\p{Letter}\p{Number}])Mochirii Cosmetics(?![\p{Letter}\p{Number}])/gu;
  const remainder = decodedValue.replace(exactAllowedPattern, " ");
  const compactRemainder = normalizeCustomerLanguageForPolicy(
    remainder,
    { joinInternalSeparators: true },
  ).replaceAll(" ", "");
  const compactIdentity = normalizeCustomerLanguageForPolicy(
    exactCommerceWordmark,
    { joinInternalSeparators: true },
  ).replaceAll(" ", "");
  return compactRemainder.includes(compactIdentity);
}

export function customerLanguageIssueCategories(value) {
  if (typeof value !== "string") return [];
  const { hasUnresolvedReference } = decodedHtmlCharacterReferences(value);
  const forms = normalizedCustomerLanguageForms(value);
  const matches = (pattern) => forms.some((form) => pattern.test(form));
  const categories = [];
  if (hasUnresolvedReference) categories.push("unresolved-html-entity");
  if (customerLanguageCompanyMatches(value).length > 0) categories.push("third-party-name");
  if (matches(systemLanguagePattern)) categories.push("system-language");
  if (matches(moodOnlyPattern)) categories.push("mood-only-language");
  if (matches(unsupportedClaimPattern)) categories.push("unsupported-claim");
  if (/[$%]/u.test(value) || matches(precisePromisePattern)) {
    categories.push("precise-commercial-promise");
  }
  if (matches(legalPromisePattern)) categories.push("legal-or-accessibility-promise");
  if (containsInconsistentCommerceWordmark(value)) categories.push("inconsistent-brand");
  return categories;
}

export function approvedCustomerCopyLanguageIssues(contract) {
  const issues = [];
  const scan = (value, surface) => {
    if (typeof value === "string") {
      for (const category of customerLanguageIssueCategories(value)) {
        issues.push({ surface, category });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => scan(item, `${surface}.${index}`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) scan(child, `${surface}.${key}`);
    }
  };

  scan(contract?.theme, "theme");
  scan(contract?.home, "home");
  scan(contract?.collectionsIndex, "collections-index");
  for (const [index, page] of (Array.isArray(contract?.pages) ? contract.pages : []).entries()) {
    for (const field of ["title", "bodyHtml", "seoTitle", "seoDescription"]) {
      scan(page?.[field], `pages.${index}.${field}`);
    }
  }
  for (const [index, collection] of (Array.isArray(contract?.collections) ? contract.collections : []).entries()) {
    for (const field of ["title", "description", "seoTitle", "seoDescription"]) {
      scan(collection?.[field], `collections.${index}.${field}`);
    }
  }
  for (const [index, product] of (Array.isArray(contract?.products) ? contract.products : []).entries()) {
    scan(product?.identity?.title, `products.${index}.title`);
    scan(product?.copy, `products.${index}.copy`);
  }
  return issues;
}

function addIssue(issues, route, category) {
  issues.push({ route, category });
}

function exactKeys(value, expected, issues, route, category) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addIssue(issues, route, `${category}.type`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    addIssue(issues, route, `${category}.keys`);
    return false;
  }
  return true;
}

function text(value, issues, route, category, { nullable = false } = {}) {
  if (nullable && value === null) return true;
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    addIssue(issues, route, `${category}.text`);
    return false;
  }
  return true;
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function sameSet(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function validateCustomerLanguage(value, issues, route, category) {
  if (typeof value !== "string") return;
  for (const issueCategory of customerLanguageIssueCategories(value)) {
    addIssue(issues, route, `${category}.${issueCategory}`);
  }
}

function validateBodyHtml(value, issues, route) {
  if (!text(value, issues, route, "body_html")) return;
  const hrefs = [...value.matchAll(/<a href="([^"]+)">/gu)].map((match) => match[1]);
  if (hrefs.some((href) => !allowedCustomerRoutes.has(href))) {
    addIssue(issues, route, "body_html.link-route");
  }
  const withoutAllowedMarkup = value
    .replaceAll(/<a href="(?:\/policies\/(?:shipping-policy|refund-policy)|\/pages\/contact)">/gu, "")
    .replaceAll(/<\/?(?:a|h2|p)>/gu, "");
  if (/[<>]/u.test(withoutAllowedMarkup)) addIssue(issues, route, "body_html.markup");
  const headingCount = value.match(/<h2>/gu)?.length ?? 0;
  if (headingCount < 2 || headingCount !== (value.match(/<\/h2>/gu)?.length ?? 0)) {
    addIssue(issues, route, "body_html.headings");
  }
  const paragraphCount = value.match(/<p>/gu)?.length ?? 0;
  if (paragraphCount < 2 || paragraphCount !== (value.match(/<\/p>/gu)?.length ?? 0)) {
    addIssue(issues, route, "body_html.paragraphs");
  }
  if ((value.match(/<a /gu)?.length ?? 0) !== (value.match(/<\/a>/gu)?.length ?? 0)) {
    addIssue(issues, route, "body_html.links");
  }
  validateCustomerLanguage(value, issues, route, "copy");
}

export function validateLaunchPagesContract(contract, options = {}) {
  const issues = [];
  if (!exactKeys(contract, LAUNCH_PAGE_ROOT_KEYS, issues, "launch-pages", "root")) return { issues };
  if (contract.$schema !== "./launch-pages.v1.schema.json") addIssue(issues, "launch-pages", "root.schema-reference");
  if (contract.schema_version !== 1) addIssue(issues, "launch-pages", "root.schema-version");
  text(contract.revision, issues, "launch-pages", "root.revision");
  if (contract.locale !== "en-US") addIssue(issues, "launch-pages", "root.locale");
  if (contract.brand !== "Mochirii Cosmetics") addIssue(issues, "launch-pages", "root.brand");
  if (!["prepared-not-applied", "applied-readback-verified"].includes(contract.status)) {
    addIssue(issues, "launch-pages", "root.status");
  }

  if (exactKeys(contract.lifecycle, LIFECYCLE_KEYS, issues, "launch-pages", "lifecycle")) {
    if (contract.lifecycle.preparation_status !== "prepared") addIssue(issues, "launch-pages", "lifecycle.preparation");
    if (contract.lifecycle.provider_write_authority !== false) addIssue(issues, "launch-pages", "lifecycle.provider-authority");
    const preparedState = contract.status === "prepared-not-applied" &&
      contract.lifecycle.application_status === "not-applied" &&
      contract.lifecycle.readback_status === "not-verified";
    const appliedState = contract.status === "applied-readback-verified" &&
      contract.lifecycle.application_status === "applied" &&
      contract.lifecycle.readback_status === "verified";
    if (!preparedState && !appliedState) addIssue(issues, "launch-pages", "lifecycle.state-consistency");
    if (options.requireLaunchReady === true && !appliedState) {
      addIssue(issues, "launch-pages", "lifecycle.application-and-readback-pending");
    }
  }

  if (!Array.isArray(contract.pages) || contract.pages.length !== REQUIRED_LAUNCH_PAGES.size) {
    addIssue(issues, "launch-pages", "pages.exact-count");
  }
  const pages = Array.isArray(contract.pages) ? contract.pages : [];
  const handles = pages.map((page) => page?.handle);
  if (!sameSet(handles, [...REQUIRED_LAUNCH_PAGES.keys()])) addIssue(issues, "launch-pages", "pages.identity-set");
  for (const page of pages) {
    const route = typeof page?.handle === "string" ? `/pages/${page.handle}` : "launch-page";
    if (!exactKeys(page, PAGE_KEYS, issues, route, "page")) continue;
    for (const field of ["handle", "title", "seo_title", "seo_description"]) {
      text(page[field], issues, route, field);
    }
    if (REQUIRED_LAUNCH_PAGES.get(page.handle) !== page.title) addIssue(issues, route, "title.identity");
    if (typeof page.seo_title === "string" && page.seo_title.length >= 60) addIssue(issues, route, "seo_title.length");
    if (typeof page.seo_description === "string" &&
        (page.seo_description.length < 70 || page.seo_description.length >= 160)) {
      addIssue(issues, route, "seo_description.length");
    }
    validateCustomerLanguage(page.title, issues, route, "title");
    validateCustomerLanguage(page.seo_title, issues, route, "seo_title");
    validateCustomerLanguage(page.seo_description, issues, route, "seo_description");
    validateBodyHtml(page.body_html, issues, route);
    if (page.handle === "faq" && typeof page.body_html === "string") {
      for (const requiredPolicyRoute of ["/policies/shipping-policy", "/policies/refund-policy"]) {
        if (!page.body_html.includes(`href="${requiredPolicyRoute}"`)) {
          addIssue(issues, route, "body_html.required-policy-route");
        }
      }
    }
  }
  return { issues };
}

export function validateMandatoryNameExceptions(contract, options = {}) {
  const issues = [];
  if (!exactKeys(contract, EXCEPTION_ROOT_KEYS, issues, "name-exceptions", "root")) return { issues };
  if (contract.$schema !== "./mandatory-name-exceptions.v1.schema.json") {
    addIssue(issues, "name-exceptions", "root.schema-reference");
  }
  if (contract.schema_version !== 1) addIssue(issues, "name-exceptions", "root.schema-version");
  text(contract.revision, issues, "name-exceptions", "root.revision");
  if (contract.locale !== "en-US") addIssue(issues, "name-exceptions", "root.locale");
  if (contract.brand !== "Mochirii Cosmetics") addIssue(issues, "name-exceptions", "root.brand");
  if (!["pending-review", "reviewed"].includes(contract.status)) addIssue(issues, "name-exceptions", "root.status");
  if (!sameSet(contract.required_rendered_route_categories, REQUIRED_RENDERED_ROUTE_CATEGORIES)) {
    addIssue(issues, "name-exceptions", "route-scope.required-categories");
  }

  let reviewReady = false;
  if (exactKeys(contract.rendered_review, RENDERED_REVIEW_KEYS, issues, "name-exceptions", "rendered-review")) {
    const pendingState = contract.status === "pending-review" &&
      contract.rendered_review.status === "pending" &&
      contract.rendered_review.reviewer === null &&
      contract.rendered_review.review_date === null &&
      Array.isArray(contract.rendered_review.reviewed_route_categories) &&
      contract.rendered_review.reviewed_route_categories.length === 0;
    reviewReady = contract.status === "reviewed" &&
      contract.rendered_review.status === "reviewed" &&
      typeof contract.rendered_review.reviewer === "string" &&
      contract.rendered_review.reviewer.trim().length > 0 &&
      isIsoDate(contract.rendered_review.review_date) &&
      sameSet(contract.rendered_review.reviewed_route_categories, REQUIRED_RENDERED_ROUTE_CATEGORIES);
    if (!pendingState && !reviewReady) addIssue(issues, "name-exceptions", "rendered-review.state-consistency");
    if (options.requireLaunchReady === true && !reviewReady) {
      addIssue(issues, "name-exceptions", "rendered-review.pending");
    }
  }

  if (!Array.isArray(contract.entries)) {
    addIssue(issues, "name-exceptions", "entries.type");
    return { issues };
  }
  const identities = new Set();
  for (const entry of contract.entries) {
    const route = typeof entry?.route === "string" && entry.route.length > 0 ? entry.route : "exception-entry";
    if (!exactKeys(entry, MANDATORY_NAME_EXCEPTION_KEYS, issues, route, "exception")) continue;
    for (const field of MANDATORY_NAME_EXCEPTION_KEYS) text(entry[field], issues, route, `exception.${field}`);
    if (typeof entry.route === "string" && !/^(?:\/|notification:)/u.test(entry.route)) {
      addIssue(issues, route, "exception.route-format");
    }
    if (entry.exact_name === "Mochirii Cosmetics") addIssue(issues, route, "exception.first-party-name");
    if (typeof entry.legal_or_contractual_reason === "string" &&
        !/\b(?:legal|law|required|regulation|contract|contractual|agreement|carrier|certification|privacy|label)\b/iu.test(entry.legal_or_contractual_reason)) {
      addIssue(issues, route, "exception.reason-basis");
    }
    if (typeof entry.exact_name === "string" && typeof entry.exact_approved_wording === "string") {
      const normalizedExactName = normalizeCustomerLanguageForPolicy(
        entry.exact_name,
        { joinInternalSeparators: true },
      );
      const normalizedApprovedWording = normalizeCustomerLanguageForPolicy(
        entry.exact_approved_wording,
        { joinInternalSeparators: true },
      );
      const exactNameIsWholeToken = normalizedExactName.length > 0 &&
        ` ${normalizedApprovedWording} `.includes(` ${normalizedExactName} `);
      if (!exactNameIsWholeToken) addIssue(issues, route, "exception.wording-name-parity");

      const knownCanonicalCompanyName = exactCustomerLanguageCompanyName(entry.exact_name);
      if (knownCanonicalCompanyName !== null && entry.exact_name !== knownCanonicalCompanyName) {
        addIssue(issues, route, "exception.exact-name-canonical");
      }
    }
    if (!isIsoDate(entry.review_date)) addIssue(issues, route, "exception.review-date");
    const identity = [entry.surface, entry.route, entry.exact_name]
      .map((value) => String(value).toLocaleLowerCase("en-US"))
      .join("\u0000");
    if (identities.has(identity)) addIssue(issues, route, "exception.duplicate");
    identities.add(identity);
  }
  return { issues };
}

export function validateStorefrontSearchExpectations(contract, options = {}) {
  const issues = [];
  if (!exactKeys(contract, SEARCH_ROOT_KEYS, issues, "search-expectations", "root")) return { issues };
  if (contract.$schema !== "./storefront-search-expectations.v1.schema.json") {
    addIssue(issues, "search-expectations", "root.schema-reference");
  }
  if (contract.schema_version !== 1) addIssue(issues, "search-expectations", "root.schema-version");
  text(contract.revision, issues, "search-expectations", "root.revision");
  if (contract.product_facts_revision !== options.productFactsRevision) {
    addIssue(issues, "search-expectations", "root.product-facts-revision");
  }
  if (contract.locale !== "en-US") addIssue(issues, "search-expectations", "root.locale");
  if (contract.brand !== "Mochirii Cosmetics") addIssue(issues, "search-expectations", "root.brand");
  if (contract.status !== "prepared") addIssue(issues, "search-expectations", "root.status");
  if (!Array.isArray(contract.queries) ||
      contract.queries.length !== REQUIRED_STOREFRONT_SEARCH_EXPECTATIONS.size) {
    addIssue(issues, "search-expectations", "queries.exact-count");
  }
  const queries = [];
  for (const item of Array.isArray(contract.queries) ? contract.queries : []) {
    const route = typeof item?.query === "string" ? `search:${item.query}` : "search-expectations";
    if (!exactKeys(item, SEARCH_QUERY_KEYS, issues, route, "query")) continue;
    queries.push(item.query);
    text(item.review_basis, issues, route, "query.review-basis");
    const expected = REQUIRED_STOREFRONT_SEARCH_EXPECTATIONS.get(item.query);
    if (!expected || !sameSet(item.expected_handles, expected)) {
      addIssue(issues, route, "query.expected-handles");
    }
  }
  if (!sameSet(queries, [...REQUIRED_STOREFRONT_SEARCH_EXPECTATIONS.keys()])) {
    addIssue(issues, "search-expectations", "queries.identity-set");
  }
  return { issues };
}

export function summarizeContractIssues(issues) {
  const counts = new Map();
  for (const issue of issues) {
    const route = typeof issue?.route === "string" ? issue.route : "contract";
    const category = typeof issue?.category === "string" ? issue.category : "invalid";
    const key = `${route}\u0000${category}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [route, category] = key.split("\u0000");
      return { route, category, count };
    })
    .sort((left, right) => left.route.localeCompare(right.route) || left.category.localeCompare(right.category));
}
