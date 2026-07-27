// Generated decoder: official libwebp 1.6.0, vendored under ./vendor/libwebp.
// The single-file module keeps API-driven Supabase deployments self-contained.
// deno-lint-ignore no-explicit-any
import createWebpValidator from "./vendor/libwebp/validator.generated.js";

type WebpValidatorModule = {
  HEAPU8: Uint8Array;
  _free(pointer: number): void;
  _gallery_validate_webp(
    pointer: number,
    size: number,
    width: number,
    height: number,
  ): number;
  _gallery_webp_decoder_version(): number;
  _malloc(size: number): number;
};

let modulePromise: Promise<WebpValidatorModule> | null = null;

function validatorModule(): Promise<WebpValidatorModule> {
  modulePromise ||= createWebpValidator() as Promise<WebpValidatorModule>;
  return modulePromise;
}

export async function galleryWebpDecoderVersion(): Promise<number> {
  return (await validatorModule())._gallery_webp_decoder_version();
}

export async function isDecodableGalleryWebp(
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<boolean> {
  const module = await validatorModule();
  const pointer = module._malloc(bytes.length);
  if (!pointer) return false;

  try {
    module.HEAPU8.set(bytes, pointer);
    return module._gallery_validate_webp(
      pointer,
      bytes.length,
      width,
      height,
    ) === 1;
  } finally {
    module._free(pointer);
  }
}
