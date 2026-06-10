import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'package.json',
    includes: ['check:mochi-social-alpha', 'check:mochi-social-game-contract']
  },
  {
    file: 'scripts/check-all.mjs',
    includes: ['check:mochi-social-alpha', 'check:mochi-social-game-contract']
  },
  {
    file: 'scripts/check-mochi-social-game-contract.mjs',
    includes: ['MOCHI_SOCIAL_GAME_CONTRACT_URL', 'NEXT_PUBLIC_MOCHI_SOCIAL_URL', '/integration/game-manifest.json', '/integration/alpha/status', 'MOCHI_SOCIAL_AUTH', 'configured-preview-stub']
  },
  {
    file: 'apps/web/app/games/mochi-social/page.tsx',
    includes: ['MochiSocialAlphaClient', 'robots', 'index: false']
  },
  {
    file: 'apps/web/components/mochi-social/MochiSocialAlphaClient.tsx',
    includes: ['NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'MOCHI_SOCIAL_AUTH', 'No real value', 'submitMochiSocialFeedback']
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
      'MOCHI_SOCIAL_AUTH',
      'Do not roll back by switching to production',
      'Computer Use'
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
      'Secret Entry Protocol',
      'MOCHI_SOCIAL_GAME_SERVER_TOKEN',
      'short-lived access token'
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
