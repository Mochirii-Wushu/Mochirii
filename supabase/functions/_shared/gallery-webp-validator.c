#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

#include <emscripten/emscripten.h>
#include <webp/decode.h>

EMSCRIPTEN_KEEPALIVE
int gallery_webp_decoder_version(void) {
  return WebPGetDecoderVersion();
}

EMSCRIPTEN_KEEPALIVE
int gallery_validate_webp(
  const uint8_t* encoded,
  size_t encoded_size,
  int expected_width,
  int expected_height
) {
  WebPBitstreamFeatures features;
  uint8_t* decoded;
  size_t stride;
  size_t decoded_size;

  if (encoded == NULL || encoded_size == 0 || expected_width < 1 || expected_height < 1) {
    return 0;
  }
  if (WebPGetFeatures(encoded, encoded_size, &features) != VP8_STATUS_OK) {
    return 0;
  }
  if (features.has_animation || features.width != expected_width || features.height != expected_height) {
    return 0;
  }
  if (features.width > 720 || features.height > 720) {
    return 0;
  }

  stride = (size_t)features.width * 4u;
  decoded_size = stride * (size_t)features.height;
  if (stride / 4u != (size_t)features.width || decoded_size / stride != (size_t)features.height) {
    return 0;
  }

  decoded = (uint8_t*)malloc(decoded_size);
  if (decoded == NULL) {
    return 0;
  }
  if (WebPDecodeRGBAInto(encoded, encoded_size, decoded, decoded_size, (int)stride) == NULL) {
    free(decoded);
    return 0;
  }

  free(decoded);
  return 1;
}
