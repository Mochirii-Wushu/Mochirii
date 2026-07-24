import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  redactedPriceVerification,
  verifyPrivatePriceLedger,
} from "./lib/private-price-rule.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appRoot, "../..");
const allowedRoot = path.resolve(repositoryRoot, ".artifacts", "operations");
const realAllowedRoot = existsSync(allowedRoot) ? realpathSync(allowedRoot) : null;

function usage() {
  console.log(
    "Usage: node scripts/verify-private-prices.mjs " +
    "--ledger <ignored-private-ledger.json> " +
    "--shopify-readback <ignored-authenticated-readback.json> " +
    "[--report <ignored-redacted-report.json>]",
  );
}

function parseArguments(argv) {
  const parsed = {};
  const names = new Map([
    ["--ledger", "ledger"],
    ["--shopify-readback", "shopifyReadback"],
    ["--report", "report"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" && argv.length === 1) return { help: true };
    const field = names.get(token);
    const value = argv[index + 1];
    if (!field || value === undefined || Object.hasOwn(parsed, field)) {
      throw new Error("invalid-arguments");
    }
    parsed[field] = value;
    index += 1;
  }
  return parsed;
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function resolveIgnoredInput(candidate) {
  if (!realAllowedRoot || typeof candidate !== "string") return null;
  try {
    const resolved = realpathSync(path.resolve(candidate));
    return lstatSync(resolved).isFile() && isInside(resolved, realAllowedRoot) ? resolved : null;
  } catch {
    return null;
  }
}

function resolveIgnoredOutput(candidate) {
  if (!realAllowedRoot || typeof candidate !== "string") return null;
  const absolute = path.resolve(candidate);
  if (existsSync(absolute)) return null;
  try {
    const parent = realpathSync(path.dirname(absolute));
    if (!isInside(parent, realAllowedRoot)) return null;
    const resolved = path.join(parent, path.basename(absolute));
    return isInside(resolved, realAllowedRoot) ? resolved : null;
  } catch {
    return null;
  }
}

function readJson(candidate) {
  return JSON.parse(readFileSync(path.resolve(candidate), "utf8"));
}

function publicProductIdentities() {
  const facts = readJson(path.join(appRoot, "content", "product-facts.v3.json"));
  const approved = readJson(path.join(appRoot, "content", "approved-customer-copy.json"));
  const factsProducts = Array.isArray(facts.products)
    ? facts.products.map((product) => ({ handle: product.handle, title: product.public_title }))
    : [];
  const approvedProducts = Array.isArray(approved.products)
    ? approved.products.map((product) => ({
      handle: product.identity?.handle,
      title: product.identity?.title,
    }))
    : [];
  const normalize = (products) => products
    .map((product) => `${product.handle}\u0000${product.title}`)
    .sort();
  if (factsProducts.length !== 20 || approvedProducts.length !== 20 ||
      new Set(factsProducts.map((product) => product.handle)).size !== 20 ||
      JSON.stringify(normalize(factsProducts)) !== JSON.stringify(normalize(approvedProducts))) {
    throw new Error("public-product-identities");
  }
  return factsProducts;
}

let args;
try {
  args = parseArguments(process.argv.slice(2));
} catch {
  console.error("Private price verification refused: invalid arguments.");
  usage();
  process.exit(2);
}

if (args.help) {
  usage();
  process.exit(0);
}
if (!args.ledger || !args.shopifyReadback) {
  console.error("Private price verification refused: both ignored evidence files are required.");
  usage();
  process.exit(2);
}
const resolvedLedger = resolveIgnoredInput(args.ledger);
const resolvedShopifyReadback = resolveIgnoredInput(args.shopifyReadback);
const resolvedReport = args.report ? resolveIgnoredOutput(args.report) : null;
if (!resolvedLedger || !resolvedShopifyReadback || (args.report && !resolvedReport)) {
  console.error(
    "Private price verification refused: ledger, readback, and report must remain inside " +
    "the ignored operations evidence boundary.",
  );
  process.exit(2);
}

let ledger;
let shopifyReadback;
let expectedProducts;
try {
  ledger = readJson(resolvedLedger);
  shopifyReadback = readJson(resolvedShopifyReadback);
  expectedProducts = publicProductIdentities();
} catch {
  console.error("Private price verification failed: evidence or public identity contracts could not be read.");
  process.exit(1);
}

const result = verifyPrivatePriceLedger(ledger, shopifyReadback, { expectedProducts });
const redacted = redactedPriceVerification(result);
if (args.report) {
  try {
    writeFileSync(resolvedReport, `${JSON.stringify(redacted, null, 2)}\n`, { flag: "wx" });
  } catch {
    console.error("Private price verification failed: the redacted report could not be created.");
    process.exit(1);
  }
}

if (!result.ok) {
  console.error("Private 2.20x price gate failed.");
  for (const failure of redacted.failures) console.error(`- ${failure.category}: ${failure.count}`);
  process.exit(1);
}
console.log(
  `Private 2.20x price gate OK (${redacted.active_variant_count} active variants; ` +
  `ledger capture ${redacted.ledger_captured_at}; authenticated readback capture ` +
  `${redacted.shopify_readback_captured_at}).`,
);
