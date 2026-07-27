import assert from "node:assert/strict";
import test from "node:test";

import type { AnimationManifestV1 } from "../apps/web/lib/spinner/media-contract.ts";
import {
  decodedMp4FrameCount,
  encodeReplayWithFallback,
  SPINNER_MEDIA_MAX_MP4_BYTES,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/lib/spinner/replay/encoder.ts";
import {
  createReplayFrameRenderer,
  rotationAtTime,
  spinnerEasing,
  TOTAL_REPLAY_DURATION_MS,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/lib/spinner/replay/renderer.ts";
import {
  renderReplayMedia,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/lib/spinner/replay/render.ts";
import {
  mediaCapabilityFromRequest,
  SPINNER_MEDIA_CAPABILITY_HEADER,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/lib/spinner/replay/request-policy.ts";

const manifest: AnimationManifestV1 = {
  version: 1,
  styleVersion: "mochirii-raffle-film-v1",
  width: 1_280,
  height: 720,
  durationMs: 10_600,
  drawId: "123e4567-e89b-42d3-a456-426614174000",
  startAt: "2026-07-26T12:00:00.000Z",
  revealAt: "2026-07-26T12:00:04.800Z",
  startRotation: 0,
  finalRotation: 2_070,
  rosterHashSha256: "a".repeat(64),
  participants: [
    { version: 1, number: 1, label: "1. Jade" },
    { version: 1, number: 2, label: "2. 月華🌸修仙者" },
    { version: 1, number: 3, label: "3. Lotus" },
    { version: 1, number: 4, label: "4. Crane" },
  ],
  selectedIndex: 1,
  winner: { version: 1, number: 2, displayName: "月華🌸修仙者" },
  visualSeedSha256: "b".repeat(64),
};

const maxManifest: AnimationManifestV1 = {
  ...manifest,
  drawId: "123e4567-e89b-42d3-a456-426614174100",
  finalRotation: 1_803.6,
  rosterHashSha256: "c".repeat(64),
  participants: Array.from({ length: 100 }, (_, index) => ({
    version: 1 as const,
    number: index + 1,
    label: `${index + 1}. ${index % 3 === 0 ? `星河${index}🌸` : index % 3 === 1 ? `Moon${index}` : `蓮花${index}✨`}`,
  })),
  selectedIndex: 99,
  winner: {
    version: 1,
    number: 100,
    displayName: "星河月華🌸修仙者星河月華🌸修仙者星河月華🌸修仙者",
  },
  visualSeedSha256: "d".repeat(64),
};

test("media capability requests fail closed across origins and malformed surfaces", () => {
  const capability = `sm1.${"a".repeat(64)}.${"b".repeat(64)}`;
  const accepted = new Request("https://mochirii.com/spinner/media/render", {
    method: "POST",
    headers: { [SPINNER_MEDIA_CAPABILITY_HEADER]: capability },
  });
  assert.equal(mediaCapabilityFromRequest(accepted), capability);

  for (const request of [
    new Request("https://mochirii.com/spinner/media/render?token=no", {
      method: "POST",
      headers: { [SPINNER_MEDIA_CAPABILITY_HEADER]: capability },
    }),
    new Request("https://mochirii.com/spinner/media/render", {
      method: "POST",
      headers: { origin: "https://outside.invalid", [SPINNER_MEDIA_CAPABILITY_HEADER]: capability },
    }),
    new Request("https://mochirii.com/spinner/media/render", {
      method: "POST",
      headers: { "content-type": "application/json", [SPINNER_MEDIA_CAPABILITY_HEADER]: capability },
      body: "{}",
    }),
    new Request("https://mochirii.com/spinner/media/render", {
      method: "POST",
      headers: { [SPINNER_MEDIA_CAPABILITY_HEADER]: "too-short" },
    }),
  ]) {
    assert.equal(mediaCapabilityFromRequest(request), null);
  }
});

test("replay wheel easing preserves endpoints and the stored winner landing", () => {
  assert.equal(spinnerEasing(-1), 0);
  assert.equal(spinnerEasing(0), 0);
  assert.equal(spinnerEasing(1), 1);
  assert.equal(spinnerEasing(2), 1);
  assert.equal(rotationAtTime(manifest, 0), manifest.startRotation);
  assert.equal(rotationAtTime(manifest, 4_800), manifest.finalRotation);
  assert.equal(rotationAtTime(manifest, TOTAL_REPLAY_DURATION_MS), manifest.finalRotation);
});

test("oversize primary encoding retries the compact profile before using the image", async () => {
  const profiles: string[] = [];
  const result = await encodeReplayWithFallback({
    manifest,
    deadlineAt: Date.now() + 5_000,
    encode: async ({ profile }) => {
      profiles.push(profile.name);
      return {
        bytes: Buffer.alloc(profile.name === "primary" ? SPINNER_MEDIA_MAX_MP4_BYTES + 1 : 1_024),
        profile,
        frames: profile.fps === 25 ? 265 : 212,
        durationMs: TOTAL_REPLAY_DURATION_MS,
        elapsedMs: 1,
        inspection: { codec: "avc1.64001F", durationMs: TOTAL_REPLAY_DURATION_MS, videoTracks: 1, audioTracks: 0 },
      };
    },
  });
  assert.equal(result.kind, "mp4");
  assert.deepEqual(profiles, ["primary", "fallback"]);
  if (result.kind === "mp4") assert.equal(result.encoded.profile.name, "fallback");
});

test("native renderer produces a deterministic bounded Unicode winner image", async () => {
  const renderer = await createReplayFrameRenderer(manifest);
  const first = renderer.renderPng();
  const second = renderer.renderPng();
  assert.deepEqual(first, second);
  assert.ok(first.byteLength > 100_000);
  assert.ok(first.byteLength <= 3_000_000);
  assert.deepEqual([...first.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test("encoder failure returns the already-rendered bounded winner image", async () => {
  const media = await renderReplayMedia(manifest, {
    encode: async () => ({ kind: "png", reason: "encoder", retried: false }),
  });
  assert.equal(media.contentType, "image/png");
  assert.equal(media.extension, "png");
  assert.ok(media.bytes.byteLength <= 3_000_000);
});

test("maximum-roster replay is exact-duration H.264 MP4 with no audio and a bounded payload", { timeout: 60_000 }, async () => {
  const result = await encodeReplayWithFallback({
    manifest: maxManifest,
    deadlineAt: Date.now() + 55_000,
  });
  assert.equal(result.kind, "mp4");
  if (result.kind !== "mp4") return;
  const encoded = result.encoded;
  assert.equal(encoded.frames, encoded.profile.fps === 25 ? 265 : 212);
  assert.equal(encoded.durationMs, TOTAL_REPLAY_DURATION_MS);
  assert.equal(encoded.inspection.durationMs, TOTAL_REPLAY_DURATION_MS);
  assert.match(encoded.inspection.codec, /^avc1\./u);
  assert.equal(encoded.inspection.videoTracks, 1);
  assert.equal(encoded.inspection.audioTracks, 0);
  assert.ok(await decodedMp4FrameCount(encoded.bytes) > 0);
  assert.ok(encoded.bytes.byteLength <= SPINNER_MEDIA_MAX_MP4_BYTES);
  assert.equal(encoded.bytes.includes(Buffer.from("Lavf")), false);
  assert.equal(encoded.bytes.includes(Buffer.from("x264 - core")), false);
});
