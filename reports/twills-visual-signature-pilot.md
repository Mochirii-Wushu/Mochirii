# Twills Visual Signature Pilot

## 1. Current Twills Visual Audit

Twills is functionally stable and protected content is rendering safely. The page loads from `data/twills.json`, keeps a single `h1`, renders four badge strings as plain text spans, renders four `profile.bio` paragraphs unchanged, and uses the expected hero and avatar paths. Browser smoke at `360px`, `390px`, `768px`, and `1440px` returned `200`, rendered the shared header/footer, showed no console-breaking errors, and had no horizontal overflow.

The visual gap is now specific: after PR #82, Twills no longer has noisy inherited border animation, but it still does not have a full page identity. It reads as a simple public profile using generic glass cards rather than a personal profile chamber.

Pre-change browser evidence:

- `360px`, `390px`, `768px`, and `1440px`: `scrollWidth === clientWidth`, header/footer rendered, one `h1`, and no local console/page errors.
- `#twillsBio`: four rendered paragraphs exactly matched `data/twills.json` `profile.bio`.
- `#twillsBadges`: four rendered badges exactly matched current badge strings.
- Images: hero path remained `./assets/img/profiles/twills/hero.webp`; avatar path remained `./assets/img/profiles/twills/avatar.webp`.
- Twills card and badge animations reported `animation-name: none` after the cross-site regression fix.
- Current panel styling is minimal: hero/main cards use generic transparent glass borders and the avatar has only a thin generic border.

| Area | Current visual issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- |
| Hero/header area | Hero image renders, but the frame is the same generic shell used before page-specific visual systems. | P2 | Add a Twills-scoped moon/frost hero rim with a soft lantern edge and quiet chamber depth. | Yes | CSS-only; no image or copy change. |
| Hero intro panel | Profile name, timezone, and badges are readable but sit in a generic glass card. | P2 | Treat the intro as a personal profile placard with frosted rim, ink-glass surface, and restrained inner light. | Yes | Preserve heading, metadata, badges, and error status. |
| Profile portrait/avatar area | Avatar is present but not portrait-forward; before lazy load it has no stable visual frame in browser metrics. | P2 | Give the avatar a stable portrait frame with `aspect-ratio`, object-fit, moon/frost rim, and lantern edge light. | Yes | No asset or path changes. |
| `profile.bio` rendering | Bio is readable but looks like standard prose in a generic card rather than a preserved personal note. | P2 | Add a quiet note container with controlled measure, paragraph rhythm, moonlit surface, and warm edge accent. | Yes | Protected text must remain byte-for-byte unchanged in data and exact in render. |
| Badge rendering | Badges are plain global pills; contact details do not feel like seals or keepsakes. | P2 | Style badges as small frosted seals with subtle separator/rim language. | Yes | Badge text remains unchanged and non-interactive. |
| Image framing | Hero and avatar images lack a Twills-specific image language. | P2 | Use stable moon/frost image frames, soft inner shadow, and restrained portrait emphasis. | Yes | No new assets. |
| Panel hierarchy | Portrait and Bio cards feel equal and generic. | P2 | Use two Twills-specific tiers: portrait keepsake panel and main personal-note panel. | Yes | Existing `.col-4` / `.col-8` layout remains. |
| Border behavior | The prior noisy animation has been removed, but borders are now too plain to carry identity. | P2 | Replace generic borders with static Twills gradient rims. | Yes | No animated border. |
| Mobile readability | Current mobile layout fits and the text is readable. | Pass | Preserve one-column stack and improve spacing only through Twills-scoped CSS. | No defect | Keep no-overflow behavior at `360px` and `390px`. |
| Desktop readability | Desktop bio width is readable, but the profile chamber lacks deliberate focus. | P2 | Make the bio card the central personal note and keep portrait supportive. | Yes | Avoid Recruitment-style long-form speech treatment. |
| Focus states | Twills content has no page-local interactive controls; shared header/footer focus is visible. | Pass | Preserve global/shared focus behavior; no new controls. | No | If future links are added, use Twills-scoped focus rings. |
| Relationship to Leaders | Twills currently can feel like a small extension of Leaders. | P2 | Make it more intimate and portrait-forward, unlike Leaders' council/stewardship roster. | Yes | Preserve Leaders link behavior elsewhere. |
| Relationship to Recruitment | Twills bio uses personal voice but should not look like Recruitment's long hall speech. | P2 | Use a note/chamber treatment rather than a public address treatment. | Yes | No protected copy changes. |
| Relationship to Gallery | Twills can use moon/frost, but should not become an image archive. | P3 | Use moon/frost for portrait and note surfaces, not thumbnail/gallery controls. | Yes | No lightbox or gallery behavior changes. |
| Relationship to Home | Twills should not reuse Home's threshold, seal, or doorway system. | P3 | Keep the Home jade/lantern entry language separate; use a quieter personal palette. | Yes | Page-scoped variables only. |
| Relationship to overall visual system | Twills lacks the scoped-token/static-rim discipline now used elsewhere. | P2 | Reuse page-scoped variables, stable gradient rims, and restrained focus/motion rules. | Yes | No global CSS rewrite. |
| Performance risks | No current heavy Twills effects, but future polish could overdo shadows or motion. | Pass | Use static gradients/shadows only and no JS-driven effects. | No | Keep CSS-only and scoped. |
| Reduced-motion behavior | Current Twills animation is already none. | Pass | Do not add keyframes; rely on static styling and reduced-motion-safe transitions. | No | Existing global reduced-motion rule remains compatible. |

## 2. Proposed Twills Visual Treatment

Twills should feel like a personal profile chamber within the Mōchirīī world: calm, moonlit, portrait-forward, and intimate. The page should still belong to the same visual family, but it should no longer read as the only unstyled profile after the broader visual rollout.

Twills accent palette:

- Primary: moon/frost for the chamber surface, portrait frame, and bio note.
- Secondary: lantern gold for soft edge warmth and personal keepsake emphasis.
- Support: jade for site-family continuity and grounded accents.
- Grounding: ink glass for readable panels.
- Rare accent: lotus as a very soft warmth in the badge/note glow only.

Profile panel tiers:

- Hero frame: frosted profile image shell with static moon rim and subtle lantern edge.
- Profile placard: hero intro panel with moon/frost rim, ink-glass body, and small warm highlights.
- Portrait keepsake: side portrait card with a stable avatar frame, intentional crop, and soft rim.
- Personal note: bio card as the main reading surface, with improved text measure, paragraph rhythm, and preserved-note feeling.
- Badge seals: small non-interactive frosted badges that feel like keepsakes rather than generic pills.

Portrait/avatar treatment:

- Keep the current avatar image and path.
- Add `aspect-ratio: 787 / 909`, `object-fit: cover`, stable width, and static moon/frost rim.
- Use a subtle lantern edge glow and inner shadow so the avatar feels framed, not decorative clutter.

`profile.bio` treatment:

- Keep `data/twills.json` `profile.bio` unchanged.
- Rendered paragraphs remain plain text created by `twills.js`.
- Add Twills-scoped reading measure, line-height, paragraph spacing, and a quiet note surface behind the prose.
- Avoid the Recruitment long-form speech look by using a more personal note-card rhythm.

Badge/seal treatment:

- Keep badge strings unchanged and plain text.
- Style spans as small seals/keepsakes with frost border, ink-glass fill, and minimal glow.
- Do not convert contact badges into links.

How Twills differs from existing pages:

- Leaders: Twills is a single personal profile, not a council roster or stewardship grid.
- Recruitment: Twills is a personal note, not a guild-wide recruitment address.
- Gallery: Twills is portrait-forward, not an image archive or lightbox experience.
- Home: Twills is a quiet chamber, not the guild threshold or door system.

How Twills reuses the visual system:

- Use `body[data-page="twills"]` scoped variables.
- Use stable gradient rims, static layered glass, and restrained hover/focus transitions.
- Preserve shared header/footer/nav behavior and the existing layout architecture.
- Keep all work CSS-only unless a hook is proven necessary; this plan does not require HTML or JS hooks.

Motion and reduced motion:

- No new keyframes.
- No JavaScript-driven visual effects.
- Any transitions should be limited to static CSS property changes and remain covered by the existing global `prefers-reduced-motion` rule.
- Twills cards and badges should continue to report no active animation.

What must remain unchanged:

- `data/twills.json` `profile.bio`, including wording, punctuation, paragraph breaks, capitalization, diacritics, and structure.
- Twills profile copy, badge strings, and image paths.
- `data/home.json` `seal.verse`.
- `data/recruitment.json` `content.paragraphs` and `content.conclusion`.
- Header/footer/mobile nav, Supabase behavior, workflows, validation scripts, docs, assets, and page behavior.

## 3. Changes Made

Changed file:

- `styles.css`

Selectors changed:

- `body[data-page="twills"]`
- `body[data-page="twills"] .page-hero`
- `body[data-page="twills"] .hero-intro`
- `body[data-page="twills"] .page-main .glass-card`
- `body[data-page="twills"] .badge-row > span`
- `body[data-page="twills"] .hero-intro::before`
- `body[data-page="twills"] .page-main .glass-card::before`
- `body[data-page="twills"] .page-main .grid-gap`
- `body[data-page="twills"] .glass-pad`
- `body[data-page="twills"] .kicker`
- `body[data-page="twills"] .meta-text`
- `body[data-page="twills"] .muted`
- `body[data-page="twills"] .prose-stack`
- `body[data-page="twills"] .display-title`
- `body[data-page="twills"] .section-title`
- `body[data-page="twills"] .badge-row`
- `body[data-page="twills"] #twillsBadges > span:first-child`
- `body[data-page="twills"] .col-4 .glass-card`
- `body[data-page="twills"] .col-8 .glass-card`
- `body[data-page="twills"] .profile-avatar`
- `body[data-page="twills"] #twillsBio`
- `body[data-page="twills"] #twillsBio p`
- `body[data-page="twills"] .footer-link:focus-visible`
- `body[data-page="twills"] .footer-nav:focus-visible`
- `body[data-page="twills"]` mobile media rules at `max-width:640px`

Sections affected:

- Hero image frame.
- Profile placard.
- Portrait/avatar card.
- Bio/personal-note card.
- Profile badge row.
- Twills-only shared footer focus appearance.

Profile treatment:

- Added Twills-scoped moon/frost, lantern, jade, lotus, ink-glass, text, and muted-text variables.
- Replaced the generic Twills glass card treatment with a static frosted chamber panel language.
- Kept all styling page-scoped through `body[data-page="twills"]`.

Avatar/portrait treatment:

- Preserved `./assets/img/profiles/twills/avatar.webp`.
- Added a stable `aspect-ratio: 787 / 909`, full-width portrait frame, object-fit cover, moon/frost border, and subtle lantern edge glow.
- The frame now reserves meaningful portrait space before lazy image completion.

`profile.bio` treatment:

- Preserved `data/twills.json` `profile.bio` exactly.
- Added a Twills-scoped note surface around `#twillsBio`.
- Improved reading measure, line-height, paragraph rhythm, and contrast without changing renderer behavior.

Badge/seal treatment:

- Preserved all four badge strings exactly.
- Restyled existing plain badge spans as frosted keepsake seals.
- Gave the first badge a slightly warmer leader-seal treatment without adding semantics or links.

Cache-query decision:

- `styles.css` changed.
- Cache-query changed: no.
- Reason: Twills does not currently use the Gallery-style page-specific stylesheet query convention, and this branch does not introduce a new convention.

Motion changes:

- No new keyframes.
- No JavaScript-driven visual effects.
- Twills cards and badges continue to disable inherited `border-shift`.
- The treatment relies on static gradients, shadows, and existing reduced-motion-safe transition handling.

Reduced-motion handling:

- No Twills-specific animation was added.
- Existing global `prefers-reduced-motion` rules remain compatible.
- Browser smoke confirmed Twills panel and badge animation names stayed `none`.

Accessibility considerations:

- Heading order stayed unchanged: one `h1`, then `h2` headings for Portrait and Bio.
- Bio text remains real paragraphs rendered with `textContent`.
- Badge text remains plain non-interactive text.
- Shared footer focus states remain visible and now use a Twills-aligned focus ring on the Twills page.
- No new interactive controls or focus traps were added.

Performance considerations:

- No new assets, fonts, dependencies, scripts, or image transformations were added.
- Static CSS replaces generic glass without adding runtime work.
- No broad global selector changed.

## 4. QA Results

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Desktop Twills visual smoke | Pass | `1440px`: status 200, header/footer rendered, one `h1`, no overflow, hero/avatar/bio rendered. | Avatar loaded after scroll and kept a stable portrait frame. |
| Mobile Twills visual smoke | Pass | `360px` and `390px`: status 200, no console/page errors, no horizontal overflow, profile panels stacked cleanly. | Bio remained readable and badges wrapped safely. |
| Tablet Twills visual smoke | Pass | `768px`: status 200, no horizontal overflow, Twills profile layout remained stable. | Shared grid collapse remained intact. |
| Twills identity | Pass | Browser smoke confirmed Twills-scoped visual variables were present only on Twills; cross-page routes did not inherit them. | Twills now reads as a moonlit personal chamber rather than generic profile cards. |
| Protected bio | Pass | Rendered `#twillsBio p` exactly matched `data/twills.json` `profile.bio`. | No data file changed. |
| Badges | Pass | Rendered badge strings exactly matched `data/twills.json` `profile.badges`. | Badges remain text-only spans. |
| Image paths | Pass | Hero remained `./assets/img/profiles/twills/hero.webp`; avatar remained `./assets/img/profiles/twills/avatar.webp`. | No asset or data path changes. |
| Animation cleanup | Pass | Twills hero/card/badge animation names remained `none`. | No noisy border animation returned. |
| Cross-page regression smoke | Pass | `/`, `/join.html`, `/events.html`, `/gallery.html`, `/ranks.html`, `/leaders.html`, `/codex.html`, `/recruitment.html`, `/announcements.html`, `/raffles.html`, `/spotify.html`, and `/spotlight.html` passed at `390px`. | Header/footer rendered, one `h1`, no overflow, and no console-breaking errors. |
| Protected content diff | Pass | Empty diffs for `data/home.json`, `data/twills.json`, and `data/recruitment.json`. | Guild seal poem, Recruitment body/conclusion, and Twills bio unchanged. |
| `npm run check` | Pass | Full repo check passed. | Known MP3 warning only. |
| `git diff --check` | Pass | No whitespace errors. |  |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |  |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |  |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (420 refs checked).` |  |
| `node scripts/check-assets.mjs` | Pass with known warning | Checked 214 asset files; `assets/audio/mochiriiiiii.mp3` remains over threshold intentionally. |  |
| `npm run check:production` | Pass | `Production smoke check OK.` |  |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` | Local server on port `8765`. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold because original audio quality was restored.
- GitHub-managed Pages may still emit the known non-blocking Node.js 20 annotation.

Screenshots captured: no.

## 5. Visual Rollout Impact

Why Twills needed this before the cross-site visual baseline:

- PR #82 confirmed Twills was functionally stable and removed the last inherited border animation issue, but it still described Twills as a simple public profile.
- All other page families had received distinct page-scoped visual identities before the final cross-site visual baseline.
- This pilot fills that gap by giving Twills a personal, portrait-forward chamber treatment while preserving protected profile text.

Reusable pattern:

- Page-scoped variables plus static gradient rims remain a good pattern for focused visual signatures.
- Stable image framing with `aspect-ratio` is useful for lazy-loaded profile media.
- Report-first audit and CSS-only implementation remains the right shape for protected content pages.

Twills-only patterns:

- Moonlit personal chamber palette.
- Portrait keepsake avatar frame.
- Preserved-note `profile.bio` surface.
- Keepsake/seal badge treatment for public contact strings.

Recommended follow-up:

- Run `qa/twills-visual-regression-review` after merge.
- Rerun a refreshed `qa/cross-site-visual-regression-review` after Twills QA before creating the final cross-site visual baseline tag.
