# Social Preview QA

This runbook keeps social preview checks repeatable for the live Next app at `https://mochirii.com`. It covers Open Graph, Twitter-style metadata, Discord/link unfurls, public route discovery, and no-secret handling for protected member routes.

## Source Basis

- [Next.js Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js `generateMetadata`](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Open Graph protocol](https://ogp.me/)
- [Vercel OG Image Generation](https://vercel.com/docs/og-image-generation)
- [Discord embed metadata community note](https://support.discord.com/hc/en-us/community/posts/360055886251-Extended-metadata-tags-for-embeds)

## Route Policy

Public routes should have:

- a stable title and description
- a canonical path on `https://mochirii.com`
- Open Graph `website` metadata with title, description, URL, image, and image alt text
- Twitter-style `summary_large_image` metadata with title, description, and image
- a public preview image under `/assets/img/`
- inclusion in `apps/web/public/sitemap.xml`

Protected or member routes should:

- keep `robots.index` set to `false`
- stay out of the sitemap
- use only public-safe metadata if direct links are shared
- never expose signed URLs, private Storage paths, account identifiers, Discord IDs, email addresses, cookies, or raw headers in metadata, reports, screenshots, or PR text

Dynamic member profile routes stay `noindex` and must not generate previews from private profile media. `/games/mochi-social` stays `noindex`, closed-alpha, no-real-value, and `configured-preview-stub` until a separate funded-chain release is approved.

## Local Static Check

Run:

```sh
npm run check:social-preview-qa
```

To refresh the redacted reports:

```sh
npm run check:social-preview-qa -- --write
```

The check is intentionally local-only. It does not call Discord, Vercel, Supabase, Fly, Enjin, or any external preview service.

## Manual Platform Checklist

After a production deploy, manually paste these URLs into Discord and any card/debug tool the guild uses:

- `https://mochirii.com/`
- `https://mochirii.com/join`
- `https://mochirii.com/events`
- `https://mochirii.com/gallery`
- `https://mochirii.com/recruitment`
- `https://mochirii.com/games/mochi-social`

Record only:

- pass/fail
- route
- observed title
- observed image presence
- observed domain
- cache note if stale

If a platform shows stale metadata, refresh that platform's cache or test a fresh preview URL before changing source metadata.

## Stop Lines

Stop and move evidence to a private operator note if a check would expose:

- tokens, cookies, service-role keys, bot tokens, OAuth secrets, webhook URLs, or raw request headers
- signed URLs or private Supabase Storage object paths
- Discord IDs, email addresses, account names, or private member profile data
- screenshots from logged-in private member or moderator pages
- real Discord channel posts, automated preview spam, or provider mutations without an approved release packet

This runbook is about preview quality and safety, not provider activation.
