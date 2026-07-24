import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CUSTOMER_LANGUAGE_COMPANY_INVENTORY,
  REQUIRED_RENDERED_ROUTE_CATEGORIES,
  REQUIRED_STOREFRONT_SEARCH_EXPECTATIONS,
  approvedCustomerCopyLanguageIssues,
  customerLanguageCompanyMatches,
  customerLanguageIssueCategories,
  exactCustomerLanguageCompanyName,
  validateLaunchPagesContract,
  validateMandatoryNameExceptions,
  validateStorefrontSearchExpectations,
} from "./lib/launch-content-contracts.mjs";
import { runtimeCustomerLanguageCategories } from "./check-customer-facing-copy.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(appRoot, relativePath), "utf8"));
const launchPages = readJson("content/launch-pages.v1.json");
const approvedCopy = readJson("content/approved-customer-copy.json");
const exceptions = readJson("content/mandatory-name-exceptions.v1.json");
const productFacts = readJson("content/product-facts.v3.json");
const searchExpectations = readJson("content/storefront-search-expectations.v1.json");

function launchReadyCopies() {
  const pages = structuredClone(launchPages);
  pages.status = "applied-readback-verified";
  pages.lifecycle.application_status = "applied";
  pages.lifecycle.readback_status = "verified";

  const register = structuredClone(exceptions);
  register.status = "reviewed";
  register.rendered_review = {
    status: "reviewed",
    reviewer: "Accountable reviewer",
    review_date: "2026-07-19",
    reviewed_route_categories: [...REQUIRED_RENDERED_ROUTE_CATEGORIES],
  };
  return { pages, register };
}

test("pending source contracts pass integrity but remain fail-closed at launch", () => {
  assert.deepEqual(validateLaunchPagesContract(launchPages).issues, []);
  assert.deepEqual(validateMandatoryNameExceptions(exceptions).issues, []);
  assert.deepEqual(validateStorefrontSearchExpectations(searchExpectations, {
    productFactsRevision: productFacts.revision,
  }).issues, []);
  assert.ok(validateLaunchPagesContract(launchPages, { requireLaunchReady: true }).issues.length > 0);
  assert.ok(validateMandatoryNameExceptions(exceptions, { requireLaunchReady: true }).issues.length > 0);
});

test("approved customer copy applies shared language policy to every visible copy group", () => {
  assert.deepEqual(approvedCustomerCopyLanguageIssues(approvedCopy), []);

  const candidate = structuredClone(approvedCopy);
  candidate.pages[0].bodyHtml += `<p>${["Shop", "ify"].join("-")} platform details.</p>`;
  candidate.collections[0].description = "A calm skincare escape.";
  candidate.products[0].copy.description = "Treats acne. Repairs skin.";
  const categories = approvedCustomerCopyLanguageIssues(candidate).map((issue) => issue.category);
  assert.ok(categories.includes("third-party-name"));
  assert.ok(categories.includes("system-language"));
  assert.ok(categories.includes("mood-only-language"));
  assert.ok(categories.includes("unsupported-claim"));
});

test("search expectations pin spelling, typo, and cleansing discovery to reviewed sets", () => {
  assert.deepEqual(
    new Map(searchExpectations.queries.map((item) => [item.query, item.expected_handles])),
    REQUIRED_STOREFRONT_SEARCH_EXPECTATIONS,
  );
  const candidate = structuredClone(searchExpectations);
  candidate.queries.find((item) => item.query === "moisturizer").expected_handles = [
    "retinol-alternative-moisturiser",
  ];
  candidate.queries.find((item) => item.query === "cleanser").expected_handles = [
    "sensitive-face-body-cleanser",
  ];
  const categories = validateStorefrontSearchExpectations(candidate, {
    productFactsRevision: productFacts.revision,
  }).issues.map((issue) => issue.category);
  assert.equal(categories.filter((category) => category === "query.expected-handles").length, 2);
});

test("applied readback and complete rendered-route review satisfy the launch gate", () => {
  const { pages, register } = launchReadyCopies();
  assert.deepEqual(validateLaunchPagesContract(pages, { requireLaunchReady: true }).issues, []);
  assert.deepEqual(validateMandatoryNameExceptions(register, { requireLaunchReady: true }).issues, []);
});

test("page copy rejects named third-party and customer-facing system language without echoing it", () => {
  const candidate = structuredClone(launchPages);
  const thirdPartyName = ["shop", "ify"].join("");
  candidate.pages[0].body_html += `<p>${thirdPartyName} platform details.</p>`;
  const categories = validateLaunchPagesContract(candidate).issues.map((issue) => issue.category);
  assert.ok(categories.includes("copy.third-party-name"));
  assert.ok(categories.includes("copy.system-language"));
});

test("page copy normalizes accented and separated provider names and broader system terms", () => {
  const candidate = structuredClone(launchPages);
  const separatedPartner = ["Self", "Named"].join("-");
  const accentedBrand = ["MÁ", "DARA"].join("");
  candidate.pages[0].body_html += `<p>${separatedPartner} manu·facturer a-p-p details and ${accentedBrand} pro·vider notes.</p>`;
  const categories = validateLaunchPagesContract(candidate).issues.map((issue) => issue.category);
  assert.ok(categories.includes("copy.third-party-name"));
  assert.ok(categories.includes("copy.system-language"));
});

test("customer-language normalization closes separator bypasses and reports categories only", () => {
  const privateMarker = "ConfidentialRef42";
  const candidate = structuredClone(launchPages);
  candidate.pages[0].body_html += [
    "<p>",
    privateMarker,
    " Kla·viyo plat·form back·end notes describe a se·rene ri­tual that re·pairs skin and is cli­nically proven.",
    "</p>",
  ].join("");
  const issues = validateLaunchPagesContract(candidate).issues;
  const categories = issues.map((issue) => issue.category);
  assert.ok(categories.includes("copy.third-party-name"));
  assert.ok(categories.includes("copy.system-language"));
  assert.ok(categories.includes("copy.mood-only-language"));
  assert.ok(categories.includes("copy.unsupported-claim"));
  assert.ok(!JSON.stringify(issues).includes(privateMarker));
});

test("customer-language normalization decodes HTML references and rejects unknown entities", () => {
  assert.ok(customerLanguageIssueCategories("S&#101;lfnamed catalog").includes("third-party-name"));
  assert.ok(customerLanguageIssueCategories("Shop&#x69;fy platform").includes("third-party-name"));
  assert.ok(customerLanguageIssueCategories("A cal&#109; escape").includes("mood-only-language"));
  assert.ok(customerLanguageIssueCategories("Back&#x65;nd status").includes("system-language"));
  assert.ok(customerLanguageIssueCategories("S&shy;elfnamed catalog").includes("third-party-name"));
  assert.ok(customerLanguageIssueCategories("Unknown &concealedcopy; reference").includes("unresolved-html-entity"));
  assert.ok(customerLanguageIssueCategories("Invalid &#x110000; reference").includes("unresolved-html-entity"));

  assert.equal(
    customerLanguageIssueCategories("Mochirii&#32;Cosmetics skincare").includes("inconsistent-brand"),
    false,
  );
  for (const candidate of [
    "Mochirii&#45;Cosmetics",
    "M&#333;chirii Cosmetics",
    "Mochirii&shy;Cosmetics",
  ]) {
    assert.equal(
      customerLanguageIssueCategories(candidate).includes("inconsistent-brand"),
      true,
      candidate,
    );
  }
});

test("customer-language policy joins inline markup and comments as rendered", () => {
  const candidate = structuredClone(approvedCopy);
  candidate.pages[0].bodyHtml += [
    "<p>Shop<em>ify</em> details.</p>",
    "<p>cal<!-- presentation split -->m escape.</p>",
    "<p>back<strong>end</strong> status.</p>",
    "<p>Mochirii<em>-</em>Cosmetics.</p>",
  ].join("");
  const categories = approvedCustomerCopyLanguageIssues(candidate).map((issue) => issue.category);
  assert.ok(categories.includes("third-party-name"));
  assert.ok(categories.includes("system-language"));
  assert.ok(categories.includes("mood-only-language"));
  assert.ok(categories.includes("inconsistent-brand"));
});

test("customer-language company inventory covers project and commerce providers", () => {
  const inventoryNames = new Set(CUSTOMER_LANGUAGE_COMPANY_INVENTORY.map((entry) => entry.name));
  for (const requiredName of [
    ["Self", "named"].join(""),
    "Shopify",
    ["MÁ", "DARA"].join(""),
    "The Ordinary",
    "Klaviyo",
    "Google",
    "PayPal",
    "FedEx",
    "GitHub",
    "Vercel",
    "Supabase",
  ]) {
    assert.ok(inventoryNames.has(requiredName), `missing company inventory entry: ${requiredName}`);
  }
  assert.deepEqual(
    customerLanguageIssueCategories("Kla·viyo, Goo\u200bgle, Pay-Pal, The Ordi·nary, and Git·Hub."),
    ["third-party-name"],
  );
  const partnerName = CUSTOMER_LANGUAGE_COMPANY_INVENTORY[0].name;
  assert.deepEqual(customerLanguageCompanyMatches(`Label text includes ${partnerName}.`), [partnerName]);
  assert.equal(exactCustomerLanguageCompanyName(CUSTOMER_LANGUAGE_COMPANY_INVENTORY[0].aliases[0]), partnerName);
  assert.equal(exactCustomerLanguageCompanyName(`Required ${partnerName} wording`), null);
});

test("commerce wordmark policy allows only the exact Mochirii Cosmetics spelling", () => {
  assert.equal(customerLanguageIssueCategories("Mochirii Cosmetics skincare").includes("inconsistent-brand"), false);
  for (const candidate of [
    "mochirii cosmetics",
    "Mo\u0304chirii Cosmetics",
    "Mochirii-Cosmetics",
    "Mochirii Cosmetics and mochirii cosmetics",
  ]) {
    assert.equal(
      customerLanguageIssueCategories(candidate).includes("inconsistent-brand"),
      true,
      candidate,
    );
  }
});

test("runtime copy guard consumes the shared policy without scanning internal theme syntax", () => {
  assert.deepEqual(
    runtimeCustomerLanguageCategories(
      "sections/example.liquid",
      "{% assign visible_copy = 'Kla·viyo plat·form se·rene re·pairs skin.' %}<p>{{ visible_copy }}</p>",
    ),
    ["third-party-name", "system-language", "mood-only-language", "unsupported-claim"],
  );
  assert.deepEqual(
    runtimeCustomerLanguageCategories(
      "templates/gift_card.liquid",
      "{% unless encoded_url contains '%5C' %}<script src=\"{{ 'vendor/qrcode.js' | shopify_asset_url }}\"></script>{% endunless %}",
    ),
    [],
  );
  assert.deepEqual(
    runtimeCustomerLanguageCategories(
      "assets/example.js",
      "if (event.key !== 'Escape') return; const message = `${variantName}`;",
    ),
    [],
  );
  assert.deepEqual(
    runtimeCustomerLanguageCategories(
      "sections/example.liquid",
      "{% assign catalog = collections['mochirii-cosmetics'] %}<p>Shop skincare</p>",
    ),
    [],
  );
  assert.deepEqual(
    runtimeCustomerLanguageCategories(
      "sections/example.liquid",
      "<p>Mochirii-Cosmetics skincare</p>",
    ),
    ["inconsistent-brand"],
  );
  assert.deepEqual(
    runtimeCustomerLanguageCategories(
      "sections/example.liquid",
      "<p>Shop<em>ify</em> cal<!-- split -->m back<strong>end</strong>.</p>",
    ),
    ["third-party-name", "system-language", "mood-only-language"],
  );
});

test("page copy rejects precise shipping or return promises", () => {
  const candidate = structuredClone(launchPages);
  candidate.pages[0].body_html += "<p>Delivery is guaranteed in 3 business days.</p>";
  const categories = validateLaunchPagesContract(candidate).issues.map((issue) => issue.category);
  assert.ok(categories.includes("copy.precise-commercial-promise"));
});

test("FAQ uses Shopify policy routes and rejects legacy page-route substitutes", () => {
  const faq = launchPages.pages.find((page) => page.handle === "faq");
  assert.ok(faq.body_html.includes('href="/policies/shipping-policy"'));
  assert.ok(faq.body_html.includes('href="/policies/refund-policy"'));

  const candidate = structuredClone(launchPages);
  candidate.pages.find((page) => page.handle === "faq").body_html = faq.body_html
    .replace("/policies/shipping-policy", "/pages/shipping")
    .replace("/policies/refund-policy", "/pages/returns");
  const categories = validateLaunchPagesContract(candidate).issues.map((issue) => issue.category);
  assert.ok(categories.includes("body_html.link-route"));
  assert.ok(categories.includes("body_html.required-policy-route"));
});

test("exception entries require the exact mandatory-only review fields", () => {
  const { register } = launchReadyCopies();
  register.entries.push({
    surface: "Package panel",
    route: "/products/example",
    exact_name: "Required Name",
    legal_or_contractual_reason: "Legal labeling requirement.",
    exact_approved_wording: "Distributed by Required Name",
    reviewer: "Accountable reviewer",
    review_date: "2026-07-19",
  });
  assert.deepEqual(validateMandatoryNameExceptions(register, { requireLaunchReady: true }).issues, []);
  delete register.entries[0].exact_approved_wording;
  assert.ok(validateMandatoryNameExceptions(register).issues.some((issue) => issue.category === "exception.keys"));
});

test("exception names require canonical known-company spelling and whole-token approved wording", () => {
  const knownCompany = CUSTOMER_LANGUAGE_COMPANY_INVENTORY.find(
    (entry) => entry.name === ["Shop", "ify"].join(""),
  ).name;
  const entry = {
    surface: "Required disclosure",
    route: "/products/example",
    exact_name: knownCompany,
    legal_or_contractual_reason: "Legal labeling requirement.",
    exact_approved_wording: `Distributed by ${knownCompany}`,
    reviewer: "Accountable reviewer",
    review_date: "2026-07-19",
  };

  const { register } = launchReadyCopies();
  register.entries.push(entry);
  assert.deepEqual(validateMandatoryNameExceptions(register, { requireLaunchReady: true }).issues, []);

  register.entries[0].exact_name = knownCompany.toLocaleLowerCase("en-US");
  register.entries[0].exact_approved_wording = `Distributed by ${knownCompany.toLocaleLowerCase("en-US")}`;
  assert.ok(validateMandatoryNameExceptions(register).issues.some(
    (issue) => issue.category === "exception.exact-name-canonical",
  ));

  register.entries[0].exact_name = knownCompany;
  register.entries[0].exact_approved_wording = `Distributed by ${knownCompany}Plus`;
  assert.ok(validateMandatoryNameExceptions(register).issues.some(
    (issue) => issue.category === "exception.wording-name-parity",
  ));

  register.entries[0].exact_name = "Required Name";
  register.entries[0].exact_approved_wording = "Distributed by Required Name";
  assert.deepEqual(validateMandatoryNameExceptions(register, { requireLaunchReady: true }).issues, []);
});
