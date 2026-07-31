import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { edgeResponseContractSource } from "./lib/edge-response-contract-source.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "supabase/config.toml");
const artifactPath = resolve(root, "docs/integrations/edge-response-contracts.v1.json");
const shouldWrite = process.argv.includes("--write");
const shouldSelfTest = process.argv.includes("--self-test");
const failures = [];

const configFunctions = parseFunctionConfig(readFileSync(configPath, "utf8"));
validateSourceContract(edgeResponseContractSource, configFunctions);
const generated = buildArtifact(edgeResponseContractSource, configFunctions);
const serialized = `${JSON.stringify(generated, null, 2)}\n`;

if (existsSync(artifactPath)) {
  const currentText = readFileSync(artifactPath, "utf8");
  let current = null;
  try {
    current = JSON.parse(currentText);
  } catch (error) {
    fail(`contract artifact is not valid JSON: ${error.message}`);
  }
  if (current) validateDriftAcknowledgement(current, generated);
  if (!shouldWrite && currentText !== serialized) {
    fail("edge response contract artifact is stale; review response drift and run check:edge-response-contracts -- --write");
  }
} else if (!shouldWrite) {
  fail("edge response contract artifact is missing; run check:edge-response-contracts -- --write after review");
}

if (failures.length) {
  console.error("Edge response contract check failed.");
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

if (shouldWrite) writeFileSync(artifactPath, serialized, "utf8");
if (shouldSelfTest) runSelfTests(generated);

const stateCount = generated.functions.reduce((sum, entry) => sum + entry.states.length, 0);
const fieldCount = generated.functions.reduce(
  (sum, entry) => sum + entry.states.reduce((stateSum, state) => stateSum + state.fields.length, 0),
  0,
);
const inheritedCount = generated.functions.reduce(
  (sum, entry) => sum + entry.states.reduce((stateSum, state) => stateSum + state.inheritedContainers.length, 0),
  0,
);
const wholeBodyCount = generated.functions.reduce(
  (sum, entry) => sum + entry.states.filter((state) => state.body !== null).length,
  0,
);
console.log("Edge response contracts OK.");
console.log(`- Functions: ${generated.functions.length}`);
console.log(`- JWT split: ${generated.jwtSummary.verifyJwtTrue} true / ${generated.jwtSummary.verifyJwtFalse} false`);
console.log(`- Response states: ${stateCount}`);
console.log(`- Classified field paths: ${fieldCount}`);
console.log(`- Explicit descendant-inheritance containers: ${inheritedCount}`);
console.log(`- Classified whole-body text/binary states: ${wholeBodyCount}`);
console.log(`- Artifact: ${relative(root, artifactPath).replaceAll("\\", "/")}${shouldWrite ? " (written)" : ""}`);

function buildArtifact(source, configured) {
  let verifyJwtTrue = 0;
  let verifyJwtFalse = 0;
  const functions = source.functions.map((entry) => {
    const config = configured.get(entry.id);
    if (config.verifyJwt) verifyJwtTrue += 1;
    else verifyJwtFalse += 1;
    const sourceRefs = [...new Set([
      ...localSourceClosure(config.entrypoint),
      ...dependencyInputs(config.entrypoint),
    ])].sort(compareText);
    const states = entry.states.map((state) => ({
      id: state.id,
      when: [...state.when],
      bodyKind: state.bodyKind,
      body: state.body,
      fields: [...state.fields].sort(compareField),
      inheritedContainers: [...state.inheritedContainers].sort((left, right) => compareText(left.path, right.path)),
    }));
    const responseShape = states.map(({ id, bodyKind, body, fields, inheritedContainers }) => ({
      id,
      bodyKind,
      body,
      fields,
      inheritedContainers,
    }));
    return {
      id: entry.id,
      enabled: config.enabled,
      verifyJwt: config.verifyJwt,
      entrypoint: config.entrypoint,
      states,
      reviewedSourceRefs: sourceRefs,
      reviewedSourceSha256: sourceClosureHash(sourceRefs),
      semanticContractSha256: sha256(JSON.stringify(states)),
      responseShapeContractSha256: sha256(JSON.stringify(responseShape)),
    };
  });
  return {
    schemaVersion: source.schemaVersion,
    scope: source.scope,
    factBoundary: source.factBoundary,
    classifications: source.classifications,
    jwtSummary: {
      total: functions.length,
      verifyJwtTrue,
      verifyJwtFalse,
    },
    functions,
  };
}

function validateSourceContract(source, configured) {
  assertExactKeys(source, ["schemaVersion", "scope", "factBoundary", "classifications", "functions"], "source contract");
  if (source.schemaVersion !== 1) fail("source contract schemaVersion must be 1");
  assertText(source.scope, "source contract scope");
  assertExactKeys(source.factBoundary, ["providerFacts", "secretValuesAllowed", "sourceChangePolicy"], "fact boundary");
  if (source.factBoundary?.secretValuesAllowed !== false) fail("fact boundary must forbid secret values");
  assertText(source.factBoundary?.providerFacts, "provider fact boundary");
  assertText(source.factBoundary?.sourceChangePolicy, "source change policy");

  const classifications = new Set(["public", "operational", "internal", "confidential", "credential"]);
  assertExactKeys(source.classifications, [...classifications], "classifications");
  for (const [id, description] of Object.entries(source.classifications || {})) {
    if (!classifications.has(id)) fail(`unknown classification ${id}`);
    assertText(description, `classification ${id}`);
  }

  if (!Array.isArray(source.functions)) {
    fail("functions must be an array");
    return;
  }
  const configuredIds = [...configured.keys()];
  const contractIds = source.functions.map((entry) => entry?.id);
  if (JSON.stringify(contractIds) !== JSON.stringify(configuredIds)) {
    fail("function IDs and order must exactly match supabase/config.toml");
  }
  if (source.functions.length !== 46) fail(`expected 46 functions, found ${source.functions.length}`);

  for (const entry of source.functions) {
    const label = `function ${entry?.id}`;
    if (!configured.has(entry?.id)) continue;
    assertExactKeys(entry, ["id", "states"], label);
    if (!Array.isArray(entry.states) || entry.states.length === 0) {
      fail(`${label} must declare at least one response state`);
      continue;
    }
    const stateIds = new Set();
    for (const state of entry.states) validateState(entry.id, state, stateIds, classifications);
  }

  const raw = JSON.stringify(source);
  for (const pattern of [
    /\bsb_(?:secret|service_role)_[A-Za-z0-9_-]{8,}\b/u,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/u,
    /https:\/\/[^\s/:]+:[^\s/@]+@/u,
    /discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/u,
  ]) {
    if (pattern.test(raw)) fail(`source contract contains a forbidden secret-like value matching ${pattern}`);
  }
}

function validateState(functionId, state, stateIds, classifications) {
  const label = `${functionId} state ${state?.id}`;
  assertExactKeys(state, ["id", "when", "bodyKind", "body", "fields", "inheritedContainers"], label);
  assertId(state.id, `${label} id`);
  if (stateIds.has(state.id)) fail(`${functionId} repeats state ${state.id}`);
  stateIds.add(state.id);
  assertNonEmptyStrings(state.when, `${label} when`);
  if (!["json", "text", "empty", "binary"].includes(state.bodyKind)) fail(`${label} has invalid bodyKind`);
  if (!Array.isArray(state.fields)) fail(`${label} fields must be an array`);
  if (!Array.isArray(state.inheritedContainers)) fail(`${label} inheritedContainers must be an array`);
  if (["json", "empty"].includes(state.bodyKind) && state.body !== null) {
    fail(`${label} ${state.bodyKind} state must not declare a whole-body contract`);
  }
  if (["text", "binary"].includes(state.bodyKind)) validateWholeBody(state.body, label, classifications);
  if (state.bodyKind === "json" && state.fields?.length === 0) fail(`${label} JSON state must classify at least one field`);
  if (state.bodyKind !== "json" && (state.fields?.length || state.inheritedContainers?.length)) {
    fail(`${label} non-JSON state must not declare JSON fields`);
  }

  const fieldMap = new Map();
  for (const field of state.fields || []) {
    assertExactKeys(field, ["path", "classification"], `${label} field`);
    assertFieldPath(field.path, `${label} field path`);
    if (!classifications.has(field.classification)) fail(`${label} field ${field.path} has unknown classification`);
    if (fieldMap.has(field.path)) fail(`${label} repeats field path ${field.path}`);
    fieldMap.set(field.path, field.classification);
  }

  const inheritedPaths = new Set();
  for (const container of state.inheritedContainers || []) {
    assertExactKeys(container, ["path", "classification", "dataClass", "maximumBytes", "descendants", "rationale"], `${label} inherited container`);
    assertFieldPath(container.path, `${label} inherited container path`);
    if (container.descendants !== "inherit") fail(`${label} inherited container ${container.path} must use descendants=inherit`);
    if (!classifications.has(container.classification)) fail(`${label} inherited container ${container.path} has unknown classification`);
    if (!["public", "internal", "confidential"].includes(container.classification)) {
      fail(`${label} inherited container ${container.path} cannot use ${container.classification}`);
    }
    if (!Number.isSafeInteger(container.maximumBytes) || container.maximumBytes < 1 || container.maximumBytes > 1048576) {
      fail(`${label} inherited container ${container.path} maximumBytes must be 1..1048576`);
    }
    assertId(container.dataClass.replaceAll("_", "-"), `${label} inherited container dataClass`);
    assertText(container.rationale, `${label} inherited container rationale`);
    if (fieldMap.get(container.path) !== container.classification) {
      fail(`${label} inherited container ${container.path} must also be a field with the same classification`);
    }
    if (inheritedPaths.has(container.path)) fail(`${label} repeats inherited container ${container.path}`);
    inheritedPaths.add(container.path);
  }
}

function validateWholeBody(body, label, classifications) {
  assertExactKeys(body, ["classification", "dataClass", "maximumBytes", "rationale"], `${label} whole body`);
  if (!classifications.has(body?.classification)) fail(`${label} whole body has unknown classification`);
  if (!Number.isSafeInteger(body?.maximumBytes) || body.maximumBytes < 1 || body.maximumBytes > 52428800) {
    fail(`${label} whole body maximumBytes must be 1..52428800`);
  }
  if (typeof body?.dataClass === "string") assertId(body.dataClass.replaceAll("_", "-"), `${label} whole body dataClass`);
  else fail(`${label} whole body dataClass must be text`);
  assertText(body?.rationale, `${label} whole body rationale`);
}

function validateDriftAcknowledgement(current, next) {
  for (const message of driftFailureMessages(current, next)) fail(message);
}

function driftFailureMessages(current, next) {
  const messages = [];
  const currentById = new Map((current?.functions || []).map((entry) => [entry?.id, entry]));
  for (const nextEntry of next.functions) {
    const oldEntry = currentById.get(nextEntry.id);
    if (!oldEntry || oldEntry.reviewedSourceSha256 === nextEntry.reviewedSourceSha256) continue;
    const oldShapeSha = oldEntry.responseShapeContractSha256 || oldEntry.semanticContractSha256;
    if (oldShapeSha === nextEntry.responseShapeContractSha256) {
      messages.push(`${nextEntry.id} response-source drift is unclassified; update its response-shape fields/states before regenerating`);
    }
  }
  return messages;
}

function runSelfTests(generatedArtifact) {
  const baseline = structuredClone(generatedArtifact);
  const drifted = structuredClone(generatedArtifact);
  drifted.functions[0].reviewedSourceSha256 = "0".repeat(64);
  if (driftFailureMessages(baseline, drifted).length !== 1) {
    throw new Error("self-test failed: unreviewed source drift did not fail closed");
  }

  const metadataOnly = structuredClone(drifted);
  metadataOnly.functions[0].semanticContractSha256 = "e".repeat(64);
  if (driftFailureMessages(baseline, metadataOnly).length !== 1) {
    throw new Error("self-test failed: response metadata change incorrectly acknowledged source drift");
  }

  const shapeReviewed = structuredClone(drifted);
  shapeReviewed.functions[0].responseShapeContractSha256 = "f".repeat(64);
  if (driftFailureMessages(baseline, shapeReviewed).length !== 0) {
    throw new Error("self-test failed: reviewed response-shape contract update was not accepted");
  }
  console.log("- Drift self-tests: 3 passed");
}

function parseFunctionConfig(content) {
  const functions = new Map();
  let current = null;
  for (const line of content.split(/\r?\n/u)) {
    const section = /^\[functions\.([^\]]+)\]$/u.exec(line.trim());
    if (section) {
      current = { id: section[1], enabled: null, verifyJwt: null, entrypoint: "" };
      if (functions.has(current.id)) fail(`supabase/config.toml repeats function ${current.id}`);
      functions.set(current.id, current);
      continue;
    }
    if (!current) continue;
    const setting = /^(enabled|verify_jwt|entrypoint)\s*=\s*(.+)$/u.exec(line.trim());
    if (!setting) continue;
    const [, key, raw] = setting;
    if (key === "enabled") current.enabled = raw === "true";
    else if (key === "verify_jwt") current.verifyJwt = raw === "true";
    else current.entrypoint = `supabase/functions/${/^"\.\/functions\/([^"]+)"$/u.exec(raw)?.[1] || ""}`;
  }
  for (const entry of functions.values()) {
    if (typeof entry.enabled !== "boolean") fail(`config function ${entry.id} is missing enabled`);
    if (typeof entry.verifyJwt !== "boolean") fail(`config function ${entry.id} is missing verify_jwt`);
    assertRepoPath(entry.entrypoint, `config function ${entry.id} entrypoint`);
  }
  return functions;
}

function localSourceClosure(entrypoint) {
  const pending = [entrypoint];
  const visited = new Set();
  while (pending.length) {
    const repoPath = pending.pop();
    if (visited.has(repoPath)) continue;
    assertRepoPath(repoPath, `response source ${repoPath}`);
    visited.add(repoPath);
    const absolute = resolve(root, repoPath);
    const content = readFileSync(absolute, "utf8");
    const importPattern = /(?:\bfrom\s*|\bimport\s*)["'](\.{1,2}\/[^"']+)["']/gu;
    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1];
      const target = resolve(dirname(absolute), specifier);
      const candidate = existsSync(target) ? target : existsSync(`${target}.ts`) ? `${target}.ts` : null;
      if (!candidate) fail(`${repoPath} has an unresolved local import ${specifier}`);
      else {
        const targetRepoPath = relative(root, candidate).replaceAll("\\", "/");
        if (!targetRepoPath.startsWith("supabase/functions/") || targetRepoPath.includes("/node_modules/")) {
          fail(`${repoPath} local import ${specifier} escapes the Edge source boundary`);
        } else pending.push(targetRepoPath);
      }
    }
    if (/\bimport\s*\(/u.test(content)) fail(`${repoPath} contains a dynamic import; response source closure must remain statically enumerable`);
  }
  return [...visited].sort(compareText);
}

function dependencyInputs(entrypoint) {
  const entrypointDirectory = dirname(resolve(root, entrypoint));
  return [
    resolve(root, "deno.lock"),
    resolve(entrypointDirectory, "deno.json"),
    resolve(entrypointDirectory, "deno.lock"),
  ].filter(existsSync).map((absolute) => {
    const repoPath = relative(root, absolute).replaceAll("\\", "/");
    assertRepoPath(repoPath, `response dependency input ${repoPath}`);
    return repoPath;
  });
}

function sourceClosureHash(paths) {
  const payload = paths.map((path) => {
    const content = readFileSync(resolve(root, path), "utf8").replaceAll("\r\n", "\n");
    return `${path}\0${sha256(content)}`;
  }).join("\n");
  return sha256(payload);
}

function assertRepoPath(value, label) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/u.test(value)) {
    fail(`${label} must be a repository-relative POSIX path`);
    return;
  }
  const absolute = resolve(root, value);
  const repoRelative = relative(root, absolute);
  if (repoRelative === ".." || repoRelative.startsWith(`..${sep}`) || isAbsolute(repoRelative)) fail(`${label} escapes the repository`);
  else if (!existsSync(absolute)) fail(`${label} does not exist`);
}

function assertFieldPath(value, label) {
  if (typeof value !== "string" || !value || value.includes("*") || !/^[A-Za-z_][A-Za-z0-9_-]*(?:\[\]|\{\})?(?:\.[A-Za-z_][A-Za-z0-9_-]*(?:\[\]|\{\})?)*$/u.test(value)) {
    fail(`${label} must be an explicit dotted path with optional [] or {} collection markers and no wildcard`);
  }
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
    return;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail(`${label} fields do not match the schema`);
}

function assertNonEmptyStrings(values, label) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string" || !value.trim())) {
    fail(`${label} must be a non-empty string array`);
  } else if (new Set(values).size !== values.length) fail(`${label} must not contain duplicates`);
}

function assertId(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) fail(`${label} must be lowercase kebab-case`);
}

function assertText(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be non-empty text`);
}

function compareField(left, right) {
  return compareText(left.path, right.path) || compareText(left.classification, right.classification);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fail(message) {
  failures.push(message);
}
