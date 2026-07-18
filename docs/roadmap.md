# Mōchirīī Website Roadmap

## 1. Current Stable Baseline

The site is currently a static HTML/CSS/vanilla JavaScript project with:

- dependency-free validation scripts under `scripts/`
- GitHub Actions validation on PRs and pushes to `main`
- read-only production smoke checks
- an optional manual Lighthouse audit workflow
- optimized gallery and non-gallery image assets
- page-specific SEO/social metadata
- keyboard-friendly navigation and gallery lightbox behavior
- content mostly managed through `apps/web/public/data/*.json`

The stable post-audit baseline is tagged as `v0.1.0-site-baseline`.

## 2. Development Principles

- Use one branch per scoped change.
- Preserve the Mōchirīī visual identity: cozy, jade-lit, readable, and wuxia-inspired.
- Run validation before opening or merging a PR.
- Avoid direct feature edits on `main`.
- Avoid broad refactors without a specific maintenance or correctness reason.
- Do not migrate frameworks unless static-site maintenance pain clearly justifies it.
- Keep production checks separate from offline `npm run check`.

## 3. Near-Term Backlog

### Social Preview QA

Branch: `seo/social-preview-polish`

Goal: Adjust social card title, description, or image selection only if live Discord/X-style previews show problems.

### Events Archive / Filtering

Branch: `feature/events-archive-filtering`

Goal: Improve browsing past and upcoming events without changing the static architecture.

### Gallery Categories

Branch: `feature/gallery-categories`

Goal: Allow gallery grouping by events, scenery, members, or featured moments while preserving thumbnail/full-image behavior.

### Member Spotlight Polish

Branch: `feature/member-spotlight-polish`

Goal: Improve spotlight layout and content structure if more member stories are added.

### Recruitment Checklist

Branch: `feature/join-checklist`

Goal: Give new visitors a concise pre-join checklist with Discord, in-game name, time zone, Tome, and first event steps.

### Seasonal Homepage Atmosphere

Branch: `feature/seasonal-home-atmosphere`

Goal: Allow seasonal hero/copy variations while preserving page speed and the current design identity.

### Guild Tome Expansion

Branch: `content/guild-codex-expansion`

Goal: Expand rules, values, traditions, leadership clarity, and conflict-resolution guidance when the guild's policies settle further.

## 4. Branch Template

Use this shape for future scoped branches:

```md
Branch:

Goal:

Scope:

Files likely touched:

Validation commands:
- npm run check
- git diff --check

Manual smoke pages:

PR checklist:
- [ ] validation passes
- [ ] relevant smoke test passes
- [ ] no broken local references
- [ ] no fake .webp files
- [ ] mobile layout checked when UI changes
- [ ] production check run when production behavior changes
```

## 5. Definition of Done

- `npm run check` passes.
- `git diff --check` passes.
- Relevant page or interaction smoke test passes.
- No broken local references.
- No fake `.webp` files.
- Mobile layout is checked for user-facing UI changes.
- `npm run check:production` runs when production behavior is relevant.
- PR is reviewed and merged through the normal branch flow.

## 6. Deferred / Avoid for Now

- CMS adoption.
- Framework migration.
- Broad redesign.
- Deleting large asset groups without a usage audit.
- Required Lighthouse score gates.
- Making production network checks part of `npm run check`.
