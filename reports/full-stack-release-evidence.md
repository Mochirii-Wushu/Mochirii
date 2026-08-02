# Mochirii Full-Stack Release Evidence

Generated: 2026-07-30T06:03:56.200Z

This file is intentionally no-secret. It records release-readiness evidence only and omits raw tokens, service-role keys, webhook URLs, secret digests, private message content, cookies, and raw headers.

## Result

- OK: yes
- Production URL: https://mochirii.com
- Provider reads: disabled
- Git branch: agent/full-stack-integration-rehearsal-20260729
- Git head: dcaa33750e81
- Git dirty entries: 0

## Local Release Surface

- Required scripts present: 20/20
- Required files present: 12/12
- CI whitespace gate: git diff --check BASE_SHA..HEAD_SHA

## Vercel

- Status: skipped
- Production state: not checked
- Production aliases: not checked
- Production env names: not checked
- Preview env names: not checked

## Supabase

- Status: local-only
- CLI version: 2.109.1
- Local migrations: 50
- Remote migrations: not checked
- Migration local-only: none/not checked
- Migration remote-only: none/not checked
- Local function config count: 46
- Remote function count: not checked
- Inactive remote functions: none/not checked
- Secrets: not read by this no-secret evidence command

## Discord And Reaper

- Slash-command registration script: present
- Rollback script: present
- ModMail audit command registration script: present
- ModMail audit command: /audit-modmail
- Gateway direct permission mutation expected here: no

## Warnings

- None

## Skipped

- provider reads disabled
- supabase provider reads disabled

## Failures

- None
