import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  enforceProductionGalleryMatrixGuard,
  isProductionWebsiteOrigin,
  LIVE_GALLERY_MEDIA_SMOKE_OPT_IN,
} from "./live-gallery-media-smoke-guard.mjs";

const siteOrigin = "https://mochirii.com";

test("recognizes only the canonical production Website origins", () => {
  assert.equal(isProductionWebsiteOrigin("https://mochirii.com/gallery", siteOrigin), true);
  assert.equal(isProductionWebsiteOrigin("https://www.mochirii.com/gallery", siteOrigin), true);
  assert.equal(isProductionWebsiteOrigin("http://127.0.0.1:8765/gallery", siteOrigin), false);
  assert.equal(isProductionWebsiteOrigin("http://localhost:8765/gallery", siteOrigin), false);
  assert.equal(isProductionWebsiteOrigin("https://reviewed-preview.vercel.app/gallery", siteOrigin), false);
});

test("blocks production matrices unless the exact process-scoped opt-in is present", () => {
  assert.throws(
    () => enforceProductionGalleryMatrixGuard({ baseUrl: siteOrigin, siteOrigin, environment: {} }),
    /Refusing a broad gallery\/browser matrix/,
  );
  assert.throws(
    () => enforceProductionGalleryMatrixGuard({
      baseUrl: siteOrigin,
      siteOrigin,
      environment: { [LIVE_GALLERY_MEDIA_SMOKE_OPT_IN]: "TRUE" },
    }),
    /Refusing a broad gallery\/browser matrix/,
  );
  assert.doesNotThrow(() => enforceProductionGalleryMatrixGuard({
    baseUrl: siteOrigin,
    siteOrigin,
    environment: { [LIVE_GALLERY_MEDIA_SMOKE_OPT_IN]: "true" },
  }));
});

test("allows fixture-based local and Preview matrices without an opt-in", () => {
  for (const baseUrl of [
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "https://reviewed-preview.vercel.app",
  ]) {
    assert.doesNotThrow(() => enforceProductionGalleryMatrixGuard({
      baseUrl,
      siteOrigin,
      environment: {},
    }));
  }
});

test("all broad gallery/browser entrypoints enforce the shared guard", async () => {
  const entrypoints = [
    new URL("../smoke-gallery-lightbox.mjs", import.meta.url),
    new URL("../smoke-gallery-approved-feed.mjs", import.meta.url),
    new URL("../check-browser-route-matrix.mjs", import.meta.url),
  ];

  for (const entrypoint of entrypoints) {
    const source = await readFile(entrypoint, "utf8");
    assert.match(source, /enforceProductionGalleryMatrixGuard\(\{ baseUrl, siteOrigin: SITE_ORIGIN \}\)/);
  }
});
