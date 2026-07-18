# Mochirii Social Encrypted Backup Readiness Packet

Prepared: 2026-07-12 PDT

Approved: 2026-07-12 PDT

PR #39 merged at `93c2cdd1dcefb0160da55484140d1ac683f9fe60`.
The main workflow passed and published immutable GHCR digest
`sha256:81118f040522efe32f15c1ab080458607efbe1c87cf7339cdb1ea92ff72b678b`.
No Droplet deployment occurred. DigitalOcean authentication is the next
execution dependency.

This packet is intentionally no-secret. It records current read-only evidence
and the exact provider mutations still requiring approval.

## Verified Repository And Host State

- Repository `Mochirii-Wushu/mochirii-pixelfed-ops` is clean and synchronized
  on `main` at `fc880a689798d55bd5adb34edccd831cd596a798` with no open PR.
- `npm run check:production-backups`, `npm run check:mochirii-ops`, and
  `git diff --check` pass.
- Installed backup, restore, enable, service, and timer files exactly match the
  tracked `main` blobs.
- The Droplet has 30 GB free. Pixelfed app, MariaDB, Redis, Horizon, and the
  scheduler are healthy. Horizon is running and the schedule is populated.
- Root login, password auth, and keyboard-interactive auth are disabled.
  Public-key auth is enabled and only `mochirii`, `github-deploy`, and
  `github-recovery` are allowed.
- `github-recovery` exists with mode-700 `.ssh`, mode-600 `authorized_keys`,
  and the forced command `/usr/local/sbin/mochirii-social-restore-entry`.
- The age recipient is present and root-owned. `age` and `rclone` are installed.
- The backup timer is loaded but disabled and inactive. This is the intended
  fail-closed state before the first encrypted backup and restore proof.
- `/opt/mochirii-social/shared/backup.env` is absent. No backup Space
  credential is available to the host.
- One root-only, mode-600 pre-online SQL gzip remains on the Droplet. It is not
  an encrypted online recovery point and must remain until the new proof passes.

## GitHub Free Constraint

The repository is private and the owning organization is on GitHub Free. The
`social-recovery` environment exists and is restricted to protected branches,
but it has no reviewer or wait-timer rule. GitHub documents that private
repositories on Free cannot use environment secrets, required reviewers, or
wait timers. The existing environment secret names therefore do not prove that
a runner can receive them.

The Free-compatible recovery boundary is:

- repository Actions secrets for the recovery identity, backup Space key, SSH
  key, and known hosts;
- repository Actions variables for the non-secret bucket, endpoint, region,
  host, and recovery username;
- a workflow present only on protected `main`;
- `sha_pinning_required: true`, read-only default workflow permissions, and
  `persist-credentials: false`;
- owner-only manual dispatch, exact object-key validation, exact typed
  confirmation, and non-cancelling concurrency; and
- strict host-key SSH plus the Droplet forced command for production restore.

Required reviewers can be added later only with a plan that supports them for
private repositories. No GitHub subscription increase is part of this packet.

## DigitalOcean Boundary

DigitalOcean documents that Spaces has no built-in backups, so the separate
regional backup Space and `rclone` copy are required. Spaces keys support a
bucket-specific `readwrite` grant, which is narrower than full access. Object
Versioning is disabled by default and must be enabled through the S3-compatible
API before relying on noncurrent-version retention.

Current authenticated dashboard readback is unavailable because the browser
session expired. Earlier provider evidence recorded `mochirii-social-backups`
in `sfo3` as empty. Re-authentication and a fresh readback are required before
any mutation.

Official references:

- [DigitalOcean Spaces backup guidance](https://docs.digitalocean.com/support/how-do-i-back-up-spaces-buckets/)
- [DigitalOcean scoped Spaces keys](https://docs.digitalocean.com/products/spaces/reference/api/spaces-keys/)
- [DigitalOcean Spaces versioning](https://docs.digitalocean.com/products/spaces/how-to/enable-versioning/)
- [GitHub deployment environment availability](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)

## Exact Approved Mutation Sequence

1. Mark Social draft PR #39 ready and squash-merge it only after all checks
   pass. Allow the existing `main` workflow to publish its immutable GHCR
   image, but do not dispatch the Droplet deployment workflow.
2. Re-authenticate to DigitalOcean and read back only the backup Space region,
   object count, versioning, lifecycle, and access-logging status.
3. Create one new Spaces key named for Mochirii Social backups with only a
   bucket-specific `readwrite` grant on `mochirii-social-backups`. Do not grant
   access to the live media Space or any other bucket.
4. Enable Object Versioning only on `mochirii-social-backups` and apply only the
   approved 30-day noncurrent-version lifecycle. Do not alter the live media
   Space, CDN, CORS, DNS, or Cloudflare.
5. Store the new key only in root-owned mode-600
   `/opt/mochirii-social/shared/backup.env` and in repository-level GitHub
   Actions secrets. Store non-secret recovery settings as repository variables.
   Remove the unusable same-name environment entries only after repository
   parity is confirmed.
6. Run `/usr/local/sbin/mochirii-social-backup bootstrap` once. Require a
   successful transactional dump, network-disabled isolated MariaDB restore,
   critical-row-count comparison, age encryption, private upload, and remote
   object readback.
7. Dispatch `Verify or restore Mochirii Social backup` from protected `main` in
   `validate-only` mode for that exact object key with confirmation
   `VERIFY social backup`. Require successful download, decryption, isolated
   restore, and critical-table probes on a GitHub-hosted runner.
8. Only after both proofs pass, enable and start
   `mochirii-social-backup.timer`, verify the next 03:15 UTC run, and delete
   only the named pre-online SQL gzip from the Droplet.
9. Keep ActivityPub disabled. Do not run `restore-production`, change Pixelfed
   runtime settings, deploy a new image, or change any unrelated provider.

## Rollback

- Before the timer is enabled, remove only the new `backup.env` and the new
  GitHub repository secret/variable entries if bootstrap or validation fails.
- Revoke only the newly created backup key if credential parity cannot be
  proven.
- If versioning or lifecycle configuration is wrong, correct only the backup
  Space configuration; do not touch live media.
- Keep the pre-online SQL gzip until the entire encrypted recovery path passes.

## Exact Approval

```text
Approve the exact Mochirii Social encrypted-backup mutation sequence in operations/evidence/2026-07-12/social/encrypted-backup-readiness-packet.md: merge checked Social PR #39 and allow its immutable GHCR publish without Droplet deployment; re-authenticate and read back mochirii-social-backups; create one bucket-scoped readwrite Spaces key; enable versioning and the 30-day noncurrent lifecycle only on that backup Space; store the key only in root mode-600 backup.env and repository-level GitHub Actions secrets; configure only the listed repository variables; run one bootstrap encrypted backup and one GitHub validate-only restore; then, only after both pass, enable the nightly timer and delete only the named pre-online SQL gzip. Keep ActivityPub disabled and do not change live media, CDN, CORS, DNS, Cloudflare, Pixelfed runtime settings, images, or unrelated providers.
```
