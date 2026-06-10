import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'apps/web/app/games/mochi-social/page.tsx',
    includes: ['MochiSocialAlphaClient', 'robots', 'index: false']
  },
  {
    file: 'apps/web/components/mochi-social/MochiSocialAlphaClient.tsx',
    includes: ['NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'MOCHI_SOCIAL_AUTH', 'No real value', 'submitMochiSocialFeedback']
  },
  {
    file: 'supabase/config.toml',
    includes: ['mochi-social-alpha-session', 'mochi-social-alpha-action', 'mochi-social-alpha-admin', 'submit-mochi-social-feedback']
  },
  {
    file: 'supabase/migrations/20260610090000_add_mochi_social_alpha.sql',
    includes: ['mochi_social_alpha_testers', 'mochi_social_ledger_events', "network = 'CANARY'", 'expires_at']
  },
  {
    file: 'apps/web/next.config.ts',
    includes: ['NEXT_PUBLIC_MOCHI_SOCIAL_URL', 'frame-src', 'connect-src']
  }
];

for (const check of checks) {
  const text = readFileSync(check.file, 'utf8');
  for (const needle of check.includes) {
    if (!text.includes(needle)) {
      throw new Error(`${check.file} is missing ${needle}`);
    }
  }
}

console.log('Mochi Social alpha static checks passed.');
