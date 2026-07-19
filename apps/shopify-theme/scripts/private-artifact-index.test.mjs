import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import {
  PRIVATE_ARTIFACT_INDEX_POLICY,
  privateArtifactBindingKey,
  validatePrivateArtifactIndex,
} from "./lib/private-artifact-index.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appRoot, "../..");
const allowedRoot = path.join(repositoryRoot, ".artifacts", "operations");
mkdirSync(allowedRoot, { recursive: true });

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
}

function canonicalJsonSha(buffer) {
  return sha256(Buffer.from(JSON.stringify(canonicalJson(JSON.parse(buffer.toString("utf8")))), "utf8"));
}

function asRepositoryPath(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).split(path.sep).join("/");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function pngFixture(label, { width = 600, height = 600, blank = false } = {}) {
  const seed = createHash("sha256").update(label).digest().subarray(0, 3);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const rowLength = 1 + (width * 3);
  const pixels = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * rowLength;
    pixels[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + (x * 3);
      pixels[pixelOffset] = blank ? 255 : (x + seed[0]) % 256;
      pixels[pixelOffset + 1] = blank ? 255 : (y + seed[1]) % 256;
      pixels[pixelOffset + 2] = blank ? 255 : (x + y + seed[2]) % 256;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function withFixture(callback) {
  const directory = mkdtempSync(path.join(allowedRoot, "private-artifact-index-test-"));
  const relativeDirectory = asRepositoryPath(directory);
  const absoluteById = new Map();
  const addArtifact = (artifactId, filename, contentType, value) => {
    const absolutePath = path.join(directory, filename);
    const buffer = Buffer.isBuffer(value) ? value : Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    writeFileSync(absolutePath, buffer);
    absoluteById.set(artifactId, absolutePath);
    const hashMode = contentType === "application/json" ? "canonical-json-v1" : "raw-bytes";
    return {
      artifact_id: artifactId,
      artifact_path: asRepositoryPath(absolutePath),
      hash_mode: hashMode,
      sha256: hashMode === "canonical-json-v1" ? canonicalJsonSha(buffer) : sha256(buffer),
      size_bytes: buffer.length,
      content_type: contentType,
    };
  };
  const artifacts = [
    addArtifact("product-formula", "product-formula.json", "application/json", {
      formula_identity: "synthetic-formula-identity",
      revision: 1,
    }),
    addArtifact("product-front", "product-front.png", "image/png", pngFixture("product-front")),
    addArtifact("product-front-ocr", "product-front-ocr.json", "application/json", {
      role: "front",
      text: "Synthetic decoded label text that must remain private.",
    }),
    addArtifact("product-label-media-review", "product-label-media-review.json", "application/json", {
      decision: "pass",
      reviewed_surfaces: ["front", "media"],
    }),
    addArtifact("pricing-auth", "pricing-auth.png", "image/png", pngFixture("pricing-auth")),
    addArtifact("pricing-account-plan", "pricing-account-plan.json", "application/json", {
      authenticated: true,
      plan_scope: "synthetic-connected-plan",
    }),
    addArtifact("pricing-snapshot", "pricing-snapshot.json", "application/json", {
      currency: "USD",
      market: "US",
      records: [],
    }),
    addArtifact("provider-surface-readback", "provider-surface-readback.json", "application/json", {
      record_type: "mochirii-private-provider-surface-readback",
      schema_version: 1,
    }),
    addArtifact("mandatory-name-home", "mandatory-name-home.json", "application/json", {
      record_type: "mochirii-private-rendered-body-scan",
      category: "home",
    }),
  ];
  const productIdentity = {
    scope: "product",
    handle: "example-product",
  };
  const bindings = [
    {
      ...productIdentity,
      field: "formula_record_sha256",
      role: null,
      public_reference: null,
      artifact_id: "product-formula",
    },
    {
      ...productIdentity,
      field: "front_label_sha256",
      role: null,
      public_reference: null,
      artifact_id: "product-front",
    },
    {
      ...productIdentity,
      field: "media_records.artifact_sha256",
      role: "front",
      public_reference: "/products/example-product-front.webp",
      artifact_id: "product-front",
    },
    {
      ...productIdentity,
      field: "media_records.ocr_output_sha256",
      role: "front",
      public_reference: "/products/example-product-front.webp",
      artifact_id: "product-front-ocr",
    },
    {
      ...productIdentity,
      field: "label_media_review_record_sha256",
      role: null,
      public_reference: null,
      artifact_id: "product-label-media-review",
    },
    ...[
      ["authentication_evidence_sha256", "pricing-auth"],
      ["connected_account_plan_record_sha256", "pricing-account-plan"],
      ["snapshot_sha256", "pricing-snapshot"],
    ].map(([field, artifactId]) => ({
      scope: "pricing",
      handle: null,
      field,
      role: null,
      public_reference: null,
      artifact_id: artifactId,
    })),
    {
      scope: "provider-surface",
      handle: null,
      field: "readback_sha256",
      role: null,
      public_reference: null,
      artifact_id: "provider-surface-readback",
    },
    {
      scope: "mandatory-name",
      handle: "home",
      field: "scan_sha256",
      role: null,
      public_reference: null,
      artifact_id: "mandatory-name-home",
    },
  ];
  const evidencePath = path.join(directory, "artifact-index-evidence-envelope.json");
  writeFileSync(evidencePath, `${JSON.stringify({ evidence_kind: "artifact-index" }, null, 2)}\n`);
  const index = { schema_version: 1, artifacts, bindings };
  const validate = (candidate = index, overrides = {}) => validatePrivateArtifactIndex(candidate, {
    repositoryRoot,
    allowedRoot,
    evidencePaths: [asRepositoryPath(evidencePath)],
    ...overrides,
  });
  try {
    callback({
      absoluteById,
      directory,
      evidencePath,
      index,
      relativeDirectory,
      validate,
    });
  } finally {
    const resolvedAllowed = path.resolve(allowedRoot);
    const resolvedDirectory = path.resolve(directory);
    assert.equal(resolvedDirectory.startsWith(`${resolvedAllowed}${path.sep}`), true);
    rmSync(resolvedDirectory, { recursive: true, force: true });
  }
}

test("validates real ignored artifacts and resolves exact private bindings", () => {
  withFixture(({ index, validate }) => {
    assert.equal(
      PRIVATE_ARTIFACT_INDEX_POLICY.product_fields.includes("shipping_mapping_record_sha256"),
      true,
    );
    assert.deepEqual(PRIVATE_ARTIFACT_INDEX_POLICY.provider_surface_fields, ["readback_sha256"]);
    assert.deepEqual(PRIVATE_ARTIFACT_INDEX_POLICY.mandatory_name_fields, ["scan_sha256"]);
    const result = validate();
    assert.equal(result.ok, true, JSON.stringify(result.issues));
    assert.deepEqual(result.issues, []);
    assert.equal(result.artifact_count, 9);
    assert.equal(result.binding_count, 10);
    const frontQuery = {
      scope: "product",
      handle: "example-product",
      field: "front_label_sha256",
      role: null,
      public_reference: null,
    };
    const mediaQuery = {
      scope: "product",
      handle: "example-product",
      field: "media_records.artifact_sha256",
      role: "front",
      public_reference: "/products/example-product-front.webp",
    };
    assert.equal(privateArtifactBindingKey(frontQuery)?.includes("example-product"), true);
    const resolvedFront = result.resolveBinding(frontQuery);
    assert.equal(resolvedFront?.artifact_id, "product-front");
    assert.deepEqual(resolvedFront?.image_metadata, {
      format: "png",
      width: 600,
      height: 600,
      pages: 1,
    });
    assert.deepEqual(Object.keys(resolvedFront.image_metadata).sort(), ["format", "height", "pages", "width"]);
    const serializedFront = JSON.stringify(resolvedFront);
    for (const forbidden of ["entropy", "standard_deviation", "dynamic_range", "decoded label text"]) {
      assert.equal(serializedFront.includes(forbidden), false);
    }
    for (const forbiddenKey of ["buffer", "bytes", "text", "entropy_bits", "standard_deviation", "dynamic_range"]) {
      assert.equal(Object.hasOwn(resolvedFront, forbiddenKey), false);
      assert.equal(Object.hasOwn(resolvedFront.image_metadata, forbiddenKey), false);
    }
    assert.equal(result.resolveBinding(mediaQuery)?.artifact_id, "product-front");
    assert.equal(result.resolveBinding({ ...frontQuery, handle: "different-product" }), null);
    assert.equal(result.resolveBinding({ ...frontQuery, unexpected: true }), null);
    assert.equal(result.resolveBinding(frontQuery)?.sha256, index.artifacts[1].sha256);
    const resolvedOcr = result.resolveBinding({
      scope: "product",
      handle: "example-product",
      field: "media_records.ocr_output_sha256",
      role: "front",
      public_reference: "/products/example-product-front.webp",
    });
    assert.equal(resolvedOcr?.artifact_id, "product-front-ocr");
    assert.equal(resolvedOcr?.image_metadata, undefined);
    assert.equal(JSON.stringify(resolvedOcr).includes("Synthetic decoded label text"), false);
    assert.equal(result.resolveBinding({
      scope: "product",
      handle: "example-product",
      field: "formula_record_sha256",
      role: null,
      public_reference: null,
    })?.image_metadata, undefined);
  });
});

test("rejects duplicate artifact IDs, paths, binding identities, and unbound artifacts", () => {
  withFixture(({ index, validate }) => {
    const duplicateId = structuredClone(index);
    duplicateId.artifacts.push({
      ...duplicateId.artifacts[0],
      artifact_path: duplicateId.artifacts[1].artifact_path,
    });
    let result = validate(duplicateId);
    assert.equal(result.ok, false);
    assert.equal(result.issues.includes("artifact.duplicate-id"), true);
    assert.equal(result.issues.includes("artifact.duplicate-path"), true);

    const duplicateBinding = structuredClone(index);
    duplicateBinding.bindings.push(structuredClone(duplicateBinding.bindings[0]));
    result = validate(duplicateBinding);
    assert.equal(result.issues.includes("binding.duplicate"), true);

    const unbound = structuredClone(index);
    unbound.bindings = unbound.bindings.filter((binding) => binding.artifact_id !== "product-formula");
    result = validate(unbound);
    assert.equal(result.issues.includes("artifact.unbound"), true);
  });
});

test("rejects traversal, backslashes, Git pathspec metacharacters, NTFS alternate streams, reserved names, and absolute paths", () => {
  withFixture(({ index, relativeDirectory, validate }) => {
    const unsafePaths = [
      `${relativeDirectory}/../escape.png`,
      `${relativeDirectory}\\product-front.png`,
      `${relativeDirectory}/product-[front].png`,
      `${relativeDirectory}/product-front.png:private-stream`,
      `${relativeDirectory}/NUL.json`,
      "C:/private/product-front.png",
    ];
    for (const unsafePath of unsafePaths) {
      const candidate = structuredClone(index);
      candidate.artifacts[1].artifact_path = unsafePath;
      const result = validate(candidate);
      assert.equal(result.ok, false);
      assert.equal(result.issues.includes("artifact.path"), true, unsafePath);
      assert.equal(result.resolveBinding({
        scope: "product",
        handle: "example-product",
        field: "front_label_sha256",
        role: null,
        public_reference: null,
      }), null);
    }
  });
});

test("binds hashes and sizes to file bytes while canonical JSON ignores formatting only", () => {
  withFixture(({ absoluteById, index, validate }) => {
    const frontPath = absoluteById.get("product-front");
    writeFileSync(frontPath, pngFixture("mutated-product-front"));
    let result = validate();
    assert.equal(result.issues.includes("artifact.hash-mismatch"), true);

    const restored = pngFixture("product-front");
    writeFileSync(frontPath, restored);
    const sizeMismatch = structuredClone(index);
    sizeMismatch.artifacts.find((artifact) => artifact.artifact_id === "product-front").size_bytes += 1;
    result = validate(sizeMismatch);
    assert.equal(result.issues.includes("artifact.size-mismatch"), true);

    const accountPath = absoluteById.get("pricing-account-plan");
    const accountRecord = JSON.parse(readFileSync(accountPath, "utf8"));
    const compact = Buffer.from(JSON.stringify(accountRecord), "utf8");
    writeFileSync(accountPath, compact);
    const reformatted = structuredClone(index);
    reformatted.artifacts.find((artifact) => artifact.artifact_id === "pricing-account-plan").size_bytes = compact.length;
    result = validate(reformatted);
    assert.equal(result.ok, true, JSON.stringify(result.issues));

    accountRecord.plan_scope = "different-synthetic-plan";
    const changed = Buffer.from(JSON.stringify(accountRecord), "utf8");
    writeFileSync(accountPath, changed);
    reformatted.artifacts.find((artifact) => artifact.artifact_id === "pricing-account-plan").size_bytes = changed.length;
    result = validate(reformatted);
    assert.equal(result.issues.includes("artifact.hash-mismatch"), true);
  });
});

test("rejects declared content mismatches, invalid hash modes, and truncated images", () => {
  withFixture(({ absoluteById, index, validate }) => {
    const wrongContentType = structuredClone(index);
    wrongContentType.artifacts[1].content_type = "application/json";
    let result = validate(wrongContentType);
    assert.equal(result.issues.includes("artifact.content-type"), true);

    const wrongHashMode = structuredClone(index);
    wrongHashMode.artifacts[1].hash_mode = "canonical-json-v1";
    result = validate(wrongHashMode);
    assert.equal(result.issues.includes("artifact.hash-mode"), true);

    const wrongBindingType = structuredClone(index);
    wrongBindingType.bindings.find((binding) => binding.field === "snapshot_sha256").artifact_id = "pricing-auth";
    result = validate(wrongBindingType);
    assert.equal(result.issues.includes("binding.content-type"), true);

    const truncated = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    writeFileSync(absoluteById.get("product-front"), truncated);
    const corruptImage = structuredClone(index);
    const front = corruptImage.artifacts.find((artifact) => artifact.artifact_id === "product-front");
    front.sha256 = sha256(truncated);
    front.size_bytes = truncated.length;
    result = validate(corruptImage);
    assert.equal(result.issues.includes("artifact.content"), true);
  });
});

test("OCR and label-media review bindings require exact fields, JSON content, and identities", () => {
  withFixture(({ index, validate }) => {
    const invalidField = structuredClone(index);
    invalidField.bindings.find((binding) => binding.field === "media_records.ocr_output_sha256").field =
      "media_records.ocr_sha256";
    let result = validate(invalidField);
    assert.equal(result.issues.includes("binding.product-identity"), true);

    const ocrImage = structuredClone(index);
    ocrImage.bindings.find((binding) => binding.field === "media_records.ocr_output_sha256").artifact_id =
      "product-front";
    result = validate(ocrImage);
    assert.equal(result.issues.includes("binding.content-type"), true);

    const reviewImage = structuredClone(index);
    reviewImage.bindings.find((binding) => binding.field === "label_media_review_record_sha256").artifact_id =
      "product-front";
    result = validate(reviewImage);
    assert.equal(result.issues.includes("binding.content-type"), true);

    for (const field of ["role", "public_reference"]) {
      const missingMediaIdentity = structuredClone(index);
      missingMediaIdentity.bindings.find((binding) => binding.field === "media_records.ocr_output_sha256")[field] = null;
      result = validate(missingMediaIdentity);
      assert.equal(result.issues.includes("binding.media-identity"), true, field);
    }

    const reviewWithMediaIdentity = structuredClone(index);
    const reviewBinding = reviewWithMediaIdentity.bindings
      .find((binding) => binding.field === "label_media_review_record_sha256");
    reviewBinding.role = "front";
    reviewBinding.public_reference = "/products/example-product-front.webp";
    result = validate(reviewWithMediaIdentity);
    assert.equal(result.issues.includes("binding.product-identity"), true);
  });
});

test("OCR and label-media review artifacts are exclusive to one binding identity", () => {
  withFixture(({ index, validate }) => {
    const reusedOcr = structuredClone(index);
    reusedOcr.bindings.push({
      scope: "product",
      handle: "example-product",
      field: "media_records.ocr_output_sha256",
      role: "technical-panel",
      public_reference: "/products/example-product-panel.webp",
      artifact_id: "product-front-ocr",
    });
    let result = validate(reusedOcr);
    assert.equal(result.issues.includes("binding.exclusive-artifact-reuse"), true);

    const reusedReview = structuredClone(index);
    reusedReview.bindings.find((binding) => binding.field === "formula_record_sha256").artifact_id =
      "product-label-media-review";
    result = validate(reusedReview);
    assert.equal(result.issues.includes("binding.exclusive-artifact-reuse"), true);

    const crossEvidenceReuse = structuredClone(index);
    crossEvidenceReuse.bindings.find((binding) => binding.field === "label_media_review_record_sha256").artifact_id =
      "product-front-ocr";
    result = validate(crossEvidenceReuse);
    assert.equal(result.issues.includes("binding.exclusive-artifact-reuse"), true);
  });
});

test("rejects tiny and blank decoded image evidence while preserving the injected inspector hook", () => {
  withFixture(({ absoluteById, index, validate }) => {
    const frontPath = absoluteById.get("product-front");
    const frontRecord = (candidate) => candidate.artifacts
      .find((artifact) => artifact.artifact_id === "product-front");
    for (const image of [
      pngFixture("tiny-product-front", { width: 1, height: 1 }),
      pngFixture("blank-product-front", { blank: true }),
    ]) {
      writeFileSync(frontPath, image);
      const candidate = structuredClone(index);
      frontRecord(candidate).sha256 = sha256(image);
      frontRecord(candidate).size_bytes = image.length;
      const result = validate(candidate);
      assert.equal(result.ok, false);
      assert.equal(result.issues.includes("artifact.content"), true);
    }

    const tiny = pngFixture("injected-inspector-fixture", { width: 1, height: 1 });
    writeFileSync(frontPath, tiny);
    const injected = structuredClone(index);
    frontRecord(injected).sha256 = sha256(tiny);
    frontRecord(injected).size_bytes = tiny.length;
    const inspectedContentTypes = [];
    const injectedResult = validate(injected, {
      imageInspector: (contentType, buffer) => {
        inspectedContentTypes.push(contentType);
        return Buffer.isBuffer(buffer) && buffer.length > 0;
      },
    });
    assert.equal(injectedResult.ok, true, JSON.stringify(injectedResult.issues));
    assert.deepEqual(inspectedContentTypes, ["image/png", "image/png"]);

    const multiFrameResult = validate(injected, {
      imageInspector: () => ({ format: "png", width: 600, height: 600, pages: 2 }),
    });
    assert.equal(multiFrameResult.ok, false);
    assert.equal(multiFrameResult.issues.includes("artifact.content"), true);
  });
});

test("rejects final symlinks, tracked paths, unignored paths, and evidence-envelope reuse", (t) => {
  withFixture(({ absoluteById, evidencePath, index, validate }) => {
    const trackedResult = validate(index, {
      gitPathStatus: (relativePath) => ({
        ignored: true,
        tracked: relativePath.endsWith("product-front.png"),
      }),
    });
    assert.equal(trackedResult.issues.includes("artifact.tracked"), true);

    const unignoredResult = validate(index, {
      gitPathStatus: (relativePath) => ({
        ignored: !relativePath.endsWith("product-front.png"),
        tracked: false,
      }),
    });
    assert.equal(unignoredResult.issues.includes("artifact.not-ignored"), true);

    const evidenceReuse = structuredClone(index);
    const formulaArtifact = evidenceReuse.artifacts.find((artifact) => artifact.artifact_id === "product-formula");
    const evidenceBuffer = readFileSync(evidencePath);
    formulaArtifact.artifact_path = asRepositoryPath(evidencePath);
    formulaArtifact.sha256 = canonicalJsonSha(evidenceBuffer);
    formulaArtifact.size_bytes = evidenceBuffer.length;
    const evidenceResult = validate(evidenceReuse);
    assert.equal(evidenceResult.issues.includes("artifact.evidence-file"), true);

    const frontPath = absoluteById.get("product-front");
    try {
      rmSync(frontPath);
      symlinkSync(absoluteById.get("pricing-auth"), frontPath, "file");
    } catch (error) {
      if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        t.skip("The current Windows policy does not permit creating a test symlink.");
        return;
      }
      throw error;
    }
    const symlinkResult = validate();
    assert.equal(symlinkResult.issues.includes("artifact.symlink"), true);
  });
});

test("rejects one artifact reused across scopes, products, or distinct pricing claims", () => {
  withFixture(({ index, validate }) => {
    const pricingReuse = structuredClone(index);
    pricingReuse.bindings.find((binding) => binding.field === "connected_account_plan_record_sha256").artifact_id = "pricing-auth";
    let result = validate(pricingReuse);
    assert.equal(result.issues.includes("binding.pricing-artifact-reuse"), true);

    const crossProduct = structuredClone(index);
    crossProduct.bindings.push({
      scope: "product",
      handle: "another-product",
      field: "media_records.artifact_sha256",
      role: "front",
      public_reference: "/products/another-product-front.webp",
      artifact_id: "product-front",
    });
    result = validate(crossProduct);
    assert.equal(result.issues.includes("binding.artifact-reuse"), true);

    const crossScope = structuredClone(index);
    crossScope.bindings.find((binding) => binding.field === "authentication_evidence_sha256").artifact_id = "product-front";
    result = validate(crossScope);
    assert.equal(result.issues.includes("binding.artifact-reuse"), true);
  });
});

test("issues contain categories only and never echo private index values", () => {
  withFixture(({ index, relativeDirectory, validate }) => {
    const candidate = structuredClone(index);
    candidate.artifacts[1].artifact_path = `${relativeDirectory}/secret-account-value.png:private`;
    candidate.artifacts[1].sha256 = "f".repeat(64);
    candidate.bindings[1].handle = "private-sensitive-product";
    candidate.bindings[2].public_reference = "/products/private-sensitive-reference";
    const result = validate(candidate);
    assert.equal(result.ok, false);
    const serialized = JSON.stringify(result.issues);
    for (const sensitiveValue of [
      "secret-account-value",
      "private-sensitive-product",
      "private-sensitive-reference",
      "f".repeat(64),
      relativeDirectory,
    ]) {
      assert.equal(serialized.includes(sensitiveValue), false);
    }
    assert.equal(result.issues.every((issue) => typeof issue === "string" && /^[a-z-]+(?:\.[a-z-]+)*$/u.test(issue)), true);
  });
});
