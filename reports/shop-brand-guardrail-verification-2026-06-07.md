# Shop Brand Guardrail Verification - 2026-06-07

This report records the guild-site side of the one-brand Shopify launch pass.

## Scope

- Added `scripts/check-shop-brand-guardrails.mjs`.
- Added `npm run check:shop-brand`.
- Added the new guardrail to `npm run check`.
- Scanned visible root static and Next app surfaces for old shop/supplier terms.

## Blocked Terms

- Old shop brand/domain terms: `Velesari`, `velesari`, `shop.velesari.trade`, `velesari.trade`.
- Supplier or third-party cosmetics references: `Selfnamed`, `selfnamed`, `MÁDARA`, `Madara`.
- Supplier-facing phrases: `private label`, `dropshipping`, `offer your customers`, `professional skincare offerings`.

Internal docs and reports are intentionally outside this guild-site customer-facing scan. They may retain private audit context as long as it is not rendered into the public website.

## Live Sample

Checked public routes:

- `https://mochirii.com/`
- `https://mochirii.com/join`
- `https://mochirii.com/gallery`
- `https://mochirii.com/gallery-submit`

Result: all returned `200` and no blocked shop/supplier terms were found in sampled HTML.

## Result

Status: `clean` for sampled public guild pages.

Remaining Shopify storefront blockers live in the Shopify theme repo and Shopify Admin: product categories, routine collections, product-source mockup reconciliation, product descriptions/SEO/media alt text, visible mockup label artwork, About facts, and Contact facts.
