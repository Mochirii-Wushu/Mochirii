# Website App Guidance

- `apps/web` is the only live `mochirii.com` application source.
- Public JSON and media live in `public/data` and `public/assets`; do not create
  root-level mirrors or restore the retired static source.
- Preserve public routes, redirects, metadata, headers, accessibility, and
  signed-out fail-closed behavior unless the task explicitly changes them.
- Keep secrets and privileged provider credentials out of browser code and
  `NEXT_PUBLIC_*` values.
- The app owns the noindex `/games/mochi-pets` tester doorway, Website-only
  session, and dormant connection contract. It must not depend on game source,
  builds, or a hosted game runtime, and must not restore the retired iframe,
  token bridge, or Supabase game calls. The registered private source repository
  is `Mochirii-Wushu/Mochirii-Pets`; identifying it does not authorize loading a
  Web artifact or passing Website/Social credentials into Unity.
- Use Node `22.23.1`. Run `npm run toolchain:check`, `npm run lint`, and
  `npm run build` for app changes.
