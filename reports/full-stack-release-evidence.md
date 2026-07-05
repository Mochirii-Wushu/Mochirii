# Mochirii Full-Stack Release Evidence

Generated: 2026-07-05T12:11:58.375Z

This file is intentionally no-secret. It records release-readiness evidence only and omits raw tokens, service-role keys, webhook URLs, secret digests, private message content, cookies, and raw headers.

## Result

- OK: yes
- Production URL: https://mochirii.com
- Provider reads: enabled
- Git branch: main
- Git head: f1b2b354c9b8
- Git dirty entries: 0

## Local Release Surface

- Required scripts present: 20/20
- Required files present: 10/10
- CI whitespace gate: git diff --check BASE_SHA..HEAD_SHA

## Vercel

- Status: checked
- Production state: READY
- Production aliases: mochirii.com, mochirii.vercel.app, www.mochirii.com, mochirii-mochirii.vercel.app, mochirii-git-main-mochirii.vercel.app
- Production env names: MOCHI_PETS_ALPHA_ACCESS_MODE, MOCHI_PETS_TESTER_PASSWORD, NEXT_PUBLIC_AUTH_PROVIDER_IDS, NEXT_PUBLIC_MOCHI_PETS_URL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_DATABASE, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PRISMA_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING, POSTGRES_USER, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
- Preview env names: MOCHI_SOCIAL_TESTER_PASSWORD_SHA256, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL

## Supabase

- Status: skipped
- CLI version: 2.108.0
- Local migrations: 23
- Remote migrations: not checked
- Migration local-only: none/not checked
- Migration remote-only: none/not checked
- Local function config count: 30
- Remote function count: not checked
- Inactive remote functions: none/not checked
- Secrets: not read by this no-secret evidence command

## Discord And Reaper

- Slash-command registration script: present
- Rollback script: present
- ModMail audit command registration script: present
- ModMail audit command: /audit-modmail
- Gateway direct permission mutation expected here: no

## Mochi Pets, Fly, And Enjin

- Mochi Pets preview report present: no
- Mochi Pets hosted checks allowed in last report: no/not checked
- Fly deployment requires separate approval: yes
- Enjin preview-only expected: yes
- Enjin funded-chain actions authorized: no

## Warnings

- None

## Skipped

- supabase linked migration list failed

## Failures

- None
