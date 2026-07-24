import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const manifestPath = path.join(process.cwd(), "public/mix-manifest.json");
const vendorPath = path.join(process.cwd(), "public/js/vendor.js");
const vendorLicensePath = path.join(process.cwd(), "public/js/vendor.js.LICENSE.txt");
const vendorKey = "/js/vendor.js";
const suffix = "mochirii-vendor-syntaxfix1";
const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  fail("public/mix-manifest.json does not exist.");
}

if (!fs.existsSync(vendorPath)) {
  fail("public/js/vendor.js does not exist.");
}

if (!fs.existsSync(vendorLicensePath)) {
  fail("public/js/vendor.js.LICENSE.txt does not exist.");
}

const vendorLicense = fs.readFileSync(vendorLicensePath, "utf8");
const normalizedVendorLicense = vendorLicense
  .replace(/\r\n/g, "\n")
  .replace(/[ \t]+$/gm, "");
if (vendorLicense !== normalizedVendorLicense) {
  if (checkOnly) fail("public/js/vendor.js.LICENSE.txt is not normalized.");
  fs.writeFileSync(vendorLicensePath, normalizedVendorLicense);
  console.log("Normalized public/js/vendor.js.LICENSE.txt.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const currentValue = manifest[vendorKey];

if (typeof currentValue !== "string") {
  fail("public/mix-manifest.json is missing /js/vendor.js.");
}

const vendorBytes = fs.readFileSync(vendorPath);
const vendorHash = crypto.createHash("md5").update(vendorBytes).digest("hex");
const expectedValue = `${vendorKey}?id=${vendorHash}-${suffix}`;

if (currentValue === expectedValue) {
  console.log(`Public JS cache bust is current for ${vendorKey}.`);
  process.exit(0);
}

if (checkOnly) {
  fail(
    `Public JS cache bust is stale for ${vendorKey}: expected ${expectedValue}, found ${currentValue}.`,
  );
}

manifest[vendorKey] = expectedValue;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`);
console.log(`Updated public JS cache bust for ${vendorKey}.`);
