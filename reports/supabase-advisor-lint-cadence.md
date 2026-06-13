# Supabase Advisor And Lint Cadence Report

Generated: 2026-06-13T02:21:43.940Z

This file is intentionally no-secret. It validates the monthly Supabase advisor/lint runbook and records only static command coverage, source coverage, and context-file presence.

## Result

- OK: yes
- Runbook: docs/supabase-advisor-lint-cadence.md
- Official source links: 8
- Required terms: 19
- Read-only commands: 9

## Required Context Files

| File | State |
| --- | --- |
| docs/supabase-advisor-lint-cadence.md | present |
| supabase/README.md | present |
| reports/supabase-production-security-review.md | present |
| reports/supabase-ci-and-parity-review.md | present |
| reports/supabase-manual-parity-runbook.md | present |

## Command Coverage

| Command | Purpose |
| --- | --- |
| `supabase --version` | read-only/inspection |
| `supabase db lint --help` | read-only/inspection |
| `supabase db advisors --help` | read-only/inspection |
| `supabase inspect db --help` | read-only/inspection |
| `supabase db lint --local --schema public --level warning --fail-on none` | read-only/inspection |
| `supabase db advisors --local --type all --level info --fail-on none` | read-only/inspection |
| `supabase migration list --linked` | read-only/inspection |
| `supabase db lint --linked --schema public --level warning --fail-on none` | read-only/inspection |
| `supabase db advisors --linked --type all --level info --fail-on none` | read-only/inspection |

## Warnings

- None

## Failures

- None
