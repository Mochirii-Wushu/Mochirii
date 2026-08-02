# Event Social Reminder Content Contract

## Purpose and authority

`apps/web/public/data/event-social-content.json` is the source-only contract for one-hour event reminder copy and creative specifications. It does not schedule a job, call a provider, authorize publication, or replace `apps/web/public/data/guild-schedule.json` as the event-time authority.

All publication switches are `false`. A future sender must fail closed unless the global platform switch, the matching event-platform switch, approved artwork, a final schedule occurrence, and separately authorized provider configuration are all ready.

The contract covers exactly these schedule IDs:

| Schedule ID | Public event title |
| --- | --- |
| `monthly-gathering` | Monthly Guild Gathering |
| `monthly-raffle` | Monthly Guild Raffle |
| `guild-party` | Guild Party |
| `breaking-army` | Breaking Army |
| `showdown` | Showdown |
| `guild-wars` | Guild Wars |
| `guild-heros-realm` | Guild Hero's Realm: Weekly Coordination |
| `united-resolve` | United Resolve |

The manifest duplicates neither weekdays nor clock values. The August 7 Breaking Army one-off is manual-only and is deliberately absent from automation. A sender must resolve every automated occurrence from the current schedule/override authority before rendering copy and must not infer an automated occurrence from a manual announcement.

## One-hour rendering contract

The only allowed dynamic content tokens are:

- `{{EVENT_DATE}}`: the full event start date in the guild's `UTC+8` schedule.
- `{{EVENT_TIME_RANGE}}`: the complete display range; a midnight crossing must say that the end is on the next day.

Every caption contains both tokens and displays `UTC+8` exactly. The send instant is the resolved event start minus exactly 60 minutes. Missing, stale, duplicated, early, or late occurrences are suppressed; they are not rewritten as one-hour reminders.

Each event uses one reusable static image family. Visible creative text and alt text contain no date, weekday, clock value, `UTC+8`, or rendering token. Occurrence details belong only in the destination caption, so an approved image can be reused without stale schedule text.

The Monthly Guild Gathering and Monthly Guild Raffle captions and visible notices must each state both facts without paraphrase:

1. The monthly event replaces the Guild Party scheduled for that event date.
2. Attendance still qualifies for the in-game Guild Party attendance reward.

## Platform content and layout

Facebook, Instagram, and Discord have distinct caption templates. Each ends with one relevant response prompt and contains no provider mention, mass mention, external destination, or engagement-bait instruction.

| Platform | Internal export target | Safe inset | Copy limits |
| --- | --- | --- | --- |
| Facebook feed | 1080 × 1350, 4:5, sRGB JPEG | 8% | Caption and alt text at most 500 characters; at most 8 overlay lines |
| Instagram feed | 1080 × 1350, 4:5, sRGB JPEG | 8% | Caption and alt text at most 500 characters; at most 8 overlay lines |
| Discord event/reminder | 1600 × 640, 5:2, sRGB PNG | 5% | Caption and alt text at most 500 characters; at most 6 overlay lines |

These are Mochirii export targets, not claims about provider maximums. Essential image text stays inside the safe inset and meets at least 4.5:1 contrast against its rendered background.

Every reusable creative contains only:

- the `Starts in one hour` badge;
- the event title;
- the concise, occurrence-independent event notice from the manifest;
- the canonical guild seal at `./assets/img/brand/emblem.webp`; and
- the approved cupcake mark at `./assets/img/brand/cupcake-mark.svg`.

Each event records its source and exact destination exports:

- high-quality opaque sRGB source: `./assets/img/event-social/masters/<event-id>.webp`;
- Facebook: `./assets/img/event-social/<event-id>/facebook.<full-sha256>.jpg`;
- Instagram: `./assets/img/event-social/<event-id>/instagram.<full-sha256>.jpg`; and
- Discord: `./assets/img/event-social/<event-id>/discord.<full-sha256>.png`.

The 64-character lowercase digest in every platform filename must equal the
exact delivered bytes. The renderer derives the digest after encoding, refuses
a manifest path that does not match it, and never overwrites a changed binary.
This keeps an approved template bound to one immutable public object even when
a later creative revision is rendered.

The seal and cupcake mark form one top lockup with equal visual weight and deliberate clear space. File existence is not brand approval: do not replace either mark, generate a lookalike, add a registration symbol, or publish an export until the owner approves the exact artwork.

Alt text describes the visible static reminder, event title, both marks, and any monthly replacement/reward notice. It does not invent a date or time, repeat decorative atmosphere, or expose a rendering token.

## Public-copy policy

The validator scans every caption, visible creative string, and alt-text template. It rejects:

- mood filler including `warm`, `warmth`, `calm`, `quiet`, `cozy`, `serene`, `peaceful`, `gentle`, `soft`, and related configured terms;
- the word `shared` and generic shared-run, activity, event, or session variants;
- links, domains, QR prompts, link-in-bio directions, and hashtags;
- hard-coded clock values in captions;
- unknown template tokens;
- exact game-name use outside the bounded Guild Party caption lane; and
- weekday or rescheduling claims in Breaking Army copy.

The event names, builds, roles, parties, Guild Base Pool, attendance reward, and in-game calls to action keep the content centered on the guild's game purpose. The exact name `Where Winds Meet` appears one or two times across all 24 captions and currently appears naturally in a Guild Party caption only.

`Mōchirīī`, `Mōchī`, `Wushu land`, `pretty`, `cupcake`, and `wonderful` are bounded caption accents. The manifest requires each to appear naturally at least once across the complete 24-caption set and caps each occurrence count. `wuxia`, `xianxia`, and `Jianghu` each appear exactly once, in separate captions rather than as a stacked theme list. Factual alt-text references to the cupcake mark are not marketing accents.

## Validation

Run the focused contract first:

```text
npm run check:event-social-content
npm run test:event-social-content
npm run check:event-social-assets
npm run test:event-social-assets
npm run check:guild-schedule
npm run check:content
npm run check:json
git diff --check
```

An explicitly approved canonical render uses both confirmation flags. Adding
`--write-review-contact-sheet` also refreshes the ignored local review sheet:

```text
npm run render:event-social-assets -- --confirm-text-free-masters --confirm-canonical-public-write --remove-superseded-unhashed-assets --write-review-contact-sheet
```

The cleanup flag is canonical-root-only. It removes only the exact legacy
`facebook.jpg`, `instagram.jpg`, and `discord.png` names after verifying that
each file is byte-identical to its full-SHA-256 successor; any mismatch fails
closed.

The root `npm run check` suite also runs the validator and its mutation tests. The focused tests prove that publication enablement, forbidden wording, links/domains, QR/link-in-bio/hashtags, hard-coded times, missing tokens, occurrence text in static artwork, asset-path drift, monthly copy drift, exact game/theme accent misuse, an automated Breaking Army occurrence inferred from the manual one-off, and event-inventory drift fail closed.

## Template-to-publisher handoff

The manifest is content input, not provider authority. The backend projects its exact reviewed caption, alt-text, and media hashes into service-only reusable publication templates. An owner/operator must explicitly approve each event-and-destination template revision before it can create an eligible job. Browser-supplied caption, alt-text, media, date, time, destination, or publication approval is never accepted for an automated reminder.

For each current schedule occurrence, the backend renders only `{{EVENT_DATE}}` and `{{EVENT_TIME_RANGE}}`, fingerprints the rendered copy, occurrence revision, template revision, destination, and media hash, and creates at most one job per destination. Schedule, content, media, or template drift revokes eligibility and requires a newly reviewed template revision. There is no per-occurrence copy override or automatic retry path.

The manifest's false switches are content/UI availability gates only. Independent database destination switches, Edge publication flags, provider identity checks, reusable-template approval, a fresh provider-mutation preflight, and the exact one-hour dispatch window must all pass. All remain false until separately approved. Facebook and Instagram exports use JPEG; the internal Discord target is PNG even where the backend can safely accept other reviewed Discord formats.

## Activation boundary

This source packet is complete only as a disabled content contract. Activation remains a separate operation and requires:

1. current readback of the exact event occurrence and `UTC+8` rendering;
2. owner approval of the final seal/cupcake lockup and all eight platform exports;
3. accessible text/contrast/crop review at each declared layout;
4. current provider authentication and destination verification;
5. explicit approval of the exact reusable template and platform activation; and
6. a sender that suppresses late, duplicate, stale, or mismatched occurrences.

No source validation result authorizes a Facebook, Instagram, or Discord post.
