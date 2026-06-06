# Contributing

Mochirii is a public repository for a private guild website. Contributions should preserve the current production behavior unless a task explicitly says otherwise.

## Workflow

- Work on a scoped branch; do not commit directly to `main`.
- Keep root `assets/` and `data/` canonical until DNS cutover.
- If changing copied public assets or data for the Next app, run `npm run sync:next-public`.
- Keep secrets out of the repo. Do not commit `.env`, Supabase service-role keys, Discord bot tokens, OAuth secrets, or Vercel tokens.
- For content changes, follow the relevant guide in `docs/`.

## Validation

Run the checks that match your change:

```sh
npm run check
git diff --check
```

For Next/Vercel app changes:

```sh
cd apps/web
npm ci
npm run lint
npm run build
```

For production behavior, also run:

```sh
npm run check:production
```

## Pull Requests

Include the purpose, changed surfaces, validation run, and any deployment or DNS impact. If a change touches protected copy, Supabase behavior, auth/member workflows, or production routing, call that out clearly.
