# Approved Gallery Submissions Feed Release Readiness

## 1. Current Branch Status

Branch: `feature/approved-gallery-submissions-feed`

The branch contains uncommitted approved-feed release changes. `git diff main...` is empty because the branch changes are still in the working tree before commit.

## 2. Files Changed

Working-tree changes:

- `gallery.js`
- `styles.css`
- `supabase.js`
- `supabase/README.md`
- `supabase/config.toml`
- `reports/approved-gallery-submissions-feed-analysis.md`
- `reports/approved-gallery-submissions-feed-release-readiness.md`
- `supabase/functions/list-approved-gallery-submissions/.npmrc`
- `supabase/functions/list-approved-gallery-submissions/deno.json`
- `supabase/functions/list-approved-gallery-submissions/index.ts`

## 3. Migration Status

No new migration exists for this approved-feed work.

Existing migrations are:

- `20260513081523_create_discord_role_gated_gallery_uploads.sql`
- `20260513193110_increase_member_gallery_upload_limit_to_50mb.sql`
- `20260513195853_create_gallery_moderation_events.sql`

`supabase migration list --local` shows local and remote both have those three migrations. No `supabase db push` is required.

## 4. data/gallery.json Status

`data/gallery.json` is unchanged. Existing static gallery captions are unchanged.

## 5. Protected Text Status

`git diff -- data/` returned no output. Protected data files were not changed.

## 6. Secret Scan Status

The secret scan found placeholder documentation references only, including `DISCORD_BOT_TOKEN=<set manually, never commit>`. No real Discord bot token, Supabase service-role key, Supabase secret key, database password, JWT secret, or `postgres://` credential was found.

## 7. Edge Function Deployment Readiness

`list-approved-gallery-submissions` is ready to deploy as the only public approved-feed function. `supabase/config.toml` has:

- `list-approved-gallery-submissions`: `verify_jwt = false`
- `verify-discord-member`: `verify_jwt = true`
- `list-gallery-review-queue`: `verify_jwt = true`
- `moderate-gallery-submission`: `verify_jwt = true`

The function reads only `gallery_submissions` rows where `status = 'approved'`, signs private `member-gallery` object URLs server-side, and returns public-safe fields.

## 8. Validation Result

Completed before deployment:

- `npm run check`: passed with the existing large audio asset warning only.
- `npm run check:production`: passed.
- `git diff --check`: passed.
- `node --check gallery.js`: passed.
- `node --check supabase.js`: passed.
- `npm run smoke:gallery` with local static server: passed.
- Edge Function local load check: passed with a structured response.

Deployment status:

- `supabase functions deploy list-approved-gallery-submissions`: completed.
- `supabase functions list`: confirmed `list-approved-gallery-submissions` is `ACTIVE` version 1.

After merge:

- repeat local validation on `main`
- watch GitHub Actions / Pages deployment
- check `https://mochirii.com/gallery.html` and `https://mochirii.com/`

## 9. Release Recommendation

Recommended to proceed with commit, PR, checks, merge, and production verification. `supabase db push` is not required and was not run. Only `list-approved-gallery-submissions` was deployed.
