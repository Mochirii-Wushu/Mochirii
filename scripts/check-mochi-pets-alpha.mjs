import { readFileSync } from 'node:fs';

const browserGateEnvNames = [
  'MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED',
  'MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER',
  'MOCHI_PETS_SITE_BROWSER_GATES_BROWSER',
  'MOCHI_PETS_SITE_BROWSER_GATES_URL',
  'MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE',
  'MOCHI_PETS_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK',
  'MOCHI_PETS_SITE_BROWSER_NON_TESTER_BLOCKED_OK',
  'MOCHI_PETS_SITE_BROWSER_TERMS_GATE_OK',
  'MOCHI_PETS_SITE_BROWSER_PASSWORD_LOCKED_OK',
  'MOCHI_PETS_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK',
  'MOCHI_PETS_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK',
  'MOCHI_PETS_SITE_BROWSER_IFRAME_LOADS_OK',
  'MOCHI_PETS_SITE_BROWSER_AUTH_BRIDGE_OK',
  'MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK',
  'MOCHI_PETS_SITE_BROWSER_NO_REAL_VALUE_OK',
  'MOCHI_PETS_SITE_BROWSER_GAME_PRESENCE_OK',
  'MOCHI_PETS_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK'
];

const blockedToolReferencePattern = new RegExp(`\\b(?:${
  [
    ['Co', 'dex'].join(''),
    ['A', 'I'].join(''),
    ['L', 'L', 'M'].join(''),
    ['ag', 'ent'].join(''),
    ['Open', 'A', 'I'].join(''),
    ['tool', 'ing'].join('')
  ].join('|')
})\\b`, 'i');

const checks = [
  {
    file: 'package.json',
    includes: ['check:mochi-pets-alpha', 'check:mochi-pets-auth-bridge', 'check:mochi-pets-bridge-state', 'check:mochi-pets-browser-gates', 'check:mochi-pets-discord-oauth', 'check:mochi-pets-edge-authority', 'check:mochi-pets-game-contract', 'check:mochi-pets-preview-key-loader', 'check:mochi-pets-preview-url', 'check:mochi-pets-preview-ready', 'check:mochi-pets-rename-manifest', 'check:mochi-pets-report-hygiene', 'check:mochi-pets-tester-password-gate', 'prepare:mochi-pets-alpha-operator-checklist', 'prepare:mochi-pets-browser-gates', 'smoke:mochi-pets-production-doorway', 'test:mochi-pets-alpha']
  },
  {
    file: 'AGENTS.md',
    includes: ['Alpha Preview Ready', 'dummy Enjin IDs']
  },
  {
    file: 'scripts/check-all.mjs',
    includes: ['check:mochi-pets-alpha', 'check:mochi-pets-auth-bridge', 'check:mochi-pets-bridge-state', 'check:mochi-pets-browser-gates', 'check:mochi-pets-discord-oauth', 'check:mochi-pets-edge-authority', 'test:mochi-pets-alpha', 'check:mochi-pets-game-contract', 'check:mochi-pets-preview-key-loader', 'check:mochi-pets-preview-url', 'check:mochi-pets-rename-manifest', 'check:mochi-pets-tester-password-gate', 'check:mochi-pets-report-hygiene']
  },
  {
    file: 'supabase/functions/_shared/mochi-pets-alpha_test.ts',
    includes: ['alphaAccess', 'requireUser', 'requireGameServer', 'upsertUnityPlayerLink', 'upsertSharedPetSnapshot', 'missing_auth', 'invalid_unity_custom_id', 'invalid_unity_room', 'invalid_unity_room_pet', 'invalid_shared_pet_state', 'invalid_shared_pet_actor', 'wrongRoom', 'onConflict === "pet_key"']
  },
  {
    file: 'scripts/check-mochi-pets-game-contract.mjs',
    includes: ['MOCHI_PETS_GAME_CONTRACT_URL', 'NEXT_PUBLIC_MOCHI_PETS_URL', '/integration/game-manifest.json', '/integration/alpha/status', 'MOCHI_PETS_AUTH', 'engine === "unity-webgl"', 'activeRuntime === "unity-webgl"', 'unityWebglBuild?.present === true', 'legacyFallback?.active === false', 'single-shared-room', 'ugs-distributed-authority', 'mochi-pets-unity-auth', 'must not expose future asset runtime state']
  },
  {
    file: 'scripts/smoke-mochi-pets-alpha-edge.mjs',
    includes: ['MOCHI_PETS_ALPHA_EDGE_URL', 'MOCHI_PETS_ALPHA_EDGE_PUBLISHABLE_KEY', 'MOCHI_PETS_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'selectPublishableKey', 'mochi-pets-alpha-session', 'mochi-pets-unity-auth', 'mochi-pets-alpha-action', 'invalid_game_server_token', 'invalid_alpha_action']
  },
  {
    file: 'scripts/prepare-mochi-pets-alpha-operator-checklist.mjs',
    includes: ['Desktop', 'Creds', 'mochirii-mochi-pets-alpha-operator-next-steps.md', 'This file is intentionally no-secret', 'MOCHI_PETS_PREVIEW_ENV_FILE', 'MOCHI_PETS_GAME_PR_NUMBER', 'MOCHI_PETS_SITE_PR_NUMBER', 'https://github.com/${repo}/pull/${number}', 'pending GitHub verification', 'verify PR mergeability and checks in GitHub before merging', 'PR state is listed above; verify both PRs in GitHub before merge.', 'readPreviewEnvFile', 'Local no-secret preview URL file', 'NEXT_PUBLIC_MOCHI_PETS_URL', 'MOCHI_PETS_ALPHA_EDGE_URL', 'MOCHI_PETS_ALPHA_AUTH_URL', 'MOCHI_PETS_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'MOCHI_PETS_GAME_SERVER_TOKEN', 'Discord OAuth setup', 'site.discord-oauth', 'Alpha Preview Ready', 'one shared room', 'shared Lirabao', 'Do not set dummy', 'Local Branch Sync', 'Public-repo pushes are allowed', 'Push C:\\\\Users\\\\xtyty\\\\Documents\\\\Mochirii', 'Maintainers may verify only provider enabled/status and callback shape.', 'Live Production Password Gate', 'Production website env names', 'MOCHI_PETS_SITE_PRODUCTION_URL', '/games/mochi-pets', 'reuses existing provider projects', ...browserGateEnvNames]
  },
  {
    file: 'scripts/check-mochi-pets-preview-ready.mjs',
    includes: ['Mochirii Mochi Pets Alpha Preview Ready audit', 'reports/mochi-pets-preview-ready.json', 'mochirii-mochi-pets-preview-ready.md', 'MOCHI_PETS_SITE_PREVIEW_READY_ALLOW_HOSTED', 'MOCHI_PETS_SITE_PREVIEW_READY_SKIP_SELF_TEST_COMMANDS', 'MOCHI_PETS_PREVIEW_ENV_FILE', 'Local Preview URL File', 'readPreviewEnvFile', 'urlFieldsRead', 'MOCHI_PETS_SITE_BROWSER_GATES_JSON', 'reports/mochi-pets-browser-gates.json', 'addStoredManualBrowserGateRequirement', 'stored browser gate report', 'stored browser gate report access mode', 'does not match current browser gate mode', 'browserGateRouteFailure', 'manual browser gate URL', 'stored browser gate report URL', 'must target /games/mochi-pets', 'MOCHI_PETS_SITE_REPORT_HYGIENE_JSON', 'reports/mochi-pets-report-hygiene.json', 'site.report-hygiene', 'check:mochi-pets-report-hygiene', 'MOCHI_PETS_PRODUCTION_DOORWAY_JSON', 'reports/mochi-pets-production-doorway.json', 'addProductionDoorwayRequirement', 'site.production-doorway-smoke', 'production doorway smoke report', '- Upstream HEAD: ${gitState.upstreamHead || "unknown"}', '- Ahead: ${gitState.ahead}', '- Behind: ${gitState.behind}', '- Dirty tracked files: ${gitState.dirty.length}', 'site.operator-checklist', 'game preview-ready site snapshot', 'gameReport.data?.siteGit', 'MOCHI_PETS_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'publishableKeySource', 'not-loaded-awaiting-hosted-approval', 'selectPublishableKey', 'site.bridge-state', 'check-mochi-pets-bridge-state.mjs', 'site.auth-bridge', 'check-mochi-pets-auth-bridge.mjs', 'site.edge-authority', 'check-mochi-pets-edge-authority.mjs', 'site.preview-key-loader', 'check-mochi-pets-preview-key-loader.mjs', 'site.discord-oauth-detector', 'check-mochi-pets-discord-oauth-self-test.mjs', 'site.game-contract', 'site.edge-smoke', 'site.discord-oauth', 'MOCHI_PETS_ALPHA_AUTH_URL', 'provider is not enabled', 'site.manual-browser-gates', 'site.branch-sync', 'site.game-preview-ready', 'browserGateEnvForMode', 'tester-password locked page visible', 'Live Production Password-Wall Target', 'Production Approval Prompt', 'Preview Rehearsal Approval Prompt', 'MOCHI_PETS_DEFAULT_ORIGIN', 'SITE_ORIGIN', ...browserGateEnvNames]
  },
  {
    file: 'scripts/check-mochi-pets-preview-key-loader.mjs',
    includes: ['MOCHI_PETS_ALPHA_EDGE_PUBLISHABLE_KEY_FILE', 'not-loaded-awaiting-hosted-approval', 'publishableKeyPresent === true', 'publishableKeySource', 'assertNoLeak', 'Mochi Pets preview publishable-key loader self-test OK']
  },
  {
    file: 'scripts/check-mochi-pets-preview-url-self-test.mjs',
    includes: ['Mochi Pets preview URL self-test OK', 'mochi-pets-alpha-vercel-preview.local.txt', 'MOCHI_PETS_GAME_URL', 'MOCHI_PETS_SITE_PREVIEW_URL', 'Local no-secret preview URL file', '## Local Preview URL File', 'assertNoLeak', 'fakeToken']
  },
  {
    file: 'scripts/check-mochi-pets-auth-bridge.mjs',
    includes: ['Mochi Pets auth bridge check passed', 'payload: { accessToken: token }', 'resolveMochiPetsBridgeMessage(event.data)', 'MOCHI_PETS_AUTH_BRIDGE_ERROR_MESSAGE', 'refreshToken', 'SUPABASE_SERVICE_ROLE_KEY', 'DISCORD_BOT_TOKEN', 'ENJIN_PLATFORM_TOKEN']
  },
  {
    file: 'scripts/check-mochi-pets-bridge-state.mjs',
    includes: ['Mochi Pets bridge state self-test OK', 'MOCHI_PETS_READY', 'MOCHI_PETS_AUTH_STATE', 'MOCHI_PETS_ERROR', 'access-token-only', 'assertNoForbiddenMaterial']
  },
  {
    file: 'apps/web/lib/mochi-pets/bridge.ts',
    includes: ['MochiPetsBridgeStatus', 'resolveMochiPetsBridgeMessage', 'MOCHI_PETS_READY', 'MOCHI_PETS_AUTH_STATE', 'MOCHI_PETS_ERROR', 'MOCHI_PETS_AUTH_BRIDGE_ERROR_MESSAGE']
  },
  {
    file: 'scripts/check-mochi-pets-browser-gate-self-test.mjs',
    includes: ['MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED', 'MOCHI_PETS_SITE_BROWSER_GATES_URL', 'MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE', 'hosted browser gate confirmation requires', 'write-mochi-pets-browser-gates.mjs', 'stored browser gate report', 'stored tester-password report', 'Stored Supabase report should fail the tester-password manual browser gate.', 'access mode supabase does not match current browser gate mode tester-password', 'Manual browser evidence should fail when the URL path is not /games/mochi-pets.', 'stored browser gate report URL must target /games/mochi-pets', 'fakeToken', 'site.bridge-state', 'check-mochi-pets-bridge-state.mjs', 'site.auth-bridge', 'check-mochi-pets-auth-bridge.mjs', 'site.preview-key-loader', 'check-mochi-pets-preview-key-loader.mjs', 'site.discord-oauth-detector', 'check-mochi-pets-discord-oauth-self-test.mjs', 'site.manual-browser-gates', 'Preview Ready should still remain red', ...browserGateEnvNames]
  },
  {
    file: 'scripts/write-mochi-pets-browser-gates.mjs',
    includes: ['Mochi Pets browser gate evidence passed', 'reports/mochi-pets-browser-gates.json', 'reports/mochi-pets-browser-gates.md', 'mochirii-mochi-pets-browser-gates.md', 'This file is intentionally no-secret', 'MOCHI_PETS_SITE_BROWSER_GATES_ALLOW_HOSTED', 'MOCHI_PETS_SITE_BROWSER_GATES_NOTES', 'Access mode', 'browserGateEnvForMode', 'browserGateRouteFailure', 'browser gate review URL', 'must target /games/mochi-pets', 'assertNoForbiddenMaterial', 'DISCORD_(?:CLIENT_SECRET|BOT_TOKEN)', ...browserGateEnvNames]
  },
  {
    file: 'scripts/check-mochi-pets-report-hygiene.mjs',
    includes: ['Mochi Pets report hygiene OK', 'reports/mochi-pets-report-hygiene.json', 'reports/mochi-pets-report-hygiene.md', 'reports/mochi-pets-production-doorway.json', 'reports/mochi-pets-production-doorway.md', 'mochirii-mochi-pets-browser-gates.md', 'mochirii-mochi-pets-preview-ready.md', 'mochirii-mochi-pets-alpha-operator-next-steps.md', 'No secret values were printed', 'Wallet seed file reference', 'Account email', 'readGitState(root)']
  },
  {
    file: 'scripts/check-mochi-pets-discord-oauth-self-test.mjs',
    includes: ['Mochi Pets Discord OAuth provider self-test OK', 'Unsupported provider: provider is not enabled', 'site.discord-oauth', 'discord.com', 'MOCHI_PETS_ALPHA_AUTH_URL']
  },
  {
    file: 'scripts/check-mochi-pets-edge-authority.mjs',
    includes: ['MOCHI_PETS_GAME_SERVER_TOKEN', 'x-mochi-pets-server-token', 'mochi_pets_ledger_events', 'noRealValue: true', 'must not accept', 'isValidSharedPetState', 'Mochi Pets Edge authority check passed']
  },
  {
    file: 'apps/web/app/games/mochi-pets/page.tsx',
    includes: ['MochiPetsAlphaClient', 'MochiPetsTesterPasswordGate', 'alphaShellUnlocked', 'MOCHI_PETS_ALPHA_ACCESS_MODE', 'robots', 'index: false', 'getMochiPetsGameRuntimeStatus', '/healthz', 'activeRuntime === "unity-webgl"', 'unityWebglBuild?.present === true', 'legacyFallback?.active !== true', 'gamePausedMessage']
  },
  {
    file: 'scripts/check-mochi-pets-tester-password-gate.mjs',
    includes: ['Mochi Pets tester password gate check passed', 'MOCHI_PETS_TESTER_PASSWORD', 'scryptSync', 'httpOnly: true', 'NEXT_PUBLIC_MOCHI_PETS_(?:TESTER_)?PASSWORD']
  },
  {
    file: 'scripts/smoke-mochi-pets-production-doorway.mjs',
    includes: ['Mochi Pets production doorway smoke passed', 'Mochi Pets Production Doorway Smoke', 'MOCHI_PETS_ALPHA_ACCESS_MODE', 'MOCHI_PETS_TESTER_PASSWORD', 'NEXT_PUBLIC_MOCHI_PETS_URL', 'MOCHI_PETS_PRODUCTION_DOORWAY_JSON', 'reports/mochi-pets-production-doorway.json', 'Tester password', 'Unlock playtest', 'Mochirii member sign-in is required for saved play', 'Checking alpha access', 'assertRobotsNoindex', 'assertNoIframe', 'assertPublicCopySafe', 'writeReport', 'readGitState(root)']
  },
  {
    file: 'apps/web/components/mochi-pets/MochiPetsAlphaClient.tsx',
    includes: ['configuredMochiPetsOrigin', 'MOCHI_PETS_AUTH', 'No real value', 'Shared guild room', 'shared Lirabao', 'submitMochiPetsFeedback', 'mochi-game-preview-contract', 'saved for this member', 'Mochirii member sign-in is required for saved play', 'Room connection:', 'data-mochi-bridge-state', 'resolveMochiPetsBridgeMessage', 'sendAuthToGame(accessToken)', 'gameAvailable', 'visibleBridgeStatus', 'Playtest temporarily paused', 'role="status"', 'aria-live="polite"']
  },
  {
    file: 'apps/web/components/site-header/header-navigation.tsx',
    includes: ['navItemVisibleForPath', 'activeKey === "games/mochi-pets" && item.nav === "tome"']
  },
  {
    file: 'apps/web/components/SiteFooter.tsx',
    includes: ['usePathname', 'hideToolingLanguage', 'pathname || ""', 'link.href !== "/tome"']
  },
  {
    file: 'apps/web/components/member-workflow/LeaderDashboard.tsx',
    includes: ['mochiPetsAlphaPanel', 'Grant alpha access', 'AlphaAuditPanel', 'manageMochiPetsAlphaAdmin', '[89ab][0-9a-f]{3}-[0-9a-f]{12}']
  },
  {
    file: 'apps/web/lib/mochi-pets/alpha.ts',
    includes: ['MochiPetsAlphaAdmin', 'MochiPetsUnityAuth', 'getMochiPetsUnityAuth', 'mochi-pets-unity-auth', 'manageMochiPetsAlphaAdmin', 'mochi-pets-alpha-admin', 'progress?:', 'authority: "mochirii-edge"', 'engine: "unity-webgl"', 'roomMode: "single-shared-room"']
  },
  {
    file: 'supabase/config.toml',
    includes: ['mochi-pets-alpha-session', 'mochi-pets-unity-auth', 'mochi-pets-alpha-action', 'mochi-pets-alpha-progress', 'mochi-pets-alpha-admin', 'submit-mochi-pets-feedback']
  },
  {
    file: 'supabase/functions/mochi-pets-unity-auth/index.ts',
    includes: ['UNITY_SERVICES_PROJECT_ID', 'UNITY_SERVICES_ENVIRONMENT_ID', 'UNITY_SERVICES_ENVIRONMENT_NAME', 'UNITY_SERVICES_SERVICE_ACCOUNT_KEY_ID', 'UNITY_SERVICES_SERVICE_ACCOUNT_SECRET', 'unityCustomId(access.userId)', 'upsertUnityPlayerLink', 'ugs-distributed-authority', 'ugs-cloud-save', 'single-shared-room']
  },
  {
    file: 'supabase/functions/mochi-pets-alpha-action/index.ts',
    includes: [
      '[89ab][0-9a-f]{3}-[0-9a-f]{12}',
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
    file: 'supabase/functions/mochi-pets-alpha-progress/index.ts',
    includes: [
      '[89ab][0-9a-f]{3}-[0-9a-f]{12}',
      'requireGameServer(req)',
      'alphaAccess(adminClient, playerId)',
      'loadAlphaProgressSnapshot(adminClient, playerId)',
      'normalizeAlphaProgressSnapshot(data)',
      'fallback: "guest-local"',
      'noRealValue: true'
    ]
  },
  {
    file: 'supabase/functions/mochi-pets-alpha-admin/index.ts',
    includes: ['[89ab][0-9a-f]{3}-[0-9a-f]{12}', 'loadAlphaAudit', 'recentLedger', 'mochi_pets_feedback', 'mochi_pets_unity_players', 'mochi_pets_shared_pet_snapshots', 'recentSharedPets']
  },
  {
    file: 'supabase/migrations/20260704120856_rename_mochi_pets_internal_prefix.sql',
    includes: ['mochi_pets_alpha_testers', 'mochi_pets_progress_snapshots', 'mochi_pets_ledger_events', 'mochi_pets_unity_players', 'mochi_pets_shared_pet_snapshots', 'mochi_pets_feedback', 'alter table public.%I rename to %I', 'alter index public.%I rename to %I', 'alter policy %I on public.%I rename to %I', 'grant %s on table public.%I to %I']
  },
  {
    file: 'apps/web/next.config.ts',
    includes: ['NEXT_PUBLIC_MOCHI_PETS_URL', 'frame-src', 'connect-src']
  },
  {
    file: 'docs/mochi-pets-alpha.md',
    includes: [
      'Mochi Pets Alpha',
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
    file: 'docs/mochi-pets-account-progress.md',
    includes: [
      'Internal Mochi Pets Account Progress Notes',
      'private implementation note for maintainers',
      'not player-facing copy',
      'docs/mochi-pets-playtest-guide.md',
      'shared guild room',
      'Lirabao care',
      'closed alpha',
      'no real value'
    ]
  },
  {
    file: 'docs/mochi-pets-alpha-maintainer-ops.md',
    includes: [
      'Source Hierarchy',
      'Source Basis',
      'Verification Choice',
      'Live Production Password Gate',
      'Website Production Environment Matrix',
      'Supabase Authority Matrix',
      'Discord Boundary',
      'Preview Verification',
      'Manual Browser Evidence Protocol',
      'Secret Entry Protocol',
      'MOCHI_PETS_GAME_SERVER_TOKEN',
      'MOCHI_PETS_ALPHA_EDGE_PUBLISHABLE_KEY_FILE',
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
  { label: 'Mochi Pets game server token assignment', pattern: /\bMOCHI_PETS_GAME_SERVER_TOKEN\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\s"']{8,}/i },
  { label: 'Enjin Platform token assignment', pattern: /\bENJIN_PLATFORM_TOKEN\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\s"']{8,}/i }
];

const publicMochiPetsFiles = [
  'docs/mochi-pets-alpha.md',
  'docs/mochi-pets-playtest-guide.md',
  'apps/web/app/games/mochi-pets/page.tsx',
  'apps/web/components/mochi-pets/MochiPetsAlphaClient.tsx',
  'apps/web/components/mochi-pets/MochiPetsTesterPasswordGate.tsx'
];

const publicCopyForbiddenPatterns = [
  { label: 'configured preview stub wording', pattern: /\bconfigured-preview-stub\b/i },
  { label: 'Enjin wording', pattern: /\bEnjin\b/i },
  { label: 'Canary wording', pattern: /\bCanary\b/i },
  { label: 'market wording', pattern: /\bmarket\b/i },
  { label: 'buying or selling wording', pattern: /\b(?:buying|selling)\b/i },
  { label: 'trade wording', pattern: /\btrad(?:e|es|ing)\b/i },
  { label: 'cashout wording', pattern: /\bcashout\b/i },
  { label: 'funded-chain wording', pattern: /\bfunded-chain\b/i },
  { label: 'public launch wording', pattern: /\bpublic[- ](?:launch|release)\b/i },
  { label: 'wider release wording', pattern: /\bwider release\b/i },
  { label: 'operator wording', pattern: /\boperator\b/i },
  { label: 'ledger wording', pattern: /\bledger\b/i },
  { label: 'systems wording', pattern: /\b(?:Distributed Authority|Cloud Save|Edge Function|Unity Custom ID|configured-preview-stub)\b/i },
  { label: 'internal tool wording', pattern: blockedToolReferencePattern }
];

const publicMochiPetsSections = [
  {
    file: 'README.md',
    heading: '## Mochi Pets Closed Playtest',
    includes: [
      'closed Mochirii playtest',
      'shared 3D guild room',
      'create a curated character',
      'meet Lirabao',
      'care for the guild pet together',
      'tester password wall',
      'member sign-in is required for saved play',
      'no real value',
      'docs/mochi-pets-playtest-guide.md'
    ]
  }
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

const actionFunction = readFileSync('supabase/functions/mochi-pets-alpha-action/index.ts', 'utf8');
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
    throw new Error(`Mochi Pets shared-room alpha action function must not accept ${forbiddenAction}.`);
  }
}
for (const forbiddenSnippet of ['chainNetwork', 'applyFinalizedChainInventory', 'CERTIFICATE_ELIGIBLE_SPIRITS', 'VALID_CHAIN_STATUSES']) {
  if (actionFunction.includes(forbiddenSnippet)) {
    throw new Error(`Mochi Pets shared-room alpha action function contains inactive system authority: ${forbiddenSnippet}.`);
  }
}

for (const file of publicMochiPetsFiles) {
  const text = readFileSync(file, 'utf8');
  for (const { label, pattern } of publicCopyForbiddenPatterns) {
    if (pattern.test(text)) {
      throw new Error(`${file} contains public ${label}.`);
    }
  }
}

for (const sectionCheck of publicMochiPetsSections) {
  const text = readFileSync(sectionCheck.file, 'utf8');
  const section = markdownSection(text, sectionCheck.heading);
  if (!section) throw new Error(`${sectionCheck.file} is missing ${sectionCheck.heading}.`);
  for (const needle of sectionCheck.includes) {
    if (!section.includes(needle)) {
      throw new Error(`${sectionCheck.file} ${sectionCheck.heading} is missing ${needle}.`);
    }
  }
  for (const { label, pattern } of publicCopyForbiddenPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(section)) {
      throw new Error(`${sectionCheck.file} ${sectionCheck.heading} contains public ${label}.`);
    }
  }
}
console.log('Mochi Pets alpha static checks passed.');

function markdownSection(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const next = text.slice(start + heading.length).search(/\n##\s+/);
  return next === -1
    ? text.slice(start)
    : text.slice(start, start + heading.length + next);
}
