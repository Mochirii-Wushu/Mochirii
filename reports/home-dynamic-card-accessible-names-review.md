# Home Dynamic Card Accessible Names Review

Date: 2026-05-15
Branch: `qa/home-dynamic-card-accessible-names-review`
Mode: QA/report-only

No site behavior, data files, CSS, Supabase configuration, migrations, Edge Functions, assets, workflows, or validation scripts were changed for this review.

## 1. Scope

This review verifies the A01 fix from `reports/home-dynamic-card-accessible-names.md`.

Reviewed files:

- `home.js`
- `index.html`
- `reports/home-dynamic-card-accessible-names.md`
- `reports/accessibility-name-and-member-pages-review.md`

Primary accessibility basis:

- WCAG 2.2 Success Criterion 2.4.4 Link Purpose (In Context)
- WCAG 2.2 Success Criterion 2.5.3 Label in Name
- WCAG 2.2 Success Criterion 4.1.2 Name, Role, Value

## 2. Accessible Name Verification

Result: passed.

Home dynamic card links now expose specific accessible names after JSON content renders.

Verified examples:

- Featured bulletin: `Featured bulletin - Event - 02/28/2026 - Monthly gatherings open to all members to be heard.`
- Member spotlight: `Member spotlight - Spotlight - Congratulations to: Meenari. - For support & a pretty amazing spark. - Spotlight Appreciation`
- Home Gallery Spotlight sample: `View Companions Gallery images: Two weapon-bearers share a pale portrait.`
- Home Gallery Spotlight sample: `View Scenery Gallery images: Two figures looking toward a mountaintop pagoda.`

Browser role checks:

- `page.getByRole('link', { name: /Monthly gatherings open to all members/i })` found exactly 1 link.
- `page.getByRole('link', { name: /Congratulations to: Meenari/i })` found exactly 1 link.
- No sampled Home Gallery Spotlight link kept the old generic `View Gallery category` name.

## 3. Keyboard, Focus, and Layout

Result: passed.

- First Tab focus reached `Skip to main content`.
- The focused skip link retained a visible `solid 2px` outline.
- No horizontal overflow was observed on Home at widths `360`, `390`, `768`, or `1440`.
- The fix stayed attribute-level in `home.js`; no visual styling or layout files changed.

## 4. Home Gallery Spotlight

Result: passed.

Fresh local browser evidence:

- Home rendered exactly 4 Gallery Spotlight images.
- The 4 sampled image sources were unique.
- The 4 sampled accessible labels were unique.
- All sampled Home Gallery Spotlight images used `/thumbs/` paths.
- All sampled Home Gallery Spotlight links resolved to `gallery.html?category=<category>`.

The A01 change did not alter the selection count, duplicate guard, thumbnail policy, category link policy, or Home Gallery Spotlight rotation behavior.

## 5. Fallback Behavior

Result: passed.

With `data/gallery.json` intercepted as unavailable, Home fell back to the existing 4 screenshot buttons:

- `./assets/img/gallery/thumbs/shot-23.webp`
- `./assets/img/gallery/thumbs/shot-57.webp`
- `./assets/img/gallery/thumbs/shot-60.webp`
- `./assets/img/gallery/thumbs/shot-65.webp`

Fallback accessible labels used caption or alt text. The fallback pass found 0 bare `Open image` labels.

Expected fallback-only console evidence:

- A local `503 Service Unavailable` was produced by the test interception for `data/gallery.json`.

## 6. Gallery Regression Checks

Result: passed.

Local Gallery checks:

- `/gallery.html` rendered 73 Gallery items.
- Gallery count text showed `Showing 73 of 73 images.`
- Default Gallery order stayed `random`.
- Two fresh random-mode page loads produced different first item orders.
- Portraits filter updated the URL to `gallery.html?category=portraits`.
- Portraits filter set `aria-pressed="true"` and showed `Showing 23 images in Portraits.`
- Sort changes updated the URL to `sort=newest` and `sort=oldest`.
- Back navigation restored `sort=newest`, then returned to random sort for `category=portraits`.
- Copy link reported `Link copied`.
- Gallery lightbox opened a full image path, not a `/thumbs/` path.
- Lightbox focus moved to `#lightboxClose`.
- Escape closed the lightbox.

## 7. Cross-Page Stability

Result: passed.

The local browser pass loaded these pages without console-breaking errors, with 1 `h1`, mounted header/footer shell, and no horizontal overflow:

- `/`
- `/gallery.html`
- `/join.html`
- `/events.html`
- `/recruitment.html`
- `/twills.html`

## 8. Protected Content and Data

Result: passed.

- No data files changed in this review branch.
- `data/home.json` remains unchanged.
- `data/gallery.json` remains unchanged.
- `data/recruitment.json` remains unchanged.
- `data/twills.json` remains unchanged.
- Protected `data/home.json` `seal.verse` remains unchanged.
- Protected `data/recruitment.json` `content.paragraphs` remains unchanged.
- Protected `data/recruitment.json` `content.conclusion` remains unchanged.
- Protected `data/twills.json` `profile.bio` remains unchanged.

## 9. Validation

Standard validation passed on this branch:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:production`
- `npm run smoke:gallery`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 10. Conclusion

A01 resolved the Home dynamic card accessible-name issue without changing visible copy, data files, Gallery data, Gallery images, CSS, or Home/Gallery behavior. No follow-up implementation fix is needed in this branch.
