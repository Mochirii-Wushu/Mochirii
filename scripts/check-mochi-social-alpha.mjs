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
  'MOCHI_SOCIAL_SITE_BROWSER_NO_REAL_VALUE_OK',
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
    includes: ['Alpha Preview Ready', 'dummy Enjin IDs']
  },
  {
    file: 'scripts/check-all.mjs',
    includes: ['check:mochi-social-alpha', 'check:mochi-social-auth-bridge', 'check:mochi-social-bridge-state', 'check:mochi-social-browser-gates', 'check:mochi-social-discord-oauth', 'check:mochi-social-edge-authority', 'check:mochi-social-game-contract', 'check:mochi-social-preview-key-loader', 'check:mochi-social-preview-url', 'check:mochi-social-tester-password-gate', 'check:mochi-social-report-hygiene']
  },
  {
    file: 'scripts/check-mochi-social-game-contract.mjs',
    includes: ['MOCHI_SOCIAL_GAME_CONTRACT_URL', 'NEXT_PUBLIC_MOCHI_SOCIAL_URL', '/integration/game-manifest.json', '/integration/alpha/status', 'MOCHI_SOCIAL_AUTH', 'engine === "unity-webgl"', 'single-shared-room', 'ugs-distributed-authority', 'mochi-social-unity-auth', 'must not expose future asset runtime state']
  },
  {
    file: 'scripts/smoke-mochi-social-alpha-edge.mjs',
    includes: ['MOCHI_SOCIAL_ALPHA_EDGE_URL', 'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY', 'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'selectPublishableKey', 'mochi-social-alpha-session', 'mochi-social-unity-auth', 'mochi-social-alpha-action', 'invalid_game_server_token', 'invalid_alpha_action']
  },
  {
    file: 'scripts/prepare-mochi-social-alpha-operator-checklist.mjs',
    includes: ['Desktop', 'Creds', 'mochirii-mochi-social-alpha-operator-next-steps.md', 'This file is intentionally no-secret', 'MOCHI_SOCIAL_PREVIEW_ENV_FILE', 'readPreviewEnvFile', 'Local no-secret preview URL file', 'NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'MOCHI_SOCIAL_ALPHA_EDGE_URL', 'MOCHI_SOCIAL_ALPHA_AUTH_URL', 'MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'MOCHI_SOCIAL_GAME_SERVER_TOKEN', 'Discord OAuth setup', 'site.discord-oauth', 'Alpha Preview Ready', 'one shared room', 'shared Lirabao', 'Do not set dummy', 'Local Branch Sync', 'Public-repo pushes are allowed', 'Push C:\\\\Users\\\\xtyty\\\\Documents\\\\Mochirii', ...browserGateEnvNames]
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
    includes: ['MOCHI_SOCIAL_GAME_SERVER_TOKEN', 'x-mochi-social-server-token', 'mochi_social_ledger_events', 'noRealValue: true', 'must not accept', 'isValidSharedPetState', 'Mochi Social Edge authority check passed']
  },
  {
    file: 'apps/web/app/games/mochi-social/page.tsx',
    includes: ['MochiSocialAlphaClient', 'MochiSocialTesterPasswordGate', 'MochiSocialTesterGameClient', 'MOCHI_SOCIAL_ALPHA_ACCESS_MODE', 'robots', 'index: false', 'getMochiSocialGameRuntimeStatus', '/healthz', 'activeRuntime === "unity-webgl"', 'unityWebglBuild?.present === true', 'legacyFallback?.active !== true', 'gamePausedMessage']
  },
  {
    file: 'scripts/check-mochi-social-tester-password-gate.mjs',
    includes: ['Mochi Social tester password gate check passed', 'MOCHI_SOCIAL_TESTER_PASSWORD', 'scryptSync', 'httpOnly: true', 'NEXT_PUBLIC_MOCHI_SOCIAL_(?:TESTER_)?PASSWORD']
  },
  {
    file: 'apps/web/components/mochi-social/MochiSocialAlphaClient.tsx',
    includes: ['NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'MOCHI_SOCIAL_AUTH', 'No real value', 'Shared guild room', 'shared Lirabao', 'submitMochiSocialFeedback', 'mochi-game-preview-contract', 'saved for this member', 'Room connection:', 'data-mochi-bridge-state', 'resolveMochiSocialBridgeMessage', 'sendAuthToGame(accessToken)', 'gameAvailable', 'visibleBridgeStatus', 'Playtest temporarily paused', 'role="status"', 'aria-live="polite"']
  },
  {
    file: 'apps/web/components/member-workflow/LeaderDashboard.tsx',
    includes: ['mochiSocialAlphaPanel', 'Grant alpha access', 'AlphaAuditPanel', 'manageMochiSocialAlphaAdmin']
  },
  {
    file: 'apps/web/lib/mochi-social/alpha.ts',
    includes: ['MochiSocialAlphaAdmin', 'MochiSocialUnityAuth', 'getMochiSocialUnityAuth', 'mochi-social-unity-auth', 'manageMochiSocialAlphaAdmin', 'mochi-social-alpha-admin', 'progress?:', 'authority: "mochirii-edge"', 'engine: "unity-webgl"', 'roomMode: "single-shared-room"']
  },
  {
    file: 'supabase/config.toml',
    includes: ['mochi-social-alpha-session', 'mochi-social-unity-auth', 'mochi-social-alpha-action', 'mochi-social-alpha-progress', 'mochi-social-alpha-admin', 'submit-mochi-social-feedback']
  },
  {
    file: 'supabase/functions/mochi-social-unity-auth/index.ts',
    includes: ['UNITY_SERVICES_PROJECT_ID', 'UNITY_SERVICES_ENVIRONMENT_ID', 'UNITY_SERVICES_ENVIRONMENT_NAME', 'UNITY_SERVICES_SERVICE_ACCOUNT_KEY_ID', 'UNITY_SERVICES_SERVICE_ACCOUNT_SECRET', 'unityCustomId(access.userId)', 'upsertUnityPlayerLink', 'ugs-distributed-authority', 'ugs-cloud-save', 'single-shared-room']
  },
  {
    file: 'supabase/functions/mochi-social-alpha-action/index.ts',
    includes: [
      'alphaAccess(adminClient, playerId)',
      'upsertAlphaProgressSnapshot(adminClient',
      'upsertSharedPetSnapshot(adminClient',
      'progress: progressResult?.snapshot ?? null',
      'sharedPet: sharedPetResult?.snapshot ?? null',
      'unity.character.created',
      'unity.character.updated',
      'unity.pet.interaction',
      'unity.pet.state_saved',
      'unity.room.joined',
      'unity.room.left'
    ]
  },
  {
    file: 'supabase/functions/mochi-social-alpha-progress/index.ts',
    includes: [
      'requireGameServer(req)',
      'alphaAccess(adminClient, playerId)',
      'loadAlphaProgressSnapshot(adminClient, playerId)',
      'normalizeAlphaProgressSnapshot(data)',
      'fallback: "guest-local"',
      'noRealValue: true'
    ]
  },
  {
    file: 'supabase/functions/mochi-social-alpha-admin/index.ts',
    includes: ['loadAlphaAudit', 'recentLedger', 'mochi_social_feedback', 'mochi_social_unity_players', 'mochi_social_shared_pet_snapshots', 'recentSharedPets']
  },
  {
    file: 'supabase/migrations/20260610090000_add_mochi_social_alpha.sql',
    includes: ['mochi_social_alpha_testers', 'mochi_social_progress_snapshots', 'mochi_social_ledger_events', 'expires_at']
  },
  {
    file: 'supabase/migrations/20260621120000_add_mochi_social_unity_room.sql',
    includes: ['mochi_social_unity_players', 'mochi_social_shared_pet_snapshots', "room_key text not null default 'jade-lantern-room-alpha'", "check (pet_key = 'lirabao')", 'enable row level security', 'grant select on public.mochi_social_unity_players to authenticated', 'grant select, insert, update, delete on public.mochi_social_shared_pet_snapshots to service_role']
  },
  {
    file: 'apps/web/next.config.ts',
    includes: ['NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'frame-src', 'connect-src']
  },
  {
    file: 'docs/mochi-social-alpha.md',
    includes: [
      'Mochi Social Alpha',
      'closed Mochirii playtest',
      'shared guild room',
      'curated character',
      'care for Lirabao together',
      'tester password',
      'Mochirii member sign-in',
      'What Members Can Try',
      'Playtest Boundaries',
      'no real value',
      'Ready To Invite Testers',
      'playtest-paused message'
    ]
  },
  {
    file: 'docs/mochi-social-alpha-maintainer-ops.md',
    includes: [
      'Source Hierarchy',
      'Source Basis',
      'Verification Choice',
      'Website Production Environment Matrix',
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
      'no market, no trade, no paid assets',
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

const publicMochiSocialFiles = [
  'docs/mochi-social-alpha.md',
  'docs/mochi-social-playtest-guide.md',
  'apps/web/app/games/mochi-social/page.tsx',
  'apps/web/components/mochi-social/MochiSocialAlphaClient.tsx',
  'apps/web/components/mochi-social/MochiSocialTesterGameClient.tsx',
  'apps/web/components/mochi-social/MochiSocialTesterPasswordGate.tsx'
];

const publicCopyForbiddenPatterns = [
  { label: 'configured preview stub wording', pattern: /\bconfigured-preview-stub\b/i },
  { label: 'Enjin wording', pattern: /\bEnjin\b/i },
  { label: 'Canary wording', pattern: /\bCanary\b/i },
  { label: 'market wording', pattern: /\bmarket\b/i },
  { label: 'trade wording', pattern: /\btrad(?:e|es|ing)\b/i },
  { label: 'funded-chain wording', pattern: /\bfunded-chain\b/i },
  { label: 'operator wording', pattern: /\boperator\b/i },
  { label: 'ledger wording', pattern: /\bledger\b/i },
  { label: 'systems wording', pattern: /\b(?:Distributed Authority|Cloud Save|Edge Function|Unity Custom ID|configured-preview-stub)\b/i },
  { label: 'AI/tooling wording', pattern: /\b(?:Codex|AI|LLM|agent|OpenAI|tooling)\b/i }
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
for (const forbiddenAction of [
  'market.fixed_list',
  'market.guild_receipt',
  'trade.direct_offer',
  'trade.exchange_accord',
  'chain.withdraw_request',
  'chain.deposit_request',
  'chain.operation_update',
]) {
  if (actionFunction.includes(`"${forbiddenAction}"`)) {
    throw new Error(`Mochi Social shared-room alpha action function must not accept ${forbiddenAction}.`);
  }
}
for (const forbiddenSnippet of ['chainNetwork', 'applyFinalizedChainInventory', 'CERTIFICATE_ELIGIBLE_SPIRITS', 'VALID_CHAIN_STATUSES']) {
  if (actionFunction.includes(forbiddenSnippet)) {
    throw new Error(`Mochi Social shared-room alpha action function contains inactive system authority: ${forbiddenSnippet}.`);
  }
}

for (const file of publicMochiSocialFiles) {
  const text = readFileSync(file, 'utf8');
  for (const { label, pattern } of publicCopyForbiddenPatterns) {
    if (pattern.test(text)) {
      throw new Error(`${file} contains public ${label}.`);
    }
  }
}
console.log('Mochi Social alpha static checks passed.');
