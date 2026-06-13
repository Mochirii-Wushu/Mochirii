# Community Health Signals Report

Generated: 2026-06-13T02:14:42.047Z

This file is intentionally no-secret. It validates that the community health matrix stays aggregate-only, redacted, and non-mutating.

## Result

- OK: yes
- Matrix: docs/community-health-signals.md
- Signals: 10
- Official source links: 8
- Required terms: 22

## Required Context Files

| File | State |
| --- | --- |
| docs/community-health-signals.md | present |
| supabase/README.md | present |
| docs/vote-reminder-runbook.md | present |
| docs/member-workflow-production-qa-runbook.md | present |
| docs/reaper-pending-verification-containment.md | present |
| docs/mochi-social-alpha-codex-ops.md | present |
| reports/full-stack-release-evidence.md | present |

## Signal Coverage

| Signal | Source tables | Stop lines |
| --- | --- | ---: |
| onboarding_completion | member_profiles, discord_sync_log | 2 |
| verified_conversion | member_profiles, discord_sync_log, discord_managed_permission_overwrites | 2 |
| profile_setup | member_profiles | 1 |
| gallery_participation | gallery_submissions, gallery_moderation_events | 2 |
| event_heartbeat | discord_resources, discord_sync_log | 1 |
| vote_reminder_engagement | vote_reminder_sends, vote_confirmations | 2 |
| spotlight_participation | spotlight_poll_cycles, spotlight_poll_candidates, spotlight_poll_results | 2 |
| discord_resource_hygiene | discord_resources, discord_sync_log | 2 |
| moderation_throughput | gallery_submissions | 2 |
| mochi_social_alpha_health | operator/runtime | 3 |

## Warnings

- None

## Failures

- None
