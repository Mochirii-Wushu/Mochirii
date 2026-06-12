# Mochirii Full-Stack Release Evidence

Generated: 2026-06-12T23:29:12.627Z

This file is intentionally no-secret. It records release-readiness evidence only and omits raw tokens, service-role keys, webhook URLs, secret digests, private message content, cookies, and raw headers.

## Result

- OK: yes
- Production URL: https://mochirii.com
- Provider reads: enabled
- Git branch: codex/full-stack-release-evidence
- Git head: 2961fe366f45
- Git dirty entries: 7

## Local Release Surface

- Required scripts present: 16/16
- Required files present: 9/9
- CI whitespace gate: git diff --check + git show --check

## Vercel

- Status: checked
- Production state: READY
- Production aliases: mochirii.com, mochirii.vercel.app, mochirii-mochirii.vercel.app, mochirii-git-main-mochirii.vercel.app, www.mochirii.com
- Production env names: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL
- Preview env names: MOCHI_SOCIAL_ALPHA_ACCESS_MODE, MOCHI_SOCIAL_TESTER_PASSWORD, MOCHI_SOCIAL_TESTER_PASSWORD_SHA256, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL

## Supabase

- Status: checked
- CLI version: 2.105.0
- Local migrations: 16
- Remote migrations: 16
- Migration local-only: none/not checked
- Migration remote-only: none/not checked
- Local function config count: 24
- Remote function count: 24
- Inactive remote functions: none/not checked
- Secrets: not read by this no-secret evidence command

## Discord And Reaper

- Slash-command registration script: present
- Rollback script: present
- Gateway direct permission mutation expected here: no

## Mochi Social, Fly, And Enjin

- Mochi Social preview report present: yes
- Mochi Social hosted checks allowed in last report: yes
- Fly deployment requires separate approval: yes
- Enjin preview-only expected: yes
- Enjin funded-chain actions authorized: no

## Warnings

- None

## Skipped

- None

## Failures

- None
