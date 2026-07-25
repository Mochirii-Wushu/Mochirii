# Online Backup And Recovery

Mochirii Social backups run on the production Droplet through systemd. They do
not require a Windows task, local Docker container, tunnel, or workstation.

## Backup Contract

At 03:15 UTC, `/usr/local/sbin/mochirii-social-backup nightly`:

1. creates a transactional MariaDB dump with routines, events, triggers, and
   binary data;
2. packages the root-owned runtime, Caddy, SSH, release, and backup settings;
3. restores the dump into an isolated, network-disabled MariaDB container and
   compares critical table counts;
4. encrypts the validated recovery payload to the dedicated public recipient;
5. uploads it privately to the regional backup Space with a dedicated key; and
6. retains 14 daily, 8 weekly, and 6 monthly recovery points.

Manual pre-deploy and pre-restore points use a separate eight-object retention
class. Pruning validates every exact object name before deleting it. The
versioned bucket lifecycle remains the provider-side second boundary.

The Droplet stores only the encryption recipient. The matching identity belongs
in a `social-recovery` environment secret and in one offline copy inside the
approved credentials boundary. Backup, media, and temporary administrative
Spaces keys remain separate.

## Pinned Recovery Tools

Both the Droplet backup installer and the GitHub-hosted recovery workflow use
`scripts/install-pinned-recovery-tools.sh`. It installs only checksum-verified
release artifacts for these approved versions:

| Tool | Version | Purpose |
| --- | --- | --- |
| `age` and `age-keygen` | `1.3.1` | Encrypt and decrypt recovery payloads |
| `rclone` | `1.74.4` | Transfer private recovery objects |

The installer supports Linux AMD64 and ARM64, requires HTTPS for the initial
request and every redirect, verifies an architecture-specific SHA-256 before
extracting, and checks the reported version before installation. The production
backup also refuses to run if either installed version drifts from this contract.
This removes Ubuntu package-repository timing from the backup and recovery path.
The approved Ubuntu host must already provide `curl`, `install`, `mktemp`,
`sha256sum`, `tar`, `uname`, and `unzip`; the installer stops with the missing
prerequisite name before downloading anything.

Repository validation runs syntax checks and ShellCheck, then installs and
exercises the pinned binaries on native AMD64 and ARM64 Ubuntu 24.04 runners.
Each runner verifies the exact versions, completes an `age` encrypt/decrypt
round trip with a byte-identical payload, and exercises `rclone` `copyto`, `lsf`,
and `deletefile` against its no-network local backend. The
[`ubuntu-24.04-arm` runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
is a GitHub-hosted public-preview dependency, so its unavailability fails the
required `validate-social` result closed and blocks Social image publication;
the workflow does not silently fall back to another architecture or bypass the
check. This CI coverage validates the source and release artifacts; it does not
install tools on the live Droplet. The live host remains unchanged until a
separately approved installation packet and post-install version readback are
completed.

To update a pin, review the upstream release and its security notes. For `age`,
verify the [official release](https://github.com/FiloSottile/age/releases) checksum
through its Sigsum or GitHub artifact attestation. For `rclone`, follow the
[release-signing procedure](https://rclone.org/release_signing/) and verify the
signed checksum file with release key fingerprint
`FBF737ECE9F8AB18604BD2AC93935E02FF3B54FA`. Update both architecture hashes,
the expected versions, this runbook, and the static contract together; then test
installation and an encrypt/decrypt round trip on Ubuntu 24.04 before any
separately approved host installation or recovery dispatch.

## Host Settings

`/opt/mochirii-social/shared/backup.env` is root-owned mode `600` and contains:

```text
BACKUP_S3_ACCESS_KEY_ID=<dedicated backup key id>
BACKUP_S3_SECRET_ACCESS_KEY=<dedicated backup key secret>
BACKUP_S3_BUCKET=mochirii-social-backups
BACKUP_S3_ENDPOINT=https://sfo3.digitaloceanspaces.com
BACKUP_S3_REGION=sfo3
```

Never commit, print, copy into a release bundle, or place this file in a user
home directory. Activate the timer only after a manual encrypted upload and
isolated restore pass:

```bash
sudo /usr/local/sbin/mochirii-social-backup-enable
```

## GitHub Recovery

The canonical repository is public. Store recovery credentials only as
`social-recovery` environment secrets and non-secret destinations as
`social-recovery` environment variables. Restrict deployments to protected
`main`, and retain any required-reviewer rule confirmed through GitHub provider
readback. Repository-wide credentials are not the recovery boundary.

The protected `Verify or restore Mochirii Social backup` workflow accepts one
exact private object key. `validate-only` decrypts and restores it into an
isolated GitHub-hosted MariaDB container. `restore-production` additionally
requires the typed confirmation `RESTORE social.mochirii.com` and streams only
the validated plaintext payload over strict-host-key SSH to the locked,
forced-command `github-recovery` account.

The host creates a new verified encrypted pre-restore point before replacing the
database. A failed production restore stays in maintenance mode for a forward
fix or another reviewed restore. Configuration files in the payload are not
automatically applied during a database restore.

The control set is protected `main`, the protected `social-recovery`
environment, full-SHA-pinned actions, read-only workflow permissions,
owner-controlled manual dispatch, exact typed confirmations, non-cancelling
concurrency, strict host-key checking, and the Droplet forced command. Do not
claim that GitHub reviewed a restore unless the required-reviewer rule is
verified by provider readback.
