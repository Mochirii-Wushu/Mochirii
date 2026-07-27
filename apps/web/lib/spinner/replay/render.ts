import type { AnimationManifestV1 } from "../media-contract.ts";
import { SPINNER_MEDIA_MAX_MP4_BYTES, encodeReplayWithFallback } from "./encoder.ts";
import { createReplayFrameRenderer } from "./renderer.ts";

export const SPINNER_MEDIA_MAX_PNG_BYTES = 3_000_000;
export const SPINNER_MEDIA_RENDER_DEADLINE_MS = 45_000;

export type RenderedReplayMedia = Readonly<{
  bytes: Buffer;
  contentType: "video/mp4" | "image/png";
  extension: "mp4" | "png";
}>;

async function renderBoundedPoster(manifest: AnimationManifestV1): Promise<Buffer> {
  const primary = (await createReplayFrameRenderer(manifest, 1_280, 720)).renderPng();
  if (primary.byteLength <= SPINNER_MEDIA_MAX_PNG_BYTES) return primary;
  const compact = (await createReplayFrameRenderer(manifest, 960, 540)).renderPng();
  if (compact.byteLength > SPINNER_MEDIA_MAX_PNG_BYTES) {
    throw new RangeError("Winning image exceeds its payload limit.");
  }
  return compact;
}

/** Renders the immutable winner image first, so every video failure stays recoverable. */
export async function renderReplayMedia(
  manifest: AnimationManifestV1,
  options: { now?: () => number; encode?: typeof encodeReplayWithFallback } = {},
): Promise<RenderedReplayMedia> {
  const now = options.now ?? Date.now;
  const poster = await renderBoundedPoster(manifest);
  const deadlineAt = now() + SPINNER_MEDIA_RENDER_DEADLINE_MS;
  const video = await (options.encode ?? encodeReplayWithFallback)({
    manifest,
    deadlineAt,
    maximumBytes: SPINNER_MEDIA_MAX_MP4_BYTES,
  });
  if (video.kind === "mp4") {
    return Object.freeze({ bytes: video.encoded.bytes, contentType: "video/mp4", extension: "mp4" });
  }
  return Object.freeze({ bytes: poster, contentType: "image/png", extension: "png" });
}
