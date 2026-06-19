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
  assert(manifest.economy?.mode === "test-soft-currency", "Manifest economy must stay test-soft-currency.");
  assert(manifest.chain?.provider === "enjin", "Manifest chain provider must stay Enjin.");
  assert(manifest.chain?.network === "CANARY", "Manifest chain network must stay CANARY.");
  assert(manifest.market?.fixedPrice === true, "Manifest must keep fixed-price market enabled.");
  assert(manifest.market?.directTrade === true, "Manifest must keep direct trade enabled.");
  assert(manifest.market?.auctions === false, "Manifest must keep auctions disabled.");
  assert(manifest.market?.cashout === false, "Manifest must keep cashout disabled.");
  assert(manifest.ugc === "curated", "Manifest UGC mode must stay curated.");
  assert(manifest.progress?.authority === "mochirii-edge", "Manifest must identify Mochirii Edge as account-progress authority.");
  assert(manifest.progress?.linkedAccount === true, "Manifest must expose linked account progress support.");
  assert(manifest.progress?.guestFallback === true, "Manifest must keep guest progress fallback.");
  assert(manifest.progress?.snapshotEndpoint === "/integration/alpha/progress", "Manifest must expose the account progress snapshot endpoint.");

  if (siteOrigin) {
    const allowedOrigin = manifestResult.headers.get("access-control-allow-origin");
    assert(allowedOrigin === siteOrigin, `Game runtime must allow the configured site origin. Expected ${siteOrigin}, received ${allowedOrigin || "<missing>"}.`);
  }

  const alphaStatus = await getJson("/integration/alpha/status", "alpha status");
  assert(alphaStatus.ok === true, "Alpha status must return ok=true.");
  assert(alphaStatus.alpha?.allowlistRequired === true, "Alpha status must require allowlist.");
  assert(alphaStatus.alpha?.termsRequired === true, "Alpha status must require terms.");
  assert(alphaStatus.alpha?.noRealValue === true, "Alpha status must keep no-real-value posture.");
  assert(alphaStatus.economy?.mode === "test-soft-currency", "Alpha status economy must stay test-soft-currency.");
  assert(alphaStatus.chain?.provider === "enjin", "Alpha status chain provider must stay Enjin.");
  assert(alphaStatus.chain?.network === "CANARY", "Alpha status chain network must stay CANARY.");
  assert(alphaStatus.market?.fixedPrice === true, "Alpha status must keep fixed-price enabled.");
  assert(alphaStatus.market?.directTrade === true, "Alpha status must keep direct trade enabled.");
  assert(alphaStatus.market?.auctions === false, "Alpha status must keep auctions disabled.");
  assert(alphaStatus.market?.cashout === false, "Alpha status must keep cashout disabled.");
  assert(alphaStatus.ugc === "curated", "Alpha status UGC mode must stay curated.");
  assert(alphaStatus.edgeFunctions?.session === "mochi-social-alpha-session", "Alpha status must expose the session Edge Function.");
  assert(alphaStatus.edgeFunctions?.action === "mochi-social-alpha-action", "Alpha status must expose the action Edge Function.");
  assert(alphaStatus.edgeFunctions?.progress === "mochi-social-alpha-progress", "Alpha status must expose the progress Edge Function.");
  assert(alphaStatus.edgeFunctions?.admin === "mochi-social-alpha-admin", "Alpha status must expose the admin Edge Function.");
  assert(alphaStatus.edgeFunctions?.feedback === "submit-mochi-social-feedback", "Alpha status must expose the feedback Edge Function.");
  assert(alphaStatus.chainRuntime?.provider === "enjin", "Alpha chain runtime provider must stay Enjin.");
  assert(alphaStatus.chainRuntime?.network === "CANARY", "Alpha chain runtime network must stay CANARY.");
  assert(["configured", "configured-preview-stub"].includes(alphaStatus.chainRuntime?.mode), "Alpha chain runtime mode must be configured or configured-preview-stub.");
  if (alphaStatus.enjinCanaryConfigured === false) {
    assert(alphaStatus.chainRuntime?.mode === "configured-preview-stub", "Unconfigured Enjin runtime must expose configured-preview-stub.");
  }

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
