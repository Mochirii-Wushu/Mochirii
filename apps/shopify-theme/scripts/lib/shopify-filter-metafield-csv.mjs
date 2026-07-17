export const SHOPIFY_FILTER_METAFIELD_UPDATE_HEADERS = Object.freeze([
  "URL handle",
  "Title",
  "Option1 name",
  "Option1 value",
  "product.metafields.custom.concern_options",
  "product.metafields.custom.skin_type_options",
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

function serializeList(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
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
  return JSON.stringify(items);
}

function escapeCsvField(value) {
  const text = String(value ?? "");
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

    return {
      "URL handle": handle,
      Title: requireString(product.title, `${label}.title`),
      "Option1 name": requireString(product.option1Name, `${label}.option1Name`),
      "Option1 value": requireString(product.option1Value, `${label}.option1Value`),
      "product.metafields.custom.concern_options": serializeList(
        product.concernOptions,
        `${label}.concernOptions`,
      ),
      "product.metafields.custom.skin_type_options": serializeList(
        product.skinTypeOptions,
        `${label}.skinTypeOptions`,
      ),
    };
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
