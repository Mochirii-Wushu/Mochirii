#!/usr/bin/env bash
set -Eeuo pipefail

readonly BUILDX_VERSION="v0.35.0"
readonly BUILDX_ASSET="buildx-v0.35.0.linux-amd64"
readonly BUILDX_SHA256="d41ece72044243b4f58b343441ae37446d9c29a7d6b5e11c61847bbcf8f7dfda"
readonly BUILDX_BUNDLE_SHA256="efe9f45ff054cb8c29c74b908958277423c6f4ef57350354f452e1672f91ddcf"
readonly BUILDX_CERTIFICATE_IDENTITY="https://github.com/docker/github-builder/.github/workflows/bake.yml@5f637c833aa76bc99372a1dc9a6f8bcd8056fb85"
readonly BUILDX_RELEASE_BASE="https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}"

readonly SYFT_VERSION="1.49.0"
readonly SYFT_ASSET="syft_1.49.0_linux_amd64.tar.gz"
readonly SYFT_SHA256="7aa2f03ee92739cf643279ba3990548b9925d4e22cae13f46831ee62821147fe"
readonly SYFT_CHECKSUMS_SHA256="1870142953acd02a9de2f5ff019087cee4a6dc03e4a7c15b67de7b1dc48e0865"
readonly SYFT_CERTIFICATE_IDENTITY="https://github.com/anchore/syft/.github/workflows/release.yaml@refs/heads/main"
readonly SYFT_RELEASE_BASE="https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}"

readonly CERTIFICATE_OIDC_ISSUER="https://token.actions.githubusercontent.com"

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  echo "Verified Social build tools support only the pinned Linux AMD64 runner." >&2
  exit 1
fi

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign must be installed by the pinned Sigstore installer action." >&2
  exit 1
fi

download() {
  local destination="$1"
  local url="$2"

  curl \
    --retry 3 \
    --retry-all-errors \
    --proto '=https' \
    --proto-redir '=https' \
    --tlsv1.2 \
    --fail \
    --silent \
    --show-error \
    --location \
    --output "$destination" \
    "$url"
}

verify_sha256() {
  local expected="$1"
  local file="$2"
  local directory
  local basename

  directory="$(dirname "$file")"
  basename="$(basename "$file")"
  (
    cd "$directory"
    printf '%s  %s\n' "$expected" "$basename" | sha256sum --check --strict -
  )
}

readonly task_root="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
readonly task_dir="$(mktemp -d "${task_root%/}/mochirii-social-tools.XXXXXX")"
readonly bin_dir="${HOME}/.local/bin"
readonly buildx_plugin_dir="${HOME}/.docker/cli-plugins"

cleanup() {
  if [[ -n "${task_dir:-}" && "$task_dir" == "${task_root%/}"/mochirii-social-tools.* ]]; then
    rm -rf -- "$task_dir"
  fi
}
trap cleanup EXIT

mkdir -p "$bin_dir" "$buildx_plugin_dir"

readonly buildx_binary="${task_dir}/${BUILDX_ASSET}"
readonly buildx_bundle="${buildx_binary}.sigstore.json"
download "$buildx_binary" "${BUILDX_RELEASE_BASE}/${BUILDX_ASSET}"
download "$buildx_bundle" "${BUILDX_RELEASE_BASE}/${BUILDX_ASSET}.sigstore.json"
verify_sha256 "$BUILDX_SHA256" "$buildx_binary"
verify_sha256 "$BUILDX_BUNDLE_SHA256" "$buildx_bundle"
cosign verify-blob \
  --bundle "$buildx_bundle" \
  --certificate-identity "$BUILDX_CERTIFICATE_IDENTITY" \
  --certificate-oidc-issuer "$CERTIFICATE_OIDC_ISSUER" \
  "$buildx_binary"
install -m 0755 "$buildx_binary" "${buildx_plugin_dir}/docker-buildx"
"${buildx_plugin_dir}/docker-buildx" version | grep -F "$BUILDX_VERSION"

readonly syft_archive="${task_dir}/${SYFT_ASSET}"
readonly syft_checksums="${task_dir}/syft_${SYFT_VERSION}_checksums.txt"
readonly syft_certificate_base64="${syft_checksums}.pem.b64"
readonly syft_certificate="${syft_checksums}.pem"
readonly syft_signature="${syft_checksums}.sig"
download "$syft_archive" "${SYFT_RELEASE_BASE}/${SYFT_ASSET}"
download "$syft_checksums" "${SYFT_RELEASE_BASE}/syft_${SYFT_VERSION}_checksums.txt"
download "$syft_certificate_base64" "${SYFT_RELEASE_BASE}/syft_${SYFT_VERSION}_checksums.txt.pem"
download "$syft_signature" "${SYFT_RELEASE_BASE}/syft_${SYFT_VERSION}_checksums.txt.sig"
verify_sha256 "$SYFT_CHECKSUMS_SHA256" "$syft_checksums"
base64 --decode "$syft_certificate_base64" > "$syft_certificate"
cosign verify-blob \
  --certificate "$syft_certificate" \
  --signature "$syft_signature" \
  --certificate-identity "$SYFT_CERTIFICATE_IDENTITY" \
  --certificate-oidc-issuer "$CERTIFICATE_OIDC_ISSUER" \
  "$syft_checksums"
grep -Fx "${SYFT_SHA256}  ${SYFT_ASSET}" "$syft_checksums"
verify_sha256 "$SYFT_SHA256" "$syft_archive"
tar -xzf "$syft_archive" -C "$task_dir" syft
install -m 0755 "${task_dir}/syft" "${bin_dir}/syft"
"${bin_dir}/syft" version | grep -Eq "Version:[[:space:]]+${SYFT_VERSION//./\\.}"

if [[ -n "${GITHUB_PATH:-}" ]]; then
  printf '%s\n' "$bin_dir" >> "$GITHUB_PATH"
fi
