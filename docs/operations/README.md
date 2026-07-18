# Mochirii Operations

This directory contains durable, no-secret operational guidance for the
canonical Mochirii repository and hosted production surfaces.

## Canonical Workspace

```text
C:\Github Repo's\Mochirii Website\
  Website\      GitHub: Mochirii-Wushu/Mochirii
  Mochi Pets\   GitHub: xartaiusx/mochi-pets
  Mochi Creds\  Private credential and recovery boundary, never Git tracked
  AGENTS.md      Umbrella workspace guidance
```

Within `Website`, the public website, storefront theme, Social application, and
Supabase backend live under `apps/web`, `apps/shopify-theme`, `services/social`,
and `supabase`. Mochi Pets remains a separate connected game repository.

## Directory Contract

- `CURRENT-STATE.md`: current hosted state and exact resume point.
- `deployment.md`: release, verification, and rollback boundaries.
- `integration-operations-runbook.md`: provider-adjacent operating rules.
- `repository-ownership.md`: source and hosted ownership matrix.
- `history/`: superseded plans and dated handoffs retained as evidence.
- `evidence/`: durable no-secret approval and readiness packets.

Generated screenshots, logs, JSON readbacks, provider exports, and rollback
captures do not belong here. Store them under ignored `.artifacts/operations`.

## Rules

- Start each repository phase with `git status --short --branch`.
- Keep credentials, cookies, tokens, private keys, signed URLs, customer data,
  supplier evidence, and recovery material in `Mochi Creds` or protected hosted
  secret stores only.
- Preserve protected-PR delivery and exact approval gates for provider
  mutations, deployments, theme publication, migrations, and secret changes.
- Keep ActivityPub federation disabled.
- Never require the workstation to serve traffic, process production jobs, hold
  the only production data copy, or keep hosted integrations online.
