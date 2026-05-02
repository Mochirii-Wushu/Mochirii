# Repository Guidance

- This is a static HTML/CSS/vanilla JavaScript guild website. Do not add a framework or bundler unless explicitly requested.
- Avoid direct feature work on `main`; create a scoped branch and keep it reviewable.
- Preserve the current Mōchirīī wuxia/glass visual identity while improving clarity, speed, and accessibility.
- Do not delete or rewrite asset directories unless usage is verified and the change is intentionally scoped.
- Run validation before completing work: `npm run check` plus any task-specific smoke checks. Individual checks: `npm run check:js`, `npm run check:json`, `npm run check:refs`, `npm run check:assets`.
- Keep public URLs and page filenames stable unless fixing a confirmed broken reference.
- Prefer dependency-free Node scripts and plain browser APIs.
