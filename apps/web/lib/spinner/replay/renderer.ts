import { resolve } from "node:path";
import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type Canvas,
  type Image,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import type { AnimationManifestV1 } from "../media-contract.ts";
import { createCelebrationScene, type CelebrationParticle } from "./celebration-scene.ts";

export const SPIN_DURATION_MS = 4_800;
export const CELEBRATION_DURATION_MS = 4_800;
export const WINNER_HOLD_DURATION_MS = 1_000;
export const TOTAL_REPLAY_DURATION_MS = 10_600;
export const CANONICAL_POSTER_TIME_MS = SPIN_DURATION_MS + 2_500;

const LOGICAL_WIDTH = 1_280;
const LOGICAL_HEIGHT = 720;
const WHEEL_PALETTE = ["#123f3a", "#6c354e", "#185f52", "#393555", "#824f35", "#254b67"] as const;
const BODY_FONT = '"Mochirii Serif", "Mochirii Emoji", serif';

type ReplayAssets = Readonly<{
  background: Image;
  banner: Image;
  raffle: Image;
  emblem: Image;
}>;

export type ReplayFrameRenderer = Readonly<{
  width: number;
  height: number;
  durationMs: number;
  renderRgba: (timeMs: number) => Buffer;
  renderPng: (timeMs?: number) => Buffer;
}>;

let assetsPromise: Promise<ReplayAssets> | null = null;

const ASSET_FILES = Object.freeze({
  serif: resolve(process.cwd(), "server-assets/spinner-fonts/NotoSerifSC-Variable.ttf"),
  emoji: resolve(process.cwd(), "server-assets/spinner-fonts/NotoColorEmoji-Regular.ttf"),
  background: resolve(process.cwd(), "public/assets/img/backgrounds/main.webp"),
  banner: resolve(process.cwd(), "public/assets/img/spinner/mochirii-banner.webp"),
  raffle: resolve(process.cwd(), "public/assets/img/raffles/hero.webp"),
  emblem: resolve(process.cwd(), "public/assets/img/brand/emblem.webp"),
});

async function loadReplayAssets(): Promise<ReplayAssets> {
  if (assetsPromise) return assetsPromise;
  assetsPromise = (async () => {
    const serif = GlobalFonts.registerFromPath(
      ASSET_FILES.serif,
      "Mochirii Serif",
    );
    const emoji = GlobalFonts.registerFromPath(
      ASSET_FILES.emoji,
      "Mochirii Emoji",
    );
    if (!serif || !emoji) throw new Error("Spinner media fonts are unavailable.");
    const [background, banner, raffle, emblem] = await Promise.all([
      loadImage(ASSET_FILES.background),
      loadImage(ASSET_FILES.banner),
      loadImage(ASSET_FILES.raffle),
      loadImage(ASSET_FILES.emblem),
    ]);
    return Object.freeze({ background, banner, raffle, emblem });
  })();
  return assetsPromise;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cubicCoordinate(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t;
}

/** Evaluates the same cubic-bezier(0.12, 0.72, 0.12, 1) reveal used by the page. */
export function spinnerEasing(value: number): number {
  const progress = clamp(value, 0, 1);
  if (progress === 0 || progress === 1) return progress;
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    if (cubicCoordinate(middle, 0.12, 0.12) < progress) low = middle;
    else high = middle;
  }
  return cubicCoordinate((low + high) / 2, 0.72, 1);
}

export function rotationAtTime(manifest: AnimationManifestV1, timeMs: number): number {
  const progress = clamp(timeMs / SPIN_DURATION_MS, 0, 1);
  return manifest.startRotation +
    (manifest.finalRotation - manifest.startRotation) * spinnerEasing(progress);
}

function roundedRect(
  context: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawImageCover(
  context: SKRSContext2D,
  image: Image,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(
    image,
    (image.width - sourceWidth) / 2,
    (image.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function drawBackground(context: SKRSContext2D, assets: ReplayAssets) {
  drawImageCover(context, assets.background, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  context.save();
  context.globalAlpha = 0.72;
  drawImageCover(context, assets.banner, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  context.restore();
  const veil = context.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  veil.addColorStop(0, "rgba(2, 12, 16, .62)");
  veil.addColorStop(0.53, "rgba(4, 20, 20, .36)");
  veil.addColorStop(1, "rgba(2, 8, 12, .79)");
  context.fillStyle = veil;
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  const vignette = context.createRadialGradient(600, 340, 160, 600, 340, 760);
  vignette.addColorStop(0.52, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.58)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

function drawWheel(
  context: SKRSContext2D,
  manifest: AnimationManifestV1,
  assets: ReplayAssets,
  rotationDegrees: number,
  revealed: boolean,
) {
  const centerX = 394;
  const centerY = 378;
  const radius = 286;
  const slice = Math.PI * 2 / manifest.participants.length;
  const startAt = -Math.PI / 2 - slice / 2;

  context.save();
  context.shadowColor = "rgba(200, 162, 75, .64)";
  context.shadowBlur = 30;
  context.fillStyle = "#071311";
  context.beginPath();
  context.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotationDegrees * Math.PI / 180);
  context.translate(-centerX, -centerY);
  manifest.participants.forEach((entry, index) => {
    const start = startAt + index * slice;
    const color = WHEEL_PALETTE[index % WHEEL_PALETTE.length];
    const gradient = context.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius);
    gradient.addColorStop(0, `${color}e8`);
    gradient.addColorStop(1, color);
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, radius, start, start + slice);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = revealed && index === manifest.selectedIndex
      ? "rgba(255, 232, 155, .98)"
      : "rgba(248, 220, 143, .34)";
    context.lineWidth = revealed && index === manifest.selectedIndex ? 3.2 : 1.1;
    context.stroke();

    const middle = start + slice / 2;
    const fontSize = Math.max(8, Math.min(21, (radius * 1.36 * slice) / 2.8));
    context.save();
    context.translate(centerX, centerY);
    context.rotate(middle);
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.font = `600 ${fontSize}px ${BODY_FONT}`;
    context.fillStyle = "#fff8df";
    context.shadowColor = "rgba(0,0,0,.92)";
    context.shadowBlur = 4;
    context.fillText(entry.label, radius * 0.89, 0, radius * 0.68);
    context.restore();
  });
  context.restore();

  context.strokeStyle = "#c8a24b";
  context.lineWidth = 10;
  context.beginPath();
  context.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(89, 201, 165, .92)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(centerX, centerY, radius - 9, 0, Math.PI * 2);
  context.stroke();

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, 54, 0, Math.PI * 2);
  context.clip();
  drawImageCover(context, assets.emblem, centerX - 54, centerY - 54, 108, 108);
  context.restore();
  context.strokeStyle = "#d4aa4f";
  context.lineWidth = 5;
  context.shadowColor = "rgba(240, 202, 109, .75)";
  context.shadowBlur = 16;
  context.beginPath();
  context.arc(centerX, centerY, 56, 0, Math.PI * 2);
  context.stroke();
  context.shadowBlur = 0;

  const pointer = context.createLinearGradient(centerX - 24, 67, centerX + 24, 120);
  pointer.addColorStop(0, "#f9df93");
  pointer.addColorStop(0.48, "#d3a441");
  pointer.addColorStop(1, "#4fc5a2");
  context.fillStyle = pointer;
  context.shadowColor = "rgba(245, 207, 111, .88)";
  context.shadowBlur = 15;
  context.beginPath();
  context.moveTo(centerX, 112);
  context.lineTo(centerX - 27, 68);
  context.lineTo(centerX + 27, 68);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "#fff1bd";
  context.lineWidth = 2;
  context.stroke();
}

function starPath(context: SKRSContext2D, outer: number, inner: number) {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function drawParticle(context: SKRSContext2D, particle: CelebrationParticle, elapsedSeconds: number) {
  const age = elapsedSeconds - particle.delay;
  if (age < 0 || age > particle.life) return;
  const progress = age / particle.life;
  const x = particle.x + particle.vx * age + Math.sin(age * 2.8 + particle.phase) * 8;
  const y = particle.y + particle.vy * age + particle.gravity * age * age * 0.5;
  context.save();
  context.globalAlpha = Math.sin(Math.PI * progress) * particle.alpha;
  context.translate(x, y);
  context.rotate(particle.rotation + particle.spin * age);
  context.fillStyle = particle.color;
  context.strokeStyle = particle.color;
  context.shadowColor = particle.accent;

  if (particle.kind === "paint-splash") {
    const radius = particle.size * (0.55 + progress * 0.45);
    context.shadowBlur = 10;
    context.beginPath();
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      const wobble = 0.68 + 0.28 * Math.sin(index * 2.17 + particle.phase);
      const px = Math.cos(angle) * radius * wobble;
      const py = Math.sin(angle) * radius * wobble;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  } else if (particle.kind === "neon-stream" || particle.kind === "streak") {
    const gradient = context.createLinearGradient(0, 0, particle.length, 0);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.28, particle.color);
    gradient.addColorStop(0.72, particle.accent);
    gradient.addColorStop(1, "transparent");
    context.strokeStyle = gradient;
    context.lineWidth = particle.size;
    context.lineCap = "round";
    context.shadowBlur = particle.kind === "neon-stream" ? 16 : 6;
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(
      particle.length * 0.28,
      Math.sin(particle.phase + age * 2) * 18,
      particle.length * 0.68,
      Math.cos(particle.phase + age * 1.7) * 15,
      particle.length,
      0,
    );
    context.stroke();
  } else if (particle.kind === "ribbon") {
    context.lineWidth = particle.size;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-particle.length * 0.25, 0);
    context.bezierCurveTo(-particle.length * 0.1, -12, particle.length * 0.1, 12, particle.length * 0.25, 0);
    context.stroke();
  } else if (particle.kind === "petal") {
    context.beginPath();
    context.moveTo(0, -particle.size);
    context.bezierCurveTo(particle.size * 0.8, -particle.size * 0.35, particle.size * 0.68, particle.size * 0.72, 0, particle.size);
    context.bezierCurveTo(-particle.size * 0.68, particle.size * 0.72, -particle.size * 0.8, -particle.size * 0.35, 0, -particle.size);
    context.fill();
  } else if (particle.kind === "bubble") {
    context.fillStyle = "rgba(255,255,255,.08)";
    context.lineWidth = 1.4;
    context.beginPath();
    context.arc(0, 0, particle.size, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else if (particle.kind === "droplet") {
    context.beginPath();
    context.moveTo(0, -particle.size * 1.25);
    context.bezierCurveTo(particle.size, -particle.size * 0.15, particle.size * 0.75, particle.size, 0, particle.size);
    context.bezierCurveTo(-particle.size * 0.75, particle.size, -particle.size, -particle.size * 0.15, 0, -particle.size * 1.25);
    context.fill();
  } else if (particle.kind === "firework") {
    const radius = particle.size * (0.18 + progress * 0.92);
    context.shadowBlur = 10;
    context.lineWidth = Math.max(1, 2.4 * (1 - progress));
    for (let ray = 0; ray < Math.round(particle.length); ray += 1) {
      const angle = ray / particle.length * Math.PI * 2 + particle.phase;
      context.beginPath();
      context.moveTo(Math.cos(angle) * radius * 0.34, Math.sin(angle) * radius * 0.34);
      context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      context.stroke();
    }
  } else if (particle.kind === "star") {
    context.shadowBlur = 10;
    starPath(context, particle.size, particle.size * 0.42);
    context.fill();
  } else if (particle.kind === "spark") {
    context.shadowBlur = 8;
    context.lineWidth = particle.size;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-particle.vx * 0.035, -particle.vy * 0.035);
    context.stroke();
  } else if (particle.kind === "bloom") {
    const radius = particle.size * (0.24 + progress * 0.9);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(0.22, `${particle.color}88`);
    gradient.addColorStop(0.58, `${particle.accent}38`);
    gradient.addColorStop(1, "transparent");
    context.globalAlpha = (1 - progress) * particle.alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawTitle(context: SKRSContext2D, revealed: boolean) {
  context.textAlign = "left";
  context.fillStyle = "#f4d889";
  context.font = `700 34px ${BODY_FONT}`;
  context.fillText("Mōchirīī", 758, 88);
  context.fillStyle = "#cceee5";
  context.font = `600 18px ${BODY_FONT}`;
  context.fillText(revealed ? "The winning name has been revealed" : "The shared draw is underway", 760, 124);
  context.strokeStyle = "rgba(216, 174, 76, .55)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(760, 147);
  context.lineTo(1178, 147);
  context.stroke();
}

function drawWinnerCard(context: SKRSContext2D, manifest: AnimationManifestV1, assets: ReplayAssets) {
  const x = 760;
  const y = 184;
  const width = 440;
  const height = 370;
  context.save();
  roundedRect(context, x, y, width, height, 28);
  context.clip();
  context.globalAlpha = 0.28;
  drawImageCover(context, assets.raffle, x, y, width, height);
  context.globalAlpha = 1;
  const glass = context.createLinearGradient(x, y, x + width, y + height);
  glass.addColorStop(0, "rgba(8,31,31,.82)");
  glass.addColorStop(1, "rgba(7,16,27,.94)");
  context.fillStyle = glass;
  context.fillRect(x, y, width, height);
  context.restore();
  roundedRect(context, x, y, width, height, 28);
  context.strokeStyle = "rgba(221,181,83,.86)";
  context.lineWidth = 2;
  context.shadowColor = "rgba(101,225,187,.3)";
  context.shadowBlur = 24;
  context.stroke();
  context.shadowBlur = 0;

  context.fillStyle = "#78dfbd";
  context.font = `600 17px ${BODY_FONT}`;
  context.textAlign = "center";
  context.fillText("MŌCHIRĪĪ RAFFLE", x + width / 2, y + 62);
  context.fillStyle = "#f5d98f";
  context.font = `700 56px ${BODY_FONT}`;
  context.fillText("Winner", x + width / 2, y + 138);
  const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(manifest.winner.displayName));
  const nameSize = graphemes.length > 30 ? 24 : graphemes.length > 20 ? 28 : graphemes.length > 12 ? 34 : 42;
  context.fillStyle = "#fff8df";
  context.font = `700 ${nameSize}px ${BODY_FONT}`;
  context.shadowColor = "rgba(230,181,75,.65)";
  context.shadowBlur = 10;
  context.fillText(manifest.winner.displayName, x + width / 2, y + 225, width - 48);
  context.shadowBlur = 0;
  context.fillStyle = "#9ee9d2";
  context.font = `600 19px ${BODY_FONT}`;
  context.fillText(`Entry ${manifest.winner.number} of ${manifest.participants.length}`, x + width / 2, y + 281);
  context.fillStyle = "rgba(255,244,210,.72)";
  context.font = `500 15px ${BODY_FONT}`;
  context.fillText("Equal chance · selection complete", x + width / 2, y + 326);
}

function renderFrame(
  canvas: Canvas,
  manifest: AnimationManifestV1,
  assets: ReplayAssets,
  scene: ReturnType<typeof createCelebrationScene>,
  timeMsValue: number,
) {
  const timeMs = clamp(timeMsValue, 0, TOTAL_REPLAY_DURATION_MS);
  const context = canvas.getContext("2d");
  context.reset();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(canvas.width / LOGICAL_WIDTH, 0, 0, canvas.height / LOGICAL_HEIGHT, 0, 0);
  drawBackground(context, assets);
  const revealed = timeMs >= SPIN_DURATION_MS;
  drawWheel(context, manifest, assets, rotationAtTime(manifest, timeMs), revealed);
  drawTitle(context, revealed);
  if (revealed) {
    const celebrationElapsed = Math.min(timeMs - SPIN_DURATION_MS, CELEBRATION_DURATION_MS) / 1_000;
    if (celebrationElapsed < CELEBRATION_DURATION_MS / 1_000) {
      for (const particle of scene.particles) drawParticle(context, particle, celebrationElapsed);
    }
    drawWinnerCard(context, manifest, assets);
  }
}

export async function createReplayFrameRenderer(
  manifest: AnimationManifestV1,
  width = 1_280,
  height = 720,
): Promise<ReplayFrameRenderer> {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 320 || height < 180) {
    throw new RangeError("Replay dimensions are invalid.");
  }
  if (Math.abs(width / height - 16 / 9) > 1e-9) throw new RangeError("Replay output must be 16:9.");
  const assets = await loadReplayAssets();
  const canvas = createCanvas(width, height);
  const scene = createCelebrationScene(manifest.visualSeedSha256, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  return Object.freeze({
    width,
    height,
    durationMs: TOTAL_REPLAY_DURATION_MS,
    renderRgba(timeMs: number) {
      renderFrame(canvas, manifest, assets, scene, timeMs);
      return canvas.data();
    },
    renderPng(timeMs = CANONICAL_POSTER_TIME_MS) {
      renderFrame(canvas, manifest, assets, scene, timeMs);
      return canvas.encodeSync("png");
    },
  });
}

export async function renderCanonicalWinningPng(manifest: AnimationManifestV1): Promise<Buffer> {
  return (await createReplayFrameRenderer(manifest)).renderPng();
}
