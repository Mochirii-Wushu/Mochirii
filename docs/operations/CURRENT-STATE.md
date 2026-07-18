# Current Mochirii State

Updated: 2026-07-18 PDT

This no-secret file records the current hosted and repository state. Update it
after a completed release or ownership change; do not place credentials,
provider exports, customer data, or mutable signed URLs here.

## Canonical Repository

- Repository: `Mochirii-Wushu/Mochirii`.
- Local checkout: `C:\Github Repo's\Mochirii Website\Website`.
- Production `main` before consolidation: `eba818418c85bc54ab0f0a4c9edf989dfdf0e902`.
- Website source: `apps/web`.
- Shopify theme source: `apps/shopify-theme`.
- Supabase source: `supabase`.
- Mochirii Social source will move to `services/social` through a reviewed
  sanitized snapshot import.
- Mochi Pets remains a separate game repository. This repository owns only its
  website doorway, browser bridge, and shared backend contracts.

## Hosted Services

- `mochirii.com` remains hosted by the existing Vercel project and deploys from
  protected `main` with Root Directory `apps/web`.
- Supabase project `deyvmtncimmcinldjyqe` remains the hosted Auth, Postgres, RLS,
  and Edge Function backend.
- `shop.mochirii.com` remains password-protected. Payments and checkout remain
  disabled.
- `social.mochirii.com` remains on the single Singapore DigitalOcean Droplet
  with Spaces-backed media. Registration is closed and ActivityPub is disabled.
- Production serving, queues, schedules, authentication, media, and backups do
  not depend on the local workstation.

## Shopify Copy

- Shared-copy packet `2026-07-18-v2` was applied exactly to the approved
  homepage SEO, two pages, five collections, twenty product records, and three
  policy presentation records.
- The automated privacy policy was unchanged.
- Source PR #459 squash-merged as
  `eba818418c85bc54ab0f0a4c9edf989dfdf0e902`.
- Theme `141514408011` remains unpublished.

## Consolidation In Progress

- Release `legacy-static-final-2026-07-18` preserves the final duplicate root
  static website for recovery.
- The root static source is being retired; `apps/web/public/assets` and
  `apps/web/public/data` are the only canonical public asset and data sources.
- Architecture, ownership, CODEOWNERS, scoped AGENTS instructions, integration
  docs, operations docs, brand boundaries, secret/path scanning, archive
  rejection, and repository-size budgets are being added through a protected
  pull request.
- The full root check, Next verification, Shopify theme validation, dependency
  audits, and `git diff --check` pass for the consolidation branch.

## Pending Ordered Work

1. Merge the repository-boundary and static-retirement pull request and verify
   the Vercel production route, redirect, metadata, and header contract.
2. Import the reviewed Social current-tree snapshot, publish and deploy the
   canonical immutable image, and verify the existing runtime.
3. Publish the focused Mochi Pets workspace-path commit without changing the
   game runtime.
4. Back up and permanently delete only the superseded Shopify and Social source
   repositories after restore and live-package verification.
5. Remove superseded local checkouts and reopen Codex at the canonical Website
   checkout.

## Deferred

- Mochi Pets dependency pull requests and game runtime development.
- Shopify payment setup, password removal, and public launch.
- ActivityPub federation.
- Cloudflare, DNS, Spaces, Droplet-size, and unrelated provider changes.
