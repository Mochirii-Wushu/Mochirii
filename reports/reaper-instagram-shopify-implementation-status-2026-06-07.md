# Reaper, Instagram, Shopify, And Grammar-Only Implementation Status - 2026-06-07

This report records the implementation state for the cross-site release plan. It separates completed repo work from external inputs that are still required before production-side actions can be finished.

## Source Basis

- Discord Application Commands: https://docs.discord.com/developers/interactions/application-commands
- Meta Instagram Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
- Vercel production checklist: https://vercel.com/docs/production-checklist
- GitHub protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Shopify product categories: https://help.shopify.com/en/manual/products/details/product-category
- Shopify collections: https://help.shopify.com/en/manual/products/collections
- Selfnamed Shopify integration: https://help.selfnamed.com/en/articles/10009931-shopify-dropshipping-integration-manual
- Plain language guidance: https://www.plainlanguage.gov/guidelines/

## Guild Repo State

- Branch checked: `main`.
- Current commit checked: `ae8bee3` (`Align Instagram migration history`).
- Live production URL: `https://mochirii.com`.
- Production surface: Vercel/Next from `apps/web`.
- Open PRs observed: stale Vercel analytics/speed-insights draft PRs and one older typo/task PR. None were part of this release pass.

## Reaper Bot Track

Status: blocked on bot source/runtime.

Chrome evidence showed the logged-in Discord Developer Portal can see the `Reaper` application. However, no local Reaper repository or GitHub repository was available from the current workspace or visible repo list. Because the runtime source was not available, this pass did not change the `/submit` command schema or handler.

Required next inputs:

- Reaper repository path or GitHub repo access.
- Reaper runtime/deployment method.
- Existing test command or deployment checklist for Reaper.

Required implementation after access is available:

- Add optional Discord boolean command option `share_to_instagram`, default `false`.
- Send `instagramOptIn: true` only when the user explicitly selects true.
- Preserve `subtitle` to `caption` mapping.
- Preserve gallery channel restriction to `1508077313965817856`.
- Preserve duplicate message/attachment idempotency.
- Register the command only after tests pass.
- Run dry-run payloads for omitted, false, true, and wrong-channel cases.

## Supabase Instagram Secrets Track

Status: blocked on owner-provided secret values.

The production Instagram migration/functions are already represented in the guild repo and Supabase deployment history. This pass did not set Supabase secrets because the real values were not provided and placeholder secrets would create false confidence.

Required owner-provided values:

- `INSTAGRAM_ACCOUNT_ID`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_API_VERSION`

Rules preserved:

- Do not store Instagram secrets in Vercel, GitHub, docs, browser code, logs, or reports.
- Do not set production `INSTAGRAM_API_BASE_URL` unless intentionally using a temporary mock provider.
- Do not perform a real Instagram post in this pass.

## Shopify Track

Status: source-of-truth evidence updated; product/admin blockers remain.

Shopify PR #39 was marked ready and squash-merged into `shopify-theme`. The Shopify theme repo was fast-forwarded to `ff39d1d`, and branch `codex/shopify-launch-blocker-cleanup` now records the latest execution evidence.

Current read-only Shopify Admin evidence:

- Products page filtered to `status:"active"` showed 20 active rows.
- All 20 active rows still showed category `Uncategorized`.
- Active product rows showed vendor `Mochirii`.
- Main collection `Mōchirīī Daily Care` showed 20 products.
- Routine collection handles were not visible in the Collections list.
- Old or unrelated collections remain present but hidden from sales channels in the visible list.
- Selfnamed `profile/my-products` opened in Chrome after the dashboard was made available. It showed 20 mockup images, but the visible supplier-side product set did not fully match Shopify's 20 active products.

Selfnamed mismatch evidence:

- Duplicate visible supplier-side entries: `Hydrating Serum` and `Sensitive Skin Oil-To-Milk Cleanser`.
- Visible Selfnamed products not currently active in Shopify: `Keratin Intensive Rescue Hair Mask`, `Keratin Volume Boost Shampoo`, `Hydrating Serum`, and `Niacinamide Gel Moisturiser`.
- Shopify active products not visible in the Selfnamed extract: `Natural Retinol Alternative Oil Serum`, `Vitamin C Serum`, `Moisturising Day Cream`, `Anti-Age Night Cream`, `Anti-Age Day Cream`, and `Peptide Anti-Aging Serum`.

Required owner/dashboard work remains:

- Assign accurate product categories.
- Create and populate routine collections.
- Reconcile the Selfnamed visible product set against Shopify's active catalog, then compare every active product image against the approved Selfnamed source mockup.
- Replace About and Contact placeholders with owner-provided facts.
- Keep old collections hidden or redirected without deleting them unless separately approved.

## Grammar-Only Track

Status: no safe shopper-facing grammar edits made in this pass.

The grammar-only scan was constrained to objective spelling, punctuation, capitalization, mojibake, and obvious typo patterns. No guild or Shopify source text was changed because no confirmed error was found that could be corrected without becoming a style rewrite, protected-copy edit, product-fact edit, or placeholder-content edit.

Protected boundaries preserved:

- Guild protected seal/recruitment/Twills copy was not edited.
- Shopify product claims and product descriptions were not rewritten.
- About and Contact placeholders were not replaced without owner facts.

## Live Safety

No live side-effect actions were taken in this pass:

- No Discord command registration.
- No Supabase secret write.
- No Instagram publishing.
- No Shopify product/category/media/collection mutation.
- No Shopify publish, password, checkout, payment, order, domain, or DNS change.

## Next Required Inputs

1. Reaper repo/runtime access.
2. Real Instagram Supabase secret values.
3. Owner-provided About fields: founder name, founding year, founder image, and quote.
4. Owner-provided Contact fields: public support email, response window, order-help note, and press/partnership contact.
5. Owner decision on whether Shopify's current active set or the visible Selfnamed `My Products` set is the intended source-of-truth catalog.
