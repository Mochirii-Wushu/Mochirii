import {
  Mp4Demuxer,
  Mp4Muxer,
  VideoDecoder,
  VideoEncoder,
  VideoFrame,
} from "@napi-rs/webcodecs";
import type { AnimationManifestV1 } from "../media-contract.ts";
import { createReplayFrameRenderer, TOTAL_REPLAY_DURATION_MS } from "./renderer.ts";

/** Requested constrained-Baseline stream. The actual muxed track is inspected after encoding. */
export const H264_REQUEST_CODEC = "avc1.42E01F";
export const SPINNER_MEDIA_MAX_MP4_BYTES = 4_250_000;

export type VideoProfile = Readonly<{
  name: "primary" | "fallback";
  width: 1_280 | 960;
  height: 720 | 540;
  fps: 25 | 20;
  bitrate: number;
}>;

export const PRIMARY_ENCODING_PROFILE: VideoProfile = Object.freeze({
  name: "primary",
  width: 1_280,
  height: 720,
  fps: 25,
  bitrate: 2_700_000,
});

export const FALLBACK_ENCODING_PROFILE: VideoProfile = Object.freeze({
  name: "fallback",
  width: 960,
  height: 540,
  fps: 20,
  bitrate: 1_800_000,
});

export type Mp4Inspection = Readonly<{
  codec: string;
  durationMs: number;
  videoTracks: number;
  audioTracks: number;
}>;

export type EncodedReplay = Readonly<{
  bytes: Buffer;
  profile: VideoProfile;
  frames: number;
  durationMs: number;
  elapsedMs: number;
  inspection: Mp4Inspection;
}>;

export type ReplayVideoResult =
  | Readonly<{ kind: "mp4"; encoded: EncodedReplay; retried: boolean }>
  | Readonly<{ kind: "png"; reason: "deadline" | "encoder" | "too_large"; retried: boolean }>;

export class ReplayEncodingError extends Error {
  readonly code: "unsupported" | "encoder_failed" | "deadline_exceeded" | "muxer_failed" | "invalid_output";

  constructor(code: ReplayEncodingError["code"]) {
    super("Replay encoding failed.");
    this.name = "ReplayEncodingError";
    this.code = code;
  }
}

function redactPrintableRun(bytes: Buffer, start: number, maximumLength: number) {
  let end = start;
  const limit = Math.min(bytes.length, start + maximumLength);
  while (end < limit && bytes[end] >= 0x20 && bytes[end] <= 0x7e) end += 1;
  const replacement = Buffer.from("Mochirii replay");
  for (let index = start; index < end; index += 1) {
    bytes[index] = replacement[(index - start) % replacement.length] ?? 0x20;
  }
}

/** Removes encoder/tool identity strings without changing atom or sample sizes. */
export function sanitizeMp4Metadata(value: Uint8Array): Buffer {
  const bytes = Buffer.from(value);
  for (const [marker, maximumLength] of [
    ["Lavf", 64],
    ["x264 - core", 2_048],
  ] as const) {
    let start = bytes.indexOf(marker);
    while (start >= 0) {
      redactPrintableRun(bytes, start, maximumLength);
      start = bytes.indexOf(marker, start + marker.length);
    }
  }
  return bytes;
}

async function waitForBackpressure(encoder: VideoEncoder, deadlineAt: number): Promise<void> {
  if (encoder.encodeQueueSize <= 3) return;
  await new Promise<void>((resolve, reject) => {
    const prior = encoder.ondequeue;
    const cleanup = () => {
      clearTimeout(timer);
      encoder.ondequeue = prior;
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new ReplayEncodingError("deadline_exceeded"));
    }, Math.max(1, deadlineAt - Date.now()));
    timer.unref();
    encoder.ondequeue = () => {
      cleanup();
      resolve();
    };
  });
}

async function withDeadline<T>(operation: Promise<T>, deadlineAt: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ReplayEncodingError("deadline_exceeded")),
      Math.max(1, deadlineAt - Date.now()),
    );
    timer.unref();
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function inspectMp4(value: Uint8Array): Promise<Mp4Inspection> {
  let error: Error | null = null;
  const demuxer = new Mp4Demuxer({ error: (value) => { error = value; } });
  try {
    await demuxer.loadBuffer(value);
    if (error) throw error;
    const videoTracks = demuxer.tracks.filter((track) => track.trackType === "video");
    const audioTracks = demuxer.tracks.filter((track) => track.trackType === "audio");
    const video = videoTracks[0];
    if (!video || videoTracks.length !== 1 || audioTracks.length !== 0) {
      throw new ReplayEncodingError("invalid_output");
    }
    return Object.freeze({
      codec: video.codec,
      durationMs: Number(video.duration ?? demuxer.duration ?? 0) / 1_000,
      videoTracks: videoTracks.length,
      audioTracks: audioTracks.length,
    });
  } finally {
    demuxer.close();
  }
}

/** Decodes an initial packet window as a native playback smoke check. */
export async function decodedMp4FrameCount(value: Uint8Array, packetCount = 8): Promise<number> {
  if (!Number.isSafeInteger(packetCount) || packetCount < 1 || packetCount > 30) {
    throw new RangeError("Playback smoke packet count is invalid.");
  }
  let decoder: VideoDecoder | null = null;
  let decodedFrames = 0;
  let playbackError: Error | null = null;
  const demuxer = new Mp4Demuxer({
    videoOutput: (chunk) => decoder?.decode(chunk),
    error: (error) => { playbackError = error; },
  });
  try {
    await demuxer.loadBuffer(value);
    const config = demuxer.videoDecoderConfig;
    if (!config) throw new ReplayEncodingError("invalid_output");
    const support = await VideoDecoder.isConfigSupported(config);
    if (!support.supported) throw new ReplayEncodingError("invalid_output");
    decoder = new VideoDecoder({
      output: (frame) => {
        decodedFrames += 1;
        frame.close();
      },
      error: (error) => { playbackError = error; },
    });
    decoder.configure(support.config);
    await demuxer.demuxAsync(packetCount);
    await decoder.flush();
    if (playbackError || decodedFrames < 1) throw new ReplayEncodingError("invalid_output");
    return decodedFrames;
  } finally {
    try {
      decoder?.close();
    } catch {
      // A native decoder error may already have closed it.
    }
    demuxer.close();
  }
}

export async function encodeReplayVideo(input: {
  manifest: AnimationManifestV1;
  profile: VideoProfile;
  deadlineAt: number;
  now?: () => number;
}): Promise<EncodedReplay> {
  const now = input.now ?? Date.now;
  if (now() >= input.deadlineAt) throw new ReplayEncodingError("deadline_exceeded");
  const support = await VideoEncoder.isConfigSupported({
    codec: H264_REQUEST_CODEC,
    width: input.profile.width,
    height: input.profile.height,
    bitrate: input.profile.bitrate,
    framerate: input.profile.fps,
    bitrateMode: "variable",
    latencyMode: "quality",
    hardwareAcceleration: "prefer-software",
    avc: { format: "avc" },
  });
  if (!support.supported) throw new ReplayEncodingError("unsupported");

  const startedAt = now();
  const renderer = await createReplayFrameRenderer(
    input.manifest,
    input.profile.width,
    input.profile.height,
  );
  const muxer = new Mp4Muxer({ fastStart: true });
  muxer.addVideoTrack({
    codec: H264_REQUEST_CODEC,
    width: input.profile.width,
    height: input.profile.height,
    framerate: input.profile.fps,
  });
  let encodingError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
    error: (error) => { encodingError = error; },
  });
  encoder.configure(support.config);

  const totalMicroseconds = TOTAL_REPLAY_DURATION_MS * 1_000;
  const frameMicroseconds = 1_000_000 / input.profile.fps;
  const frames = TOTAL_REPLAY_DURATION_MS / 1_000 * input.profile.fps;
  try {
    for (let index = 0; index < frames; index += 1) {
      if (now() >= input.deadlineAt) throw new ReplayEncodingError("deadline_exceeded");
      if (encodingError) throw new ReplayEncodingError("encoder_failed");
      await waitForBackpressure(encoder, input.deadlineAt);
      const timestamp = Math.round(index * frameMicroseconds);
      const duration = Math.max(1, Math.min(Math.round(frameMicroseconds), totalMicroseconds - timestamp));
      const frame = new VideoFrame(renderer.renderRgba(timestamp / 1_000), {
        format: "RGBA",
        codedWidth: input.profile.width,
        codedHeight: input.profile.height,
        timestamp,
        duration,
      });
      try {
        encoder.encode(frame, { keyFrame: index % (input.profile.fps * 2) === 0 });
      } finally {
        frame.close();
      }
    }
    await withDeadline(encoder.flush(), input.deadlineAt);
    if (encodingError) throw new ReplayEncodingError("encoder_failed");
    muxer.flush();
    const bytes = sanitizeMp4Metadata(muxer.finalize());
    if (bytes.length === 0) throw new ReplayEncodingError("muxer_failed");
    const inspection = await inspectMp4(bytes);
    if (Math.abs(inspection.durationMs - TOTAL_REPLAY_DURATION_MS) > 1) {
      throw new ReplayEncodingError("invalid_output");
    }
    return Object.freeze({
      bytes,
      profile: input.profile,
      frames,
      durationMs: inspection.durationMs,
      elapsedMs: Math.max(0, now() - startedAt),
      inspection,
    });
  } catch (error) {
    if (error instanceof ReplayEncodingError) throw error;
    throw new ReplayEncodingError("encoder_failed");
  } finally {
    try {
      encoder.close();
    } catch {
      // A native encoder error may already have closed it.
    }
    muxer.close();
  }
}

export async function encodeReplayWithFallback(input: {
  manifest: AnimationManifestV1;
  deadlineAt: number;
  maximumBytes?: number;
  encode?: typeof encodeReplayVideo;
}): Promise<ReplayVideoResult> {
  const maximumBytes = input.maximumBytes ?? SPINNER_MEDIA_MAX_MP4_BYTES;
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > SPINNER_MEDIA_MAX_MP4_BYTES) {
    throw new RangeError("Replay payload limit is invalid.");
  }
  const encode = input.encode ?? encodeReplayVideo;
  let primary: EncodedReplay;
  try {
    primary = await encode({ manifest: input.manifest, profile: PRIMARY_ENCODING_PROFILE, deadlineAt: input.deadlineAt });
  } catch (error) {
    return Object.freeze({
      kind: "png",
      reason: error instanceof ReplayEncodingError && error.code === "deadline_exceeded" ? "deadline" : "encoder",
      retried: false,
    });
  }
  if (primary.bytes.length <= maximumBytes) {
    return Object.freeze({ kind: "mp4", encoded: primary, retried: false });
  }
  if (Date.now() >= input.deadlineAt) {
    return Object.freeze({ kind: "png", reason: "deadline", retried: false });
  }
  try {
    const fallback = await encode({ manifest: input.manifest, profile: FALLBACK_ENCODING_PROFILE, deadlineAt: input.deadlineAt });
    return fallback.bytes.length <= maximumBytes
      ? Object.freeze({ kind: "mp4" as const, encoded: fallback, retried: true })
      : Object.freeze({ kind: "png" as const, reason: "too_large" as const, retried: true });
  } catch (error) {
    return Object.freeze({
      kind: "png",
      reason: error instanceof ReplayEncodingError && error.code === "deadline_exceeded" ? "deadline" : "encoder",
      retried: true,
    });
  }
}
