# Storefront Surface Lifecycle

Date: 2026-07-29
Scope: Mochirii Cosmetics prepayment source and provider-acceptance boundary
Provider authority granted by this record: none

## Decision

The current Online Store 2.0 source remains the sole active storefront theme.
It is prepared for an unpublished, password-protected candidate and is not
approved for publication or commerce. The active source manifest is the hash
authority for mutable theme files; the byte-sealed migration manifest remains
historical evidence and is not a current-source authority.

Every active surface below stays blocked until its referenced private evidence
and authenticated provider readback pass. Retired surfaces must remain absent
or return the recorded unavailable state. No row authorizes a provider write,
checkout activation, payment, order, or publication.

## Surface Ledger

| Surface or journey | Lifecycle | Source authority | Audience | Cache and privacy decision | Test or evidence authority | Terminal status |
| --- | --- | --- | --- | --- | --- | --- |
| Password page | Active | `layout/password.liquid`; `sections/main-password.liquid` | Candidate reviewers only | Public shell; no private facts; password stays enabled | Active-source manifest; provider readback | `BLOCKED_EXTERNAL` pending candidate readback |
| Home and collections index | Active | `templates/index.json`; `templates/list-collections.json` | Candidate reviewers, then customers | Public cacheable presentation; reviewed copy/media only | Provider-surface contract; rendered-route evidence | `BLOCKED_EXTERNAL` pending hero, featured products, and media approval |
| Five collection routes | Active | `templates/collection.json`; controlled collection contract | Candidate reviewers, then customers | Public cacheable presentation; no supplier identity | Launch-content and provider-surface contracts | `BLOCKED_EXTERNAL` pending membership, media, description, and readback approval |
| Twenty product routes and variants | Active | `templates/product.json`; `sections/main-product.liquid`; exact product-facts contract | Candidate reviewers, then customers | Public facts only; supplier mapping, cost, and evidence stay private | Product-facts and prepayment evidence gates | `BLOCKED_EXTERNAL` pending all physical dossiers; Peptide remains blocked |
| Search and controlled filters | Active | `templates/search.json`; `sections/main-search.liquid`; provider-surface contract | Candidate reviewers, then customers | Public query results; vendor filter forbidden | Search-query contract and rendered-route evidence | `BLOCKED_EXTERNAL` pending authenticated provider readback |
| Product availability and pricing | Active | Controlled Shopify fields plus private price/readback ledgers | Candidate reviewers, then customers | Public retail price and availability only; supplier cost stays private | Private price verifier and provider readback | `BLOCKED_EXTERNAL` pending authenticated exact-SKU cost and price proof |
| Cart | Active, contained | `templates/cart.json`; `sections/main-cart.liquid` | Candidate reviewers only before launch | Cart state is customer-specific; theme checkout control stays false | Release-safety and checkout-CTA contracts | `BLOCKED_APPROVAL` pending final commerce authorization |
| Checkout handoff | Active capability, disabled for prepayment | Provider checkout plus guarded cart control | No prepayment customer access | Transactional and private; no caching | Payment-dependent boundary and final integrated-order tests | `DEFERRED_BY_EXPLICIT_POLICY` to the final payment phase |
| Customer accounts | Active, optional | Provider account setting and authenticated readback | Individual customer | Private, authenticated, no shared account data | Provider-surface and operations readbacks | `BLOCKED_EXTERNAL` pending authenticated setting/readback |
| Contact and five policy routes | Active | `templates/page.contact.json`; `templates/page.json`; reviewed page/policy contracts | Public | Public cacheable policy copy; contact submissions private | Launch-content contract and provider readback | `BLOCKED_EXTERNAL` pending counsel and operations parity |
| Customer notifications | Active transactional surface | Provider notification templates and sender settings | Affected customer only | Private transactional delivery; no public archive | Provider-surface notification readback | `BLOCKED_EXTERNAL` pending approved templates and sender authentication |
| Privacy choices | Active | `/pages/data-sharing-opt-out` expectation and provider privacy settings | Public and affected customers | Public notice; submitted choices private | Provider-surface and privacy readbacks | `BLOCKED_EXTERNAL` pending GPC, disclosure, and provider verification |
| Gift cards | Retired from launch | Provider setting plus `templates/gift_card.liquid` compatibility template | No launch audience | Unlisted and expected 404; compatibility document is always `noindex, nofollow` | Provider readback and release-safety contract | `DEFERRED_BY_EXPLICIT_POLICY`; do not enable or list |
| Reviews, subscriptions, loyalty, quizzes, bundles, and popups | Retired from launch | No active theme surface | None | No data collection, embed, or customer tracking | Customer-facing copy and release-safety scans | `DEFERRED_BY_EXPLICIT_POLICY` |
| Direct checkout primitives outside guarded cart | Retired | Repository-wide runtime scan | None | Must remain absent | Checkout-CTA safety contract | `SOURCE_VERIFIED` only as an absence contract; provider checkout remains gated |
| Vendor, raw tag/type, material, generic warning, and supplier-cost presentation | Retired | Repository-wide runtime and copy scans | None | Must never render or enter public structured data | Product-facts, customer-copy, and release-safety contracts | `SOURCE_VERIFIED` only as an absence contract; recheck every candidate |
| Prior live theme and candidate exports | Replaced, retained for rollback | Ignored scoped exports and rollback packet | Operators only | Private evidence; never Git tracked or publicly cached | Candidate binding and rollback readback | `BLOCKED_EXTERNAL` pending fresh exports and exact artifact binding |

## Required Responsive Evidence

Candidate acceptance must provide fresh browser evidence for 320-by-568 through
2560-by-1440 CSS-pixel classes, including current phone portrait widths,
phone landscape, tablet portrait and landscape, desktop, the 2560-by-1080
ultrawide class, 200 percent text sizing, keyboard operation, touch, NVDA with
Chrome, and VoiceOver with Safari. The gate requires the exact viewport set encoded by
`PREPAYMENT_RESPONSIVE_VIEWPORTS`; synthetic contract fixtures never substitute
for authenticated candidate screenshots and observations.

## Rollback and Stop Conditions

Before any candidate write, capture current live and candidate theme exports,
the exact source commit and tree, package digest, scoped provider readbacks,
writer, rollback owner, and stop conditions. Stop and restore the prior scoped
state if source binding, route behavior, factual parity, pricing, privacy,
accessibility, performance, or rollback evidence differs from the approved
packet. Publication and password removal remain a separate exact approval.
