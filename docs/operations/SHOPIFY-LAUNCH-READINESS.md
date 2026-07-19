# Shopify Opening Readiness

Updated: 2026-07-18 PDT

Status: **BLOCKED — scoped source remediations are implemented; technical,
external, and provider gates remain**

This no-secret decision ledger is the single launch-control record for
shop.mochirii.com. It turns the approved opening-readiness plan into explicit,
fail-closed gates without placing supplier, formula, counsel, customer,
credential, or provider-export material in Git.

Current release boundary:

- initial market: United States only;
- launch pattern: 72-hour low-promotion public soft launch;
- assortment: exactly the twenty products in
  apps/shopify-theme/content/approved-customer-copy.json;
- candidate theme: unpublished theme 141514408011;
- checkout_enabled remains false;
- storefront password protection remains enabled;
- payment setup and payment testing are intentionally the final readiness
  phase and are not authorized by this document; and
- theme publication, password removal, real orders, purchases, and provider
  mutations still require the exact approval described below.

## Status And Evidence Rules

Use only these dispositions:

- **Pending**: acceptable current evidence is not recorded. This does not mean
  that evidence does not exist.
- **Ready**: the accountable reviewer accepted current evidence and recorded a
  sanitized pointer, review date, and result.
- **Blocked**: one or more required upstream decisions remain Pending or failed.
- **N/A (reviewed)**: a qualified reviewer documented why the field does not
  apply. Never use N/A as a convenience fallback.

Evidence is admissible only when it is formula- and SKU-specific, current for
the physical item that will ship, and reviewed by the accountable role. Broad
supplier marketing, a catalog-family document, a theme screenshot, or a green
code check cannot substitute for product-specific evidence.

Keep private evidence in the private credential and recovery boundary. The
public ledger may record only an opaque evidence ID, review date, reviewer
role, and pass/fail result. The private mapping for an evidence ID must retain
the product handle, evidence kind, source, capture date, review date, owner,
reviewer, currentness or expiry, and decision. Do not record a private
filename, supplier identifier, formula, cost, legal advice, signature, contact
detail, or credential here.

Generated Shopify readbacks, screenshots, logs, exports, and rollback captures
belong in the ignored .artifacts/operations/shopify boundary. A public status
may point to a sanitized capture ID, but not to secret-bearing output.

## Ownership And Approval

| Role | Accountable work | Public assignment rule |
| --- | --- | --- |
| Store owner | Final business decision, market, assortment, launch and emergency rollback approvals | Keep the named human in the private launch packet |
| Product evidence custodian | Physical samples, labels, formula/INCI and supplier evidence | Keep names and source records private |
| Qualified cosmetics counsel or compliance reviewer | Product classification, warnings, claims, responsible-person and MoCRA decisions | Record only the reviewer role and disposition here |
| Shopify operator | Provider readbacks, rollback exports, theme staging and approved provider actions | One authenticated writer per change packet |
| Theme engineer | Source validation, accessibility, responsive, performance and browser QA | Work through a focused branch and protected pull request |
| Fulfillment and support owner | Inventory, shipping, returns, complaints and adverse-event operations | Keep personal contact details out of Git |
| Privacy owner or counsel | App/pixel inventory, notices, consent, opt-out and request procedure | Record only the reviewed outcome here |

No role may approve its own evidence where qualified independent review is
required. The store owner must confirm the named accountable humans privately
before any SKU or launch gate becomes Ready.

## Fresh Provider And Storefront Readback

An authenticated Shopify admin readback and storefront smoke were completed on
2026-07-18 PDT. No provider setting, product, location, menu, policy, app,
pixel, theme, domain, payment record, order, or credential was changed. The
only storefront mutation was an ephemeral cart add/update/remove sequence, and
that browser-session cart was cleared. No payment page was opened.

Confirmed current facts:

- Shopify reports a Basic development store. The store currency is USD, the
  United States market is Active, and the Canada market is Draft.
- The catalog contains exactly twenty Active Mochirii Cosmetics products plus
  twenty archived legacy products. Every Active product is on one sales
  channel, has no catalog assignment, and reports **Inventory not tracked**.
- All twenty Active product records have a nonblank provider SKU and physical
  weight in grams, their admin/storefront prices match, and each record says
  **Shop location** is its single fulfilling location. This still requires the
  fulfillment owner to reconcile the intended supplier workflow and oversell
  behavior.
- The authenticated candidate storefront rendered all twenty Active products
  with USD prices. All twenty PDPs exposed size, suitability, directions, INCI,
  origin/certifications, nonblank image alt text, a canonical URL, and valid
  JSON-LD. This verifies rendered fields, not the source or legal sufficiency
  of those fields.
- Fifteen PDPs rendered the generic warning fallback. Five rendered specific
  warning text: Sensitive Skin Oil-to-Milk Cleanser, BiPhasic Make-up Remover,
  AHA Exfoliating Concentrate, All-in-One Facial Oil, and Hydrating Toner. None
  of those warning dispositions is cleared without label/formula review.
- Current live theme `141422395467` is **Mochirii Cosmetics Launch QA** version
  0.4.0. Candidate theme `141514408011` is **Mochirii Customer Copy QA
  2026-07-18 v2** version 0.5.0 and remains Draft. Storefront password
  protection remains enabled.
- The supplier delivery profile contains all twenty products, one fulfillment
  location, and thirty zones. Its United States weight tiers were displayed in
  euros in admin and have not been proven through checkout. The location list
  also contains an active placeholder Toronto location and a Shopify Test Data
  warehouse. These must be dispositioned before launch.
- Shopify Tax is enabled as a service, but the United States region reports
  **Not collecting**. Tax nexus, registrations, and collection behavior remain
  blocked on owner and qualified tax review.
- Installed apps comprise one supplier-fulfillment app, Search & Discovery,
  Knowledge Base, Shopify CLI Connector App, Theme Access, and one legacy store
  automation app. Customer events reports no app or custom pixels. Shopify
  Network Intelligence is enabled. Exact supplier and legacy-app names belong
  in the private release packet, not this public ledger.
- The automated privacy policy is enabled; the data-sharing opt-out page is
  active in fifteen US states; the provider Footer menu explicitly contains
  **Your Privacy Choices**; and the public opt-out route rendered successfully.
  The admin editor and public route showed different policy update dates.
  Checkout email marketing is preselected for US customers, and abandoned
  checkout email is enabled at ten hours for anyone. Legal and privacy-owner
  review of those settings and customer-visible behavior remains pending.
- The primary domain `shop.mochirii.com` is connected. Customer notifications
  use a public-domain sender, so Shopify reports that customers see a
  Shopify-generated sender address rather than a Mochirii-domain sender.
  `account.mochirii.com` and an older superseded storefront domain also remain
  connected and require an owner disposition before opening. Keep the retired
  brand/domain value out of public repository records.
- One organization owner is Active, but provider enforcement says a secure
  sign-in method is not required. Individual two-step-authentication status was
  not verified and remains a private owner check before payment activation.
- The current draft passed read-only smokes for five collections, a routine
  filter, ingredient and zero-result search, add/update/remove cart behavior,
  disabled checkout, contact required-field focus, public policy and privacy
  routes, branded 404, and 360x800, 390x844, 768x1024, and 1440x900 layouts with
  no horizontal overflow or broken main-content images. The new branch has not
  been uploaded to Shopify, so these are baseline provider smokes rather than
  acceptance of the source changes in this branch.
- A prior authenticated preview audit intermittently reached Shopify loading
  error pages that recovered after refresh. The behavior remains unclassified
  until controlled candidate-theme and post-password customer-route smokes pass.

## Twenty-SKU Release Ledger

The title and handle below are the only public SKU identity available in the
approved copy contract. Nonblank provider SKUs were read back, but the exact
product/variant-to-evidence mapping and release disposition remain pending.
Provider identifiers must not be invented or copied from private evidence into
this file.

Each provider-readback cell below records only sanitized rendered/admin facts.
It does not clear SKU/variant identity, inventory policy, physical-unit parity,
formula/label provenance, claims, warnings, fulfillment, or regulatory
readiness.

| # | Product identity | Physical sample | Label/formula | INCI | Directions | Warnings decision | Origin/certs | Responsible person | Safety substantiation | MoCRA registration/listing/exemption | Claims/counsel | Provider readback | Release disposition |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Peptide Smoothing Serum (peptide-smoothing-serum) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $48.99 USD; inventory untracked; generic warning fallback | Blocked |
| 2 | Natural Retinol Alternative Oil Serum (natural-retinol-alternative-oil-serum) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $50.99 USD; inventory untracked; generic warning fallback | Blocked |
| 3 | Vitamin C Serum (vitamin-c-serum) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $47.99 USD; inventory untracked; generic warning fallback | Blocked |
| 4 | Hyaluronic Day Cream (hyaluronic-day-cream) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $50.99 USD; inventory untracked; generic warning fallback | Blocked |
| 5 | Moisturising Day Cream (moisturising-day-cream) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $49.99 USD; inventory untracked; generic warning fallback | Blocked |
| 6 | Double Hydration Boost Gel (double-hydration-boost-gel) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $39.99 USD; inventory untracked; generic warning fallback | Blocked |
| 7 | Sensitive Skin Oil-to-Milk Cleanser (sensitive-skin-oil-to-milk-cleanser) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $51.99 USD; inventory untracked; warning displayed | Blocked |
| 8 | BiPhasic Make-up Remover, Fragrance Free (biphasic-makeup-remover-fragrance-free) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $47.99 USD; inventory untracked; warning displayed | Blocked |
| 9 | Collagen Night Cream (collagen-night-cream) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $53.99 USD; inventory untracked; generic warning fallback | Blocked |
| 10 | Ceramide Barrier Night Cream (ceramide-barrier-night-cream) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $53.99 USD; inventory untracked; generic warning fallback | Blocked |
| 11 | Niacinamide Gel Moisturiser (niacinamide-gel-moisturiser) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $41.99 USD; inventory untracked; generic warning fallback | Blocked |
| 12 | Gentle Cleansing Milk (gentle-cleansing-milk) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $36.99 USD; inventory untracked; generic warning fallback | Blocked |
| 13 | AHA Exfoliating Concentrate (aha-exfoliating-concentrate) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $43.99 USD; inventory untracked; warning displayed | Blocked |
| 14 | All-in-One Facial Oil (all-in-one-facial-oil) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $47.99 USD; inventory untracked; warning displayed | Blocked |
| 15 | Retinol Alternative Moisturiser (retinol-alternative-moisturiser) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $39.99 USD; inventory untracked; generic warning fallback | Blocked |
| 16 | Hydrating Toner (hydrating-toner) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $33.99 USD; inventory untracked; warning displayed | Blocked |
| 17 | Sensitive Face & Body Cleanser (sensitive-face-body-cleanser) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $27.99 USD; inventory untracked; generic warning fallback | Blocked |
| 18 | Cleansing Foam (cleansing-foam) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $36.99 USD; inventory untracked; generic warning fallback | Blocked |
| 19 | Caffeine Gel Booster (caffeine-gel-booster) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $39.99 USD; inventory untracked; generic warning fallback | Blocked |
| 20 | Smoothing Eye Cream (smoothing-eye-cream) | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Active; $42.99 USD; inventory untracked; generic warning fallback | Blocked |

A SKU becomes **Ready** only when every evidence cell is Ready or N/A
(reviewed), the provider readback matches the approved physical unit, and no
open claim, label, safety, channel, inventory, or fulfillment conflict remains.
The release is fail-closed: all twenty SKU rows must be Ready.

## Non-Payment Readiness Checklist

All items in this section must be Ready before payment setup begins.

### Product And Compliance

| ID | Required decision | Accountable role | Status |
| --- | --- | --- | --- |
| PC-01 | Reconcile each shipped sample, primary label and outer packaging to the corresponding ledger row | Product evidence custodian | Pending |
| PC-02 | Confirm actual formula, full INCI, directions, warning text or documented none-required decision, size and origin/certification display for every SKU | Product evidence custodian plus compliance reviewer | Pending |
| PC-03 | Confirm responsible-person contact and safety-substantiation record for every SKU | Compliance reviewer | Pending |
| PC-04 | Record applicable facility-registration evidence and each product/formula listing, exemption, renewal and change-reporting disposition under MoCRA | Compliance reviewer | Pending |
| PC-05 | Review cosmetic-versus-drug classification and every express or implied storefront, packaging, review, social and promotional claim | Qualified cosmetics counsel or compliance reviewer | Pending |
| PC-06 | Confirm the provider page, variant and media exactly match the approved physical unit for all twenty SKUs | Shopify operator plus product evidence custodian | Pending |

### Commerce And Fulfillment

| ID | Required decision | Accountable role | Status |
| --- | --- | --- | --- |
| CF-01 | Read back exactly twenty intended active products and their provider SKU/variant identifiers, prices, USD currency, inventory and channel status | Shopify operator | Blocked — 20 Active products, USD prices, nonblank SKUs and weights were confirmed; inventory remains untracked and final variant release disposition is Pending |
| CF-02 | Verify inventory source of truth, location assignment, oversell policy, package weights and fulfillment workflow | Fulfillment owner | Blocked — all 20 have weights but report inventory untracked and Shop location fulfillment; supplier routing, oversell behavior and placeholder/test locations require review |
| CF-03 | Test US shipping profiles, rates, processing and transit promises with representative supported and unsupported addresses | Shopify operator plus fulfillment owner | Blocked — US profile tiers were visible in EUR; checkout address testing is deferred with checkout disabled |
| CF-04 | Document reviewed US tax registrations, nexus and collection configuration; do not treat Shopify estimates as legal advice | Store owner plus tax professional | Blocked — Shopify reports United States Not collecting |
| CF-05 | Reconcile shipping, return, cancellation, damaged, incorrect, incomplete and carrier-lost promises to the real operating process | Fulfillment owner plus counsel | Pending |
| CF-06 | Verify customer-facing support routes, coverage, response ownership and order-number handling without exposing personal contacts | Support owner | Blocked — contact route works, but branded sender, coverage ownership and escalation evidence remain Pending |
| CF-07 | Disposition every connected commerce/account domain and verify secure owner access before payment activation | Store owner plus Shopify operator | Blocked — an older superseded storefront domain remains connected; provider enforcement says a secure sign-in method is not required, and individual two-step authentication was not verified |

### Privacy And Customer Safety

| ID | Required decision | Accountable role | Status |
| --- | --- | --- | --- |
| PS-01 | Inventory all installed apps, pixels, analytics, data recipients and Shopify privacy features | Privacy owner plus Shopify operator | Blocked — six apps, no pixels and Network Intelligence enabled were read back; data-recipient and owner review remain Pending |
| PS-02 | Review the automated privacy policy against actual settings and the US-only launch; the 2026-07-18 readback proves enablement, not legal sufficiency | Privacy owner or counsel | Blocked — automated policy is enabled and rendered, but admin/public update dates differed and legal review remains Pending |
| PS-03 | Verify applicable consent banner, opt-out page, Global Privacy Control behavior, marketing consent and privacy-request procedure | Privacy owner | Blocked — provider opt-out route and automated regions were verified; GPC and request operations remain Pending, while US checkout email marketing is preselected and abandoned-checkout email is enabled at ten hours for anyone pending review |
| PS-04 | Establish complaint, product-quality and serious adverse-event intake, retention, escalation and reporting workflow | Compliance reviewer plus support owner | Pending |
| PS-05 | Prepare approved customer-notification and escalation language for safety, fulfillment, privacy and payment incidents | Store owner plus accountable owner | Pending |

### Theme, Accessibility And Release Evidence

| ID | Required decision | Accountable role | Status |
| --- | --- | --- | --- |
| QA-01 | Pass npm ci, npm run check, npm run theme:package and git diff --check on the reviewed commit | Theme engineer | Blocked — all local commands passed on the branch working tree; the reviewed commit and protected CI evidence remain Pending |
| QA-02 | Verify all twenty PDPs expose the reviewed facts without generic warning or other evidence fallbacks | Theme engineer plus product evidence custodian | Blocked — all 20 rendered required field groups, but 15 use the generic warning fallback |
| QA-03 | Verify five collections, filters, ingredient search, misspellings, sold-out state, cart, contact form, policies, privacy choices and branded 404 | Theme engineer | Blocked — baseline provider smokes passed for the named routes and exact/zero-result search, but misspellings, sold-out and server-error paths remain Pending; branch changes are not on the candidate theme |
| QA-04 | Pass keyboard, screen-reader announcements, 200 percent zoom, focus order, error handling, contrast and touch navigation at 360x800, 390x844, 768x1024 and 1440x900 | Theme engineer | Blocked — viewport, overflow, broken-image and code-level contrast checks passed; assistive-technology and 200 percent zoom acceptance remain Pending |
| QA-05 | Run authenticated-preview Lighthouse checks for home, collection, PDP and cart; resolve confirmed LCP-priority and unnecessary-script problems | Theme engineer | Blocked — branch removes unnecessary eager/high product-card images; authenticated Lighthouse evidence remains Pending |
| QA-06 | Verify canonical URLs, metadata, Product and Breadcrumb structured data, social cards, sitemap and password-safe robots behavior | Theme engineer plus Shopify operator | Blocked — all 20 PDP canonicals and JSON-LD parsed, and representative home, collection and PDP metadata and social cards passed; sitemap, password-safe robots and branch-candidate acceptance remain Pending |
| QA-07 | Capture fresh provider readbacks and a rollback export of the current live theme and all records/settings in the approved mutation packet | Shopify operator | Blocked — live/candidate theme IDs and sanitized settings were read back, but no approved rollback export packet was created |
| QA-08 | Record exact candidate theme 141514408011, reviewed commit, package artifact and rollback theme in the private release packet | Shopify operator plus theme engineer | Blocked — candidate 141514408011, rollback theme 141422395467 and local package Mochirii Cosmetics-0.5.0.zip (SHA-256 3E35DDE232F6B49B411396DBFDD8E26D578310FB65D941E914E5581BDACB0C17) are recorded; the reviewed commit and approved private rollback packet remain Pending |

## Approval Gates

| Gate | Entry condition | Exit evidence | Current disposition |
| --- | --- | --- | --- |
| A — Product evidence | Exactly twenty canonical rows | Every SKU cell Ready or N/A (reviewed), with every release row Ready | Blocked |
| B — Non-payment commerce | Gate A Ready | CF-01 through CF-07 Ready | Blocked |
| C — Privacy and safety operations | Gate A Ready | PS-01 through PS-05 Ready | Blocked |
| D — Theme and storefront QA | Gates A through C Ready | QA-01 through QA-06 Ready on the candidate commit and theme | Blocked |
| E — Release and rollback preparation | Gate D Ready | QA-07 and QA-08 Ready; exact provider-change packet approved | Blocked |
| F — Final payment setup and order lifecycle | Every non-payment gate Ready | Payment verification and required test-order matrix pass; test mode disabled | Intentionally deferred final phase |
| G — Public soft launch | Gate F Ready | Exact publication/password-removal approval and successful release smoke | Blocked |

Updating a checklist or ledger status is a documentation change, not provider
authorization. Every provider mutation packet must name the exact store,
record or setting, intended value, writer, rollback capture, verification, and
stop condition.

## Final Payment Phase Boundary

Do not begin payment setup until Gates A through E are Ready and the store
owner gives an exact approval naming the store and payment action. That final
phase must:

1. confirm account security and two-step authentication without recording
   secrets or identity documents in Git;
2. complete the payment-provider business and bank verification privately;
3. confirm USD, statement descriptor, payout status, fraud controls and any
   reserve or hold;
4. keep the storefront password enabled and use an unpublished candidate
   theme during testing;
5. run successful, declined and gateway-failure test cases through inventory,
   shipping, taxes, notifications, cancellation, refund and fulfillment;
6. disable test mode and record a sanitized provider readback; and
7. perform a low-value real capture, payout or refund only after a separate
   approval that names the purchase and maximum cost.

Theme checkout remains disabled until the final payment phase is verified and
an approved source change sets checkout_enabled to true.

## Release, Rollback And 72-Hour Soft Launch

### Pre-release

1. Freeze the twenty-SKU decision ledger and retain the approved evidence
   manifest privately.
2. Confirm a clean reviewed commit, green required checks and a package built
   from that commit.
3. Capture fresh no-secret provider readbacks and a restorable export before
   any shared-record write.
4. Record the current live theme and candidate theme IDs, settings and
   rollback operator privately.
5. Complete Gate F under its separate approval.

### Controlled release

1. Merge the focused checkout-enabled source change only after Gate F passes.
2. Push that exact package only to candidate theme 141514408011.
3. Repeat the route, accessibility, SEO, cart and order-lifecycle smokes.
4. Under exact approval, publish candidate theme 141514408011.
5. Verify theme and checkout behavior while password protection remains
   enabled.
6. Remove the storefront password last under a separate exact approval.
7. Capture the public baseline without customer or payment data.

### Soft-launch monitoring

Keep promotion low for 72 hours. Review at opening, one hour, four hours, and
24, 48 and 72 hours:

- orders, declines, payouts, fraud review and duplicate-charge reports;
- inventory, oversells, fulfillment, shipping rates and tax anomalies;
- storefront route, cart, checkout and notification failures;
- privacy requests, support contacts, complaints and adverse events;
- accessibility, error signals, and p75 Core Web Vitals targets of LCP at or
  below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below
  0.1; and
- any mismatch between the shipped unit and the approved SKU ledger.

The store owner's release approval must also pre-authorize the named operator
to reapply password protection and restore the previous theme when a stop
condition occurs. Stop promotion and roll back for a label/formula/safety
conflict, systemic checkout or payment failure, incorrect tax or shipping
charges, inventory oversell, privacy-control failure, or a material storefront
regression. Preserve valid order records; never delete orders or evidence as a
rollback method.

After rollback, record the trigger, time, operator, restored state, customer
impact, evidence pointer and required corrective gate. Reopening requires a
fresh exact approval.

## Authoritative Source Anchors

Use current primary sources and qualified professional advice when completing
the gates:

- [Shopify launch preparation](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-prepare-for-launch)
- [Shopify Payments testing](https://help.shopify.com/en/manual/payments/shopify-payments/testing-shopify-payments)
- [Shopify customer privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings)
- [FDA Modernization of Cosmetics Regulation Act](https://www.fda.gov/cosmetics/cosmetics-laws-regulations/modernization-cosmetics-regulation-act-2022-mocra)
- [FDA cosmetics labeling requirements](https://www.fda.gov/cosmetics/cosmetics-labeling-regulations/summary-cosmetics-labeling-requirements)
- [FDA cosmetics under US law](https://www.fda.gov/cosmetics/cosmetics-laws-regulations/cosmetics-us-law)
- [FTC Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)
- [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [Shopify theme accessibility guidance](https://shopify.dev/docs/storefronts/themes/best-practices/accessibility)

This ledger is an operational control, not legal, tax, medical, or regulatory
advice. Qualified reviewers remain responsible for their decisions.
