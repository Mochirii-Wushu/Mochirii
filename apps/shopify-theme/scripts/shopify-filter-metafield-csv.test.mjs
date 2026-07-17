import assert from "node:assert/strict";
import test from "node:test";
import {
  SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS,
  buildShopifyFilterMetafieldRows,
  serializeShopifyFilterMetafieldUpdate,
} from "./lib/shopify-filter-metafield-csv.mjs";

const exampleProducts = () => [
  {
    handle: "example-item-one",
    title: "Example item one",
    option1Name: "Title",
    option1Value: "Default Title",
    concernOptions: ["Dryness", "Dullness"],
    skinTypeOptions: ["Normal", "Dry"],
  },
  {
    handle: "example-item-two",
    title: "Example item two",
    option1Name: "Title",
    option1Value: "Default Title",
    concernOptions: [],
    skinTypeOptions: ["All skin types"],
  },
];

test("builds a minimal filter-metafield update without commerce or internal fields", () => {
  const rows = buildShopifyFilterMetafieldRows(exampleProducts());
  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), [...SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS]);
  assert.equal(
    rows[0]["product.metafields.custom.concern_options"],
    '["Dryness","Dullness"]',
  );
  assert.equal(rows[1]["product.metafields.custom.concern_options"], "[]");
  for (const forbidden of ["SKU", "Price", "Vendor", "Status", "Inventory", "Published"]) {
    assert.equal(SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS.includes(forbidden), false);
  }
});

test("serializes deterministic CSV with Shopify list values quoted", () => {
  const csv = serializeShopifyFilterMetafieldUpdate(
    buildShopifyFilterMetafieldRows(exampleProducts()),
  );
  assert.equal(csv.split("\n")[0], SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS.join(","));
  assert.match(csv, /"\[""Dryness"",""Dullness""\]"/);
  assert.equal(csv.trimEnd().split("\n").length, 3);
});

test("fails closed for ambiguous list values and product identity", () => {
  const ambiguous = exampleProducts();
  ambiguous[0].concernOptions = ["Dryness; sensitivity"];
  assert.throws(
    () => buildShopifyFilterMetafieldRows(ambiguous),
    /Shopify list separator/,
  );

  const duplicate = exampleProducts();
  duplicate[1].handle = duplicate[0].handle;
  assert.throws(
    () => buildShopifyFilterMetafieldRows(duplicate),
    /Duplicate product handle/,
  );

  const formula = exampleProducts();
  formula[0].title = "=HYPERLINK(\"https://example.invalid\")";
  assert.throws(
    () => buildShopifyFilterMetafieldRows(formula),
    /spreadsheet formula marker/,
  );
});

test("rejects row shapes that can widen the provider mutation", () => {
  const [row] = buildShopifyFilterMetafieldRows(exampleProducts());
  assert.throws(
    () => serializeShopifyFilterMetafieldUpdate([{ ...row, Price: "19.99" }]),
    /approved columns/,
  );
});
