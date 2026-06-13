import { readFileSync } from 'node:fs';

const browserGateEnvNames = [
  'MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED',
  'MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER',
  'MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER',
  'MOCHI_SOCIAL_SITE_BROWSER_GATES_URL',
  'MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE',
  'MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_LOCKED_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_GAME_PRESENCE_OK',
  'MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK'
];

const checks = [
  {
    file: 'package.json',
    includes: ['check:mochi-social-alpha', 'check:mochi-social-auth-bridge', 'check:mochi-social-bridge-state', 'check:mochi-social-browser-gates', 'check:mochi-social-discord-oauth', 'check:mochi-social-edge-authority', 'check:mochi-social-game-contract', 'check:mochi-social-preview-key-loader', 'check:mochi-social-preview-url', 'check:mochi-social-preview-ready', 'check:mochi-social-report-hygiene', 'check:mochi-social-tester-password-gate', 'prepare:mochi-social-alpha-operator-checklist', 'prepare:mochi-social-browser-gates']
  },
  {
    file: 'AGENTS.md',
    includes: ['Alpha Preview Ready', 'configured-preview-stub', 'funded-chain-gates', 'dummy Enjin IDs']
  },
  {
    file: 'scripts/check-all.mjs',
    includes: ['check:mochi-social-alpha', 'check:mochi-social-auth-bridge', 'check:mochi-social-bridge-state', 'check:mochi-social-browser-gates', 'check:mochi-social-discord-oauth', 'check:mochi-social-edge-authority', 'check:mochi-social-game-contract', 'check:mochi-social-preview-key-loader', 'check:mochi-social-preview-url', 'check:mochi-social-tester-password-gate', 'check:mochi-social-report-hygiene']
  },
  {
    file: 'scripts/check-mochi-social-game-contract.mjs',
    includes: ['MOCHI_SOCIAL_GAME_CONTRACT_URL', 'NEXT_PUBLIC_MOCHI_SOCIAL_URL', '/integration/game-manifest.json', '/integration/alpha/status', 'MOCHI_SOCIAL_AUTH', 'configured-preview-stub']
  },
  {
    file: 'scripts/smoke-mochi-social-alpha-edge.mjs',
    includes: ['MOCHI_SOCIAL_ALPHA_EDGE_URL', 'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY', 'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'selectPublishableKey', 'mochi-social-alpha-session', 'mochi-social-alpha-action', 'invalid_game_server_token', 'invalid_alpha_action']
  },
  {
    file: 'scripts/prepare-mochi-social-alpha-operator-checklist.mjs',
    includes: ['Desktop', 'Creds', 'mochirii-mochi-social-alpha-operator-next-steps.md', 'This file is intentionally no-secret', 'MOCHI_SOCIAL_PREVIEW_ENV_FILE', 'readPreviewEnvFile', 'Local no-secret preview URL file', 'NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'MOCHI_SOCIAL_ALPHA_EDGE_URL', 'MOCHI_SOCIAL_ALPHA_AUTH_URL', 'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'MOCHI_SOCIAL_GAME_SERVER_TOKEN', 'Discord OAuth setup', 'site.discord-oauth', 'Alpha Preview Ready', 'configured-preview-stub', 'funded-chain gates', 'Do not set dummy', 'Local Branch Sync', 'Public-repo pushes are allowed', 'Push C:\\\\Users\\\\xtyty\\\\Documents\\\\Mochirii', ...browserGateEnvNames]
  },
  {
    file: 'scripts/check-mochi-social-preview-ready.mjs',
    includes: ['Mochirii Mochi Social Alpha Preview Ready audit', 'reports/mochi-social-preview-ready.json', 'mochirii-mochi-social-preview-ready.md', 'MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED', 'MOCHI_SOCIAL_SITE_PREVIEW_READY_SKIP_SELF_TEST_COMMANDS', 'MOCHI_SOCIAL_PREVIEW_ENV_FILE', 'Local Preview URL File', 'readPreviewEnvFile', 'urlFieldsRead', 'MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON', 'reports/mochi-social-browser-gates.json', 'addStoredManualBrowserGateRequirement', 'stored browser gate report', 'MOCHI_SOCIAL_SITE_REPORT_HYGIENE_JSON', 'reports/mochi-social-report-hygiene.json', 'site.report-hygiene', 'check:mochi-social-report-hygiene', 'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'publishableKeySource', 'not-loaded-awaiting-hosted-approval', 'selectPublishableKey', 'site.bridge-state', 'check-mochi-social-bridge-state.mjs', 'site.auth-bridge', 'check-mochi-social-auth-bridge.mjs', 'site.edge-authority', 'check-mochi-social-edge-authority.mjs', 'site.preview-key-loader', 'check-mochi-social-preview-key-loader.mjs', 'site.discord-oauth-detector', 'check-mochi-social-discord-oauth-self-test.mjs', 'site.game-contract', 'site.edge-smoke', 'site.discord-oauth', 'MOCHI_SOCIAL_ALPHA_AUTH_URL', 'provider is not enabled', 'site.manual-browser-gates', 'site.branch-sync', 'site.game-preview-ready', 'browserGateEnvForMode', 'tester-password locked page visible', ...browserGateEnvNames]
  },
  {
    file: 'scripts/check-mochi-social-preview-key-loader.mjs',
    includes: ['MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'not-loaded-awaiting-hosted-approval', 'publishableKeyPresent === true', 'publishableKeySource', 'assertNoLeak', 'Mochi Social preview publishable-key loader self-test OK']
  },
  {
    file: 'scripts/check-mochi-social-preview-url-self-test.mjs',
    includes: ['Mochi Social preview URL self-test OK', 'mochi-social-alpha-vercel-preview.local.txt', 'MOCHI_SOCIAL_GAME_URL', 'MOCHI_SOCIAL_SITE_PREVIEW_URL', 'Local no-secret preview URL file', '## Local Preview URL File', 'assertNoLeak', 'fakeToken']
  },
  {
    file: 'scripts/check-mochi-social-auth-bridge.mjs',
    includes: ['Mochi Social auth bridge check passed', 'payload: { accessToken: token }', 'resolveMochiSocialBridgeMessage(event.data)', 'MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE', 'refreshToken', 'SUPABASE_SERVICE_ROLE_KEY', 'DISCORD_BOT_TOKEN', 'ENJIN_PLATFORM_TOKEN']
  },
  {
    file: 'scripts/check-mochi-social-bridge-state.mjs',
    includes: ['Mochi Social bridge state self-test OK', 'MOCHI_SOCIAL_READY', 'MOCHI_SOCIAL_AUTH_STATE', 'MOCHI_SOCIAL_ERROR', 'access-token-only', 'assertNoForbiddenMaterial']
  },
  {
    file: 'apps/web/lib/mochi-social/bridge.ts',
    includes: ['MochiSocialBridgeStatus', 'resolveMochiSocialBridgeMessage', 'MOCHI_SOCIAL_READY', 'MOCHI_SOCIAL_AUTH_STATE', 'MOCHI_SOCIAL_ERROR', 'MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE']
  },
  {
    file: 'scripts/check-mochi-social-browser-gate-self-test.mjs',
    includes: ['MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED', 'MOCHI_SOCIAL_SITE_BROWSER_GATES_URL', 'MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE', 'hosted browser gate confirmation requires', 'write-mochi-social-browser-gates.mjs', 'stored browser gate report', 'stored tester-password report', 'fakeToken', 'site.bridge-state', 'check-mochi-social-bridge-state.mjs', 'site.auth-bridge', 'check-mochi-social-auth-bridge.mjs', 'site.preview-key-loader', 'check-mochi-social-preview-key-loader.mjs', 'site.discord-oauth-detector', 'check-mochi-social-discord-oauth-self-test.mjs', 'site.manual-browser-gates', 'Preview Ready should still remain red', ...browserGateEnvNames]
  },
  {
    file: 'scripts/write-mochi-social-browser-gates.mjs',
    includes: ['Mochi Social browser gate evidence passed', 'reports/mochi-social-browser-gates.json', 'reports/mochi-social-browser-gates.md', 'mochirii-mochi-social-browser-gates.md', 'This file is intentionally no-secret', 'MOCHI_SOCIAL_SITE_BROWSER_GATES_ALLOW_HOSTED', 'MOCHI_SOCIAL_SITE_BROWSER_GATES_NOTES', 'Access mode', 'browserGateEnvForMode', 'assertNoForbiddenMaterial', 'DISCORD_(?:CLIENT_SECRET|BOT_TOKEN)', ...browserGateEnvNames]
  },
  {
    file: 'scripts/check-mochi-social-report-hygiene.mjs',
    includes: ['Mochi Social report hygiene OK', 'reports/mochi-social-report-hygiene.json', 'reports/mochi-social-report-hygiene.md', 'mochirii-mochi-social-browser-gates.md', 'mochirii-mochi-social-preview-ready.md', 'mochirii-mochi-social-alpha-operator-next-steps.md', 'No secret values were printed', 'Wallet seed file reference', 'Account email', 'readGitState(root)']
  },
  {
    file: 'scripts/check-mochi-social-discord-oauth-self-test.mjs',
    includes: ['Mochi Social Discord OAuth provider self-test OK', 'Unsupported provider: provider is not enabled', 'site.discord-oauth', 'discord.com', 'MOCHI_SOCIAL_ALPHA_AUTH_URL']
  },
  {
    file: 'scripts/check-mochi-social-edge-authority.mjs',
    includes: ['MOCHI_SOCIAL_GAME_SERVER_TOKEN', 'x-mochi-social-server-token', 'mochi_social_ledger_events', 'noRealValue: true', 'chainNetwork: "CANARY"', 'finalityRequired: true', 'applyFinalizedChainInventory', 'Mochi Social Edge authority check passed']
  },
  {
    file: 'apps/web/app/games/mochi-social/page.tsx',
    includes: ['MochiSocialAlphaClient', 'MochiSocialTesterPasswordGate', 'MochiSocialTesterGameClient', 'MOCHI_SOCIAL_ALPHA_ACCESS_MODE', 'robots', 'index: false']
  },
  {
    file: 'scripts/check-mochi-social-tester-password-gate.mjs',
    includes: ['Mochi Social tester password gate check passed', 'MOCHI_SOCIAL_TESTER_PASSWORD', 'scryptSync', 'httpOnly: true', 'NEXT_PUBLIC_MOCHI_SOCIAL_(?:TESTER_)?PASSWORD']
  },
  {
    file: 'apps/web/components/mochi-social/MochiSocialAlphaClient.tsx',
    includes: ['NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'MOCHI_SOCIAL_AUTH', 'No real value', 'submitMochiSocialFeedback', 'mochi-game-preview-contract', 'configured-preview-stub', 'test soft currency', 'fixed price only', 'data-mochi-bridge-state', 'role="status"', 'aria-live="polite"', 'Session cues', 'Make this run count', 'no real value is created', 'resolveMochiSocialBridgeMessage', 'sendAuthToGame(accessToken)']
  },
  {
    file: 'apps/web/components/mochi-social/MochiSocialTesterPasswordGate.tsx',
    includes: ['Today&apos;s path', 'Unlock', 'Explore', 'Report', 'What you can test', 'Your playtest mission', 'configured-preview-stub']
  },
  {
    file: 'apps/web/components/mochi-social/MochiSocialTesterGameClient.tsx',
    includes: ['Session cues', 'Make this run count', 'data-mochi-bridge-state', 'role="status"', 'aria-live="polite"', 'configured-preview-stub', 'no real value is created']
  },
  {
    file: 'apps/web/components/member-workflow/LeaderDashboard.tsx',
    includes: ['mochiSocialAlphaPanel', 'Grant alpha access', 'AlphaAuditPanel', 'manageMochiSocialAlphaAdmin']
  },
  {
    file: 'apps/web/lib/mochi-social/alpha.ts',
    includes: ['MochiSocialAlphaAdmin', 'manageMochiSocialAlphaAdmin', 'mochi-social-alpha-admin']
  },
  {
    file: 'supabase/config.toml',
    includes: ['mochi-social-alpha-session', 'mochi-social-alpha-action', 'mochi-social-alpha-admin', 'submit-mochi-social-feedback']
  },
  {
    file: 'supabase/functions/mochi-social-alpha-action/index.ts',
    includes: [
      'alphaAccess(adminClient, playerId)',
      'mochi_social_market_listings',
      'mochi_social_trades',
      'mochi_social_pets',
      'CERTIFICATE_ELIGIBLE_SPECIES.has(species)',
      'chain.operation_update',
      'chain_request_missing',
      'nextStatus === "finalized"',
      'location: "hot"'
    ]
  },
  {
    file: 'supabase/functions/mochi-social-alpha-admin/index.ts',
    includes: ['loadAlphaAudit', 'recentLedger', 'pendingChainOps', 'mochi_social_feedback']
  },
  {
    file: 'supabase/migrations/20260610090000_add_mochi_social_alpha.sql',
    includes: ['mochi_social_alpha_testers', 'mochi_social_ledger_events', "network = 'CANARY'", 'expires_at']
  },
  {
    file: 'apps/web/next.config.ts',
    includes: ['NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'frame-src', 'connect-src']
  },
  {
    file: 'docs/mochi-social-alpha.md',
    includes: [
      'mochi-social-alpha-codex-ops.md',
      'Tester Guide',
      'Preview Acceptance',
      'Rollback',
      'npm run alpha:load-smoke',
      'NEXT_PUBLIC_MOCHI_SOCIAL_URL',
      'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE',
      'MOCHI_SOCIAL_AUTH',
      'Manual Browser Gate Evidence',
      ...browserGateEnvNames,
      'prepare:mochi-social-alpha-operator-checklist',
      'check:mochi-social-report-hygiene',
      'check:mochi-social-preview-ready',
      'Do not roll back by switching to production',
      'Computer Use',
      'Alpha Preview Ready',
      'configured-preview-stub',
      'preview-live-gates',
      'funded-chain-gates',
      'Do not set dummy'
    ]
  },
  {
    file: 'docs/mochi-social-alpha-codex-ops.md',
    includes: [
      'Source Hierarchy',
      'Source Basis',
      'Tool Choice',
      'Website Preview Environment Matrix',
      'Supabase Authority Matrix',
      'Discord Boundary',
      'Preview Verification',
      'Manual Browser Evidence Protocol',
      'Secret Entry Protocol',
      'MOCHI_SOCIAL_GAME_SERVER_TOKEN',
      'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE',
      ...browserGateEnvNames,
      'short-lived access token',
      'Alpha Preview Ready Lane',
      'configured-preview-stub',
      'preview-live-gates',
      'funded-chain-gates',
      'Do not set dummy'
    ]
  }
];

const forbiddenPatterns = [
  { label: 'GitHub token', pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { label: 'Supabase secret key', pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/ },
  { label: 'JWT-like token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
  { label: 'Mochi Social game server token assignment', pattern: /\bMOCHI_SOCIAL_GAME_SERVER_TOKEN\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\s"']{8,}/i },
  { label: 'Enjin Platform token assignment', pattern: /\bENJIN_PLATFORM_TOKEN\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\s"']{8,}/i }
];

for (const check of checks) {
  const text = readFileSync(check.file, 'utf8');
  for (const needle of check.includes) {
    if (!text.includes(needle)) {
      throw new Error(`${check.file} is missing ${needle}`);
    }
  }
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(text)) {
      throw new Error(`${check.file} appears to contain a real ${label}.`);
    }
  }
}

const actionFunction = readFileSync('supabase/functions/mochi-social-alpha-action/index.ts', 'utf8');
if (/certificate_eligible:\s*species\s*===\s*["']sora["']/.test(actionFunction)) {
  throw new Error('Mochi Social certificate eligibility must stay aligned to Momo, not Sora.');
}
if (!/CERTIFICATE_ELIGIBLE_SPECIES\s*=\s*new Set\(\[["']momo["']\]\)/.test(actionFunction)) {
  throw new Error('Mochi Social certificate eligibility must explicitly name Momo as the alpha certificate species.');
}

console.log('Mochi Social alpha static checks passed.');
