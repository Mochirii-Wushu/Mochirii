# APAC Content And Singapore-Time Approval Packet

Prepared: 2026-07-12 PDT

Approved and released: 2026-07-12 PDT

Website PR: `Mochirii-Wushu/Mochirii#455`

Merged production commit: `7fa3c2e96987b39f8afa9a30e484ae621ea1ee02`

GitHub validation, Next validation, CodeQL, and Vercel Preview passed on the
approved head; Supabase Preview correctly skipped because no Supabase file
changed. Vercel production deployment `dpl_9CByV7MYhUwcNmB9q72mboNHFum2` is
`READY` in `iad1`.

## Exact Visible Wording

Header and footer lockup:

```text
Mōchirīī
Asia Pacific Guild
```

The prominent guild name and regional line are identical in the desktop
header, mobile header, and footer. This lockup wording has been explicitly
approved.

Homepage subtitle:

```text
Asia Pacific • Where Winds Meet Guild
```

Site description:

```text
Join Mōchirīī, an Asia Pacific Where Winds Meet guild full of yummy cupcakes for everyone & pretty people to share them all with.
```

Spotlight introduction:

```text
Pretty guild member who's always so lovely, beautiful & keeping the guild a wonderful place for everyone.
```

Gathering title and description:

```text
Monthly Guild Gathering
A monthly gathering where every member can discuss anything they'd like with the guild.
```

Footer description:

```text
An Asia Pacific Where Winds Meet guild, with events scheduled in Singapore Time (UTC+8).
```

Join introduction:

```text
Mōchirīī welcomes all pretty new members across Asia Pacific or anywhere else in the world if you don't mind the ping.
```

Website time label:

```text
Singapore Time (UTC+8)
```

## Machine-Readable Contract

- Document language: `en-SG`.
- Open Graph locale: `en_SG`.
- Schedule IANA zone: `Asia/Singapore`.
- Canonical offset: 480 minutes and Discord-facing label `UTC+8`.
- Home structured data: `Organization` with canonical URL, logo, description,
  Discord contact point, and Mochirii Social `sameAs`.
- Static rollback and Next surfaces carry the same approved wording and
  metadata values.
- No Vercel region, Supabase region, provider, schema, secret, Discord,
  Cloudflare, DigitalOcean, Pixelfed, Fly, Unity, Enjin, or ActivityPub change.

## Rendered Evidence

Evidence is under
`operations/evidence/2026-07-12/copy/apac-preview` and
`operations/evidence/2026-07-12/apac-brand-lockup`.

Verified viewports include 320x568, 360x800, 390x844, 412x915, 768x1024,
1024x768, 1366x768, 1440x900, and 1920x1080, plus text zoom and 400%-equivalent
reflow. Hosted preview screenshots cover the home copy and desktop/mobile
header and footer lockups. The latest lockup readback confirms the same classes,
28px prominent guild name, 12px regional label, no overlay, and no collision.

## Release Gate

Do not mark PR #455 ready, merge it, or change production copy until the exact
packet below is approved. After approval, refresh checks on the unchanged head,
squash-merge through protected `main`, wait for Vercel production `READY`, and
re-run production metadata, structured-data, schedule, desktop, and mobile
smokes. Roll back by reverting only the focused PR.

## Exact Approval

```text
Approve the complete exact visible wording and machine-readable APAC contract in operations/evidence/2026-07-12/copy/apac-subtitle-approval-packet.md, mark Website PR #455 ready, squash-merge it only after fresh protected GitHub, CodeQL, and Vercel checks pass, and allow merged main to deploy automatically to Vercel project mochirii/mochirii. Keep Vercel Functions in iad1, Supabase in us-west-2, ActivityPub disabled, and all unrelated provider, schema, secret, Discord, Cloudflare, DigitalOcean, Pixelfed, Fly, Unity, and Enjin settings unchanged.
```
