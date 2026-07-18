export const SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS = Object.freeze([
  "URL handle",
  "Title",
  "Option1 name",
  "Option1 value",
  "Description",
  "SEO title",
  "SEO description",
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

function escapeCsvField(value) {
  const text = requireString(value, "CSV field");
  if (!/[",\r\n]/u.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildShopifyProductCopyRows({ products, currentProductIdentities }) {
  if (!Array.isArray(products) || products.length !== 20) {
    throw new Error("Exactly 20 approved public-copy products are required");
  }
  if (!Array.isArray(currentProductIdentities) || currentProductIdentities.length !== 20) {
    throw new Error("Exactly 20 current product identities from a pre-import export are required");
  }

  const currentByTitle = new Map();
  for (const [index, current] of currentProductIdentities.entries()) {
    const title = requireString(current?.title, `currentProductIdentities[${index}].title`);
    if (currentByTitle.has(title)) throw new Error(`Duplicate current product title: ${title}`);
    currentByTitle.set(title, current);
  }

  const seenHandles = new Set();
  const seenTitles = new Set();
  return products.map((product, index) => {
    const label = `products[${index}]`;
    requireString(product?.identity?.handle, `${label}.identity.handle`);
    const title = requireString(product?.identity?.title, `${label}.identity.title`);
    const current = currentByTitle.get(title);
    if (!current) throw new Error(`Missing current product identity for ${title}`);
    const handle = requireString(current.currentHandle, `${title}.currentHandle`);
    const option1Name = requireString(current.option1Name, `${title}.option1Name`);
    const option1Value = requireString(current.option1Value, `${title}.option1Value`);
    const description = requireString(product?.copy?.description, `${label}.copy.description`);
    const seoTitle = requireString(product?.copy?.seoTitle, `${label}.copy.seoTitle`);
    const seoDescription = requireString(
      product?.copy?.seoDescription,
      `${label}.copy.seoDescription`,
    );

    if (seenHandles.has(handle)) throw new Error(`Duplicate product handle: ${handle}`);
    if (seenTitles.has(title)) throw new Error(`Duplicate product title: ${title}`);
    if (seoTitle.length >= 60) throw new Error(`${label}.copy.seoTitle must be under 60 characters`);
    if (seoDescription.length < 70 || seoDescription.length >= 160) {
      throw new Error(`${label}.copy.seoDescription must contain 70-159 characters`);
    }
    seenHandles.add(handle);
    seenTitles.add(title);

    return {
      "URL handle": handle,
      Title: title,
      "Option1 name": option1Name,
      "Option1 value": option1Value,
      Description: description,
      "SEO title": seoTitle,
      "SEO description": seoDescription,
    };
  });
}

export function serializeShopifyProductCopyRows(rows) {
  if (!Array.isArray(rows) || rows.length !== 20) {
    throw new Error("Exactly 20 Shopify copy rows are required");
  }

  const lines = [SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS.join(",")];
  for (const [index, row] of rows.entries()) {
    const keys = Object.keys(row);
    const unknown = keys.filter((key) => !SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS.includes(key));
    const missing = SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS.filter((key) => !keys.includes(key));
    if (unknown.length > 0 || missing.length > 0) {
      throw new Error(`CSV row ${index + 2} does not match the approved copy-only columns`);
    }
    lines.push(
      SHOPIFY_PRODUCT_COPY_UPDATE_HEADERS.map((header) => escapeCsvField(row[header])).join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
