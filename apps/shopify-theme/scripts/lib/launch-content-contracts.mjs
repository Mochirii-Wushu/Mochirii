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

const namedThirdPartyPattern = new RegExp(
  `\\b(?:${[
    ["self", "named"].join(""),
    ["shop", "ify"].join(""),
    ["ma", "dara"].join(""),
    ["vele", "sari"].join(""),
  ].join("|")})\\b`,
  "iu",
);
const systemLanguagePattern = /\b(?:supplier|vendor|platform|integration|retailer|warehouse|fulfillment|backend|internal system|internal metadata|store owner)\b/iu;
const moodOnlyPattern = /\b(?:calm|quiet|warm|dreamy|serene|escape|ritual|thoughtful|elevated|timeless|luxurious)\b/iu;
const unsupportedClaimPattern = /\b(?:heals?|healing|anti-inflammatory|repairs? skin|treats? (?:acne|eczema)|builds? collagen|hypoallergenic|chemical-free|non-toxic|clinically proven|dermatologist approved|clean beauty|green beauty)\b/iu;
const precisePromisePattern = /(?:[$%]|\b(?:free shipping|guaranteed|ships? within|delivers? within|arrives? within|refunds? within|returns? within|[0-9]+\s*(?:business|calendar)?\s*days?)\b)/iu;
const legalPromisePattern = /\b(?:fully accessible|complies? with all|wcag(?:\s+[0-9.]+)? compliant)\b/iu;
const inconsistentBrandPattern = /\bMōchirīī Cosmetics\b/u;

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
  for (const [issueCategory, pattern] of [
    ["third-party-name", namedThirdPartyPattern],
    ["system-language", systemLanguagePattern],
    ["mood-only-language", moodOnlyPattern],
    ["unsupported-claim", unsupportedClaimPattern],
    ["precise-commercial-promise", precisePromisePattern],
    ["legal-or-accessibility-promise", legalPromisePattern],
    ["inconsistent-brand", inconsistentBrandPattern],
  ]) {
    if (pattern.test(value)) addIssue(issues, route, `${category}.${issueCategory}`);
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
  const visibleText = value.replaceAll(/<[^>]+>/gu, " ").replaceAll(/\s+/gu, " ").trim();
  validateCustomerLanguage(visibleText, issues, route, "copy");
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
    if (typeof entry.exact_name === "string" && typeof entry.exact_approved_wording === "string" &&
        !entry.exact_approved_wording.toLocaleLowerCase("en-US").includes(entry.exact_name.toLocaleLowerCase("en-US"))) {
      addIssue(issues, route, "exception.wording-name-parity");
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
