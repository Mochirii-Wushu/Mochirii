# Supabase Integration

Project ref: `deyvmtncimmcinldjyqe`

Project URL: `https://deyvmtncimmcinldjyqe.supabase.co`

This repository is a static GitHub Pages site. Keep Supabase integration browser-safe, dependency-free, and migration-based.

## Rules

- Browser code may only use the publishable / anon key.
- Secret keys, service-role keys, database passwords, JWT secrets, and private environment values stay outside public files.
- Database schema changes should be created through Supabase migrations.
- Tables exposed to browser clients require explicit grants and RLS policies.
- anon access should be minimal and feature-specific.
- service_role should be reserved for trusted backend/admin workflows.
- GitHub Pages cannot safely hold private server-side secrets.
- Edge Functions or another backend should be used for privileged workflows.

## Browser Helper

`supabase.js` attaches `window.MochiriiSupabase` before `site.js` and page scripts run. It provides:

- `getConfig()`
- `request(path, options)`
- `select(table, query)`
- `insert(table, payload)`
- `probe()`

Script order on pages with the shared runtime is:

```html
<script src="./utils.js" defer></script>
<script src="./supabase.js" defer></script>
<script src="./site.js" defer></script>
<script src="./page.js" defer></script>
```

## Connectivity Probe

From a browser console on the site:

```js
await window.MochiriiSupabase.probe();
```

The probe calls only the REST API root and does not read or write app tables. A nonzero HTTP response with `reachable: true` confirms the Supabase REST gateway responded, even if the root returns a non-200 status because schema introspection is restricted.

Equivalent local curl check:

```sh
curl -i "https://deyvmtncimmcinldjyqe.supabase.co/rest/v1/" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json"
```

Only send an `Authorization: Bearer ...` header when using a real Supabase Auth access token for a signed-in user.

## Future CLI Setup

Install the Supabase CLI locally, then run:

```sh
supabase login
supabase link --project-ref deyvmtncimmcinldjyqe
supabase migration list
```

Use migrations for future schema changes. Do not create tables directly from browser code.
