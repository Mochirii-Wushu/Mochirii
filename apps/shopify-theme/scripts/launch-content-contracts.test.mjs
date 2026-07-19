import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_RENDERED_ROUTE_CATEGORIES,
  validateLaunchPagesContract,
  validateMandatoryNameExceptions,
} from "./lib/launch-content-contracts.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(appRoot, relativePath), "utf8"));
const launchPages = readJson("content/launch-pages.v1.json");
const exceptions = readJson("content/mandatory-name-exceptions.v1.json");

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
  assert.ok(validateLaunchPagesContract(launchPages, { requireLaunchReady: true }).issues.length > 0);
  assert.ok(validateMandatoryNameExceptions(exceptions, { requireLaunchReady: true }).issues.length > 0);
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
