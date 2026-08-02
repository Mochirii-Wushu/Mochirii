import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SaxesParser } from "saxes";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const repositoryRoot = resolve(webRoot, "../..");
const publicRoots = [
  resolve(webRoot, "public"),
  resolve(repositoryRoot, "services/social/public"),
  resolve(repositoryRoot, "apps/shopify-theme/assets"),
];
const lottieRoot = resolve(webRoot, "public/assets/lottie");
const maximumSvgBytes = 4 * 1024 * 1024;
const maximumLottieBytes = 2 * 1024 * 1024;
const maximumSvgElements = 250_000;
const maximumJsonNodes = 200_000;
const maximumJsonDepth = 64;
const maximumStringLength = 128 * 1024;
const maximumTreeEntries = 100_000;
const maximumTreeDepth = 64;
const maximumSvgFiles = 10_000;
const maximumLottieFiles = 1_000;
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const legacySvgDtd = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >';
const legacySvgDtdAllowlist = new Set([
  "services/social/public/fonts/fa-brands-400.svg",
  "services/social/public/fonts/fa-light-300.svg",
  "services/social/public/fonts/fa-regular-400.svg",
  "services/social/public/fonts/fa-solid-900.svg",
  "services/social/public/fonts/nucleo-icons.svg",
]);
const forbiddenSvgElements = new Set([
  "a",
  "animate",
  "animatemotion",
  "animatetransform",
  "audio",
  "discard",
  "embed",
  "foreignobject",
  "iframe",
  "object",
  "script",
  "set",
  "video",
]);

function displayPath(file) {
  return relative(repositoryRoot, file).replaceAll("\\", "/");
}

function decodeCssEscapes(value) {
  const withoutContinuations = value.replace(/\\(?:\r\n|[\n\r\f])/gu, "");
  return withoutContinuations.replace(/\\(?:([0-9A-Fa-f]{1,6})(?:\r\n|[\t\n\f\r ])?|([^\n\r\f0-9A-Fa-f]))/gu, (_, hex, character) => {
    if (character !== undefined) return character;
    const codePoint = Number.parseInt(hex, 16);
    return codePoint === 0 || codePoint > 0x10ffff ? "\uFFFD" : String.fromCodePoint(codePoint);
  });
}

function walk(directory, state = { entries: 0 }, depth = 0) {
  if (depth > maximumTreeDepth) throw new Error(`${displayPath(directory)} exceeds the ${maximumTreeDepth}-level tree-depth bound`);
  if (!existsSync(directory)) throw new Error(`${displayPath(directory)} does not exist`);
  if (lstatSync(directory).isSymbolicLink()) throw new Error(`${displayPath(directory)} is a symbolic link`);

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    state.entries += 1;
    if (state.entries > maximumTreeEntries) {
      throw new Error(`public artifact trees exceed the ${maximumTreeEntries}-entry traversal bound`);
    }
    const absolute = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`${displayPath(absolute)} is a symbolic link`);
    if (entry.isDirectory()) files.push(...walk(absolute, state, depth + 1));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error(`${displayPath(absolute)} is not a regular file or directory`);
  }
  return files;
}

function readBoundedUtf8(file, maximumBytes) {
  const handle = openSync(file, "r");
  try {
    const before = fstatSync(handle);
    if (!before.isFile()) throw new Error("not a regular file");
    if (before.size === 0 || before.size > maximumBytes) {
      throw new Error(`file length ${before.size} is outside the ${maximumBytes}-byte bound`);
    }
    const buffer = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(handle, buffer, offset, buffer.length - offset, offset);
      if (count === 0) throw new Error("file ended during bounded read");
      offset += count;
    }
    const after = fstatSync(handle);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error("file changed during validation");
    }
    return utf8Decoder.decode(buffer);
  } finally {
    closeSync(handle);
  }
}

function validateFragmentUrlFunctions(value, label) {
  const decoded = decodeCssEscapes(value);
  const matches = [...decoded.matchAll(/url\(\s*([^)]*?)\s*\)/giu)];
  const apparentUrlFunctions = decoded.match(/url\s*\(/giu)?.length ?? 0;
  if (matches.length !== apparentUrlFunctions) {
    throw new Error(`${label} contains an ambiguous or malformed CSS resource reference`);
  }
  for (const match of matches) {
    const resource = match[1].replace(/^['"]|['"]$/gu, "");
    if (!/^#[A-Za-z0-9_][A-Za-z0-9_.:-]*$/u.test(resource)) {
      throw new Error(`${label} contains a non-fragment CSS resource reference`);
    }
  }
}

function validateSvgStyleContent(value, label) {
  const decoded = decodeCssEscapes(value);
  if (/@(?:import|document)\b|expression\s*\(|\b(?:javascript|vbscript|file)\s*:/iu.test(decoded)) {
    throw new Error(`${label} contains active or externally loadable SVG style content`);
  }
  validateFragmentUrlFunctions(value, label);
}

function prepareSvgSource(source, label, allowLegacyDtd) {
  const doctypeCount = source.match(/<!DOCTYPE/giu)?.length ?? 0;
  const entityCount = source.match(/<!ENTITY/giu)?.length ?? 0;
  if (entityCount > 0) throw new Error(`${label} contains an entity declaration`);
  if (allowLegacyDtd) {
    const exactCount = source.split(legacySvgDtd).length - 1;
    if (doctypeCount !== 1 || exactCount !== 1) {
      throw new Error(`${label} does not contain its single exact reviewed legacy SVG DTD`);
    }
    return source.replace(legacySvgDtd, "");
  }
  if (doctypeCount > 0) throw new Error(`${label} contains an unapproved DTD`);
  return source;
}

function validateSvgSource(source, label, { allowLegacyDtd = false } = {}) {
  const prepared = prepareSvgSource(source, label, allowLegacyDtd);
  let elementCount = 0;
  let rootSeen = false;
  let parserError;
  let styleDepth = 0;
  let styleText = "";
  const parser = new SaxesParser({ xmlns: true });

  parser.on("error", (error) => {
    parserError = error;
  });
  parser.on("doctype", () => {
    parserError = new Error(`${label} contains an unapproved DTD`);
  });
  parser.on("opentag", (tag) => {
    if (parserError) return;
    elementCount += 1;
    if (elementCount > maximumSvgElements) {
      parserError = new Error(`${label} exceeds the ${maximumSvgElements}-element bound`);
      return;
    }
    const element = tag.local.toLowerCase();
    if (!rootSeen) {
      rootSeen = true;
      if (element !== "svg" || tag.uri !== "http://www.w3.org/2000/svg") {
        parserError = new Error(`${label} does not have a namespaced SVG root`);
        return;
      }
    }
    if (forbiddenSvgElements.has(element)) {
      parserError = new Error(`${label} contains forbidden <${tag.local}> content`);
      return;
    }
    if (element === "style") styleDepth += 1;

    const attributes = Object.values(tag.attributes);
    if (attributes.length > 256) {
      parserError = new Error(`${label} has an element with more than 256 attributes`);
      return;
    }
    for (const attribute of attributes) {
      const name = attribute.local.toLowerCase();
      const value = attribute.value;
      if (attribute.uri === "http://www.w3.org/2000/xmlns/") continue;
      if (/^on[a-z0-9_-]+$/u.test(name)) {
        parserError = new Error(`${label} contains event-handler attribute ${attribute.name}`);
        return;
      }
      if (/\b(?:javascript|vbscript|file)\s*:/iu.test(value)) {
        parserError = new Error(`${label} contains an active URI scheme in ${attribute.name}`);
        return;
      }
      if (name === "href" || name === "src") {
        if (!/^#[A-Za-z0-9_][A-Za-z0-9_.:-]*$/u.test(value)) {
          parserError = new Error(`${label} contains a non-fragment ${attribute.name} resource reference`);
          return;
        }
      }
      try {
        validateFragmentUrlFunctions(value, `${label} ${attribute.name}`);
        if (name === "style") validateSvgStyleContent(value, `${label} ${attribute.name}`);
      } catch (error) {
        parserError = error;
        return;
      }
    }
  });
  parser.on("text", (text) => {
    if (styleDepth > 0) styleText += text;
  });
  parser.on("cdata", (text) => {
    if (styleDepth > 0) styleText += text;
  });
  parser.on("processinginstruction", (instruction) => {
    parserError = new Error(`${label} contains processing instruction ${instruction.target}`);
  });
  parser.on("closetag", (tag) => {
    if (tag.local.toLowerCase() === "style") styleDepth -= 1;
  });

  parser.write(prepared).close();
  if (parserError) throw parserError;
  if (!rootSeen) throw new Error(`${label} does not contain an SVG root`);
  validateSvgStyleContent(styleText, `${label} <style>`);
  return { elements: elementCount };
}

function validateLottieObject(value, label, depth = 0, state = { nodes: 0 }) {
  state.nodes += 1;
  if (state.nodes > maximumJsonNodes) throw new Error(`${label} exceeds the ${maximumJsonNodes}-node JSON bound`);
  if (depth > maximumJsonDepth) throw new Error(`${label} exceeds the ${maximumJsonDepth}-level JSON depth bound`);

  if (typeof value === "string") {
    if (value.length > maximumStringLength) throw new Error(`${label} contains an oversized string`);
    if (value.includes("\0")) throw new Error(`${label} contains a NUL character`);
    if (/^(?:\/\/)|\b(?:blob|data|file|ftp|https?|javascript|vbscript|wss?)\s*:/iu.test(value)) {
      throw new Error(`${label} contains an external or active URI-like string`);
    }
    return state;
  }
  if (value === null || typeof value === "boolean") return state;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number`);
    return state;
  }
  if (typeof value !== "object") throw new Error(`${label} contains an unsupported JSON value`);

  const keys = Object.keys(value);
  if (keys.length > 25_000) throw new Error(`${label} contains an object or array with too many entries`);
  for (const key of keys) {
    if (["__proto__", "prototype", "constructor"].includes(key)) {
      throw new Error(`${label} contains forbidden object key ${JSON.stringify(key)}`);
    }
    if (["expression", "expr"].includes(key.toLowerCase())) {
      throw new Error(`${label} contains an expression-bearing key ${JSON.stringify(key)}`);
    }
    if (["p", "u", "fpath"].includes(key.toLowerCase()) && typeof value[key] === "string" && value[key].trim().length > 0) {
      throw new Error(`${label} contains a path-bearing key ${JSON.stringify(key)}`);
    }
    if (key === "x" && typeof value[key] === "string" && value[key].trim().length > 0) {
      throw new Error(`${label} contains a Lottie expression string`);
    }
    validateLottieObject(value[key], label, depth + 1, state);
  }
  return state;
}

function validateLottieSource(source, label) {
  let document;
  try {
    document = JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!document || Array.isArray(document) || typeof document !== "object") {
    throw new Error(`${label} root must be an object`);
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(document.v)) {
    throw new Error(`${label} has an invalid Lottie version`);
  }
  if (!Number.isFinite(document.fr) || document.fr <= 0 || document.fr > 120) {
    throw new Error(`${label} frame rate is outside the 0-120 fps bound`);
  }
  if (!Number.isFinite(document.ip) || !Number.isFinite(document.op) || document.op <= document.ip) {
    throw new Error(`${label} has an invalid frame interval`);
  }
  if ((document.op - document.ip) / document.fr > 600) throw new Error(`${label} duration exceeds 10 minutes`);
  if (
    !Number.isInteger(document.w) || !Number.isInteger(document.h)
    || document.w < 1 || document.h < 1 || document.w > 4_096 || document.h > 4_096
    || document.w * document.h > 16_777_216
  ) {
    throw new Error(`${label} canvas dimensions exceed the validation bound`);
  }
  if (![0, 1].includes(document.ddd)) throw new Error(`${label} has an invalid 3D-layer flag`);
  if (!Array.isArray(document.assets) || document.assets.length > 2_000) {
    throw new Error(`${label} assets must be a bounded array`);
  }
  if (!Array.isArray(document.layers) || document.layers.length > 10_000) {
    throw new Error(`${label} layers must be a bounded array`);
  }
  for (const asset of document.assets) {
    if (!asset || Array.isArray(asset) || typeof asset !== "object") throw new Error(`${label} contains an invalid asset`);
    if ((typeof asset.p === "string" && asset.p.length > 0) || (typeof asset.u === "string" && asset.u.length > 0)) {
      throw new Error(`${label} contains an external or embedded image asset`);
    }
  }
  return validateLottieObject(document, label);
}

function expectReject(label, validator, source, options) {
  try {
    validator(source, `<canary:${label}>`, options);
  } catch {
    return;
  }
  throw new Error(`Public artifact semantic canary failed closed: ${label}`);
}

validateSvgSource('<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(#a)" d="M0 0h1v1H0z"/></svg>', "<canary:safe-svg>");
validateSvgSource(String.raw`<svg xmlns="http://www.w3.org/2000/svg"><path fill="u\72l(#a)" d="M0 0h1v1H0z"/></svg>`, "<canary:safe-escaped-svg-fragment>");
expectReject("external SVG href", validateSvgSource, '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.invalid/a.svg"/></svg>');
expectReject("SVG script", validateSvgSource, '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
expectReject("SVG SMIL resource mutation", validateSvgSource, '<svg xmlns="http://www.w3.org/2000/svg"><image id="x"/><set href="#x" attributeName="href" to="https://example.invalid/a.png"/></svg>');
expectReject("external SVG style URL", validateSvgSource, '<svg xmlns="http://www.w3.org/2000/svg"><style>.x{fill:url(https://example.invalid/a.svg)}</style></svg>');
expectReject("escaped external SVG attribute URL", validateSvgSource, String.raw`<svg xmlns="http://www.w3.org/2000/svg"><path fill="u\72l(https://example.invalid/a.svg)"/></svg>`);
expectReject("CRLF-terminated escaped external SVG URL", validateSvgSource, '<svg xmlns="http://www.w3.org/2000/svg"><path fill="u\\72\r\nl(https://example.invalid/a.svg)"/></svg>');
expectReject("continued external SVG style URL", validateSvgSource, '<svg xmlns="http://www.w3.org/2000/svg"><style>.x{fill:u\\\nrl(https://example.invalid/a.svg)}</style></svg>');
expectReject("escaped inline SVG expression", validateSvgSource, String.raw`<svg xmlns="http://www.w3.org/2000/svg"><path style="width:expre\73 sion(alert(1))"/></svg>`);
expectReject("SVG stylesheet processing instruction", validateSvgSource, '<?xml-stylesheet href="https://example.invalid/a.css"?><svg xmlns="http://www.w3.org/2000/svg"/>');
expectReject("malformed SVG", validateSvgSource, '<svg xmlns="http://www.w3.org/2000/svg"><path></svg>');
expectReject("unapproved SVG DTD", validateSvgSource, '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>');

const safeLottie = JSON.stringify({ v: "5.7.4", fr: 30, ip: 0, op: 1, w: 1, h: 1, ddd: 0, assets: [], layers: [] });
validateLottieSource(safeLottie, "<canary:safe-lottie>");
expectReject("Lottie external asset", validateLottieSource, JSON.stringify({ v: "5.7.4", fr: 30, ip: 0, op: 1, w: 1, h: 1, ddd: 0, assets: [{ p: "https://example.invalid/a.png" }], layers: [] }));
expectReject("Lottie relative font path", validateLottieSource, JSON.stringify({ v: "5.7.4", fr: 30, ip: 0, op: 1, w: 1, h: 1, ddd: 0, assets: [], layers: [], fonts: { list: [{ fPath: "fonts/private.woff2" }] } }));
expectReject("Lottie expression", validateLottieSource, JSON.stringify({ v: "5.7.4", fr: 30, ip: 0, op: 1, w: 1, h: 1, ddd: 0, assets: [], layers: [{ x: "time*10" }] }));

const traversalState = { entries: 0 };
const publicFiles = publicRoots.flatMap((publicRoot) => walk(publicRoot, traversalState));
const svgFiles = publicFiles
  .filter((file) => extname(file).toLowerCase() === ".svg")
  .sort((left, right) => left.localeCompare(right));
const lottieFiles = walk(lottieRoot, traversalState)
  .filter((file) => extname(file).toLowerCase() === ".json")
  .sort((left, right) => left.localeCompare(right));
if (svgFiles.length > maximumSvgFiles) throw new Error(`public artifact trees exceed the ${maximumSvgFiles}-file SVG bound`);
if (lottieFiles.length > maximumLottieFiles) throw new Error(`public artifact trees exceed the ${maximumLottieFiles}-file Lottie bound`);
const failures = [];
let svgElements = 0;
let lottieNodes = 0;

for (const file of svgFiles) {
  const label = displayPath(file);
  try {
    const result = validateSvgSource(readBoundedUtf8(file, maximumSvgBytes), label, {
      allowLegacyDtd: legacySvgDtdAllowlist.has(label),
    });
    svgElements += result.elements;
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
for (const file of lottieFiles) {
  const label = displayPath(file);
  try {
    const result = validateLottieSource(readBoundedUtf8(file, maximumLottieBytes), label);
    lottieNodes += result.nodes;
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const expected of legacySvgDtdAllowlist) {
  if (!svgFiles.some((file) => displayPath(file) === expected)) failures.push(`${expected}: reviewed legacy-DTD asset is missing`);
}
if (svgFiles.length === 0) failures.push("No public SVG files were found.");
if (lottieFiles.length === 0) failures.push("No public Lottie files were found.");

if (failures.length > 0) {
  console.error(`Public artifact semantic validation failed (${failures.length} findings):`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`- ...and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(
  `Public artifact semantics passed for ${svgFiles.length} SVG files/${svgElements} elements and `
  + `${lottieFiles.length} Lottie files/${lottieNodes} JSON nodes; five exact legacy font DTD declarations were allowlisted without dereferencing.`,
);
