import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRODUCT_FACT_KEYS,
  SHOPIFY_PUBLICATION_MAPPING,
  summarizeIssueCodes,
  validateProductFactsContract,
} from "./lib/product-facts-contract.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appRoot, "../..");
const read = (relativePath) => readFileSync(path.join(appRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const requireComplete = process.argv.includes("--require-complete");

const contract = readJson("content/product-facts.v3.json");
const schema = readJson("content/product-facts.v3.schema.json");
const publicCopy = readJson("content/approved-customer-copy.json");
const canonicalEmblemAsset = "apps/web/public/assets/img/brand/emblem.webp";
const storefrontEmblemAsset = "apps/shopify-theme/assets/mochirii-emblem.webp";
const canonicalEmblemSha256 = createHash("sha256")
  .update(readFileSync(path.join(repositoryRoot, canonicalEmblemAsset)))
  .digest("hex");
const storefrontEmblemSha256 = createHash("sha256")
  .update(readFileSync(path.join(repositoryRoot, storefrontEmblemAsset)))
  .digest("hex");

const schemaIssues = [];
if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") schemaIssues.push("schema.dialect");
if (schema.$id !== "https://mochirii.com/contracts/product-facts.v3.schema.json") schemaIssues.push("schema.id");
if (schema.properties?.products?.minItems !== 20 || schema.properties?.products?.maxItems !== 20) {
  schemaIssues.push("schema.exact-count");
}
const schemaFactKeys = Object.keys(schema.$defs?.facts?.properties ?? {}).sort();
if (JSON.stringify(schemaFactKeys) !== JSON.stringify([...PRODUCT_FACT_KEYS].sort())) {
  schemaIssues.push("schema.fact-keys");
}
if (!schema.properties?.shopify_publication ||
    schema.$defs?.shopify_publication?.properties?.schema_version?.const !==
      SHOPIFY_PUBLICATION_MAPPING.schema_version) {
  schemaIssues.push("schema.shopify-publication");
}

const expectedProducts = (publicCopy.products ?? []).map((product) => ({
  handle: product.identity?.handle,
  title: product.identity?.title,
}));
const collectionHandles = (publicCopy.collections ?? []).map((collection) => collection.handle);
const result = validateProductFactsContract(contract, {
  expectedProducts,
  collectionHandles,
  canonicalEmblemAsset,
  canonicalEmblemSha256,
  storefrontEmblemAsset,
  storefrontEmblemSha256,
  requireComplete,
});
const issues = [...schemaIssues, ...result.issues];

if (issues.length > 0) {
  console.error(requireComplete ? "Product-facts launch gate failed." : "Product-facts contract check failed.");
  for (const { category, count } of summarizeIssueCodes(issues)) {
    console.error(`- ${category}: ${count}`);
  }
  process.exit(1);
}

if (requireComplete) {
  console.log("Product-facts launch gate OK (20 evidence-reviewed products; canonical brand mark attested). ");
} else {
  console.log(
    `Product-facts contract integrity OK (${result.summary.total} products; ` +
    `${result.summary.complete} complete, ${result.summary.pending} pending, ${result.summary.blocked} blocked).`,
  );
}
