# Mochirii Social Delivery Contract

The canonical source for Mochirii Social is `services/social`. GitHub-hosted
runners validate it and publish the private container package
`ghcr.io/mochirii-wushu/mochirii-pixelfed-ops`. The production Droplet pulls an
exact digest; mutable tags are never deployment inputs.

## Hosted Workflows

| Workflow | Purpose | Mutation boundary |
| --- | --- | --- |
| `validate-social.yml` | Always reports `validate-social`; runs Social and image checks only for Social-owned paths | Pull requests and protected `main` |
| `deploy-social-production.yml` | Verifies a merged commit and package digest, then sends a no-secret release bundle to the forced-command account | Manual dispatch, `social-production` |
| `verify-social-online-hosting.yml` | Verifies the Droplet runtime, Spaces round trip, public service, and fail-closed hosted boundaries | Manual dispatch, `social-production` |
| `recover-social-production.yml` | Validates an encrypted recovery point in an isolated database and optionally restores through the forced-command account | Manual dispatch, `social-recovery` |

All external actions use reviewed full commit SHAs. Checkout credentials are
not persisted. Production publication includes an SPDX JSON SBOM, immutable
digest, and GitHub artifact attestations.

## Environment Contract

`social-production` contains these names:

- Variables: `SOCIAL_DEPLOY_HOST`, `SOCIAL_DEPLOY_USER`.
- Secrets: `SOCIAL_SSH_PRIVATE_KEY`, `SOCIAL_SSH_KNOWN_HOSTS`.

`social-recovery` contains these names:

- Variables: `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`,
  `SOCIAL_RECOVERY_HOST`, `SOCIAL_RECOVERY_USER`.
- Secrets: `BACKUP_AGE_IDENTITY`, `BACKUP_S3_ACCESS_KEY_ID`,
  `BACKUP_S3_SECRET_ACCESS_KEY`, `SOCIAL_RECOVERY_SSH_PRIVATE_KEY`,
  `SOCIAL_RECOVERY_SSH_KNOWN_HOSTS`.

Values are loaded only from the approved credential boundary and are never
printed, committed, attached to workflow artifacts, or copied into release
bundles. Environment deployment branches are restricted to protected `main`.

## Package And Host Boundary

- Keep the container package private and grant the canonical repository only
  the Actions access needed to publish and install it.
- Preserve the Droplet's dedicated read-only package credential. Do not replace
  it with a personal interactive login or bake it into an image.
- The forced-command SSH accounts cannot open a shell, allocate a PTY, forward
  traffic, or select an unapproved command.
- Runtime secrets, MariaDB, Redis, uploads, media, and backups stay on the
  Droplet or Spaces, never in GitHub artifacts or on a required workstation.
- ActivityPub remains disabled.

The superseded Shopify and Social source repositories were deleted on
2026-07-18 only after the canonical image was published and deployed, the
Droplet and Spaces boundaries passed hosted verification, and both encrypted
repository backups passed disposable restore checks. Workflow run
`29665954934` reverified the hosted runtime after deletion.
