# Site Shell Visual Alignment Pilot

## 1. Current Shell Visual Audit

The shared shell is behaviorally stable. `header.html` and `footer.html` mount through `site.js`; desktop dropdowns, mobile menu open/close, Escape close, focus return, skip link, active desktop navigation, footer year, script order, and signed-out Supabase browsing are already documented and working. Pre-change browser smoke at `390px` confirmed the mobile menu toggled `aria-expanded`, moved focus inside the menu, closed with Escape, returned focus to `#menu-btn`, cleared body overflow, and had no horizontal overflow or console-breaking errors.

The visual gap is focused: the header and footer still use the older plain ink-glass surfaces while page-level pilots now use richer static rims, page-scoped accent systems, deliberate focus rings, and less generic panel hierarchy. The shell should become the polished frame around the newer page identities without changing links, labels, routes, data, or behavior.

| Area | Current visual/shell issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- |
| Desktop header | Header is stable and readable, but the surface is a flat dark bar compared with the newer page visual system. | P2 | Add a shell-scoped ink-glass ribbon with jade/moon structure and soft lantern edge. | Yes | CSS-only; preserve sticky behavior and mounted markup. |
| Desktop nav links | Links are usable and 44px tall, but hover/current states are generic pills. | P2 | Refine nav links as calm shell controls with stable glass fill, subtle rim, and stronger active state. | Yes | Labels and hrefs unchanged. |
| Current/active page state | Direct top-level active state works; dropdown child state is only visible when the dropdown is open. | P2 | Use CSS-only parent highlighting for dropdown groups containing the active page and keep child active styling clear. | Yes | No JS change planned. |
| Desktop dropdown menus | Dropdown behavior is solid, but the menu surface is a plain dark panel. | P2 | Align dropdowns with the shell palette using refined rims, inner light, and clear item states. | Yes | Do not change dropdown open/close behavior. |
| Mobile menu button | Button is accessible and 44px, but visually basic beside newer page treatments. | P3 | Add a compact jade/moon shell-button surface with stronger hover/focus feedback. | Yes | Preserve `#menu-btn`, `aria-expanded`, and labels. |
| Mobile nav panel | Mobile dialog works, but the sheet reads like a plain side drawer. | P2 | Treat as a polished folded guild panel with ink glass, jade/frost rim, warm inner edge, and grouped link surfaces. | Yes | Preserve dialog role, focus trap, close controls, and link list. |
| Mobile nav links | Links are usable and about 45px tall, but their visual hierarchy is utilitarian. | P2 | Add group plates, clearer section titles, refined link surfaces, and touch-safe spacing. | Yes | No link labels or routes change. |
| Escape/focus return behavior | Escape closes the menu and returns focus to `#menu-btn`. | Pass | Preserve existing `site.js` behavior. | No | No JS change needed. |
| Skip link | Skip link works, but its surface is a plain dark pill. | P3 | Align skip link with shell focus treatment using jade/frost rim and lantern focus glow. | Yes | Preserve `href="#main"` and reveal-on-focus behavior. |
| Footer structure | Footer is compact and stable, but it still feels like a plain utility block. | P2 | Add quiet closing-hall surface with subtle top rim, jade/lantern seal warmth, and more finished link treatment. | Yes | Footer should not become a second homepage. |
| Footer links | Footer links are clear, but regular footer nav links are visually small and less touch-obvious on mobile. | P2 | Improve link surfaces and mobile touch clarity while keeping modest density. | Yes | Hrefs and labels unchanged. |
| Footer identity text | Identity text is allowed and stable, but the brand/emblem treatment can better match the crafted shell frame. | P3 | Add subtle emblem glow and refined brand/footer type contrast. | Yes | Do not edit visible copy. |
| Focus states | Global focus is visible, but shell controls do not share a polished, consistent focus language. | P2 | Add shell-focused rings for brand, nav, dropdown, CTA, burger, mobile, skip, and footer controls. | Yes | Keyboard clarity must remain stronger than hover. |
| Hover states | Hover states work, but some surfaces brighten without a strong system relationship. | P3 | Use restrained jade/frost/lantern hover changes and avoid heavy motion. | Yes | Reduced-motion should stay safe. |
| Touch targets | Header and mobile controls are 44px+; footer nav can be clearer on small screens. | P2 | Preserve existing hit areas and set mobile footer nav to a clearer 44px touch surface. | Yes | CSS-only. |
| Border behavior | Shell does not have noisy animated borders, but borders are plain and less deliberate than new page systems. | P2 | Use static gradient-like layered surfaces and stable linework. | Yes | No animated border strips. |
| Relationship to page visual system | Page identities are now distinct; shell still feels less crafted than the pages it frames. | P2 | Add a shared shell palette that supports Home, Gallery, Recruitment, Join, Events, ceremonial pages, Side Pages, and Twills without overpowering them. | Yes | Keep page-specific CSS untouched. |
| Mobile layout | Current mobile shell has no horizontal overflow. | Pass | Preserve viewport safety while improving the panel treatment. | No defect | Recheck all public pages after CSS. |
| Reduced-motion behavior | Existing global reduced-motion rule covers transitions and CTA glints. | Pass | Add no new keyframes; keep transition-based polish only. | No defect | No JS-driven visual effects. |
| Performance risks | Existing shell is lightweight. New polish could become too heavy if overdone. | Pass | Use static CSS gradients/shadows only; no assets, dependencies, or scripts. | No | CSS-only plan. |

## 2. Proposed Shell Visual Treatment

Shared shell palette:

- Primary: jade for navigation structure and active/current state.
- Secondary: moon/frost for rim light, text clarity, and quiet glass.
- Accent: lantern gold for focus warmth and call-to-action edges.
- Grounding: ink glass for header, dropdowns, mobile sheet, and footer surfaces.
- Rare: lotus only as a very soft footer/shell warmth where useful.

Header treatment:

- Treat the sticky header as a refined ink-glass navigation ribbon.
- Add layered dark glass, jade/moon linework, and subtle lantern edge light.
- Refine brand/emblem presence without changing the brand link or text.
- Keep desktop dropdown behavior unchanged.
- Use CSS-only `:has()` support to make dropdown parents visually active when their child page is current.

Mobile menu treatment:

- Keep the same dialog, scrim, sheet, close button, grouped links, Escape behavior, focus trap, and focus return.
- Style the sheet as a polished guild panel rather than a plain drawer.
- Add group plates, clear group titles, touch-safe link surfaces, and a stronger close-button/focus treatment.

Footer treatment:

- Keep the footer compact and link-oriented.
- Treat it as a quiet closing hall with a stable top rim, subtle emblem glow, refined link surfaces, and modest mobile touch clarity.
- Do not add content, remove links, or make the footer feel like another homepage section.

Active/current page treatment:

- Preserve `site.js` active desktop nav behavior.
- Strengthen `[aria-current="page"]` and `.nav-item.is-active`.
- Add CSS-only parent dropdown styling through `.nav-group:has(.nav-item.is-active) .nav-trigger`.
- Do not change mobile active-state behavior in this pilot.

Focus treatment:

- Use a consistent shell focus ring: visible outline, offset, jade/frost outer glow, and lantern warmth.
- Apply to skip link, brand links, nav links, dropdown items, CTA buttons, burger, mobile close button, mobile links, and footer links.
- Keep focus stronger and clearer than hover.

How the shell supports pages:

- The shell should be a quiet guild frame, not a competing page identity.
- Jade and moon structure ties the site together, while page-specific palettes still own each page's main content.
- Header/footer surfaces stay static and restrained so Home, Gallery, Recruitment, Join, Events, Codex/Ranks/Leaders, Side Pages, and Twills remain distinct.

Motion and reduced motion:

- No new keyframes.
- No JavaScript-driven visual effects.
- Use only lightweight transition-based hover/focus polish.
- Existing `prefers-reduced-motion` rules remain compatible.

Must remain unchanged:

- Header links, footer links, navigation labels, and route URLs.
- Mobile menu open/close, `aria-expanded`, Escape close, focus return, focus trap, link-close, scrim-close, and body scroll lock behavior.
- Skip link `href="#main"` and reveal-on-focus behavior.
- Header/footer mount behavior.
- Script order and Supabase signed-out safety.
- `data/home.json` `seal.verse`.
- `data/recruitment.json` `content.paragraphs` and `content.conclusion`.
- `data/twills.json` `profile.bio`.

## 3. Changes Made

Changed files:

- `styles.css`
- `reports/site-shell-visual-alignment-pilot.md`

No changes were made to `header.html`, `footer.html`, `site.js`, page HTML, page JavaScript, data files, assets, docs, workflows, validation scripts, `README.md`, or `AGENTS.md`.

Selectors changed or added:

- `:where(.site-header, .site-footer, .mobile-shell, .skip-link)`
- `.skip-link`
- `.skip-link:focus-visible`
- `.site-header`
- `.site-header[data-state="scrolled"]`
- `.brand`
- `.brand-mark`
- `.brand-emblem`
- `.brand:hover .brand-mark`
- `.nav-link`
- `.nav-link::after`
- `.nav-link:hover`
- `.nav-link:hover::after`
- `.nav-group[data-open="true"] .nav-trigger`
- `.nav-group[data-open="true"] .nav-trigger::after`
- `.nav-group:has(.nav-item.is-active) .nav-trigger`
- `.nav-group:has(.nav-item.is-active) .nav-trigger::after`
- `.nav-link[aria-current="page"]`
- `.nav-link[aria-current="page"]::after`
- `.nav-trigger[aria-expanded="true"] .nav-caret`
- `.nav-menu`
- `.nav-item`
- `.nav-item + .nav-item`
- `.nav-item:hover`
- `.nav-item.is-active`
- `.brand:focus-visible`
- `.footer-brand-link:focus-visible`
- `.nav-link:focus-visible`
- `.nav-item:focus-visible`
- `.mobile-link:focus-visible`
- `.cta:focus-visible`
- `.burger:focus-visible`
- `.icon-btn:focus-visible`
- `.footer-cta:focus-visible`
- `.footer-link:focus-visible`
- `.footer-nav:focus-visible`
- `.cta`
- `.burger`
- `.burger:hover`
- `.burger[aria-expanded="true"]`
- `.mobile-scrim`
- `.mobile-sheet`
- `.mobile-top`
- `.brand--mobile .brand-mark`
- `.brand--mobile .brand-emblem`
- `.icon-btn`
- `.icon-btn:hover`
- `.mobile-nav`
- `.mobile-group`
- `.mobile-group-title`
- `.mobile-link`
- `.mobile-link + .mobile-link`
- `.mobile-link:hover`
- `.site-footer`
- `.site-footer::before`
- `.footer-wrap`
- `.footer-top`
- `.footer-brand-link`
- `.footer-emblem`
- `.footer-title`
- `.footer-sub`
- `.footer-cta`
- `.footer-link`
- `.footer-link:hover`
- `.footer-cols`
- `.footer-col-title`
- `.footer-nav`
- `.footer-nav:hover`
- `.footer-bottom`
- Mobile media rule: `.footer-nav`

Header treatment:

- Added shell-scoped CSS variables for jade, moon/frost, lantern, lotus, and ink-glass surfaces.
- Refined the sticky header into a layered ink-glass ribbon with static jade/moon structure and warm edge light.
- Added a framed brand-emblem surface without changing the brand image, text, or link.
- Refined desktop nav links, dropdown menus, dropdown items, CTA, and menu button surfaces.
- Added CSS-only parent highlighting for dropdown groups that contain the current page through `:has(.nav-item.is-active)`.
- Preserved desktop dropdown markup and behavior.

Mobile nav treatment:

- Preserved the current mobile dialog, scrim, close button, grouped links, `aria-expanded`, body scroll lock, Escape close, focus return, focus trap, link-close, and scrim-close behavior.
- Restyled the mobile sheet as a polished guild panel with static ink-glass surface, jade/frost rim, lantern edge warmth, and grouped link plates.
- Kept mobile close button and links at 44px+ touch size.

Footer treatment:

- Refined the footer as a compact closing hall with a stable top rim, jade/lantern surface warmth, subtle emblem treatment, and clearer link surfaces.
- Improved footer navigation touch clarity on small screens without changing labels, hrefs, group structure, or footer content.
- Kept footer compact and link-oriented.

Focus treatment:

- Added one consistent shell focus language across skip link, brand links, desktop nav, dropdown items, CTA, menu button, mobile close button, mobile links, footer CTA, footer link, and footer nav.
- Focus rings use visible outline, offset, jade/frost outer glow, and lantern warmth.
- Keyboard focus remains stronger than hover.

Cache-query decision:

- `styles.css` changed.
- Cache-query changed: no.
- Reason: this repo does not currently use a repo-wide shared stylesheet query convention. Gallery has page-specific cache-query strings, but the shared shell and most public pages do not. Adding new cache-query strings would create a new convention outside this pilot.

Motion changes:

- No new keyframes.
- No JavaScript-driven visual effects.
- Existing CTA glints remain covered by the global reduced-motion rule.
- New shell polish uses static gradients, shadows, and restrained transitions only.

Reduced-motion handling:

- Browser smoke ran with reduced motion enabled across all public pages and passed.
- Existing `prefers-reduced-motion` rules remain compatible.
- No animated border behavior was introduced.

Accessibility considerations:

- Header and footer landmarks remain unchanged.
- Header links, footer links, navigation labels, route URLs, and Discord safe-link attributes remain unchanged.
- Desktop active navigation still uses `aria-current="page"`.
- Mobile menu `aria-expanded`, Escape close, scrim close, focus trap, focus return, and body scroll lock behavior passed browser smoke.
- Skip link still focuses visibly and moves to `#main`.
- Shell controls retain usable touch targets, including 44px mobile menu button, 44px mobile close button, 46px sampled mobile links, and 44px footer nav links at small widths.

Performance considerations:

- No new assets, dependencies, scripts, fonts, or build tooling.
- CSS-only static surfaces; no runtime visual work.
- Selector scope stays on shell-specific classes rather than page content systems.

## 4. QA Results

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Desktop shell smoke | Pass | All public pages at `1440px` returned `200`, rendered header/footer, had one `h1`, no overflow, no console-breaking errors, and desktop nav visible. | Page identities remained intact. |
| Mobile shell smoke | Pass | All public pages at `360px`, `390px`, and `768px` returned `200`, rendered header/footer, had one `h1`, no overflow, no console-breaking errors, and mobile menu button visible. | Mobile button measured 44px. |
| Header/nav | Pass | Browser smoke confirmed shell variables applied to header, active desktop nav remained present, and desktop nav links retained current labels/hrefs. | `header.html` unchanged. |
| Mobile nav behavior | Pass | At `390px`, opening menu set `aria-expanded="true"`, focus moved inside, body overflow locked, Escape closed menu, focus returned to `#menu-btn`, and scrim close also worked. | `site.js` unchanged. |
| Mobile nav touch targets | Pass | Close button measured 44x44; first mobile link measured 46px tall; mobile sheet fit within viewport. | No horizontal overflow. |
| Footer | Pass | Footer rendered on every public page; footer nav measured 44px tall at `360px` and `390px`; footer links retained labels/hrefs and Discord safe attributes. | `footer.html` unchanged. |
| Skip link | Pass | Keyboard Tab focused `.skip-link`, it became visible at the top of the viewport, and Enter moved location hash to `#main` with main content at viewport top. | `href="#main"` unchanged. |
| Focus states | Pass | Sampled shell links showed visible outline/box-shadow focus treatment. | Focus stronger than hover. |
| Cross-page regression | Pass | `/`, `/join.html`, `/events.html`, `/gallery.html`, `/ranks.html`, `/leaders.html`, `/codex.html`, `/recruitment.html`, `/twills.html`, `/announcements.html`, `/raffles.html`, `/spotify.html`, and `/spotlight.html` passed at all requested viewports. | No page-specific visual system regressed in smoke. |
| Gallery feature regression | Pass | Gallery rendered 70 thumbnails and expected filters; Portraits URL state produced `category=portraits`; Copy link returned `Link copied`; lightbox opened `./assets/img/gallery/shot-01.webp`, not `/thumbs/`. | `npm run smoke:gallery` also passed. |
| Events feature regression | Pass | All filter activated with `aria-pressed`, rendered 1 event, and count text reported `All: 1 event`. | Events behavior unchanged. |
| Recruitment audio | Pass | Recruitment audio rendered with native controls and source `./assets/audio/mochiriiiiii.mp3`. | Audio path unchanged. |
| Spotify feature regression | Pass | Initial render had 8 cards/iframes, iframe titles remained meaningful, `loading="lazy"` stayed present, no-match query showed empty state, and tag filter returned cards. | Spotify behavior unchanged. |
| Protected content | Pass | Empty diffs for `data/home.json`, `data/recruitment.json`, and `data/twills.json`. | Protected content unchanged. |
| Script order | Pass | Public pages still follow `utils.js` -> `supabase.js` -> `site.js` -> page script; Gallery preserved its existing cache-query order. | No HTML changed. |
| Supabase signed-out browsing | Pass | Browser smoke found `window.MochiriiSupabase` as an object and no page/runtime errors on public routes. | Supabase behavior unchanged. |
| `npm run check` | Pass | Full repo validation completed. | Known MP3 size warning only. |
| `git diff --check` | Pass | No whitespace errors. |  |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |  |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |  |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (420 refs checked).` |  |
| `node scripts/check-assets.mjs` | Pass with known warning | Checked 214 asset files; `assets/audio/mochiriiiiii.mp3` remains over the normal threshold intentionally. |  |
| `npm run check:production` | Pass | `Production smoke check OK.` |  |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` | Local server on port `8765`. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold because original audio quality was restored.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.

## 5. Next Step

Recommended sequence:

1. `qa/site-shell-visual-regression-review`
2. `qa/cross-site-visual-regression-review`
3. Tag `v2.2.0-cross-site-visual-baseline`
