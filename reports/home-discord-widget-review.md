# Home Discord Widget Review

## 1. Implementation Review

Files inspected:

- `index.html`
- `styles.css`
- `data/home.json`
- `home.js`
- `site.js`
- `header.html`
- `footer.html`
- `reports/home-visual-system-pilot.md`
- `reports/home-visual-regression-review.md`
- `reports/site-shell-visual-alignment-pilot.md`
- `reports/cross-site-visual-regression-review.md`

Placement:

- The Discord widget section is present only on the Home page in `index.html`.
- It appears directly after the Four Doors section and before Member Spotlight.
- The widget is not duplicated elsewhere in page shells.

Layout behavior:

- Desktop uses a Home glass-card two-column layout: copy and CTA on the left, iframe frame on the right.
- The iframe frame is capped at `350px`, matching the provided widget width.
- Mobile under `640px` switches to one centered column.
- The frame uses `width:min(100%, 350px)` and `overflow:hidden`, so it can shrink within narrow Home content without horizontal overflow.
- No JavaScript was added.

Iframe attributes:

- `src` remains `https://discord.com/widget?id=1078630751077142608&theme=dark`.
- `width="350"` and `height="500"` remain in the iframe markup.
- `allowtransparency="true"`, `frameborder="0"`, and the provided `sandbox` value are preserved.
- `title="Mōchirīī Discord server widget"` is present.
- `loading="lazy"` is present.

CTA status:

- The existing Discord invite URL remains `https://discord.com/invite/dPafqMwWPK`.
- The new section includes a matching Home CTA using the existing `hero-cta` styling and safe external-link attributes.
- Header and footer Discord CTAs were not changed.

Styling scope:

- New selectors are Home-scoped with `body[data-page="home"]`.
- No global CSS, shared shell CSS, data files, JavaScript files, assets, workflows, validation scripts, docs, `README.md`, or `AGENTS.md` were changed for the widget.
- No heavy animation or new keyframes were added.

Accessibility notes:

- The section is labelled by `aria-labelledby="homeDiscordTitle"`.
- The iframe has a meaningful title.
- The CTA remains keyboard focusable and inherits the existing visible Home CTA focus treatment.
- The widget follows existing Home heading structure with an `h2`, preserving a single `h1` on Home.

Risks:

- Discord can block or fail the iframe network load during local or external smoke checks. That should be treated as a third-party/network limitation if the iframe markup, layout, and surrounding page remain stable.
- The iframe is intentionally fixed at `500px` tall to match Discord's widget dimensions, so the surrounding section is tall on mobile. This is expected and contained by the centered one-column layout.

## 2. Protected Content Review

Validated with direct diffs:

- `git diff -- data/home.json`: no diff.
- `git diff -- data/recruitment.json`: no diff.
- `git diff -- data/twills.json`: no diff.
- `git diff -- data/gallery.json`: no diff.

Protected content status:

- `data/home.json` `seal.verse` unchanged.
- `data/recruitment.json` `content.paragraphs` unchanged.
- `data/recruitment.json` `content.conclusion` unchanged.
- `data/twills.json` `profile.bio` unchanged.
- Gallery data and images were not changed.

## 3. Local Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known intentional `assets/audio/mochiriiiiii.mp3` size warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | JSON validation passed. |
| `node scripts/check-js.mjs` | Pass | JavaScript syntax validation passed. |
| `node scripts/check-refs.mjs` | Pass | Local references OK, `474` refs checked. |
| `node scripts/check-assets.mjs` | Pass with known warning | `assets/audio/mochiriiiiii.mp3` exceeds the normal `0.95 MB` threshold intentionally. |
| `npm run check:production` | Pass | Production smoke check OK. |
| `npm run smoke:gallery` | Pass | Gallery lightbox smoke OK with the local static server on port `8765`. |

## 4. Browser Smoke

Home viewports checked:

- `360px`: Pass. No horizontal overflow. Widget stacked in one centered column. Frame rendered at `290px`.
- `390px`: Pass. No horizontal overflow. Widget stacked in one centered column. Frame rendered at `320px`.
- `640px`: Pass. No horizontal overflow. Widget stacked in one centered column under the breakpoint. Frame rendered at `350px`.
- `768px`: Pass. No horizontal overflow. Widget used the two-column layout. Frame rendered at `350px`.
- `1440px`: Pass. No horizontal overflow. Widget used the two-column layout. Frame rendered at `350px`.

Home checks:

- Page loaded with shared header and footer.
- Mobile nav opened, closed with Escape, and returned focus.
- Skip link moved to `#main`.
- Home hero rendered.
- Four Doors rendered `4` cards.
- Discord widget appeared after Four Doors and before Member Spotlight.
- Iframe markup retained the required title, source, dimensions, lazy loading, transparency, frameborder, and sandbox attributes.
- Existing Discord invite CTA remained visible, focusable, and safe-linked.
- Home Gallery Spotlight rendered `4` items.
- Guild seal poem rendered with expected text.
- No horizontal overflow or console-breaking errors were observed.

Cross-page smoke at `390px`:

- `/join.html`: Pass.
- `/events.html`: Pass.
- `/gallery.html`: Pass.
- `/recruitment.html`: Pass.
- `/twills.html`: Pass.
- `/spotify.html`: Pass.

Cross-page result:

- Each checked page loaded, mounted header/footer, kept one `h1`, avoided horizontal overflow, and produced no console-breaking errors.
- Gallery smoke also passed through the project smoke script.
- No Supabase signed-out browsing regression was observed.

## 5. Fix Decision

One narrow CSS fix was made during review:

- `body[data-page="home"] .discord-widget-frame` now uses `box-sizing:border-box`.

Reason:

- The first browser smoke showed the frame measured `352px` including its `1px` border on each side, because this repo does not set global `box-sizing:border-box`.
- The fix keeps the full rendered frame at the intended `350px` cap without changing markup, data, JavaScript, Discord settings, or shared CSS behavior.

No other fixes were required.
