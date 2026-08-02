import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import {
  EVENT_SOCIAL_LAYOUTS,
  EVENT_SOCIAL_RENDERER_VERSION,
  EVENT_SOCIAL_SCHEMA_VERSION,
  getRepositoryRoot,
  loadEventSocialJson,
  removeSupersededEventSocialPlatformAssets,
  renderEventSocialAssets,
} from "./event-social-assets.mjs";

const root = getRepositoryRoot();
const require = createRequire(path.join(root, "apps", "web", "package.json"));
const sharp = require("sharp");
const manifest = loadEventSocialJson(path.join(root, "apps", "web", "public", "data", "event-social-content.json"));
const schedule = loadEventSocialJson(path.join(root, "apps", "web", "public", "data", "guild-schedule.json"));

test("renderer is deterministic, local-font-bound, static, and platform-native", async () => {
  const firstRoot = mkdtempSync(path.join(tmpdir(), "mochirii-event-social-first-"));
  const secondRoot = mkdtempSync(path.join(tmpdir(), "mochirii-event-social-second-"));
  try {
    const options = {
      manifest,
      schedule,
      eventIds: ["monthly-gathering"],
      confirmTextFreeMasters: true,
      allowPlatformSpecificTemporaryOutputs: true,
    };
    const first = await renderEventSocialAssets({ ...options, outputPublicRoot: firstRoot });
    const second = await renderEventSocialAssets({ ...options, outputPublicRoot: secondRoot });
    assert.equal(first.renderVersion, second.renderVersion);
    assert.equal(first.outputs.length, 3);
    assert.equal(first.schemaVersion, EVENT_SOCIAL_SCHEMA_VERSION);
    assert.equal(first.rendererVersion, EVENT_SOCIAL_RENDERER_VERSION);
    assert.equal(first.contentAddressedPlatformAssets, true);
    assert.equal(first.publicationEnabled, false);
    assert.equal(first.providerMutationPerformed, false);
    assert.equal(first.overlayContainsDateOrTime, false);

    for (const platform of ["facebook", "instagram", "discord"]) {
      const left = first.outputs.find((output) => output.platform === platform);
      const right = second.outputs.find((output) => output.platform === platform);
      assert.ok(left && right);
      assert.equal(left.sha256, right.sha256);
      assert.equal(
        left.assetPath,
        `./assets/img/event-social/monthly-gathering/${platform}.${left.sha256}.${platform === "discord" ? "png" : "jpg"}`,
      );
      assert.equal(left.relativeFile, left.assetPath.slice(2));
      const metadata = await sharp(path.join(firstRoot, left.relativeFile)).metadata();
      assert.equal(metadata.width, EVENT_SOCIAL_LAYOUTS[platform].width);
      assert.equal(metadata.height, EVENT_SOCIAL_LAYOUTS[platform].height);
      assert.equal(metadata.format, EVENT_SOCIAL_LAYOUTS[platform].format);
      assert.equal(metadata.space, "srgb");
      assert.equal(metadata.hasAlpha, false);
    }

    const serialized = readFileSync(first.sidecar, "utf8");
    assert.doesNotMatch(serialized, /\{\{EVENT_(?:DATE|TIME_RANGE)\}\}/u);
    assert.doesNotMatch(serialized, /https?:\/\/|www\.|#[\p{L}\p{N}_]/iu);
  } finally {
    rmSync(firstRoot, { recursive: true, force: true });
    rmSync(secondRoot, { recursive: true, force: true });
  }
});

test("canonical public writes and text-free review require explicit confirmation", async () => {
  const canonicalPublic = path.join(root, "apps", "web", "public");
  await assert.rejects(
    renderEventSocialAssets({ manifest, schedule, eventIds: ["monthly-gathering"], outputPublicRoot: canonicalPublic }),
    /confirmTextFreeMasters=true/u,
  );
  await assert.rejects(
    renderEventSocialAssets({ manifest, schedule, eventIds: ["monthly-gathering"], outputPublicRoot: canonicalPublic, confirmTextFreeMasters: true }),
    /confirmCanonicalPublicWrite=true/u,
  );
  await assert.rejects(
    renderEventSocialAssets({
      manifest,
      schedule,
      outputPublicRoot: canonicalPublic,
      confirmTextFreeMasters: true,
      confirmCanonicalPublicWrite: true,
      allowPlatformSpecificTemporaryOutputs: true,
    }),
    /cannot target the canonical public root/u,
  );
});

test("rendered bytes must match the manifest's full-SHA-256 output path", async () => {
  const outputRoot = mkdtempSync(path.join(tmpdir(), "mochirii-event-social-mismatch-"));
  const candidate = structuredClone(manifest);
  candidate.events[0].creative.platformAssets.facebook =
    "./assets/img/event-social/monthly-gathering/facebook.0000000000000000000000000000000000000000000000000000000000000000.jpg";
  try {
    await assert.rejects(
      renderEventSocialAssets({
        manifest: candidate,
        schedule,
        eventIds: ["monthly-gathering"],
        outputPublicRoot: outputRoot,
        confirmTextFreeMasters: true,
      }),
      /manifest path does not contain the full rendered SHA-256/u,
    );
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
});

test("renderer refuses to replace changed content-addressed output bytes", async () => {
  const outputRoot = mkdtempSync(
    path.join(tmpdir(), "mochirii-event-social-tamper-"),
  );
  const options = {
    manifest,
    schedule,
    eventIds: ["monthly-gathering"],
    outputPublicRoot: outputRoot,
    confirmTextFreeMasters: true,
    allowPlatformSpecificTemporaryOutputs: true,
  };
  try {
    const report = await renderEventSocialAssets(options);
    const facebook = report.outputs.find((output) =>
      output.platform === "facebook"
    );
    assert.ok(facebook);
    writeFileSync(path.join(outputRoot, facebook.relativeFile), "tampered");
    await assert.rejects(
      renderEventSocialAssets(options),
      /Refusing to overwrite changed output/u,
    );
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
});

test("superseded canonical asset cleanup requires explicit confirmation", () => {
  assert.throws(
    () => removeSupersededEventSocialPlatformAssets({}),
    /confirmSupersededAssetRemoval=true/u,
  );
});
