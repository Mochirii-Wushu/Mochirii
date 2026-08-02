import assert from "node:assert/strict";
import test from "node:test";
import { expectedStaticThumbnailDimensions } from "./gallery-static-thumbnail-contract.mjs";

test("static Gallery dimensions preserve exact and normally rounded aspect ratios", () => {
  assert.deepEqual(expectedStaticThumbnailDimensions(640, 400), { width: 640, height: 400 });
  assert.deepEqual(expectedStaticThumbnailDimensions(1920, 1080), { width: 640, height: 360 });
  assert.deepEqual(expectedStaticThumbnailDimensions(1001, 777), { width: 640, height: 497 });
  assert.deepEqual(expectedStaticThumbnailDimensions(480, 720), { width: 427, height: 640 });
});

test("static Gallery dimensions prevent drift, crop, rotation, and tiny substitutes", () => {
  const expected = expectedStaticThumbnailDimensions(1920, 1080);
  for (const rejected of [
    { width: 639, height: 360 },
    { width: 640, height: 480 },
    { width: 360, height: 640 },
    { width: 1, height: 1 },
  ]) {
    assert.notDeepEqual(rejected, expected);
  }
});

test("static Gallery dimensions fail closed for invalid geometry", () => {
  for (const values of [[0, 1080], [1920, -1], [1.5, 1], [1, 1, 0]]) {
    assert.throws(() => expectedStaticThumbnailDimensions(...values));
  }
});
