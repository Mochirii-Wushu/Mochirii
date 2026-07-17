# Shopify Theme Guidance

- This public directory owns only the Mochirii Cosmetics storefront theme.
- Keep runtime theme code under `assets`, `blocks`, `config`, `layout`,
  `locales`, `sections`, `snippets`, and `templates`.
- Never add supplier records, costs, source or mockup identifiers, samples,
  counsel material, admin exports, credentials, private evidence, or internal
  launch ledgers.
- Public operator tooling must remain pure and generic: no real product facts,
  source identifiers, private paths, provider reads/writes, or mutation calls.
- Keep `product_publication_approved` and `checkout_enabled` false, and keep the
  corporate/legal name blank. Product publication, password removal, checkout
  or payment activation, orders, product mutations, domains, and paid resources
  require separate explicit approval and must not be automated by CI.
- Run `npm ci`, `npm run check`, `npm run theme:package`, and
  `git diff --check` before handoff.
