# Website App Guidance

- `apps/web` is the only live `mochirii.com` application source.
- Public JSON and media live in `public/data` and `public/assets`; do not create
  root-level mirrors or restore the retired static source.
- Preserve public routes, redirects, metadata, headers, accessibility, and
  signed-out fail-closed behavior unless the task explicitly changes them.
- Keep secrets and privileged provider credentials out of browser code and
  `NEXT_PUBLIC_*` values.
- The app owns the public, indexable `/games/mochi-pets` concept page and its
  optional protected inner tester doorway. With incomplete tester configuration,
  render only the public concept and no tester controls or access-status copy.
  Never serialize the dormant connection
  contract into a public page payload. Each private-access check must verify the
  current Website bearer on the server, then require the member-bound signed
  tester cookie. The app must not depend on game source, builds, or a hosted game
  runtime, and must not restore the retired iframe, token bridge, or game data
  calls. The registered private source repository is
  `Mochirii-Wushu/Mochirii-Pets`; identifying it internally does not authorize
  loading a Web artifact or passing Website/Social credentials into Unity.
- Use Node `22.23.1`. Run `npm run toolchain:check`, `npm run lint`, and
  `npm run build` for app changes.
