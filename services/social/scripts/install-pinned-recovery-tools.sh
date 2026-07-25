#!/usr/bin/env bash

set -Eeuo pipefail

readonly AGE_VERSION="1.3.1"
readonly RCLONE_VERSION="1.74.4"

if [[ "$#" -ne 1 || -z "${1:-}" || "$1" != /* ]]; then
  echo "Usage: $0 /absolute/destination-directory" >&2
  exit 1
fi

destination="$1"

for command_name in curl install mktemp sha256sum tar uname unzip; do
  command -v "$command_name" >/dev/null || {
    echo "Missing recovery-tool installer dependency: $command_name" >&2
    exit 1
  }
done

[[ "$(uname -s)" == "Linux" ]] || {
  echo "Pinned recovery tools are supported only on Linux." >&2
  exit 1
}

case "$(uname -m)" in
  x86_64 | amd64)
    architecture=amd64
    age_sha256=bdc69c09cbdd6cf8b1f333d372a1f58247b3a33146406333e30c0f26e8f51377
    rclone_sha256=fe435e0c36228e7c2f116a8701f01127bb1f694005fc11d1f27186c8bca4115d
    ;;
  aarch64 | arm64)
    architecture=arm64
    age_sha256=c6878a324421b69e3e20b00ba17c04bc5c6dab0030cfe55bf8f68fa8d9e9093a
    rclone_sha256=97685285c9ad6a0cf17d5844115d2a67245af6444db672187074bd9c358de419
    ;;
  *)
    echo "Unsupported recovery-tool architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

readonly architecture age_sha256 rclone_sha256
readonly age_url="https://github.com/FiloSottile/age/releases/download/v${AGE_VERSION}/age-v${AGE_VERSION}-linux-${architecture}.tar.gz"
readonly rclone_url="https://github.com/rclone/rclone/releases/download/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-linux-${architecture}.zip"

work_directory="$(mktemp -d)"
cleanup() {
  rm -rf -- "$work_directory"
}
trap cleanup EXIT

age_archive="$work_directory/age.tar.gz"
rclone_archive="$work_directory/rclone.zip"
curl_options=(
  --proto '=https'
  --proto-redir '=https'
  --fail
  --show-error
  --silent
  --location
  --retry 3
  --retry-all-errors
  --connect-timeout 20
  --max-time 300
)

curl "${curl_options[@]}" --output "$age_archive" "$age_url"
curl "${curl_options[@]}" --output "$rclone_archive" "$rclone_url"

printf '%s  %s\n' "$age_sha256" "$age_archive" | sha256sum --check --strict -
printf '%s  %s\n' "$rclone_sha256" "$rclone_archive" | sha256sum --check --strict -

install -d -m 0755 "$work_directory/age-extract" "$work_directory/rclone-extract" "$work_directory/bin"
tar --extract --gzip --file "$age_archive" --directory "$work_directory/age-extract"
unzip -q "$rclone_archive" -d "$work_directory/rclone-extract"

age_source="$work_directory/age-extract/age/age"
age_keygen_source="$work_directory/age-extract/age/age-keygen"
rclone_source="$work_directory/rclone-extract/rclone-v${RCLONE_VERSION}-linux-${architecture}/rclone"
for source_path in "$age_source" "$age_keygen_source" "$rclone_source"; do
  [[ -f "$source_path" ]] || {
    echo "A verified recovery-tool archive has an unexpected layout." >&2
    exit 1
  }
done

install -m 0755 "$age_source" "$work_directory/bin/age"
install -m 0755 "$age_keygen_source" "$work_directory/bin/age-keygen"
install -m 0755 "$rclone_source" "$work_directory/bin/rclone"

[[ "$("$work_directory/bin/age" --version)" == "v${AGE_VERSION}" ]] || {
  echo "The staged age version does not match the approved pin." >&2
  exit 1
}
[[ "$("$work_directory/bin/age-keygen" --version)" == "v${AGE_VERSION}" ]] || {
  echo "The staged age-keygen version does not match the approved pin." >&2
  exit 1
}
rclone_version_output="$("$work_directory/bin/rclone" version)"
[[ "${rclone_version_output%%$'\n'*}" == "rclone v${RCLONE_VERSION}" ]] || {
  echo "The staged rclone version does not match the approved pin." >&2
  exit 1
}

if [[ ! -d "$destination" ]]; then
  install -d -m 0755 "$destination"
fi
install -m 0755 "$work_directory/bin/age" "$destination/age"
install -m 0755 "$work_directory/bin/age-keygen" "$destination/age-keygen"
install -m 0755 "$work_directory/bin/rclone" "$destination/rclone"

echo "Installed pinned recovery tools: age v${AGE_VERSION}, rclone v${RCLONE_VERSION}."
