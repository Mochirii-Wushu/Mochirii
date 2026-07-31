import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readSync,
} from "node:fs";
import { extname, join, relative } from "node:path";
import process from "node:process";
import postcss from "postcss";

const publicCssDir = join(process.cwd(), "public", "css");
const maximumStylesheetBytes = 2 * 1024 * 1024;
const maximumEmbeddedSvgBytes = 64 * 1024;
const maximumTreeEntries = 10_000;
const maximumTreeDepth = 64;
const maximumStylesheetFiles = 1_024;
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/giu;

function decodeCssEscapes(value) {
  const withoutContinuations = value.replace(/\\(?:\r\n|[\n\r\f])/gu, "");
  return withoutContinuations.replace(/\\(?:([0-9A-Fa-f]{1,6})(?:\r\n|[\t\n\f\r ])?|([^\n\r\f0-9A-Fa-f]))/gu, (_, hex, character) => {
    if (character !== undefined) return character;
    const codePoint = Number.parseInt(hex, 16);
    return codePoint === 0 || codePoint > 0x10ffff ? "\uFFFD" : String.fromCodePoint(codePoint);
  });
}

function displayPath(file) {
  return relative(process.cwd(), file).replaceAll("\\", "/");
}

function collectCssFiles(directory, state = { entries: 0 }, depth = 0) {
  if (depth > maximumTreeDepth) throw new Error(`${displayPath(directory)} exceeds the ${maximumTreeDepth}-level tree-depth bound`);
  if (!existsSync(directory)) throw new Error(`${displayPath(directory)} does not exist`);
  if (lstatSync(directory).isSymbolicLink()) throw new Error(`${displayPath(directory)} is a symbolic link`);

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    state.entries += 1;
    if (state.entries > maximumTreeEntries) throw new Error(`public CSS trees exceed the ${maximumTreeEntries}-entry traversal bound`);
    const fullPath = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`${displayPath(fullPath)} is a symbolic link`);
    if (entry.isDirectory()) files.push(...collectCssFiles(fullPath, state, depth + 1));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".css") files.push(fullPath);
    else if (!entry.isFile() && !entry.isDirectory()) {
      throw new Error(`${displayPath(fullPath)} is not a regular file or directory`);
    }
  }
  return files;
}

function readBoundedUtf8(file) {
  const handle = openSync(file, "r");
  try {
    const before = fstatSync(handle);
    if (!before.isFile()) throw new Error("not a regular file");
    if (before.size === 0 || before.size > maximumStylesheetBytes) {
      throw new Error(`file length ${before.size} is outside the ${maximumStylesheetBytes}-byte bound`);
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

function validateEmbeddedSvg(source, label) {
  if (Buffer.byteLength(source, "utf8") > maximumEmbeddedSvgBytes) {
    throw new Error(`${label} exceeds the ${maximumEmbeddedSvgBytes}-byte embedded-SVG bound`);
  }
  const root = source.match(/^\s*<svg(?:\s[^>]*)?>/iu)?.[0] ?? "";
  if (!root || !/\sxmlns\s*=\s*(["'])http:\/\/www\.w3\.org\/2000\/svg\1/iu.test(root) || !/<\/svg>\s*$/iu.test(source)) {
    throw new Error(`${label} is not a complete SVG document`);
  }
  if (/<\/?[A-Za-z_][A-Za-z0-9_.-]*:|\s[A-Za-z_][A-Za-z0-9_.-]*:[A-Za-z_][A-Za-z0-9_.-]*\s*=/u.test(source)) {
    throw new Error(`${label} contains a namespace-prefixed element or attribute`);
  }
  if (/<!DOCTYPE|<!ENTITY/iu.test(source)) throw new Error(`${label} contains a DTD or entity declaration`);
  if (/<\/?(?:a|animate|animateMotion|animateTransform|audio|discard|embed|foreignObject|iframe|object|script|set|style|video)(?:\s|\/?>)/iu.test(source)) {
    throw new Error(`${label} contains an active or externally loadable element`);
  }
  if (/\son[a-z0-9_-]+\s*=/iu.test(source)) throw new Error(`${label} contains an event-handler attribute`);
  if (/\b(?:javascript|vbscript|file)\s*:/iu.test(source)) throw new Error(`${label} contains an active URI scheme`);

  const cssDecodedSource = decodeCssEscapes(source);
  if (/@(?:import|document)\b|expression\s*\(|\b(?:javascript|vbscript|file)\s*:/iu.test(cssDecodedSource)) {
    throw new Error(`${label} contains active inline style content`);
  }

  for (const match of source.matchAll(/(?:href|xlink:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/giu)) {
    const value = match[1] ?? match[2] ?? "";
    if (!/^#[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(value)) {
      throw new Error(`${label} contains a non-fragment resource reference`);
    }
  }
  const cssUrlMatches = [...cssDecodedSource.matchAll(/url\(\s*([^)]*?)\s*\)/giu)];
  const apparentCssUrls = cssDecodedSource.match(/url\s*\(/giu)?.length ?? 0;
  if (cssUrlMatches.length !== apparentCssUrls) throw new Error(`${label} contains an ambiguous CSS resource reference`);
  for (const match of cssUrlMatches) {
    const value = match[1].replace(/^['"]|['"]$/gu, "");
    if (!/^#[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(value)) {
      throw new Error(`${label} contains a non-fragment CSS resource reference`);
    }
  }
}

function decodeEmbeddedSvg(value, label) {
  const comma = value.indexOf(",");
  if (comma < 0) throw new Error(`${label} has no data-URI payload`);
  const mediaType = value.slice(5, comma).toLowerCase();
  const payload = value.slice(comma + 1);
  let bytes;
  if (mediaType === "image/svg+xml" || mediaType === "image/svg+xml;charset=utf-8") {
    let decoded;
    try {
      decoded = decodeURIComponent(payload);
    } catch {
      throw new Error(`${label} has invalid percent encoding`);
    }
    bytes = Buffer.from(decoded, "utf8");
  } else if (mediaType === "image/svg+xml;base64") {
    if (payload.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(payload)) {
      throw new Error(`${label} has noncanonical base64 encoding`);
    }
    bytes = Buffer.from(payload, "base64");
  } else {
    throw new Error(`${label} uses unapproved embedded media type ${JSON.stringify(mediaType)}`);
  }
  if (bytes.length === 0 || bytes.length > maximumEmbeddedSvgBytes) {
    throw new Error(`${label} decoded length is outside the embedded-SVG bound`);
  }
  validateEmbeddedSvg(utf8Decoder.decode(bytes), label);
}

function validateRootRelativeUrl(value, label) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    throw new Error(`${label} is not an origin-local absolute path`);
  }
  if (/[\\\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} contains a backslash or control character`);
  const rawPath = value.split(/[?#]/u, 1)[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    throw new Error(`${label} has invalid percent encoding`);
  }
  if (decodedPath.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error(`${label} contains a path traversal segment`);
  }
  const parsed = new URL(value, "https://social.mochirii.com");
  if (parsed.origin !== "https://social.mochirii.com" || parsed.username || parsed.password) {
    throw new Error(`${label} resolves outside the approved origin`);
  }
}

function validateCssUrl(value, label) {
  if (value.length === 0) throw new Error(`${label} is empty`);
  if (value.startsWith("data:")) decodeEmbeddedSvg(value, label);
  else if (value.startsWith("#")) {
    if (!/^#[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(value)) throw new Error(`${label} has an invalid fragment`);
  } else validateRootRelativeUrl(value, label);
}

function validateStylesheet(source, label) {
  const root = postcss.parse(source, { from: label });
  let declarations = 0;
  let urls = 0;

  root.walkAtRules((rule) => {
    if (["import", "document"].includes(decodeCssEscapes(rule.name).toLowerCase())) {
      throw rule.error(`@${rule.name} is not permitted in public generated CSS`);
    }
  });
  root.walkDecls((declaration) => {
    declarations += 1;
    const property = decodeCssEscapes(declaration.prop).toLowerCase();
    const value = declaration.value;
    const decodedValue = decodeCssEscapes(value);
    if (property === "behavior" || property === "-moz-binding") {
      throw declaration.error(`${declaration.prop} is not permitted in public generated CSS`);
    }
    if (/expression\s*\(|(?:javascript|vbscript|file)\s*:/iu.test(decodedValue)) {
      throw declaration.error("active CSS content is not permitted in public generated CSS");
    }

    const matches = [...decodedValue.matchAll(urlPattern)];
    const apparentUrlFunctions = decodedValue.match(/url\s*\(/giu)?.length ?? 0;
    if (matches.length !== apparentUrlFunctions) throw declaration.error("contains an ambiguous or malformed url() value");
    for (const match of matches) {
      const resource = (match[1] ?? match[2] ?? match[3] ?? "").trim();
      validateCssUrl(resource, `${label}:${declaration.source?.start?.line ?? 0} url()`);
      urls += 1;
    }
  });
  return { declarations, urls };
}

function expectReject(label, source) {
  try {
    validateStylesheet(source, `<canary:${label}>`);
  } catch {
    return;
  }
  throw new Error(`CSS semantic canary failed closed: ${label}`);
}

validateStylesheet(
  String.raw`.safe{mask-image:url(data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3Cpath%20d='M0%200h1v1H0z'/%3E%3C/svg%3E);src:url('/fonts/safe.woff2?#iefix');background:u\72l(\2f assets/safe.png)}`,
  "<canary:safe>",
);
expectReject("external URL", ".unsafe{background:url(https://example.invalid/a.png)}");
expectReject("escaped external URL", String.raw`.unsafe{background:u\72l(https://example.invalid/a.png)}`);
expectReject("CRLF-terminated escaped external URL", ".unsafe{background:u\\72\r\nl(https://example.invalid/a.png)}");
expectReject("continued external URL", ".unsafe{background:u\\\nrl(https://example.invalid/a.png)}");
expectReject("scriptable data SVG", ".unsafe{background:url(\"data:image/svg+xml,%3Csvg%3E%3Cscript/%3E%3C/svg%3E\")}");
expectReject(
  "namespace-aliased data SVG script",
  ".unsafe{background:url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20xmlns:s='http://www.w3.org/2000/svg'%3E%3Cs:script/%3E%3C/svg%3E\")}",
);
expectReject(
  "data SVG SMIL resource mutation",
  ".unsafe{background:url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3Cimage%20id='x'/%3E%3Cset%20href='%23x'%20attributeName='href'%20to='https://example.invalid/a.png'/%3E%3C/svg%3E\")}",
);
expectReject("CSS expression", ".unsafe{width:expression(alert(1))}");
expectReject("escaped CSS expression", String.raw`.unsafe{width:expre\73 sion(alert(1))}`);
expectReject(
  "escaped inline data SVG expression",
  String.raw`.unsafe{background:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3Cpath%20style='width:expre%5C73%20sion(alert(1))'/%3E%3C/svg%3E")}`,
);
expectReject("import", "@import url('/css/other.css');");
expectReject("escaped import", String.raw`@\69mport url('/css/other.css');`);

const failures = [];
let files = [];
let declarationCount = 0;
let urlCount = 0;
try {
  files = collectCssFiles(publicCssDir).sort((left, right) => left.localeCompare(right));
  if (files.length === 0) throw new Error("no generated public CSS files were found");
  if (files.length > maximumStylesheetFiles) throw new Error(`public CSS trees exceed the ${maximumStylesheetFiles}-file parse bound`);
} catch (error) {
  failures.push(`public/css: ${error instanceof Error ? error.message : String(error)}`);
}

for (const file of files) {
  try {
    const result = validateStylesheet(readBoundedUtf8(file), displayPath(file));
    declarationCount += result.declarations;
    urlCount += result.urls;
  } catch (error) {
    failures.push(`${displayPath(file)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error(`Generated public CSS semantic check failed (${failures.length}/${files.length} files):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Generated public CSS semantics passed (${files.length} files, ${declarationCount} declarations, ${urlCount} bounded local/embedded URLs).`);
