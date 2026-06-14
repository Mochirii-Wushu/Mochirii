# Mochi Social Monero Treasury Boundary

This website-side runbook keeps Monero mining outside Mochirii and outside Mochi Social runtime code. Monero can mine XMR, but it cannot directly fund Enjin Canary cENJ. For alpha, Enjin Canary work remains no-real-value and uses cENJ/Fuel Tank tooling only after explicit approval. Mined XMR is an external operator treasury that may later be manually converted to ENJ for mainnet work after a separate approval.

## Source Basis

- Monero downloads and mining: https://www.getmonero.org/downloads/ and https://www.getmonero.org/get-started/mining/
- Monero CLI wallet reference: https://docs.getmonero.org/interacting/monero-wallet-cli-reference/
- P2Pool and XMRig guide: https://docs.getmonero.org/interacting/mining/guides/p2pool/xmrig-p2pool/
- Enjin Fuel Tanks: https://docs.enjin.io/guides/platform/managing-users/using-fuel-tanks
- Enjin Wallet Daemon: https://docs.enjin.io/getting-started/using-wallet-daemon
- Supabase cost control: https://supabase.com/docs/guides/platform/cost-control
- Vercel spend management: https://vercel.com/docs/spend-management
- Fly cost management: https://fly.io/docs/about/cost-management/
- GitHub budgets: https://docs.github.com/en/billing/how-tos/set-up-budgets
- Discord OAuth2: https://docs.discord.com/developers/topics/oauth2
- CISA cryptojacking guidance: https://www.cisa.gov/news-events/news/defending-against-illicit-cryptocurrency-mining-activity
- IRS digital assets: https://www.irs.gov/filing/digital-assets

## Website Boundary

Mochirii may own alpha tester access, terms, feedback, admin views, Supabase Edge Functions, budget reservations, and withdrawal kill switches. It must not own or run mining software. There is no public API for mining, no browser mining, no hidden mining, no visitor/device mining, no provider-hosted mining, and no GitHub Actions mining.

Do not put mining binaries, wallet files, node data, wallet reports, wallet seeds, private spend keys, private view keys, wallet passwords, exchange credentials, transfer receipts, or tax/accounting records in this repo.

## Supabase Authority

For future funded Enjin work, Supabase owns budget and finality authority:

- Edge Functions validate signed-in testers and privileged game-server writes.
- Browser code receives only public/publishable-safe values and short-lived user tokens.
- Service-role keys, Discord secrets, Enjin tokens, Wallet Daemon secrets, Monero keys, exchange credentials, and wallet passwords stay out of browser code, Vercel public env, static JSON, reports, screenshots, and PR text.
- Admin controls must include an all-withdrawal kill switch before any funded withdrawal lane is enabled.

Available chain budget must be computed server-side:

```text
min(fuelTankRemaining, tankBudget, perUserBudget, operatorCap, dailyCap) - pendingReservations
```

Reject if budget cannot be verified. Duplicate idempotency keys must not double-spend. Inventory changes only after Enjin state is `FINALIZED`.

## Discord Boundary

Discord remains an auth/community surface. OAuth secrets and bot tokens stay in Supabase/provider secrets. Discord must not present mining prompts, financial promises, auto-withdrawal claims, or any suggestion that tester actions generate real-value rewards during Alpha Preview Ready.

## Enjin Boundary

Alpha Preview Ready keeps Enjin visible as `configured-preview-stub`. Do not set dummy Enjin IDs, do not clear funded-chain gates, do not convert XMR to cENJ, and do not submit chain transactions without explicit action-time approval. Future mainnet ENJ funding is a separate operator action, not a website automation.

## Provider Billing Boundary

The Monero wallet cannot cap Vercel, Supabase, Fly, GitHub, Discord, or Enjin provider bills. Each provider needs its own budget/spend controls and approval trail. Starting a miner is also cost-bearing because it consumes electricity and hardware.

## Operator Evidence

No-secret site-side evidence may record only:

- operator checklist status,
- budget policy version,
- kill switch state,
- idempotency behavior,
- finality behavior,
- provider budget-control status,
- links to public docs or internal no-secret runbooks.

Do not publish wallet balances, exchange details, private addresses, emails, tax records, cookies, access tokens, raw headers, wallet files, keys, or screenshots containing private provider data.
