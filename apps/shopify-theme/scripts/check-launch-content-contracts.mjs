import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MANDATORY_NAME_EXCEPTION_KEYS,
  summarizeContractIssues,
  validateLaunchPagesContract,
  validateMandatoryNameExceptions,
  validateStorefrontSearchExpectations,
} from "./lib/launch-content-contracts.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(appRoot, relativePath), "utf8"));
const requireLaunchReady = process.argv.includes("--require-launch-ready");

const launchPages = readJson("content/launch-pages.v1.json");
const launchPagesSchema = readJson("content/launch-pages.v1.schema.json");
const exceptions = readJson("content/mandatory-name-exceptions.v1.json");
const exceptionsSchema = readJson("content/mandatory-name-exceptions.v1.schema.json");
const productFacts = readJson("content/product-facts.v3.json");
const searchExpectations = readJson("content/storefront-search-expectations.v1.json");
const searchExpectationsSchema = readJson("content/storefront-search-expectations.v1.schema.json");

const issues = [
  ...validateLaunchPagesContract(launchPages, { requireLaunchReady }).issues,
  ...validateMandatoryNameExceptions(exceptions, { requireLaunchReady }).issues,
  ...validateStorefrontSearchExpectations(searchExpectations, {
    productFactsRevision: productFacts.revision,
  }).issues,
];

const launchPageSchemaText = JSON.stringify(launchPagesSchema.$defs?.page ?? {});
if (launchPagesSchema.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
    launchPagesSchema.$id !== "https://mochirii.com/contracts/launch-pages.v1.schema.json" ||
    launchPagesSchema.properties?.pages?.minItems !== 3 ||
    launchPagesSchema.properties?.pages?.maxItems !== 3 ||
    !launchPageSchemaText.includes("/policies/shipping-policy") ||
    !launchPageSchemaText.includes("/policies/refund-policy")) {
  issues.push({ route: "launch-pages", category: "schema.structure" });
}
const schemaExceptionKeys = Object.keys(exceptionsSchema.$defs?.entry?.properties ?? {}).sort();
if (exceptionsSchema.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
    exceptionsSchema.$id !== "https://mochirii.com/contracts/mandatory-name-exceptions.v1.schema.json" ||
    JSON.stringify(schemaExceptionKeys) !== JSON.stringify([...MANDATORY_NAME_EXCEPTION_KEYS].sort())) {
  issues.push({ route: "name-exceptions", category: "schema.structure" });
}
if (searchExpectationsSchema.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
    searchExpectationsSchema.$id !==
      "https://mochirii.com/contracts/storefront-search-expectations.v1.schema.json" ||
    searchExpectationsSchema.properties?.queries?.minItems !== 6 ||
    searchExpectationsSchema.properties?.queries?.maxItems !== 6) {
  issues.push({ route: "search-expectations", category: "schema.structure" });
}

if (!readFileSync(path.join(appRoot, ".shopifyignore"), "utf8").split(/\r?\n/u).includes("content/**")) {
  issues.push({ route: "theme-package", category: "content-exclusion.missing" });
}

if (issues.length > 0) {
  console.error(requireLaunchReady ? "Customer-facing launch gate failed." : "Launch-content contract check failed.");
  for (const { route, category, count } of summarizeContractIssues(issues)) {
    console.error(`- route=${route} category=${category} count=${count}`);
  }
  process.exit(1);
}

if (requireLaunchReady) {
  console.log("Customer-facing launch gate OK (three pages applied and read back; mandatory-name review complete). ");
} else {
  console.log("Launch-content contract integrity OK (three pages and six reviewed search expectations prepared; provider authority absent; mandatory-name review pending). ");
}
