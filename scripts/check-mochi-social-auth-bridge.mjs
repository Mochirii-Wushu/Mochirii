import { readFileSync } from "node:fs";

const componentPath = "apps/web/components/mochi-social/MochiSocialAlphaClient.tsx";
const text = readFileSync(componentPath, "utf8");
const failures = [];

requireSnippet("NEXT_PUBLIC_MOCHI_SOCIAL_URL", "game origin must come from the public Mochi Social URL env.");
requireSnippet("payload: { accessToken: token }", "MOCHI_SOCIAL_AUTH payload must contain only the short-lived access token field.");
requireSnippet("auth.data?.session?.access_token || null", "initial session read must use Supabase access_token only.");
requireSnippet("nextSession?.access_token || null", "auth-state updates must use Supabase access_token only.");
requireSnippet("onLoad={() => sendAuthToGame(accessToken)}", "iframe load must resend the current access-token-only auth message.");
requireSnippet('frame.postMessage({ type: "MOCHI_SOCIAL_SIGN_OUT", protocolVersion: 1 }, gameOrigin)', "sign-out bridge message must not include token payload data.");
requireSnippet('window.addEventListener("message", handleGameMessage);', "parent page must listen for game bridge messages.");
requireSnippet("event.origin !== gameOrigin", "game bridge listener must ignore messages from unexpected origins.");
requireSnippet("data.protocolVersion !== 1", "game bridge listener must enforce the protocol version.");
requireSnippet('data.type === "MOCHI_SOCIAL_READY"', "game bridge listener must handle the READY event.");
requireSnippet("sendAuthToGame(accessToken);", "READY handling must send only the current access token through the existing bridge helper.");
requireSnippet('data.type === "MOCHI_SOCIAL_AUTH_STATE"', "game bridge listener must handle auth-state replies.");
requireSnippet('data.type === "MOCHI_SOCIAL_ERROR"', "game bridge listener must handle game-side bridge errors.");
requireSnippet("data-mochi-bridge-state", "page must expose a non-secret bridge status indicator.");

const authIndex = text.indexOf('type: "MOCHI_SOCIAL_AUTH"');
if (authIndex === -1) {
  failures.push("MOCHI_SOCIAL_AUTH postMessage block was not found.");
} else {
  const authBlock = text.slice(Math.max(0, authIndex - 160), authIndex + 360);
  if (!authBlock.includes("frame.postMessage(")) failures.push("MOCHI_SOCIAL_AUTH must be sent through frame.postMessage.");
  if (!authBlock.includes("gameOrigin")) failures.push("MOCHI_SOCIAL_AUTH postMessage must target gameOrigin.");
  if (!authBlock.includes("payload: { accessToken: token }")) failures.push("MOCHI_SOCIAL_AUTH payload must stay access-token-only.");
  assertNoForbiddenBridgeMaterial("MOCHI_SOCIAL_AUTH block", authBlock);
}

assertNoForbiddenBridgeMaterial("MochiSocialAlphaClient", text);

if (failures.length) {
  console.error("Mochi Social auth bridge check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mochi Social auth bridge check passed.");

function requireSnippet(snippet, message) {
  if (!text.includes(snippet)) failures.push(`${message} Missing snippet: ${snippet}`);
}

function assertNoForbiddenBridgeMaterial(label, value) {
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
    if (value.includes(forbidden)) {
      failures.push(`${label} must not include ${forbidden}.`);
    }
  }
}
