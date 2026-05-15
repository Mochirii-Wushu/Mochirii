# Supabase Public Config And Secret Guardrails

Date: 2026-05-15
Branch: `qa/supabase-public-config-and-secret-guardrails`
Mode: QA automation

No data files, protected content, public copy, CSS, Supabase schema, migrations, Storage policies, Edge Functions, workflows, secrets, or production data were changed.

## 1. Current Gap

Previous Supabase reviews showed that public browser config is intentional and currently safe, but the check was report-only. The repo now has a durable local validation script so accidental secret commits and browser secret exposure fail before PR merge.

Source reports:

- `reports/supabase-ci-and-parity-review.md`
- `reports/supabase-production-security-review.md`
- `reports/supabase-edge-functions-review.md`
- `reports/secrets-and-public-config-review.md`

## 2. Script Added

Added:

- `scripts/check-supabase-public-config.mjs`
- package script `check:supabase-config`

The script is wired into `npm run check` because it is local-only, deterministic, dependency-free, and non-mutating.

## 3. Checks Added

Hard failures:

- tracked `.env` files outside `.env.example` and `supabase/functions/.env.example`
- untracked non-ignored `.env` files
- missing `.gitignore` rules for local env files
- `sb_secret_` values
- Discord webhook URLs
- Discord bot-token shaped values
- credentialed Postgres URLs
- JWT-like token values
- non-placeholder assignments for secret-like variables
- secret-only Supabase/Discord terms in browser HTML/JS files
- missing or unsafe `supabase.js` public config shape

## 4. Allowed Public Config

Allowed in browser/runtime files:

- Supabase project ref `deyvmtncimmcinldjyqe`
- public Supabase URL
- `sb_publishable_` browser key
- Discord guild and role IDs
- role labels
- member Gallery bucket name
- upload size/type limits

These values do not grant privileged access without RLS, private Storage policies, authenticated sessions, and Edge Function server-side secrets.

## 5. Forbidden Secret Patterns

Forbidden in committed files:

- Supabase `sb_secret_` keys
- service-role or secret-key values
- Discord bot tokens
- Discord webhook URLs
- Discord client secrets
- database URLs/passwords
- JWT-like bearer tokens
- real values assigned to secret-like environment variables

The script masks suspicious values in failure output.

## 6. Known Limitations

- The script cannot prove dashboard secret presence or correct values.
- The script does not inspect ignored local `.env` file contents, which avoids printing or handling real secrets.
- The script treats documentation placeholders as allowed only when they are blank, bracketed placeholders, or obvious "set manually"/"never commit" examples.
- This does not replace human review for Supabase dashboard settings, RLS, Storage, or Edge Function deployment parity.

## 7. Validation Result

`npm run check:supabase-config` passed on this branch.

Standard branch validation also passed, with the known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only.

## 8. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No Supabase data was mutated.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations, schemas, RLS policies, or Storage policies were changed.
