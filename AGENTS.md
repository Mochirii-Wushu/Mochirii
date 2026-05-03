# Repository Guidance

- This is a static HTML/CSS/vanilla JavaScript guild website. Do not add a framework or bundler unless explicitly requested.
- Avoid direct feature work on `main`; create a scoped branch and keep it reviewable.
- Preserve the current Mōchirīī wuxia/glass visual identity while improving clarity, speed, and accessibility.
- Do not delete or rewrite asset directories unless usage is verified and the change is intentionally scoped.
- Run validation before completing work: `npm run check` plus any task-specific smoke checks. Individual checks: `npm run check:js`, `npm run check:json`, `npm run check:refs`, `npm run check:assets`.
- Consult `docs/content-guide.md` before content, JSON, date, gallery, or asset edits.
- Preserve protected copy: the long-form recruitment body in `data/recruitment.json` and the guild seal poem in `data/home.json`.
- Use `docs/roadmap.md` for future branch ideas; keep roadmap items scoped instead of turning them into broad refactors.
- Keep public URLs and page filenames stable unless fixing a confirmed broken reference.
- Prefer dependency-free Node scripts and plain browser APIs.
- Load `utils.js` before `site.js` and page scripts when using shared browser helpers.
- Keep Lighthouse audits optional/manual unless the user explicitly asks for score gates.
