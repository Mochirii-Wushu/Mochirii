# Mochi Pets Rename Manifest

This manifest is the current source of truth for separating the guild game from
the guild social platform.

## Public Names

| Surface | Current public name | Current route |
| --- | --- | --- |
| Guild game | Mochi Pets | `/games/mochi-pets` |
| Guild social platform | Mochirii Social | `https://social.mochirii.com` |

## Before Rename Map

These old values are allowed only in historical applied migrations, historical
reports, and this explicit before-rename manifest:

| Old value | New value |
| --- | --- |
| `Mochi Social` | `Mochi Pets` |
| `/games/mochi-social` | `/games/mochi-pets` |
| `mochi_social_*` | `mochi_pets_*` |
| `MOCHI_SOCIAL_*` | `MOCHI_PETS_*` |
| `mochi-social-*` | `mochi-pets-*` |

## Cutover Rules

- `/games/mochi-pets` is the only current game route and must stay noindexed.
- `/games/mochi-social` is retired and must return a normal 404 with no
  redirect.
- Current app code, docs, checks, scripts, Supabase config, and Edge Function
  names use the `mochi_pets` prefix.
- Historical migrations remain immutable and may retain their original
  filenames and old source names.
- The active rename migration applies prefix-only table, index, policy, and
  grant changes with guarded `ALTER ... RENAME` statements.
- Do not merge or deploy the website route rename ahead of the approved
  Supabase migration/function cutover and game runtime manifest update.

## Release Gates

1. `npm run check:mochi-pets-rename-manifest` passes.
2. `/games/mochi-pets` returns 200 locally and in production.
3. `/games/mochi-social` returns 404 locally and in production.
4. Supabase migration/function cutover is approved and applied in one
   maintenance window.
5. The game runtime manifest advertises `Mochi Pets`, `/games/mochi-pets`, and
   `MOCHI_PETS_*` bridge messages before tester traffic resumes.
