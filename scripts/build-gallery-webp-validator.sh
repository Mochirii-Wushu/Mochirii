#!/usr/bin/env bash
set -euo pipefail

readonly LIBWEBP_VERSION="1.6.0"
readonly LIBWEBP_ARCHIVE_SHA256="e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564"
readonly LIBWEBP_URL="https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-${LIBWEBP_VERSION}.tar.gz"
readonly EMSDK_IMAGE="emscripten/emsdk:4.0.12@sha256:744fb6a68941970951bacf9d6632041a0398260492232691ef22bbf54b0585c6"
readonly OUTPUT_DIR="supabase/functions/_shared/vendor/libwebp"

if [[ "${MOCHIRII_GALLERY_WEBP_IN_EMSDK:-}" != "1" ]]; then
  docker run --rm --platform linux/amd64 \
    -e MOCHIRII_GALLERY_WEBP_IN_EMSDK=1 \
    -v "$(pwd):/src" \
    -w /src \
    "${EMSDK_IMAGE}" \
    bash scripts/build-gallery-webp-validator.sh
  exit
fi

readonly WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

curl --fail --location --silent --show-error "${LIBWEBP_URL}" --output "${WORK_DIR}/libwebp.tar.gz"
echo "${LIBWEBP_ARCHIVE_SHA256}  ${WORK_DIR}/libwebp.tar.gz" | sha256sum --check --status
tar --extract --gzip --file "${WORK_DIR}/libwebp.tar.gz" --directory "${WORK_DIR}"

emcmake cmake \
  -S "${WORK_DIR}/libwebp-${LIBWEBP_VERSION}" \
  -B "${WORK_DIR}/build" \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DWEBP_BUILD_ANIM_UTILS=OFF \
  -DWEBP_BUILD_CWEBP=OFF \
  -DWEBP_BUILD_DWEBP=OFF \
  -DWEBP_BUILD_EXTRAS=OFF \
  -DWEBP_BUILD_GIF2WEBP=OFF \
  -DWEBP_BUILD_IMG2WEBP=OFF \
  -DWEBP_BUILD_LIBWEBPMUX=OFF \
  -DWEBP_BUILD_VWEBP=OFF \
  -DWEBP_BUILD_WEBPINFO=OFF \
  -DWEBP_BUILD_WEBPMUX=OFF
cmake --build "${WORK_DIR}/build" --config Release --parallel 2

mkdir -p "${OUTPUT_DIR}"
emcc \
  supabase/functions/_shared/gallery-webp-validator.c \
  "${WORK_DIR}/build/libwebp.a" \
  "${WORK_DIR}/build/libsharpyuv.a" \
  -I "${WORK_DIR}/libwebp-${LIBWEBP_VERSION}/src" \
  -O3 \
  -flto \
  -s ALLOW_MEMORY_GROWTH=0 \
  -s ASSERTIONS=0 \
  -s ENVIRONMENT=web,worker \
  -s EXPORTED_FUNCTIONS='["_gallery_validate_webp","_gallery_webp_decoder_version","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["HEAPU8"]' \
  -s EXPORT_ES6=1 \
  -s FILESYSTEM=0 \
  -s INITIAL_MEMORY=8388608 \
  -s MALLOC=emmalloc \
  -s MODULARIZE=1 \
  -s SINGLE_FILE=1 \
  --no-entry \
  -o "${OUTPUT_DIR}/validator.generated.js"

cp "${WORK_DIR}/libwebp-${LIBWEBP_VERSION}/COPYING" "${OUTPUT_DIR}/COPYING"
cp "${WORK_DIR}/libwebp-${LIBWEBP_VERSION}/PATENTS" "${OUTPUT_DIR}/PATENTS"
sha256sum "${OUTPUT_DIR}/validator.generated.js" > "${OUTPUT_DIR}/validator.generated.js.sha256"
