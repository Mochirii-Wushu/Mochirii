# Shop Brand Guardrail Verification - 2026-06-07

This report records the guild-site side of the one-brand Shopify launch pass.

## Scope

- Added `scripts/check-shop-brand-guardrails.mjs`.
- Added `npm run check:shop-brand`.
- Added the new guardrail to `npm run check`.
- Scanned visible root static and Next app surfaces for old shop/supplier terms.

## Blocked Terms

- Former shop-brand and domain terms covered by the repository boundary scanner.
- Known manufacturing-partner identity and domain tokens assembled inside the
  guard without embedding those identifiers in public content.
- Supplier-facing phrases: `private label`, `dropshipping`, `offer your customers`, `professional skincare offerings`.

The repository boundary scanner covers tracked docs and reports as well as
customer-facing surfaces. Supplier-language rules retain their narrower public
surface scope.

## Live Sample

Checked public routes:

- `https://mochirii.com/`
- `https://mochirii.com/join`
- `https://mochirii.com/gallery`
- `https://mochirii.com/gallery-submit`

Result: all returned `200` and no blocked shop/supplier terms were found in sampled HTML.

## Result

Status: `clean` for sampled public guild pages.

Remaining storefront blockers are tracked in private operational evidence.
Public status is limited to the facts that catalog, media, policy, About, and
Contact approval remain incomplete and the storefront must stay gated.
