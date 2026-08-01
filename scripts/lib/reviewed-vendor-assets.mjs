import { createHash } from "node:crypto";
import { validateAssetFormat } from "./asset-format-validation.mjs";

const records = [
  Object.freeze({
    relativePath: "apps/web/public/assets/social-profiles/facebook-logo-secondary.png",
    extension: ".png",
    mimeType: "image/png",
    sha256: "EED4F69A017B533E7115397E47B6BA75077D0AF5FB13369C0C5E819694CEEF57",
    byteLength: 47_324,
    width: 2_084,
    height: 2_084,
    exceptionReason: "provider-supplied-physical-resolution",
  }),
];

const recordsByPath = new Map(records.map((record) => [record.relativePath, record]));
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const REVIEWED_VENDOR_ASSET_PATHS = Object.freeze(records.map((record) => record.relativePath));

function assertCanonicalRepositoryPath(relativePath, extension) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.startsWith("/")
    || /^[A-Za-z]:/u.test(relativePath)
    || relativePath.includes("\\")
    || relativePath.includes("//")
  ) {
    throw new Error("public asset path must be a canonical repository-relative POSIX path");
  }

  const segments = relativePath.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error("public asset path must not contain empty or dot segments");
  }
  if (typeof extension !== "string" || !/^\.[a-z0-9]+$/u.test(extension)) {
    throw new Error("public asset extension must be canonical lowercase ASCII");
  }

  const fileName = segments.at(-1);
  const dot = fileName.lastIndexOf(".");
  const pathExtension = dot > 0 ? fileName.slice(dot) : "";
  if (pathExtension !== extension) throw new Error("public asset path and extension disagree");
}

function validateReviewedPngHeader(record, bytes) {
  if (
    bytes.length < 33
    || !bytes.subarray(0, pngSignature.length).equals(pngSignature)
    || bytes.readUInt32BE(8) !== 13
    || bytes.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    throw new Error("reviewed vendor asset does not have the approved PNG header");
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== record.width || height !== record.height) {
    throw new Error(
      `reviewed vendor asset container dimensions ${width}x${height} disagree with `
      + `${record.width}x${record.height}`,
    );
  }
}

function validateReviewedVendorAsset(relativePath, extension, bytes) {
  const record = recordsByPath.get(relativePath);
  if (!record) return null;

  if (extension !== record.extension) {
    throw new Error(`reviewed vendor asset type ${extension || "<none>"} disagrees with ${record.extension}`);
  }
  if (!Buffer.isBuffer(bytes)) throw new TypeError("reviewed vendor asset bytes must be a Buffer");
  if (bytes.length !== record.byteLength) {
    throw new Error(`reviewed vendor asset length ${bytes.length} disagrees with ${record.byteLength}`);
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  if (sha256 !== record.sha256) throw new Error("reviewed vendor asset SHA-256 drifted");

  if (record.extension === ".png") validateReviewedPngHeader(record, bytes);
  return record;
}

export function validatePublicAssetWithReviewedVendorPolicy(relativePath, extension, bytes) {
  assertCanonicalRepositoryPath(relativePath, extension);
  const reviewedVendor = validateReviewedVendorAsset(relativePath, extension, bytes);
  return Object.freeze({
    structural: reviewedVendor ?? validateAssetFormat(extension, bytes),
    reviewedVendor,
  });
}

export function assertReviewedVendorDecodedDimensions(relativePath, decoded) {
  const record = recordsByPath.get(relativePath);
  if (!record) throw new Error(`no reviewed vendor asset contract exists for ${relativePath}`);
  if (decoded.width !== record.width || decoded.height !== record.height) {
    throw new Error(
      `decoded dimensions ${decoded.width}x${decoded.height} disagree with the reviewed vendor asset `
      + `${record.width}x${record.height}`,
    );
  }
}
