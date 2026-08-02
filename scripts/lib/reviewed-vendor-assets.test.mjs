import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertReviewedVendorDecodedDimensions,
  REVIEWED_VENDOR_ASSET_PATHS,
  validatePublicAssetWithReviewedVendorPolicy,
} from "./reviewed-vendor-assets.mjs";

const relativePath = "apps/web/public/assets/social-profiles/facebook-logo-secondary.png";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const bytes = readFileSync(resolve(repositoryRoot, relativePath));
const ordinaryPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("the reviewed-vendor bypass is restricted to the one approved Meta asset", () => {
  assert.deepEqual(REVIEWED_VENDOR_ASSET_PATHS, [relativePath]);
  const result = validatePublicAssetWithReviewedVendorPolicy(relativePath, ".png", bytes);
  const record = result.reviewedVendor;
  assert.equal(record?.width, 2_084);
  assert.equal(record?.height, 2_084);
  assert.equal(record?.byteLength, 47_324);
  assert.equal(record?.mimeType, "image/png");
  assert.equal(record?.exceptionReason, "provider-supplied-physical-resolution");
  assert.equal(Object.isFrozen(record), true);
  assert.throws(() => {
    record.width = 1;
  }, TypeError);
});

test("reviewed-vendor validation rejects byte, type, and path drift", () => {
  const tampered = Buffer.from(bytes);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(
    () => validatePublicAssetWithReviewedVendorPolicy(relativePath, ".png", tampered),
    /SHA-256 drifted/u,
  );
  assert.throws(
    () => validatePublicAssetWithReviewedVendorPolicy(relativePath, ".svg", bytes),
    /path and extension disagree/u,
  );
  assert.throws(
    () => validatePublicAssetWithReviewedVendorPolicy(relativePath, ".png", bytes.subarray(0, -1)),
    /length .* disagrees/u,
  );
  assert.throws(
    () => validatePublicAssetWithReviewedVendorPolicy(relativePath.replace("secondary.png", "secondary-copy.png"), ".png", bytes),
    /PNG: pHYs is duplicate, noncanonical, malformed, or out of order/u,
  );
  assert.throws(
    () => validatePublicAssetWithReviewedVendorPolicy(relativePath.replace("facebook", "Facebook"), ".png", bytes),
    /PNG: pHYs is duplicate, noncanonical, malformed, or out of order/u,
  );
});

test("reviewed-vendor validation rejects noncanonical repository paths", () => {
  for (const path of [
    `/${relativePath}`,
    `C:/${relativePath}`,
    relativePath.replaceAll("/", "\\"),
    relativePath.replace("assets/social-profiles", "assets/./social-profiles"),
    relativePath.replace("assets/social-profiles", "assets/../assets/social-profiles"),
  ]) {
    assert.throws(
      () => validatePublicAssetWithReviewedVendorPolicy(path, ".png", bytes),
      /canonical repository-relative POSIX path|dot segments/u,
    );
  }
});

test("ordinary public PNGs continue through the generic structural validator", () => {
  const result = validatePublicAssetWithReviewedVendorPolicy(
    "apps/web/public/assets/generic-canary.png",
    ".png",
    ordinaryPng,
  );
  assert.equal(result.reviewedVendor, null);
  assert.equal(result.structural.width, 1);
  assert.equal(result.structural.height, 1);
});

test("reviewed-vendor decoded dimensions remain exact and fail closed", () => {
  assert.doesNotThrow(() => assertReviewedVendorDecodedDimensions(relativePath, { width: 2_084, height: 2_084 }));
  assert.throws(
    () => assertReviewedVendorDecodedDimensions(relativePath, { width: 2_085, height: 2_084 }),
    /decoded dimensions .* disagree/u,
  );
  assert.throws(
    () => assertReviewedVendorDecodedDimensions(`${relativePath}.unreviewed`, { width: 2_084, height: 2_084 }),
    /no reviewed vendor asset contract/u,
  );
});
