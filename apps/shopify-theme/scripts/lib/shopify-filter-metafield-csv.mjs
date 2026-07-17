export const SHOPIFY_FILTER_METAFIELD_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: "skin_type_options",
    namespace: "custom",
    sourceField: "skinTypes",
    rowSourceField: "skinTypeOptions",
    type: "list.single_line_text_field",
  }),
  Object.freeze({
    key: "concern_options",
    namespace: "custom",
    sourceField: "concerns",
    rowSourceField: "concernOptions",
    type: "list.single_line_text_field",
  }),
]);

export const SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS = Object.freeze([
  "URL handle",
  "Title",
  "Option1 name",
  "Option1 value",
  ...SHOPIFY_FILTER_METAFIELD_DEFINITIONS.map(
    ({ key, namespace }) => `product.metafields.${namespace}.${key}`,
  ),
]);

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  if (value.trim() !== value) {
    throw new Error(`${field} must not have outer whitespace`);
  }
  if (/^[=+\-@]/u.test(value)) {
    throw new Error(`${field} cannot begin with a spreadsheet formula marker`);
  }
  return value;
}

function requireList(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array`);
  }
  const items = value.map((item, index) => {
    const text = requireString(item, `${field}[${index}]`);
    if (/[;\r\n]/.test(text)) {
      throw new Error(`${field}[${index}] contains a Shopify list separator`);
    }
    return text;
  });
  if (new Set(items).size !== items.length) {
    throw new Error(`${field} contains duplicate values`);
  }
  return items;
}

function indexUnique(items, key, label) {
  if (!Array.isArray(items)) throw new Error(`${label}s must be an array`);
  const result = new Map();
  for (const item of items) {
    const value = requireString(item?.[key], `${label}.${key}`);
    if (result.has(value)) throw new Error(`Duplicate ${label} ${key}: ${value}`);
    result.set(value, item);
  }
  return result;
}

export function buildShopifyFilterMetafieldInputs({
  manifestProducts,
  currentHandleProducts,
}) {
  if (!Array.isArray(manifestProducts) || manifestProducts.length !== 20) {
    throw new Error("Exactly 20 manifest products are required");
  }
  if (!Array.isArray(currentHandleProducts) || currentHandleProducts.length !== 20) {
    throw new Error("Exactly 20 current-handle products are required");
  }

  const currentHandleByTitle = indexUnique(
    currentHandleProducts,
    "title",
    "current-handle product",
  );
  const seenTitles = new Set();
  const seenHandles = new Set();

  return manifestProducts.map((product) => {
    const title = requireString(product?.title, "manifest product title");
    if (seenTitles.has(title)) throw new Error(`Duplicate manifest product title: ${title}`);
    seenTitles.add(title);

    const current = currentHandleByTitle.get(title);
    if (!current) throw new Error(`Missing current Shopify handle for ${title}`);
    const handle = requireString(current.currentHandle, `${title}.currentHandle`);
    if (seenHandles.has(handle)) throw new Error(`Duplicate current Shopify handle: ${handle}`);
    seenHandles.add(handle);

    return {
      handle,
      title,
      metafields: SHOPIFY_FILTER_METAFIELD_DEFINITIONS.map((definition) => ({
        key: definition.key,
        namespace: definition.namespace,
        type: definition.type,
        value: JSON.stringify(
          requireList(product[definition.sourceField], `${title}.${definition.sourceField}`),
        ),
      })),
    };
  });
}

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/^[=+\-@]/u.test(text)) {
    throw new Error("CSV fields cannot begin with a spreadsheet formula marker");
  }
  if (!/[",\r\n]/.test(text) && text.trim() === text) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildShopifyFilterMetafieldRows(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("At least one product identity is required");
  }

  const seenHandles = new Set();
  return products.map((product, index) => {
    const label = `products[${index}]`;
    const handle = requireString(product?.handle, `${label}.handle`);
    if (seenHandles.has(handle)) throw new Error(`Duplicate product handle: ${handle}`);
    seenHandles.add(handle);

    const row = {
      "URL handle": handle,
      Title: requireString(product.title, `${label}.title`),
      "Option1 name": requireString(product.option1Name, `${label}.option1Name`),
      "Option1 value": requireString(product.option1Value, `${label}.option1Value`),
    };
    for (const definition of SHOPIFY_FILTER_METAFIELD_DEFINITIONS) {
      row[`product.metafields.${definition.namespace}.${definition.key}`] = JSON.stringify(
        requireList(
          product[definition.rowSourceField],
          `${label}.${definition.rowSourceField}`,
        ),
      );
    }
    return row;
  });
}

export function serializeShopifyFilterMetafieldUpdate(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("At least one Shopify filter-metafield row is required");
  }

  const lines = [SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS.join(",")];
  for (const [index, row] of rows.entries()) {
    const keys = Object.keys(row);
    const unknown = keys.filter((key) => !SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS.includes(key));
    const missing = SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS.filter((key) => !keys.includes(key));
    if (unknown.length > 0 || missing.length > 0) {
      throw new Error(
        `CSV row ${index + 2} does not match the approved columns`,
      );
    }
    lines.push(
      SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS
        .map((header) => escapeCsvField(row[header]))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
