import assert from "node:assert/strict";
import test from "node:test";
import {
  SHOPIFY_FILTER_METAFIELD_DEFINITIONS,
  SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS,
  buildShopifyFilterMetafieldInputs,
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
    concernOptions: ["Sensitivity"],
    skinTypeOptions: ["All skin types"],
  },
];

const exactTwentyFixtures = () => ({
  manifestProducts: Array.from({ length: 20 }, (_, index) => ({
    title: `Example item ${index + 1}`,
    concerns: ["Dryness", "Dullness"],
    skinTypes: ["Normal", "Dry"],
  })),
  currentHandleProducts: Array.from({ length: 20 }, (_, index) => ({
    title: `Example item ${index + 1}`,
    currentHandle: `example-item-${index + 1}`,
  })),
});

test("builds a minimal filter-metafield update without commerce or internal fields", () => {
  const rows = buildShopifyFilterMetafieldRows(exampleProducts());
  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), [...SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS]);
  assert.equal(
    rows[0]["product.metafields.custom.concern_options"],
    '["Dryness","Dullness"]',
  );
  assert.equal(rows[1]["product.metafields.custom.concern_options"], '["Sensitivity"]');
  for (const forbidden of ["SKU", "Price", "Vendor", "Status", "Inventory", "Published"]) {
    assert.equal(SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS.includes(forbidden), false);
  }
});

test("builds the exact-20 structured list-metafield contract separately from CSV", () => {
  const inputs = buildShopifyFilterMetafieldInputs(exactTwentyFixtures());
  assert.equal(inputs.length, 20);
  assert.deepEqual(SHOPIFY_FILTER_METAFIELD_DEFINITIONS.map(({ key }) => key), [
    "skin_type_options",
    "concern_options",
  ]);
  assert.deepEqual(inputs[0], {
    handle: "example-item-1",
    title: "Example item 1",
    metafields: [
      {
        key: "skin_type_options",
        namespace: "custom",
        type: "list.single_line_text_field",
        value: '["Normal","Dry"]',
      },
      {
        key: "concern_options",
        namespace: "custom",
        type: "list.single_line_text_field",
        value: '["Dryness","Dullness"]',
      },
    ],
  });
});

test("exact-20 structured inputs fail closed for identity and list ambiguity", () => {
  const short = exactTwentyFixtures();
  short.manifestProducts.pop();
  assert.throws(
    () => buildShopifyFilterMetafieldInputs(short),
    /Exactly 20 manifest products/,
  );

  const duplicateHandle = exactTwentyFixtures();
  duplicateHandle.currentHandleProducts[1].currentHandle = "example-item-1";
  assert.throws(
    () => buildShopifyFilterMetafieldInputs(duplicateHandle),
    /Duplicate current Shopify handle/,
  );

  const missingMapping = exactTwentyFixtures();
  missingMapping.currentHandleProducts[0].title = "Unmatched item";
  assert.throws(
    () => buildShopifyFilterMetafieldInputs(missingMapping),
    /Missing current Shopify handle/,
  );

  const emptyList = exactTwentyFixtures();
  emptyList.manifestProducts[0].skinTypes = [];
  assert.throws(
    () => buildShopifyFilterMetafieldInputs(emptyList),
    /must be a non-empty array/,
  );

  const ambiguousList = exactTwentyFixtures();
  ambiguousList.manifestProducts[0].concerns = ["Dryness; sensitivity"];
  assert.throws(
    () => buildShopifyFilterMetafieldInputs(ambiguousList),
    /Shopify list separator/,
  );
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

  const emptyList = exampleProducts();
  emptyList[0].concernOptions = [];
  assert.throws(
    () => buildShopifyFilterMetafieldRows(emptyList),
    /must be a non-empty array/,
  );
});

test("rejects row shapes that can widen the provider mutation", () => {
  const [row] = buildShopifyFilterMetafieldRows(exampleProducts());
  assert.throws(
    () => serializeShopifyFilterMetafieldUpdate([{ ...row, Price: "19.99" }]),
    /approved columns/,
  );
  assert.throws(
    () => serializeShopifyFilterMetafieldUpdate([{ ...row, Title: "@unsafe" }]),
    /spreadsheet formula marker/,
  );
});
