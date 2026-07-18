#!/usr/bin/env bash

set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

image="${PIXELFED_IMAGE:-mochirii-pixelfed:production-check}"
revision="${GITHUB_SHA:-$(git rev-parse HEAD)}"
source_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-Mochirii-Wushu/Mochirii}"

build_args=(
  docker buildx build
  --load
  --tag "$image"
  --label "org.opencontainers.image.source=$source_url"
  --label "org.opencontainers.image.revision=$revision"
)

if [[ -n "${BUILD_CACHE_FROM:-}" ]]; then
  build_args+=(--cache-from "$BUILD_CACHE_FROM")
fi
if [[ -n "${BUILD_CACHE_TO:-}" ]]; then
  build_args+=(--cache-to "$BUILD_CACHE_TO")
fi

"${build_args[@]}" .
