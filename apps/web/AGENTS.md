# Website App Guidance

- `apps/web` is the only live `mochirii.com` application source.
- Public JSON and media live in `public/data` and `public/assets`; do not create
  root-level mirrors or restore the retired static source.
- Preserve public routes, redirects, metadata, headers, accessibility, and
  signed-out fail-closed behavior unless the task explicitly changes them.
- Keep secrets and privileged provider credentials out of browser code and
  `NEXT_PUBLIC_*` values.
- The app owns the Mochi Pets website doorway and browser bridge, not game
  source, assets, builds, or runtime manifests.
- Use Node `22.23.1`. Run `npm run toolchain:check`, `npm run lint`, and
  `npm run build` for app changes.
