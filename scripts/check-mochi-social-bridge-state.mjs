import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = process.cwd();
const helperPath = join(root, "apps/web/lib/mochi-social/bridge.ts");
const tempDir = mkdtempSync(join(tmpdir(), "mochirii-mochi-social-bridge-"));
const requireFromWeb = createRequire(pathToFileURL(join(root, "apps/web/package.json")));
const ts = requireFromWeb("typescript");

try {
  const source = readFileSync(helperPath, "utf8");
  assertNoForbiddenMaterial("bridge helper", source);

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
    fileName: helperPath,
  });
  assert.equal(compiled.diagnostics?.length || 0, 0, "Bridge helper should transpile without diagnostics.");

  const compiledPath = join(tempDir, "bridge.mjs");
  writeFileSync(compiledPath, compiled.outputText, "utf8");
  const bridge = await import(pathToFileURL(compiledPath));

  const resolve = bridge.resolveMochiSocialBridgeMessage;
  assert.equal(typeof resolve, "function", "resolveMochiSocialBridgeMessage must be exported.");

  assert.deepEqual(resolve(null), { action: "ignore" }, "Null message should be ignored.");
  assert.deepEqual(resolve("MOCHI_SOCIAL_READY"), { action: "ignore" }, "String message should be ignored.");
  assert.deepEqual(resolve({ type: "MOCHI_SOCIAL_READY" }), { action: "ignore" }, "Messages without protocolVersion 1 should be ignored.");
  assert.deepEqual(resolve({ type: "MOCHI_SOCIAL_READY", protocolVersion: 2 }), { action: "ignore" }, "Wrong protocol version should be ignored.");
  assert.deepEqual(resolve({ type: "OTHER_EVENT", protocolVersion: 1 }), { action: "ignore" }, "Unknown event type should be ignored.");

  assert.deepEqual(
    resolve({ type: "MOCHI_SOCIAL_READY", protocolVersion: 1 }),
    { action: "send-auth", status: "ready" },
    "READY should request an access-token-only auth resend.",
  );

  for (const state of ["linked", "guest", "error"]) {
    assert.deepEqual(
      resolve({ type: "MOCHI_SOCIAL_AUTH_STATE", protocolVersion: 1, payload: { state } }),
      { action: "set-status", status: state },
      `AUTH_STATE ${state} should be reflected as a non-secret bridge status.`,
    );
  }

  assert.deepEqual(
    resolve({ type: "MOCHI_SOCIAL_AUTH_STATE", protocolVersion: 1, payload: { state: "unexpected" } }),
    { action: "set-status", status: "ready" },
    "Unknown AUTH_STATE payloads should fall back to ready instead of exposing arbitrary state.",
  );

  const errorResult = resolve({ type: "MOCHI_SOCIAL_ERROR", protocolVersion: 1 });
  assert.equal(errorResult.action, "error", "Game error messages should move the bridge into error state.");
  assert.equal(errorResult.status, "error", "Game error messages should record error status.");
  assert.equal(errorResult.message, bridge.MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE, "Error message should come from the shared helper constant.");
  assertNoForbiddenMaterial("bridge error message", errorResult.message);

  console.log("Mochi Social bridge state self-test OK.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertNoForbiddenMaterial(label, value) {
  for (const forbidden of [
    "refresh_token",
    "refreshToken",
    "provider_token",
    "providerToken",
    "provider_refresh_token",
    "service_role",
    "serviceRole",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DISCORD_BOT_TOKEN",
    "ENJIN_PLATFORM_TOKEN",
    "KEY_PASS",
    "PLATFORM_KEY",
  ]) {
    assert(!String(value).includes(forbidden), `${label} must not include ${forbidden}.`);
  }
}
