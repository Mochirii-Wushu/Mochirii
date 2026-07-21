import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_KEYS = Object.freeze(["schema_version", "artifacts", "bindings"]);
const ARTIFACT_KEYS = Object.freeze([
  "artifact_id",
  "artifact_path",
  "hash_mode",
  "sha256",
  "size_bytes",
  "content_type",
]);
const BINDING_KEYS = Object.freeze([
  "scope",
  "handle",
  "field",
  "role",
  "public_reference",
  "artifact_id",
]);
const BINDING_IDENTITY_KEYS = Object.freeze([
  "scope",
  "handle",
  "field",
  "role",
  "public_reference",
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const HANDLE_PATTERN = SLUG_PATTERN;
const WINDOWS_RESERVED_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const WINDOWS_INVALID_CHARACTER_PATTERN = /[<>:"|?*\[\]\u0000-\u001f]/u;
const MAX_PATH_LENGTH = 1024;
const MAX_ARTIFACT_COUNT = 512;
const MAX_BINDING_COUNT = 1024;
const MAX_ARTIFACT_SIZE_BYTES = 100 * 1024 * 1024;
const MIN_EVIDENCE_IMAGE_DIMENSION = 600;
const MIN_EVIDENCE_IMAGE_ENTROPY_BITS = 0.1;
const MIN_EVIDENCE_IMAGE_STANDARD_DEVIATION = 1;
const MIN_EVIDENCE_IMAGE_DYNAMIC_RANGE = 8;

const PRODUCT_FIELDS = Object.freeze(new Set([
  "formula_record_sha256",
  "front_label_sha256",
  "technical_panel_sha256",
  "outer_box_sha256",
  "media_records.artifact_sha256",
  "media_records.ocr_output_sha256",
  "label_media_review_record_sha256",
  "shipping_mapping_record_sha256",
]));
const MEDIA_IDENTITY_FIELDS = Object.freeze(new Set([
  "media_records.artifact_sha256",
  "media_records.ocr_output_sha256",
]));
const EXCLUSIVE_ARTIFACT_FIELDS = Object.freeze(new Set([
  "media_records.ocr_output_sha256",
  "label_media_review_record_sha256",
  "shipping_mapping_record_sha256",
]));
const PRICING_FIELDS = Object.freeze(new Set([
  "authentication_evidence_sha256",
  "connected_account_plan_record_sha256",
  "snapshot_sha256",
]));
const PROVIDER_SURFACE_FIELDS = Object.freeze(new Set(["readback_sha256"]));
const MANDATORY_NAME_FIELDS = Object.freeze(new Set(["scan_sha256"]));

const IMAGE_CONTENT_TYPES = Object.freeze(new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
]));
const LABEL_CONTENT_TYPES = IMAGE_CONTENT_TYPES;
const PRICING_EVIDENCE_CONTENT_TYPES = Object.freeze(new Set([
  ...IMAGE_CONTENT_TYPES,
  "application/json",
]));

const CONTENT_TYPES = Object.freeze({
  "application/json": Object.freeze({ extensions: [".json"], hashMode: "canonical-json-v1" }),
  "image/png": Object.freeze({ extensions: [".png"], hashMode: "raw-bytes" }),
  "image/jpeg": Object.freeze({ extensions: [".jpg", ".jpeg"], hashMode: "raw-bytes" }),
  "image/webp": Object.freeze({ extensions: [".webp"], hashMode: "raw-bytes" }),
  "image/avif": Object.freeze({ extensions: [".avif"], hashMode: "raw-bytes" }),
});

const IMAGE_INSPECTOR_PATH = fileURLToPath(new URL("image-artifact-inspector.mjs", import.meta.url));
const IMAGE_FORMAT_BY_CONTENT_TYPE = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
  "image/avif": "heif",
});

export const PRIVATE_ARTIFACT_INDEX_POLICY = Object.freeze({
  schema_version: 1,
  maximum_artifact_count: MAX_ARTIFACT_COUNT,
  maximum_binding_count: MAX_BINDING_COUNT,
  maximum_artifact_size_bytes: MAX_ARTIFACT_SIZE_BYTES,
  product_fields: Object.freeze([...PRODUCT_FIELDS]),
  pricing_fields: Object.freeze([...PRICING_FIELDS]),
  provider_surface_fields: Object.freeze([...PROVIDER_SURFACE_FIELDS]),
  mandatory_name_fields: Object.freeze([...MANDATORY_NAME_FIELDS]),
});

function exactKeys(value, expected) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function add(issues, category) {
  issues.push(category);
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function fileIdentity(candidate) {
  const normalized = path.normalize(candidate);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
}

function canonicalJsonDigest(buffer) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  const value = JSON.parse(text);
  return digest(Buffer.from(JSON.stringify(canonicalJson(value)), "utf8"));
}

function validPublicReference(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 2048 &&
    value.trim() === value && !/[\u0000-\u001f\u007f]/u.test(value);
}

function safeArtifactPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PATH_LENGTH ||
      value.trim() !== value || value.includes("\\") || path.posix.isAbsolute(value) ||
      path.posix.normalize(value) !== value || !value.startsWith(".artifacts/operations/")) {
    return false;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === ".." ||
      segment.trim() !== segment || segment.endsWith(".") || segment.endsWith(" ") ||
      WINDOWS_INVALID_CHARACTER_PATTERN.test(segment) || WINDOWS_RESERVED_NAME_PATTERN.test(segment))) {
    return false;
  }
  return true;
}

function containsSymbolicLink(repositoryRoot, absolutePath) {
  const relative = path.relative(repositoryRoot, absolutePath);
  if (!isInside(absolutePath, repositoryRoot) || relative === "") return true;
  let cursor = repositoryRoot;
  for (const segment of relative.split(path.sep)) {
    cursor = path.join(cursor, segment);
    if (lstatSync(cursor).isSymbolicLink()) return true;
  }
  return false;
}

function defaultGitPathStatus(repositoryRoot, repositoryRelativePath) {
  const run = (args) => spawnSync("git", ["-C", repositoryRoot, ...args], {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "ignore", "ignore"],
  });
  const tracked = run(["ls-files", "--error-unmatch", "--", repositoryRelativePath]);
  const ignored = run(["check-ignore", "-q", "--no-index", "--", repositoryRelativePath]);
  if (![0, 1].includes(tracked.status) || ![0, 1].includes(ignored.status)) {
    throw new Error("git-path-status");
  }
  return { tracked: tracked.status === 0, ignored: ignored.status === 0 };
}

function defaultImageInspector(contentType, buffer) {
  const inspection = spawnSync(process.execPath, [IMAGE_INSPECTOR_PATH], {
    input: buffer,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 16 * 1024,
    stdio: ["pipe", "pipe", "ignore"],
  });
  if (inspection.status !== 0 || inspection.signal || inspection.error) return false;
  try {
    const result = JSON.parse(inspection.stdout);
    const valid = result.format === IMAGE_FORMAT_BY_CONTENT_TYPE[contentType] &&
      Number.isSafeInteger(result.width) && result.width >= MIN_EVIDENCE_IMAGE_DIMENSION &&
      Number.isSafeInteger(result.height) && result.height >= MIN_EVIDENCE_IMAGE_DIMENSION &&
      Number.isSafeInteger(result.pages) && result.pages === 1 &&
      Number.isFinite(result.entropy_bits) && result.entropy_bits >= MIN_EVIDENCE_IMAGE_ENTROPY_BITS &&
      Number.isFinite(result.standard_deviation) &&
      result.standard_deviation >= MIN_EVIDENCE_IMAGE_STANDARD_DEVIATION &&
      Number.isSafeInteger(result.dynamic_range) && result.dynamic_range >= MIN_EVIDENCE_IMAGE_DYNAMIC_RANGE;
    return valid ? Object.freeze({
      format: result.format,
      width: result.width,
      height: result.height,
      pages: result.pages,
    }) : false;
  } catch {
    return false;
  }
}

function inspectContent(contentType, buffer, imageInspector) {
  if (contentType === "application/json") {
    try {
      canonicalJsonDigest(buffer);
      return Object.freeze({ imageMetadata: null });
    } catch {
      return null;
    }
  }
  if (!IMAGE_CONTENT_TYPES.has(contentType)) return null;
  const inspection = imageInspector(contentType, buffer);
  if (inspection === true) return Object.freeze({ imageMetadata: null });
  if (!exactKeys(inspection, ["format", "width", "height", "pages"]) ||
      inspection.format !== IMAGE_FORMAT_BY_CONTENT_TYPE[contentType] ||
      !Number.isSafeInteger(inspection.width) || inspection.width < MIN_EVIDENCE_IMAGE_DIMENSION ||
      !Number.isSafeInteger(inspection.height) || inspection.height < MIN_EVIDENCE_IMAGE_DIMENSION ||
      !Number.isSafeInteger(inspection.pages) || inspection.pages !== 1) {
    return null;
  }
  return Object.freeze({
    imageMetadata: Object.freeze({
      format: inspection.format,
      width: inspection.width,
      height: inspection.height,
      pages: inspection.pages,
    }),
  });
}

function contentTypeSupportsBinding(contentType, binding) {
  if (binding.scope === "product") {
    if ([
      "formula_record_sha256",
      "media_records.ocr_output_sha256",
      "label_media_review_record_sha256",
      "shipping_mapping_record_sha256",
    ].includes(binding.field)) return contentType === "application/json";
    if (binding.field === "media_records.artifact_sha256") return IMAGE_CONTENT_TYPES.has(contentType);
    return LABEL_CONTENT_TYPES.has(contentType);
  }
  if (binding.scope === "pricing") {
    if (binding.field === "snapshot_sha256") return contentType === "application/json";
    return PRICING_EVIDENCE_CONTENT_TYPES.has(contentType);
  }
  if (binding.scope === "provider-surface") return contentType === "application/json";
  if (binding.scope === "mandatory-name") return contentType === "application/json";
  return false;
}

function bindingIdentity(value) {
  if (!exactKeys(value, BINDING_IDENTITY_KEYS)) return null;
  const handle = value.handle === null ? "" : value.handle;
  const role = value.role === null ? "" : value.role;
  const publicReference = value.public_reference === null ? "" : value.public_reference;
  if (![value.scope, handle, value.field, role, publicReference].every((item) => typeof item === "string")) return null;
  return [value.scope, handle, value.field, role, publicReference].join("\u0000");
}

export function privateArtifactBindingKey(value) {
  return bindingIdentity(value);
}

function validateBindingShape(binding, issues) {
  if (!exactKeys(binding, BINDING_KEYS)) {
    add(issues, "binding.contract");
    return null;
  }
  if (!SLUG_PATTERN.test(binding.artifact_id ?? "")) add(issues, "binding.artifact-id");
  if (binding.scope === "product") {
    if (!HANDLE_PATTERN.test(binding.handle ?? "") || !PRODUCT_FIELDS.has(binding.field)) {
      add(issues, "binding.product-identity");
      return null;
    }
    if (MEDIA_IDENTITY_FIELDS.has(binding.field)) {
      if (!SLUG_PATTERN.test(binding.role ?? "") || !validPublicReference(binding.public_reference)) {
        add(issues, "binding.media-identity");
        return null;
      }
    } else if (binding.role !== null || binding.public_reference !== null) {
      add(issues, "binding.product-identity");
      return null;
    }
  } else if (binding.scope === "pricing") {
    if (binding.handle !== null || binding.role !== null || binding.public_reference !== null ||
        !PRICING_FIELDS.has(binding.field)) {
      add(issues, "binding.pricing-identity");
      return null;
    }
  } else if (binding.scope === "provider-surface") {
    if (binding.handle !== null || binding.role !== null || binding.public_reference !== null ||
        !PROVIDER_SURFACE_FIELDS.has(binding.field)) {
      add(issues, "binding.provider-surface-identity");
      return null;
    }
  } else if (binding.scope === "mandatory-name") {
    if (!HANDLE_PATTERN.test(binding.handle ?? "") || binding.role !== null ||
        binding.public_reference !== null || !MANDATORY_NAME_FIELDS.has(binding.field)) {
      add(issues, "binding.mandatory-name-identity");
      return null;
    }
  } else {
    add(issues, "binding.scope");
    return null;
  }
  return bindingIdentity(Object.fromEntries(BINDING_IDENTITY_KEYS.map((key) => [key, binding[key]])));
}

function prepareContext(options, issues) {
  if (!options || typeof options.repositoryRoot !== "string" || typeof options.allowedRoot !== "string" ||
      (options.evidencePaths !== undefined && !Array.isArray(options.evidencePaths)) ||
      (options.gitPathStatus !== undefined && typeof options.gitPathStatus !== "function") ||
      (options.imageInspector !== undefined && typeof options.imageInspector !== "function")) {
    add(issues, "configuration.contract");
    return null;
  }
  try {
    const repositoryRoot = realpathSync(path.resolve(options.repositoryRoot));
    const allowedRoot = realpathSync(path.resolve(options.allowedRoot));
    if (!lstatSync(repositoryRoot).isDirectory() || !lstatSync(allowedRoot).isDirectory() ||
        !isInside(allowedRoot, repositoryRoot)) {
      add(issues, "configuration.boundary");
      return null;
    }
    const evidenceFiles = new Set();
    for (const candidate of options.evidencePaths ?? []) {
      if (typeof candidate !== "string") {
        add(issues, "configuration.evidence-path");
        continue;
      }
      try {
        const absolute = path.isAbsolute(candidate) ? candidate : path.resolve(repositoryRoot, candidate);
        const real = realpathSync(absolute);
        if (!lstatSync(real).isFile() || !isInside(real, allowedRoot)) {
          add(issues, "configuration.evidence-path");
          continue;
        }
        evidenceFiles.add(fileIdentity(real));
      } catch {
        add(issues, "configuration.evidence-path");
      }
    }
    return {
      repositoryRoot,
      allowedRoot,
      evidenceFiles,
      gitPathStatus: options.gitPathStatus ?? ((relativePath) => defaultGitPathStatus(repositoryRoot, relativePath)),
      imageInspector: options.imageInspector ?? defaultImageInspector,
    };
  } catch {
    add(issues, "configuration.boundary");
    return null;
  }
}

function validateArtifact(entry, context, seenIds, seenPaths, seenRealPaths, issues) {
  if (!exactKeys(entry, ARTIFACT_KEYS)) {
    add(issues, "artifact.contract");
    return null;
  }
  let contractValid = true;
  if (!SLUG_PATTERN.test(entry.artifact_id ?? "")) {
    add(issues, "artifact.id");
    contractValid = false;
  } else if (seenIds.has(entry.artifact_id)) {
    add(issues, "artifact.duplicate-id");
    contractValid = false;
  }
  seenIds.add(entry.artifact_id);
  if (!safeArtifactPath(entry.artifact_path)) {
    add(issues, "artifact.path");
    contractValid = false;
  } else if (seenPaths.has(entry.artifact_path)) {
    add(issues, "artifact.duplicate-path");
    contractValid = false;
  }
  seenPaths.add(entry.artifact_path);
  if (!SHA256_PATTERN.test(entry.sha256 ?? "")) {
    add(issues, "artifact.sha256");
    contractValid = false;
  }
  if (!Number.isSafeInteger(entry.size_bytes) || entry.size_bytes <= 0 ||
      entry.size_bytes > MAX_ARTIFACT_SIZE_BYTES) {
    add(issues, "artifact.size");
    contractValid = false;
  }
  const contentPolicy = CONTENT_TYPES[entry.content_type];
  if (!contentPolicy || !contentPolicy.extensions.includes(path.posix.extname(entry.artifact_path ?? "").toLowerCase())) {
    add(issues, "artifact.content-type");
    contractValid = false;
  } else if (entry.hash_mode !== contentPolicy.hashMode) {
    add(issues, "artifact.hash-mode");
    contractValid = false;
  }
  if (!contractValid || !context) return null;

  try {
    const absolute = path.resolve(context.repositoryRoot, ...entry.artifact_path.split("/"));
    if (!isInside(absolute, context.repositoryRoot) || containsSymbolicLink(context.repositoryRoot, absolute)) {
      add(issues, "artifact.symlink");
      return null;
    }
    const namedStat = lstatSync(absolute);
    const real = realpathSync(absolute);
    if (!namedStat.isFile() || !lstatSync(real).isFile() || !isInside(real, context.allowedRoot)) {
      add(issues, "artifact.boundary");
      return null;
    }
    const realIdentity = fileIdentity(real);
    if (seenRealPaths.has(realIdentity)) {
      add(issues, "artifact.duplicate-real-path");
      return null;
    }
    seenRealPaths.add(realIdentity);
    if (context.evidenceFiles.has(realIdentity)) {
      add(issues, "artifact.evidence-file");
      return null;
    }
    const status = context.gitPathStatus(entry.artifact_path);
    if (!status || typeof status.ignored !== "boolean" || typeof status.tracked !== "boolean") {
      add(issues, "artifact.git-status");
      return null;
    }
    if (status.tracked) add(issues, "artifact.tracked");
    if (!status.ignored) add(issues, "artifact.not-ignored");

    const buffer = readFileSync(real);
    if (buffer.length !== entry.size_bytes) add(issues, "artifact.size-mismatch");
    const contentInspection = inspectContent(entry.content_type, buffer, context.imageInspector);
    if (!contentInspection) {
      add(issues, "artifact.content");
      return null;
    }
    let actualSha;
    try {
      actualSha = entry.hash_mode === "canonical-json-v1" ? canonicalJsonDigest(buffer) : digest(buffer);
    } catch {
      add(issues, "artifact.content");
      return null;
    }
    if (actualSha !== entry.sha256) add(issues, "artifact.hash-mismatch");
    return Object.freeze(contentInspection.imageMetadata
      ? { ...entry, image_metadata: contentInspection.imageMetadata }
      : { ...entry });
  } catch {
    add(issues, "artifact.missing-or-invalid");
    return null;
  }
}

export function validatePrivateArtifactIndex(index, options = {}) {
  const issues = [];
  const context = prepareContext(options, issues);
  if (!exactKeys(index, INDEX_KEYS)) {
    add(issues, "index.contract");
    return { ok: false, issues, artifact_count: 0, binding_count: 0, resolveBinding: () => null };
  }
  if (index.schema_version !== PRIVATE_ARTIFACT_INDEX_POLICY.schema_version) add(issues, "index.schema-version");
  if (!Array.isArray(index.artifacts) || index.artifacts.length === 0 || index.artifacts.length > MAX_ARTIFACT_COUNT) {
    add(issues, "index.artifacts");
  }
  if (!Array.isArray(index.bindings) || index.bindings.length === 0 || index.bindings.length > MAX_BINDING_COUNT) {
    add(issues, "index.bindings");
  }

  const artifactsById = new Map();
  const seenIds = new Set();
  const seenPaths = new Set();
  const seenRealPaths = new Set();
  for (const entry of Array.isArray(index.artifacts) ? index.artifacts : []) {
    const artifact = validateArtifact(entry, context, seenIds, seenPaths, seenRealPaths, issues);
    if (artifact && !artifactsById.has(artifact.artifact_id)) artifactsById.set(artifact.artifact_id, artifact);
  }

  const bindingsByIdentity = new Map();
  const referencedArtifactIds = new Set();
  const artifactUsage = new Map();
  for (const binding of Array.isArray(index.bindings) ? index.bindings : []) {
    const identity = validateBindingShape(binding, issues);
    if (!identity) continue;
    if (bindingsByIdentity.has(identity)) {
      add(issues, "binding.duplicate");
      continue;
    }
    const artifact = artifactsById.get(binding.artifact_id);
    if (!artifact) {
      add(issues, "binding.artifact-missing");
      continue;
    }
    if (!contentTypeSupportsBinding(artifact.content_type, binding)) {
      add(issues, "binding.content-type");
      continue;
    }
    const prior = artifactUsage.get(binding.artifact_id);
    if (prior && (prior.scope !== binding.scope ||
        (binding.scope === "product" && prior.handle !== binding.handle))) {
      add(issues, "binding.artifact-reuse");
      continue;
    }
    if (prior && (EXCLUSIVE_ARTIFACT_FIELDS.has(binding.field) ||
        [...prior.fields].some((field) => EXCLUSIVE_ARTIFACT_FIELDS.has(field)))) {
      add(issues, "binding.exclusive-artifact-reuse");
      continue;
    }
    if (prior && binding.scope === "pricing" && prior.fields.size > 0 && !prior.fields.has(binding.field)) {
      add(issues, "binding.pricing-artifact-reuse");
      continue;
    }
    if (prior && binding.scope === "provider-surface") {
      add(issues, "binding.provider-surface-artifact-reuse");
      continue;
    }
    if (prior && binding.scope === "mandatory-name") {
      add(issues, "binding.mandatory-name-artifact-reuse");
      continue;
    }
    const usage = prior ?? { scope: binding.scope, handle: binding.handle, fields: new Set() };
    usage.fields.add(binding.field);
    artifactUsage.set(binding.artifact_id, usage);
    referencedArtifactIds.add(binding.artifact_id);
    bindingsByIdentity.set(identity, artifact);
  }
  for (const artifactId of artifactsById.keys()) {
    if (!referencedArtifactIds.has(artifactId)) add(issues, "artifact.unbound");
  }

  const ok = issues.length === 0;
  const resolveBinding = ok
    ? (query) => {
      const identity = bindingIdentity(query);
      return identity ? (bindingsByIdentity.get(identity) ?? null) : null;
    }
    : () => null;
  return {
    ok,
    issues,
    artifact_count: artifactsById.size,
    binding_count: bindingsByIdentity.size,
    resolveBinding,
  };
}
