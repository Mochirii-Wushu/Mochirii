# Hosted Runtime Independence

The customer website, password-protected storefront, hosted backend, and Social
application continue running when the development workstation is offline.
The static Mochi Pets status page is served by the website and has no game
runtime dependency. Codex, Chrome, local worktrees, Docker Desktop, local CLIs,
and the private credential boundary are development or administration tools
only.

The machine-readable contract is
[`docs/integrations/hosted-runtime.json`](../integrations/hosted-runtime.json).
`npm run check:host-independence` rejects self-hosted Actions runners,
workstation paths, credential-boundary names, file URLs, and unreviewed
loopback destinations in production surfaces. The stricter
`npm run gate:host-independence` also requires every operational readback to be
verified.

The GitHub-hosted weekly production check runs
`npm run check:hosted-public-boundaries` without private credentials. It checks
the Vercel website, Social, the Shopify password boundary, fail-closed Supabase
functions, and Discord's API boundary. A passing public check proves
reachability and fail-closed behavior; it does not replace provider backups,
restore drills, or internal process health.

## Remaining readbacks

- Record the Reaper Gateway worker's hosted provider class, source revision,
  supervisor, boot policy, and health signal. Do not record a host address,
  token, private ID, or process output.
- Verify the Social backup timer, newest encrypted recovery object, and one
  isolated `validate-only` restore through the protected recovery workflow.
- Supabase readback on 2026-07-24 found two active spotlight schedules and a
  successful latest execution for each. The vote-reminder schedule is not
  activated and must remain an explicit later provider change.

Until both pending readbacks are verified, core customer surfaces are proven
host-independent but complete auxiliary continuity is not certified. If the
Gateway worker is found on this workstation, move it to a supervised hosted
runtime or intentionally retire the welcome-DM feature before setting the
contract to complete.

## Primary operational guidance

- [GitHub-hosted Actions runners](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job)
- [Vercel Git deployments](https://vercel.com/docs/git)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) and [Cron](https://supabase.com/docs/guides/cron)
- [Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [DigitalOcean Droplet backups](https://docs.digitalocean.com/products/backups/) and [Spaces](https://docs.digitalocean.com/products/spaces/)
- [Fly.io autostop and autostart](https://fly.io/docs/launch/autostop-autostart/)
- [Shopify platform performance](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform)
- [Discord interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)
