import assert from "node:assert/strict";
import test from "node:test";

import {
  beginAuthLoadGeneration,
  invalidateAuthLoadGeneration,
  isCurrentAuthLoadGeneration,
} from "./auth-load-generation.ts";

test("stale authentication completions cannot replace a newer account load", async () => {
  const state = { current: 0 };
  let releaseFirstLoad!: () => void;
  const firstLoadBlocked = new Promise<void>((resolve) => {
    releaseFirstLoad = resolve;
  });

  const firstGeneration = beginAuthLoadGeneration(state);
  const firstCompletion = firstLoadBlocked.then(() => (
    isCurrentAuthLoadGeneration(state, firstGeneration) ? "review" : "stale"
  ));

  const secondGeneration = beginAuthLoadGeneration(state);
  assert.equal(isCurrentAuthLoadGeneration(state, firstGeneration), false);
  assert.equal(isCurrentAuthLoadGeneration(state, secondGeneration), true);

  releaseFirstLoad();
  assert.equal(await firstCompletion, "stale");

  invalidateAuthLoadGeneration(state);
  assert.equal(isCurrentAuthLoadGeneration(state, secondGeneration), false);
});
