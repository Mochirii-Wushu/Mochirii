import assert from "node:assert/strict";
import test from "node:test";
import {
  SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS,
  buildShopifyProductCopyRows,
  serializeShopifyProductCopyRows,
} from "./lib/shopify-product-copy-csv.mjs";

function fixtures() {
  const products = Array.from({ length: 20 }, (_, index) => ({
    identity: {
      handle: `example-product-${index + 1}`,
      title: `Example Product ${index + 1}`,
    },
    copy: {
      description: `Specific public description for example product ${index + 1}.`,
      seoTitle: `Example Product ${index + 1} | Mochirii`,
      seoDescription: `Explore example product ${index + 1} with its ingredients, texture, routine step, directions, and use details.`,
    },
  }));
  return {
    products,
    currentProductIdentities: products.map(({ identity }) => ({
      title: identity.title,
      currentHandle: identity.handle,
      option1Name: "Title",
      option1Value: "Default Title",
    })),
  };
}

test("builds a copy-only contract that preserves exact current option identity", () => {
  const rows = buildShopifyProductCopyRows(fixtures());
  assert.equal(rows.length, 20);
  assert.deepEqual(Object.keys(rows[0]), [...SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS]);
  assert.deepEqual(rows[0], {
    "URL handle": "example-product-1",
    Title: "Example Product 1",
    "Option1 name": "Title",
    "Option1 value": "Default Title",
    Description: "Specific public description for example product 1.",
    "SEO title": "Example Product 1 | Mochirii",
    "SEO description": "Explore example product 1 with its ingredients, texture, routine step, directions, and use details.",
  });
});

test("serializes only the approved public-copy columns", () => {
  const csv = serializeShopifyProductCopyRows(buildShopifyProductCopyRows(fixtures()));
  assert.equal(csv.split("\n")[0], SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS.join(","));
  assert.equal(csv.trimEnd().split("\n").length, 21);
  for (const forbidden of ["Price", "Status", "Inventory", "SKU", "Published"] ) {
    assert.equal(csv.includes(forbidden), false);
  }
});

test("rejects incomplete, duplicate, or unsafe public-copy identity", () => {
  const incomplete = fixtures();
  incomplete.currentProductIdentities.pop();
  assert.throws(() => buildShopifyProductCopyRows(incomplete), /Exactly 20 current product identities/);

  const duplicate = fixtures();
  duplicate.currentProductIdentities[1].currentHandle = duplicate.currentProductIdentities[0].currentHandle;
  assert.throws(() => buildShopifyProductCopyRows(duplicate), /Duplicate product handle/);

  const formula = fixtures();
  formula.currentProductIdentities[0].option1Value = "=HYPERLINK(\"https://example.invalid\")";
  assert.throws(() => buildShopifyProductCopyRows(formula), /spreadsheet formula marker/);
});

test("rejects missing or changed current option identity", () => {
  const missingOption = fixtures();
  missingOption.currentProductIdentities[0].option1Name = "";
  assert.throws(() => buildShopifyProductCopyRows(missingOption), /option1Name/);

  const unmatchedTitle = fixtures();
  unmatchedTitle.currentProductIdentities[0].title = "Different Product";
  assert.throws(() => buildShopifyProductCopyRows(unmatchedTitle), /Missing current product identity/);
});

test("rejects SEO values outside the approved length contract", () => {
  const longTitle = fixtures();
  longTitle.products[0].copy.seoTitle = "x".repeat(60);
  assert.throws(() => buildShopifyProductCopyRows(longTitle), /under 60/);

  const shortDescription = fixtures();
  shortDescription.products[0].copy.seoDescription = "Too short";
  assert.throws(() => buildShopifyProductCopyRows(shortDescription), /70-159/);
});

test("rejects extra columns that could widen a copy-only operation", () => {
  const rows = buildShopifyProductCopyRows(fixtures());
  rows[0].Status = "active";
  assert.throws(
    () => serializeShopifyProductCopyRows(rows),
    /does not match the approved copy-only columns/,
  );
});
