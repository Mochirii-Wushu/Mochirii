import assert from "node:assert/strict";
import test from "node:test";

import {
  createSpinnerCommandId,
  isTerminalSpinnerSpinFailure,
  parsePendingSpinnerCommand,
  parseSpinnerLiveResult,
  parseSpinnerLiveSnapshot,
  SpinnerLiveRequestError,
  spinnerLiveMotionRotations,
  spinnerSkipStateForDraw,
  spinnerLiveTimeline,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/components/spinner/live.ts";
import {
  createDrawReceipt,
  type ParticipantV1,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/components/spinner/raffle.ts";
import {
  CELEBRATION_LIMITS,
  celebrationCanvasMetrics,
  celebrationElapsedMs,
  celebrationProfileForViewport,
  createCelebrationScene,
  resolveCelebrationMotionMode,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/components/spinner/celebration-scene.ts";

const SESSION_ID = "10000000-0000-4000-8000-000000000001";
const DRAW_ID = "20000000-0000-4000-8000-000000000002";
const OTHER_DRAW_ID = "30000000-0000-4000-8000-000000000003";
const UPDATED_AT = "2026-07-26T18:00:00.000Z";
const STARTED_AT = "2026-07-26T18:00:02.000Z";
const REVEAL_AT = "2026-07-26T18:00:10.000Z";
const SERVER_NOW = "2026-07-26T18:00:04.000Z";

const PARTICIPANTS: ParticipantV1[] = [
  { version: 1, id: "40000000-0000-4000-8000-000000000004", displayName: "Lotus" },
  { version: 1, id: "50000000-0000-4000-8000-000000000005", displayName: "明月" },
];

function idleSnapshot(participants: ParticipantV1[] = []) {
  return {
    version: 1,
    sessionId: SESSION_ID,
    revision: 0,
    phase: "idle",
    participants,
    startedAt: null,
    revealAt: null,
    durationMs: 0,
    startRotation: 0,
    finalRotation: 0,
    selectedIndex: null,
    winner: null,
    drawId: null,
    updatedAt: UPDATED_AT,
  };
}

function spinningSnapshot() {
  return {
    ...idleSnapshot(PARTICIPANTS),
    revision: 3,
    phase: "spinning",
    startedAt: STARTED_AT,
    revealAt: REVEAL_AT,
    durationMs: 8_000,
    startRotation: 45,
    finalRotation: 2_205,
    drawId: DRAW_ID,
  };
}

function revealedSnapshot() {
  return {
    ...spinningSnapshot(),
    revision: 4,
    phase: "revealed",
    selectedIndex: 1,
    winner: PARTICIPANTS[1],
  };
}

function resultEnvelope(snapshot: ReturnType<typeof revealedSnapshot>, receipt: unknown = null) {
  return {
    ok: true,
    data: {
      mode: "controller",
      snapshot,
      serverNow: SERVER_NOW,
      receipt,
    },
  };
}

test("idle snapshots accept genuine empty and one-participant rosters", () => {
  const empty = parseSpinnerLiveSnapshot(idleSnapshot());
  assert.ok(empty);
  assert.equal(empty.phase, "idle");
  assert.deepEqual(empty.participants, []);

  const oneParticipantRoster = [PARTICIPANTS[0]];
  const one = parseSpinnerLiveSnapshot(idleSnapshot(oneParticipantRoster));
  assert.ok(one);
  assert.deepEqual(one.participants, [PARTICIPANTS[0]]);
  assert.notEqual(one.participants, oneParticipantRoster);
});

test("spinning snapshots withhold the selected index and winner", () => {
  const spinning = parseSpinnerLiveSnapshot(spinningSnapshot());
  assert.ok(spinning);
  assert.equal(spinning.phase, "spinning");
  assert.equal(spinning.selectedIndex, null);
  assert.equal(spinning.winner, null);

  assert.equal(parseSpinnerLiveSnapshot({ ...spinningSnapshot(), selectedIndex: 1 }), null);
  assert.equal(parseSpinnerLiveSnapshot({ ...spinningSnapshot(), winner: PARTICIPANTS[1] }), null);
});

test("revealed snapshots require the winner to map to the selected roster position", () => {
  const revealed = parseSpinnerLiveSnapshot(revealedSnapshot());
  assert.ok(revealed);
  assert.equal(revealed.selectedIndex, 1);
  assert.deepEqual(revealed.winner, PARTICIPANTS[1]);

  assert.equal(parseSpinnerLiveSnapshot({ ...revealedSnapshot(), selectedIndex: 0 }), null);
  assert.equal(parseSpinnerLiveSnapshot({ ...revealedSnapshot(), winner: PARTICIPANTS[0] }), null);
  assert.equal(parseSpinnerLiveSnapshot({ ...revealedSnapshot(), selectedIndex: 2 }), null);
});

test("malformed and corrupt snapshots are rejected instead of becoming empty state", () => {
  const corruptParticipant = { version: 1, id: "not-a-uuid", displayName: "Lotus" };
  const duplicateRoster = [PARTICIPANTS[0], { ...PARTICIPANTS[0] }];
  const cases: unknown[] = [
    null,
    { ...idleSnapshot(), version: 2 },
    { ...idleSnapshot(), participants: "not-a-roster" },
    { ...idleSnapshot(), participants: [corruptParticipant] },
    { ...idleSnapshot(), participants: duplicateRoster },
    { ...idleSnapshot(), updatedAt: "not-a-date" },
    { ...idleSnapshot(), revision: -1 },
    { ...idleSnapshot(), sessionId: "not-a-uuid" },
    { ...idleSnapshot(), durationMs: 1 },
    { ...idleSnapshot(), startRotation: Number.NaN },
    { ...spinningSnapshot(), revealAt: "2026-07-26T18:00:01.000Z" },
    { ...spinningSnapshot(), durationMs: 7_999 },
  ];

  for (const value of cases) assert.equal(parseSpinnerLiveSnapshot(value), null);
});

test("live results require a valid server clock and receipt draw-ID consistency", async () => {
  const receipt = await createDrawReceipt(
    { version: 1, participants: PARTICIPANTS },
    () => 1,
    () => DRAW_ID,
    new Date(UPDATED_AT),
  );
  const parsed = parseSpinnerLiveResult(resultEnvelope(revealedSnapshot(), receipt));
  assert.ok(parsed);
  assert.equal(parsed.snapshot.drawId, receipt.drawId);
  assert.equal(parsed.receipt?.drawId, receipt.drawId);
  assert.equal(parsed.commandId, null);
  assert.equal(parsed.serverNow, SERVER_NOW);

  assert.equal(
    parseSpinnerLiveResult(resultEnvelope(revealedSnapshot(), { ...receipt, drawId: OTHER_DRAW_ID })),
    null,
  );
  assert.equal(
    parseSpinnerLiveResult({
      ...resultEnvelope(revealedSnapshot(), receipt),
      data: { ...resultEnvelope(revealedSnapshot(), receipt).data, serverNow: "not-a-date" },
    }),
    null,
  );
});

test("live timelines preserve a future start and respect every motion mode", () => {
  const snapshot = parseSpinnerLiveSnapshot(spinningSnapshot());
  assert.ok(snapshot);
  assert.deepEqual(spinnerLiveTimeline(snapshot, "2026-07-26T18:00:00.000Z", "full"), {
    startDelayMs: 2_000,
    revealDelayMs: 10_000,
    motionDurationMs: 8_000,
    motionDelayMs: 2_000,
  });
  assert.deepEqual(spinnerLiveTimeline(snapshot, "2026-07-26T18:00:00.000Z", "reduced"), {
    startDelayMs: 8_350,
    revealDelayMs: 10_000,
    motionDurationMs: 1_650,
    motionDelayMs: 8_350,
  });
  assert.deepEqual(spinnerLiveTimeline(snapshot, "2026-07-26T18:00:00.000Z", "off"), {
    startDelayMs: 10_000,
    revealDelayMs: 10_000,
    motionDurationMs: 0,
    motionDelayMs: 10_000,
  });
});

test("live timelines use the server clock for late joins and clock skew", () => {
  const snapshot = parseSpinnerLiveSnapshot(spinningSnapshot());
  assert.ok(snapshot);
  assert.deepEqual(spinnerLiveTimeline(snapshot, "2026-07-26T18:00:06.000Z", "full"), {
    startDelayMs: 0,
    revealDelayMs: 4_000,
    motionDurationMs: 8_000,
    motionDelayMs: -4_000,
  });
  assert.deepEqual(spinnerLiveTimeline(snapshot, "2026-07-26T18:00:12.000Z", "full"), {
    startDelayMs: 0,
    revealDelayMs: 0,
    motionDurationMs: 0,
    motionDelayMs: 0,
  });
  assert.deepEqual(spinnerLiveTimeline(snapshot, "2026-07-26T18:00:09.000Z", "reduced"), {
    startDelayMs: 0,
    revealDelayMs: 1_000,
    motionDurationMs: 1_650,
    motionDelayMs: -650,
  });
  assert.deepEqual(spinnerLiveTimeline(snapshot, "2026-07-26T18:00:06.000Z", "off"), {
    startDelayMs: 4_000,
    revealDelayMs: 4_000,
    motionDurationMs: 0,
    motionDelayMs: 4_000,
  });
});

test("reduced motion removes full turns while preserving the exact landing angle", () => {
  const snapshot = parseSpinnerLiveSnapshot({
    ...spinningSnapshot(),
    startRotation: 45,
    finalRotation: 2_250,
  });
  assert.ok(snapshot);
  assert.deepEqual(spinnerLiveMotionRotations(snapshot, "full"), {
    startRotation: 45,
    finalRotation: 2_250,
  });
  assert.deepEqual(spinnerLiveMotionRotations(snapshot, "reduced"), {
    startRotation: 45,
    finalRotation: 90,
  });
  assert.equal(2_250 % 360, 90 % 360);
  assert.deepEqual(spinnerLiveMotionRotations(snapshot, "off"), {
    startRotation: 45,
    finalRotation: 45,
  });
});

test("secure command identifiers use canonical random UUID v4 shape", () => {
  const ids = new Set(Array.from({ length: 32 }, () => createSpinnerCommandId()));
  assert.equal(ids.size, 32);
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }
});

test("pending spin commands recover only valid stable identifiers", () => {
  const command = {
    version: 1,
    commandId: DRAW_ID,
    expectedRevision: 7,
    createdAt: SERVER_NOW,
  };
  assert.deepEqual(parsePendingSpinnerCommand(command), command);
  assert.equal(parsePendingSpinnerCommand({ ...command, commandId: "invalid" }), null);
  assert.equal(parsePendingSpinnerCommand({ ...command, expectedRevision: -1 }), null);
  assert.equal(parsePendingSpinnerCommand({ ...command, createdAt: "invalid" }), null);
});

test("only an authoritative terminal spin failure permits a fresh command identifier", () => {
  const terminal = new SpinnerLiveRequestError(
    "That draw attempt was not retained.",
    409,
    "spin_result_not_durable",
  );
  const conflict = new SpinnerLiveRequestError("The live roster changed.", 409, "revision_conflict");

  assert.equal(isTerminalSpinnerSpinFailure(terminal), true);
  assert.equal(isTerminalSpinnerSpinFailure(conflict), false);
  assert.equal(isTerminalSpinnerSpinFailure(new Error("Network unavailable.")), false);
});

test("Skip remains attached to one draw across refresh and never leaks to the next draw", () => {
  assert.deepEqual(spinnerSkipStateForDraw({
    skipRequested: true,
    skippedDrawId: null,
    skippedCommandId: DRAW_ID,
    resultCommandId: DRAW_ID,
    drawId: DRAW_ID,
  }), { skipRequested: true, skippedDrawId: DRAW_ID, skippedCommandId: null });
  assert.deepEqual(spinnerSkipStateForDraw({
    skipRequested: true,
    skippedDrawId: DRAW_ID,
    skippedCommandId: null,
    resultCommandId: null,
    drawId: DRAW_ID,
  }), { skipRequested: true, skippedDrawId: DRAW_ID, skippedCommandId: null });
  assert.deepEqual(spinnerSkipStateForDraw({
    skipRequested: true,
    skippedDrawId: null,
    skippedCommandId: DRAW_ID,
    resultCommandId: DRAW_ID,
    drawId: OTHER_DRAW_ID,
  }), { skipRequested: true, skippedDrawId: OTHER_DRAW_ID, skippedCommandId: null });
  assert.deepEqual(spinnerSkipStateForDraw({
    skipRequested: true,
    skippedDrawId: DRAW_ID,
    skippedCommandId: null,
    resultCommandId: OTHER_DRAW_ID,
    drawId: OTHER_DRAW_ID,
  }), { skipRequested: false, skippedDrawId: null, skippedCommandId: null });
});

test("celebration scenes deterministically include every approved effect within exact budgets", () => {
  const expectedKinds = new Set([
    "paint-splash",
    "neon-stream",
    "ribbon",
    "petal",
    "bubble",
    "droplet",
    "streak",
    "firework",
    "star",
    "spark",
    "bloom",
  ]);
  const standard = createCelebrationScene({
    drawId: DRAW_ID,
    mode: "full",
    width: 1_280,
    height: 720,
  });
  const repeated = createCelebrationScene({
    drawId: DRAW_ID,
    mode: "full",
    width: 1_280,
    height: 720,
  });
  assert.ok(standard);
  assert.deepEqual(repeated, standard);
  assert.equal(standard.profile, "standard");
  assert.equal(standard.durationMs, 4_800);
  assert.equal(standard.particles.length, CELEBRATION_LIMITS.standard.maxParticles);
  assert.deepEqual(new Set(standard.particles.map((particle) => particle.kind)), expectedKinds);

  const differentDraw = createCelebrationScene({
    drawId: OTHER_DRAW_ID,
    mode: "full",
    width: 1_280,
    height: 720,
  });
  assert.ok(differentDraw);
  assert.notDeepEqual(differentDraw.particles, standard.particles);
});

test("celebration profiles enforce standard, compact, Reduced, and Off limits", () => {
  assert.equal(celebrationProfileForViewport("full", 1_280, 720), "standard");
  assert.equal(celebrationProfileForViewport("full", 759, 720), "compact");
  assert.equal(celebrationProfileForViewport("full", 1_280, 639), "compact");
  assert.equal(celebrationProfileForViewport("reduced", 1_280, 720), "reduced");
  assert.equal(celebrationProfileForViewport("off", 1_280, 720), null);

  const compact = createCelebrationScene({
    drawId: DRAW_ID,
    mode: "full",
    width: 720,
    height: 720,
  });
  const reduced = createCelebrationScene({
    drawId: DRAW_ID,
    mode: "reduced",
    width: 1_280,
    height: 720,
  });
  assert.ok(compact);
  assert.ok(reduced);
  assert.equal(compact.durationMs, 4_800);
  assert.equal(compact.particles.length, 96);
  assert.equal(compact.maxBackingPixels, 4_200_000);
  assert.equal(reduced.durationMs, 2_400);
  assert.equal(reduced.particles.length, 32);
  assert.equal(reduced.maxBackingPixels, 3_000_000);
  assert.equal(createCelebrationScene({
    drawId: DRAW_ID,
    mode: "off",
    width: 1_280,
    height: 720,
  }), null);
});

test("celebration canvas sizing caps pixel ratio and backing allocation", () => {
  const standard = celebrationCanvasMetrics(3_840, 2_160, 4, "standard");
  const compact = celebrationCanvasMetrics(1_920, 1_080, 3, "compact");
  const reduced = celebrationCanvasMetrics(2_560, 1_600, 3, "reduced");

  assert.ok(standard.dpr <= 2);
  assert.ok(standard.backingPixels <= 8_300_000);
  assert.ok(compact.backingPixels <= 4_200_000);
  assert.ok(reduced.backingPixels <= 3_000_000);
  assert.equal(celebrationCanvasMetrics(640, 480, 1, "standard").dpr, 1);
});

test("celebration motion and authoritative reveal timing fail toward less motion", () => {
  assert.equal(resolveCelebrationMotionMode("full", false), "full");
  assert.equal(resolveCelebrationMotionMode("full", true), "reduced");
  assert.equal(resolveCelebrationMotionMode("reduced", false), "reduced");
  assert.equal(resolveCelebrationMotionMode("off", false), "off");
  assert.equal(resolveCelebrationMotionMode("off", true), "off");

  assert.equal(celebrationElapsedMs(1_000, 2_250, 4_800), 1_250);
  assert.equal(celebrationElapsedMs(2_000, 1_000, 4_800), 0);
  assert.equal(celebrationElapsedMs(1_000, 9_000, 4_800), 4_800);
  assert.equal(celebrationElapsedMs(Number.NaN, 9_000, 4_800), 0);
});

test("celebration particle origins preserve the winner region", () => {
  const protectedRegion = { x: 360, y: 220, width: 560, height: 180 };
  const scene = createCelebrationScene({
    drawId: DRAW_ID,
    mode: "full",
    width: 1_280,
    height: 720,
    protectedRegion,
  });
  assert.ok(scene);
  assert.deepEqual(scene.protectedRegion, protectedRegion);
  for (const particle of scene.particles) {
    const inside = particle.x >= protectedRegion.x
      && particle.x <= protectedRegion.x + protectedRegion.width
      && particle.y >= protectedRegion.y
      && particle.y <= protectedRegion.y + protectedRegion.height;
    assert.equal(inside, false, `${particle.kind} originated inside the protected winner region`);
  }
});
