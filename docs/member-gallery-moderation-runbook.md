# Member Gallery Moderation Runbook

This runbook is for leaders reviewing member Gallery submissions through the website Leader Dashboard.

It does not contain secrets, tokens, private URLs, or deployment credentials.

## 1. What Moderation Controls

Member Gallery moderation decides whether uploaded member images move from the private review queue into the approved public Gallery feed.

Moderation does not:

- edit `data/gallery.json`
- publish static Gallery images
- make the `member-gallery` Storage bucket public
- assign Discord roles
- bypass Supabase RLS or Storage policies
- require `supabase db push`
- require Edge Function deployment during normal review

Approved submissions are served to the public Gallery by the approved-feed Edge Function as short-lived signed URLs. Pending, rejected, and archived submissions stay out of the public Gallery.

## 2. Access Requirements

Moderators need:

- a website account signed in through Discord
- Discord membership in guild `1078630751077142608`
- the configured Discord Moderator role `1078630751165222984`
- a working server-side moderation function check

The Account page shows the Leader Dashboard link only after server-side moderator verification succeeds. A direct visit to `leader-dashboard.html` is also protected by the same checks.

If the dashboard shows access denied, do not try to work around it in browser tools. Confirm the Discord role, ask leadership to check server-side configuration, or defer to a Supabase/admin operator.

## 3. Review Queue Overview

Open the Leader Dashboard from Account.

The dashboard has four queue tabs:

- Pending
- Approved
- Rejected
- Archived

Use Refresh Queue after a moderation action or when coordinating with another moderator.

Each submission may show:

- preview image from a short-lived signed URL
- title
- caption
- uploader display details
- status
- category
- MIME type
- file size
- submitted date
- reviewed date
- Storage reference
- moderation history

Treat Storage references and signed preview URLs as operational details. Do not paste them into public Discord channels, public docs, issue comments, or screenshots.

## 4. Pending Review Checklist

Before approving a submission, check:

- the preview loads and matches the submitted title/caption
- the image is appropriate for the guild website
- the title is clear enough for public display
- the caption does not contain private information, harassment, slurs, spam, or unrelated promotion
- the category is reasonable for Gallery browsing
- the image does not reveal sensitive account, server, or personal information

If the preview is unavailable, do not approve by title alone. Refresh the queue once. If it remains unavailable, leave it pending and escalate.

## 5. Approving A Submission

Use Approve only when the submission is safe for the public Gallery.

After approval:

- the row status changes to `approved`
- review metadata is recorded
- a moderation event is recorded
- the approved public Gallery feed may include the item
- no static Gallery JSON is edited

If an approved item needs later removal from the public feed, do not edit `data/gallery.json`. Use the moderation/admin path for changing the submission status, or escalate if that path is unavailable.

## 6. Declining A Submission

Decline requires a reason.

Good decline reasons are concise, specific, and kind:

- `Caption includes private account details.`
- `Image is unrelated to the guild Gallery.`
- `Preview is unclear; please resubmit a cleaner image.`
- `Duplicate submission.`

Avoid:

- private moderator notes
- internal policy debate
- personal criticism
- Discord-only context that the member cannot understand
- secrets, private URLs, or admin details

Rejected submissions remain private and should not appear in the public Gallery.

## 7. Moderation History And Audit Trail

Moderation actions are expected to update:

- `gallery_submissions.status`
- `gallery_submissions.reviewed_by`
- `gallery_submissions.reviewed_at`
- `gallery_submissions.rejection_reason` when declined
- `gallery_moderation_events`

The audit trail is for operational accountability. Do not manually edit audit rows from the browser. Direct database repair should be handled only in a separate approved admin task.

## 8. Common States And Responses

| State | What it means | Response |
| --- | --- | --- |
| Signed out | Browser has no active website session. | Sign in with Discord again. |
| Access denied | The signed-in account does not pass moderator verification. | Confirm Discord Moderator role and server-side config. |
| No pending submissions | The pending queue is empty. | No action needed. |
| Preview unavailable | Signed preview URL could not be created or object is missing. | Refresh once; if still missing, leave pending and escalate. |
| Decline reason required | Decline was clicked without enough reason text. | Add a short reason and try again. |
| Function request failed | Edge Function returned an error or network failed. | Refresh once, avoid repeated clicking, then escalate with time and visible message. |
| Counts look stale | Another moderator may have acted or the queue changed. | Refresh Queue. |

## 9. Escalation Checklist

When escalating, include:

- page URL
- queue tab
- approximate time
- visible error message
- whether the moderator is signed in
- whether the Moderator role was recently changed
- submission title or ID if visible

Do not include:

- Supabase service-role keys
- Discord bot tokens
- database passwords
- JWTs
- signed preview URLs
- private Storage URLs
- screenshots showing private Storage references unless the recipient is an approved admin channel

## 10. Safe Operations Boundary

Normal moderation should only use the website dashboard.

Do not run these commands as part of routine moderation:

```sh
supabase db push
supabase functions deploy
supabase secrets set
```

Those are deployment/admin operations and require a separate approved branch or explicit operator instruction.

If a fix appears to require database mutation, Edge Function deployment, a secret change, or direct Storage repair, stop moderation and open a scoped admin task.

## 11. Local QA Checklist

For a local dashboard smoke, use mocked states unless approved live credentials are available:

- signed out
- access denied
- moderator with pending queue
- approve success
- decline reason required
- decline success
- function failure
- no pending submissions

Run the standard repository checks after docs or workflow changes:

```sh
npm run check
git diff --check
node scripts/check-json.mjs
node scripts/check-js.mjs
node scripts/check-refs.mjs
node scripts/check-assets.mjs
npm run check:production
npm run smoke:gallery
```

The known large MP3 asset warning is expected unless the audio asset policy changes in a separate branch.

## 12. Related Files

- `account.html`
- `leader-dashboard.html`
- `leader-dashboard.js`
- `gallery-submit.html`
- `gallery-submit.js`
- `gallery.js`
- `supabase.js`
- `supabase/README.md`
- `reports/member-gallery-end-to-end-review.md`
- `reports/account-member-dashboard-review.md`
- `reports/gallery-approved-feed-integration-review.md`
