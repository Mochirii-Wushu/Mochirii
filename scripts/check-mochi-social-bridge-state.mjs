import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const helperPath = join(root, "apps/web/lib/mochi-social/bridge.ts");

const source = readFileSync(helperPath, "utf8");
assertNoForbiddenMaterial("bridge helper", source);

const cases = [
  { input: null, expected: { action: "ignore" }, message: "Null message should be ignored." },
  { input: "MOCHI_SOCIAL_READY", expected: { action: "ignore" }, message: "String message should be ignored." },
  { input: { type: "MOCHI_SOCIAL_READY" }, expected: { action: "ignore" }, message: "Messages without protocolVersion 1 should be ignored." },
  { input: { type: "MOCHI_SOCIAL_READY", protocolVersion: 2 }, expected: { action: "ignore" }, message: "Wrong protocol version should be ignored." },
  { input: { type: "OTHER_EVENT", protocolVersion: 1 }, expected: { action: "ignore" }, message: "Unknown event type should be ignored." },
  { input: { type: "MOCHI_SOCIAL_READY", protocolVersion: 1 }, expected: { action: "send-auth", status: "ready" }, message: "READY should request an access-token-only auth resend." },
  { input: { type: "MOCHI_SOCIAL_AUTH_STATE", protocolVersion: 1, payload: { state: "linked" } }, expected: { action: "set-status", status: "linked" }, message: "AUTH_STATE linked should be reflected as a non-secret bridge status." },
  { input: { type: "MOCHI_SOCIAL_AUTH_STATE", protocolVersion: 1, payload: { state: "guest" } }, expected: { action: "set-status", status: "guest" }, message: "AUTH_STATE guest should be reflected as a non-secret bridge status." },
  { input: { type: "MOCHI_SOCIAL_AUTH_STATE", protocolVersion: 1, payload: { state: "error" } }, expected: { action: "set-status", status: "error" }, message: "AUTH_STATE error should be reflected as a non-secret bridge status." },
  { input: { type: "MOCHI_SOCIAL_AUTH_STATE", protocolVersion: 1, payload: { state: "unexpected" } }, expected: { action: "set-status", status: "ready" }, message: "Unknown AUTH_STATE payloads should fall back to ready instead of exposing arbitrary state." },
  { input: { type: "MOCHI_SOCIAL_ERROR", protocolVersion: 1 }, expected: null, message: "Game error messages should move the bridge into error state." },
];
const bridge = loadBridgeHelperResults(helperPath, cases.map((entry) => entry.input));

assert.equal(bridge.exportedResolveType, "function", "resolveMochiSocialBridgeMessage must be exported.");
cases.forEach((entry, index) => {
  if (entry.expected) assert.deepEqual(bridge.results[index], entry.expected, entry.message);
});

const errorResult = bridge.results.at(-1);
assert.equal(errorResult.action, "error", "Game error messages should move the bridge into error state.");
assert.equal(errorResult.status, "error", "Game error messages should record error status.");
assert.equal(errorResult.message, bridge.MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE, "Error message should come from the shared helper constant.");
assertNoForbiddenMaterial("bridge error message", errorResult.message);

console.log("Mochi Social bridge state self-test OK.");

function loadBridgeHelperResults(path, inputs) {
  const bridgeUrl = pathToFileURL(path).href;
  const script = `
    const bridge = await import(${JSON.stringify(bridgeUrl)});
    const cases = ${JSON.stringify(inputs)};
    const payload = {
      MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE: bridge.MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE,
      exportedResolveType: typeof bridge.resolveMochiSocialBridgeMessage,
      results: cases.map((value) => bridge.resolveMochiSocialBridgeMessage(value))
    };
    process.stdout.write(JSON.stringify(payload));
  `;
  const result = spawnSync(process.execPath, ["--no-warnings", "--experimental-strip-types", "--input-type=module", "-e", script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `Bridge helper should import with Node type stripping. ${result.stderr || result.stdout}`);

  return JSON.parse(result.stdout);
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
