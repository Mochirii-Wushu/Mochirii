const baseUrlInput = process.env.MOCHI_SOCIAL_GAME_CONTRACT_URL || process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "";
const siteOriginInput = process.env.MOCHI_SOCIAL_SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "";

if (!baseUrlInput.trim()) {
  console.log("Mochi Social game contract check skipped. Set MOCHI_SOCIAL_GAME_CONTRACT_URL or NEXT_PUBLIC_MOCHI_SOCIAL_URL to verify a local/Fly game runtime.");
  process.exit(0);
}

const baseUrl = normalizeUrl(baseUrlInput, "Mochi Social game URL");
const siteOrigin = siteOriginInput.trim() ? normalizeOrigin(siteOriginInput, "Mochi Social site origin") : "";

try {
  await run();
  console.log(`Mochi Social game contract check passed for ${baseUrl}`);
  if (siteOrigin) console.log(`Allowed-origin CORS proof passed for ${siteOrigin}`);
} catch (error) {
  console.error("Mochi Social game contract check failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function run() {
  const health = await getJson("/healthz", "health");
  assert(health.ok === true, "/healthz must return ok=true.");
  assert(health.name === "Mochi Social", "/healthz must identify Mochi Social.");
  assert(health.activeRuntime === "unity-webgl", "/healthz must report Unity WebGL as the active runtime.");
  assert(health.unityWebglBuild?.present === true, "/healthz must report the Unity WebGL build as present.");
  assert(health.legacyFallback?.active === false, "/healthz must report legacy fallback inactive.");

  const manifestResult = await request("/integration/game-manifest.json", "manifest", {
    headers: siteOrigin ? { Origin: siteOrigin } : undefined,
  });
  const manifest = parseJsonBody(manifestResult, "manifest");
  assert(manifest.name === "Mochi Social", "Manifest name must stay Mochi Social.");
  assert(manifest.slug === "mochi-social", "Manifest slug must stay mochi-social.");
  assert(manifest.origin === new URL(manifest.origin).origin, "Manifest origin must be an origin, not a path URL.");
  assert(manifest.playUrl === `${manifest.origin}/play`, "Manifest playUrl must point to /play.");
  assert(manifest.embedUrl === `${manifest.origin}/embed`, "Manifest embedUrl must point to /embed.");
  assert(manifest.healthUrl === `${manifest.origin}/healthz`, "Manifest healthUrl must point to /healthz.");
  assert(manifest.engine === "unity-webgl", 'Manifest engine must be "unity-webgl".');
  assert(manifest.activeRuntime === "unity-webgl", 'Manifest activeRuntime must be "unity-webgl".');
  assert(manifest.unityWebglBuild?.present === true, "Manifest must report the Unity WebGL build as present.");
  assert(manifest.legacyFallback?.active === false, "Manifest must report legacy fallback inactive.");
  assert(manifest.room?.key === "jade-lantern-room-alpha", "Manifest room key must be jade-lantern-room-alpha.");
  assert(manifest.room?.mode === "single-shared-room", "Manifest room mode must be single-shared-room.");
  assert(manifest.room?.capacity === 25, "Manifest room capacity must be 25.");
  assert(manifest.room?.sharedPetKey === "lirabao", "Manifest shared starter pet must be Lirabao.");
  const manifestRuntime = manifest.runtime || manifest.unity || {};
  assert(manifestRuntime.realtimeAuthority === "ugs-distributed-authority", "Manifest runtime must use UGS Distributed Authority.");
  assert(manifestRuntime.stateAuthority === "ugs-cloud-save", "Manifest runtime must use UGS Cloud Save.");
  assert(manifest.bridge?.protocolVersion === 1, "Manifest bridge protocol version must stay 1.");
  assert(manifest.bridge?.namespace === "MOCHI_SOCIAL", "Manifest bridge namespace must stay MOCHI_SOCIAL.");
  assertIncludes(manifest.bridge?.parentToGame, "MOCHI_SOCIAL_AUTH", "Manifest parent-to-game bridge must accept MOCHI_SOCIAL_AUTH.");
  assertIncludes(manifest.bridge?.parentToGame, "MOCHI_SOCIAL_SIGN_OUT", "Manifest parent-to-game bridge must accept MOCHI_SOCIAL_SIGN_OUT.");
  assertIncludes(manifest.bridge?.gameToParent, "MOCHI_SOCIAL_READY", "Manifest game-to-parent bridge must emit MOCHI_SOCIAL_READY.");
  assertIncludes(manifest.bridge?.gameToParent, "MOCHI_SOCIAL_AUTH_STATE", "Manifest game-to-parent bridge must emit MOCHI_SOCIAL_AUTH_STATE.");
  assertIncludes(manifest.bridge?.gameToParent, "MOCHI_SOCIAL_ERROR", "Manifest game-to-parent bridge must emit MOCHI_SOCIAL_ERROR.");
  assert(manifest.auth?.provider === "supabase", "Manifest auth provider must stay Supabase.");
  assert(manifest.auth?.tokenPolicy === "access-token-only", "Manifest auth token policy must stay access-token-only.");
  assert(["closed-alpha", "guest-first"].includes(manifest.auth?.mode), "Manifest auth mode must be closed-alpha or guest-first.");
  assert(manifest.alpha?.allowlistRequired === true, "Manifest must require alpha allowlist.");
  assert(manifest.alpha?.termsRequired === true, "Manifest must require alpha terms.");
  assert(manifest.alpha?.noRealValue === true, "Manifest must keep no-real-value alpha posture.");
  assertNoFutureSystemKeys(manifest, "Manifest");
  assert(manifest.avatarUploads === false, "Manifest avatar uploads must stay disabled for curated character presets.");
  assert(manifest.ugc === "curated", "Manifest UGC mode must stay curated.");

  if (siteOrigin) {
    const allowedOrigin = manifestResult.headers.get("access-control-allow-origin");
    assert(allowedOrigin === siteOrigin, `Game runtime must allow the configured site origin. Expected ${siteOrigin}, received ${allowedOrigin || "<missing>"}.`);
  }

  const alphaStatus = await getJson("/integration/alpha/status", "alpha status");
  assert(alphaStatus.ok === true, "Alpha status must return ok=true.");
  assert(alphaStatus.alpha?.allowlistRequired === true, "Alpha status must require allowlist.");
  assert(alphaStatus.alpha?.termsRequired === true, "Alpha status must require terms.");
  assert(alphaStatus.alpha?.noRealValue === true, "Alpha status must keep no-real-value posture.");
  assert(alphaStatus.engine === "unity-webgl", 'Alpha status engine must be "unity-webgl".');
  assert(alphaStatus.activeRuntime === "unity-webgl", 'Alpha status activeRuntime must be "unity-webgl".');
  assert(alphaStatus.unityWebglBuild?.present === true, "Alpha status must report the Unity WebGL build as present.");
  assert(alphaStatus.legacyFallback?.active === false, "Alpha status must report legacy fallback inactive.");
  assert(alphaStatus.room?.key === "jade-lantern-room-alpha", "Alpha status room key must be jade-lantern-room-alpha.");
  assert(alphaStatus.room?.mode === "single-shared-room", "Alpha status room mode must be single-shared-room.");
  assert(alphaStatus.room?.capacity === 25, "Alpha status room capacity must be 25.");
  assert(alphaStatus.room?.sharedPetKey === "lirabao", "Alpha status shared starter pet must be Lirabao.");
  const alphaRuntime = alphaStatus.runtime || alphaStatus.unity || {};
  assert(alphaRuntime.realtimeAuthority === "ugs-distributed-authority", "Alpha status runtime must use UGS Distributed Authority.");
  assert(alphaRuntime.stateAuthority === "ugs-cloud-save", "Alpha status runtime must use UGS Cloud Save.");
  assertNoFutureSystemKeys(alphaStatus, "Alpha status");
  assert(alphaStatus.avatarUploads === false, "Alpha status avatar uploads must stay disabled.");
  assert(alphaStatus.ugc === "curated", "Alpha status UGC mode must stay curated.");
  assert(alphaStatus.edgeFunctions?.session === "mochi-social-alpha-session", "Alpha status must expose the session Edge Function.");
  assert(alphaStatus.edgeFunctions?.unityAuth === "mochi-social-unity-auth", "Alpha status must expose the Unity auth Edge Function.");
  assert(alphaStatus.edgeFunctions?.action === "mochi-social-alpha-action", "Alpha status must expose the action Edge Function.");
  assert(alphaStatus.edgeFunctions?.admin === "mochi-social-alpha-admin", "Alpha status must expose the admin Edge Function.");
  assert(alphaStatus.edgeFunctions?.feedback === "submit-mochi-social-feedback", "Alpha status must expose the feedback Edge Function.");
  assert(!("chainRuntime" in alphaStatus), "Alpha status must not expose future asset runtime state.");
  assert(!("enjinCanaryConfigured" in alphaStatus), "Alpha status must not expose future asset provider state.");

  const embed = await request("/embed", "embed");
  assert((embed.headers.get("content-type") || "").includes("text/html"), "/embed must return HTML for the iframe.");
  assert(String(embed.body).includes("Mochi Social"), "/embed HTML must identify Mochi Social.");
}

async function getJson(path, name) {
  const result = await request(path, name);
  return parseJsonBody(result, name);
}

async function request(path, name, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.text();
  const result = { name, path, status: response.status, headers: response.headers, body };
  assert(response.status >= 200 && response.status < 300, `${name} failed with HTTP ${response.status}.`);
  return result;
}

function parseJsonBody(result, name) {
  const contentType = result.headers.get("content-type") || "";
  assert(contentType.includes("application/json"), `${name} must return JSON.`);
  return JSON.parse(result.body);
}

function normalizeUrl(value, label) {
  const url = new URL(value.trim());
  assert(["http:", "https:"].includes(url.protocol), `${label} must use http or https.`);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function normalizeOrigin(value, label) {
  const url = new URL(value.trim());
  assert(["http:", "https:"].includes(url.protocol), `${label} must use http or https.`);
  return url.origin;
}

function assertIncludes(value, expected, message) {
  assert(Array.isArray(value) && value.includes(expected), message);
}

function assertNoFutureSystemKeys(payload, label) {
  const text = JSON.stringify(payload);
  assert(!/\b(?:market|trade|cashout)\b/i.test(text), `${label} must not publish future economy keys for the Unity shared-room alpha.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
