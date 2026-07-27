export type CelebrationMotionMode = "full" | "reduced" | "off";

export type CelebrationProfile = "standard" | "compact" | "reduced";

export type CelebrationParticleKind =
  | "paint-splash"
  | "neon-stream"
  | "ribbon"
  | "petal"
  | "bubble"
  | "droplet"
  | "streak"
  | "firework"
  | "star"
  | "spark"
  | "bloom";

export type CelebrationBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CelebrationParticle = {
  kind: CelebrationParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  length: number;
  delay: number;
  life: number;
  color: string;
  accent: string;
  rotation: number;
  spin: number;
  gravity: number;
  phase: number;
  alpha: number;
};

export type CelebrationScene = {
  drawId: string;
  profile: CelebrationProfile;
  durationMs: number;
  maxBackingPixels: number;
  protectedRegion: CelebrationBounds | null;
  particles: CelebrationParticle[];
};

export const CELEBRATION_LIMITS = {
  standard: {
    durationMs: 4_800,
    maxParticles: 156,
    maxBackingPixels: 8_300_000,
  },
  compact: {
    durationMs: 4_800,
    maxParticles: 96,
    maxBackingPixels: 4_200_000,
  },
  reduced: {
    durationMs: 2_400,
    maxParticles: 32,
    maxBackingPixels: 3_000_000,
  },
} as const;

const EFFECT_COUNTS: Record<
  CelebrationProfile,
  Readonly<Record<CelebrationParticleKind, number>>
> = {
  standard: {
    "paint-splash": 8,
    "neon-stream": 8,
    ribbon: 16,
    petal: 18,
    bubble: 14,
    droplet: 14,
    streak: 10,
    firework: 6,
    star: 20,
    spark: 32,
    bloom: 10,
  },
  compact: {
    "paint-splash": 6,
    "neon-stream": 6,
    ribbon: 10,
    petal: 12,
    bubble: 8,
    droplet: 8,
    streak: 6,
    firework: 4,
    star: 10,
    spark: 20,
    bloom: 6,
  },
  reduced: {
    "paint-splash": 2,
    "neon-stream": 2,
    ribbon: 3,
    petal: 4,
    bubble: 3,
    droplet: 3,
    streak: 2,
    firework: 2,
    star: 3,
    spark: 6,
    bloom: 2,
  },
};

const PALETTE = [
  "#ffe6a3",
  "#d4aa4f",
  "#63e4ba",
  "#24a884",
  "#ff9fc6",
  "#e884bb",
  "#73d9ff",
  "#e7f5ff",
  "#c69cff",
  "#ff806e",
  "#7cfff0",
  "#ffcf70",
] as const;

const PETAL_PALETTE = ["#ffd3e2", "#ef9fbd", "#f8edf2", "#e884bb"] as const;
const UINT32_RANGE = 4_294_967_296;
const COMPACT_MIN_WIDTH = 760;
const COMPACT_MIN_HEIGHT = 640;

class PresentationRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 0x6d2b79f5;
  }

  unit() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / UINT32_RANGE;
  }

  between(min: number, max: number) {
    return min + (max - min) * this.unit();
  }

  pick<T>(items: readonly T[]) {
    return items[Math.floor(this.unit() * items.length)] ?? items[0];
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteDimension(value: number) {
  return Number.isFinite(value) ? Math.max(1, value) : 1;
}

function presentationSeed(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function normalizedBounds(
  value: CelebrationBounds | null | undefined,
  width: number,
  height: number,
): CelebrationBounds | null {
  if (!value) return null;
  const left = clamp(Number(value.x) || 0, 0, width);
  const top = clamp(Number(value.y) || 0, 0, height);
  const right = clamp(left + Math.max(0, Number(value.width) || 0), left, width);
  const bottom = clamp(top + Math.max(0, Number(value.height) || 0), top, height);
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function pointInside(bounds: CelebrationBounds | null, x: number, y: number, padding: number) {
  if (!bounds) return false;
  return x >= bounds.x - padding && x <= bounds.x + bounds.width + padding &&
    y >= bounds.y - padding && y <= bounds.y + bounds.height + padding;
}

function pointOutsideProtected(
  random: PresentationRandom,
  width: number,
  height: number,
  protectedRegion: CelebrationBounds | null,
  xRange: readonly [number, number] = [0.04, 0.96],
  yRange: readonly [number, number] = [0.04, 0.96],
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const x = random.between(width * xRange[0], width * xRange[1]);
    const y = random.between(height * yRange[0], height * yRange[1]);
    if (!pointInside(protectedRegion, x, y, 28)) return { x, y };
  }

  const leftSpace = protectedRegion?.x ?? width * 0.5;
  const rightSpace = protectedRegion ? width - protectedRegion.x - protectedRegion.width : width * 0.5;
  return {
    x: leftSpace >= rightSpace ? width * 0.08 : width * 0.92,
    y: height * 0.32,
  };
}

function particleTiming(random: PresentationRandom, durationMs: number, kindIndex: number) {
  const duration = durationMs / 1_000;
  const wave = (kindIndex % 4) / 4;
  const delay = clamp(
    random.between(duration * 0.015, duration * 0.46) + wave * duration * 0.08,
    0,
    duration * 0.56,
  );
  const remaining = Math.max(0.35, duration - delay);
  const life = Math.min(remaining, random.between(duration * 0.28, duration * 0.56));
  return { delay, life };
}

function makeParticle(
  kind: CelebrationParticleKind,
  kindIndex: number,
  random: PresentationRandom,
  width: number,
  height: number,
  durationMs: number,
  protectedRegion: CelebrationBounds | null,
): CelebrationParticle {
  const point = pointOutsideProtected(random, width, height, protectedRegion);
  const timing = particleTiming(random, durationMs, kindIndex);
  const color = kind === "petal" ? random.pick(PETAL_PALETTE) : random.pick(PALETTE);
  const accent = random.pick(PALETTE);
  const base: CelebrationParticle = {
    kind,
    x: point.x,
    y: point.y,
    vx: random.between(-24, 24),
    vy: random.between(-32, 32),
    size: random.between(3, 12),
    length: random.between(26, 110),
    delay: timing.delay,
    life: timing.life,
    color,
    accent,
    rotation: random.between(-Math.PI, Math.PI),
    spin: random.between(-2.4, 2.4),
    gravity: random.between(0, 18),
    phase: random.between(0, Math.PI * 2),
    alpha: random.between(0.48, 0.78),
  };

  if (kind === "ribbon") {
    const start = pointOutsideProtected(random, width, height, protectedRegion, [0.02, 0.98], [-0.12, 0.08]);
    return { ...base, ...start, vy: random.between(52, 102), size: random.between(3, 7), gravity: random.between(3, 12) };
  }
  if (kind === "petal") {
    const start = pointOutsideProtected(random, width, height, protectedRegion, [0.02, 0.98], [-0.14, 0.12]);
    return { ...base, ...start, vy: random.between(34, 78), size: random.between(5, 10), gravity: random.between(3, 9) };
  }
  if (kind === "bubble") {
    const start = pointOutsideProtected(random, width, height, protectedRegion, [0.03, 0.97], [0.76, 1.08]);
    return { ...base, ...start, vx: random.between(-14, 14), vy: random.between(-72, -28), size: random.between(5, 17), gravity: -2 };
  }
  if (kind === "droplet") {
    const start = pointOutsideProtected(random, width, height, protectedRegion, [0.02, 0.98], [-0.08, 0.2]);
    return { ...base, ...start, vx: random.between(-30, 30), vy: random.between(56, 126), size: random.between(3, 9), gravity: random.between(12, 26) };
  }
  if (kind === "streak") {
    const fromLeft = random.unit() < 0.5;
    return {
      ...base,
      x: fromLeft ? random.between(-width * 0.22, width * 0.05) : random.between(width * 0.95, width * 1.18),
      y: point.y,
      vx: (fromLeft ? 1 : -1) * random.between(110, 210),
      vy: random.between(-16, 16),
      size: random.between(6, 18),
      length: random.between(90, 180),
      gravity: 0,
      rotation: random.between(-0.2, 0.2) + (fromLeft ? 0 : Math.PI),
    };
  }
  if (kind === "neon-stream") {
    const fromLeft = random.unit() < 0.5;
    return {
      ...base,
      x: fromLeft ? -width * 0.12 : width * 1.12,
      y: random.unit() < 0.5 ? random.between(height * 0.08, height * 0.3) : random.between(height * 0.68, height * 0.92),
      vx: (fromLeft ? 1 : -1) * random.between(70, 132),
      vy: random.between(-8, 8),
      size: random.between(3, 8),
      length: random.between(150, 260),
      gravity: 0,
      rotation: fromLeft ? 0 : Math.PI,
      alpha: random.between(0.42, 0.62),
    };
  }
  if (kind === "firework") {
    const origin = pointOutsideProtected(random, width, height, protectedRegion, [0.1, 0.9], [0.08, 0.48]);
    return { ...base, ...origin, vx: 0, vy: 0, size: random.between(28, 58), length: random.between(8, 13), gravity: 0, spin: 0 };
  }
  if (kind === "spark") {
    const origin = pointOutsideProtected(random, width, height, protectedRegion, [0.08, 0.92], [0.08, 0.68]);
    const angle = random.between(0, Math.PI * 2);
    const speed = random.between(48, 138);
    return {
      ...base,
      ...origin,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: random.between(1.2, 3.6),
      length: random.between(12, 32),
      gravity: random.between(18, 42),
      rotation: angle,
      spin: 0,
    };
  }
  if (kind === "star") {
    return { ...base, vx: random.between(-16, 16), vy: random.between(-42, -8), size: random.between(3, 8), gravity: random.between(2, 8) };
  }
  if (kind === "paint-splash") {
    return { ...base, vx: random.between(-12, 12), vy: random.between(-10, 10), size: random.between(13, 32), length: random.between(4, 8), gravity: 0, alpha: random.between(0.34, 0.58) };
  }
  if (kind === "bloom") {
    return { ...base, vx: 0, vy: 0, size: random.between(34, 86), gravity: 0, spin: 0, alpha: random.between(0.28, 0.46) };
  }
  return base;
}

export function resolveCelebrationMotionMode(
  preferredMode: CelebrationMotionMode,
  prefersReducedMotion: boolean,
): CelebrationMotionMode {
  if (preferredMode === "off") return "off";
  return preferredMode === "full" && prefersReducedMotion ? "reduced" : preferredMode;
}

export function celebrationProfileForViewport(
  mode: CelebrationMotionMode,
  width: number,
  height: number,
): CelebrationProfile | null {
  if (mode === "off") return null;
  if (mode === "reduced") return "reduced";
  return finiteDimension(width) < COMPACT_MIN_WIDTH || finiteDimension(height) < COMPACT_MIN_HEIGHT
    ? "compact"
    : "standard";
}

export function celebrationCanvasMetrics(
  widthValue: number,
  heightValue: number,
  devicePixelRatioValue: number,
  profile: CelebrationProfile,
) {
  const width = finiteDimension(widthValue);
  const height = finiteDimension(heightValue);
  const maxBackingPixels = CELEBRATION_LIMITS[profile].maxBackingPixels;
  const requestedDpr = clamp(Number(devicePixelRatioValue) || 1, 1, 2);
  const pixelRatioCap = Math.sqrt(maxBackingPixels / (width * height));
  const dpr = Math.min(requestedDpr, pixelRatioCap);
  const pixelWidth = Math.max(1, Math.floor(width * dpr));
  const pixelHeight = Math.max(1, Math.floor(height * dpr));
  return {
    width,
    height,
    dpr,
    pixelWidth,
    pixelHeight,
    backingPixels: pixelWidth * pixelHeight,
    maxBackingPixels,
  };
}

export function celebrationElapsedMs(
  revealAtMs: number,
  authoritativeNowMs: number,
  durationMs: number,
) {
  if (!Number.isFinite(revealAtMs) || !Number.isFinite(authoritativeNowMs)) return 0;
  return clamp(authoritativeNowMs - revealAtMs, 0, Math.max(0, durationMs));
}

export function createCelebrationScene({
  drawId,
  mode,
  width: widthValue,
  height: heightValue,
  protectedRegion: protectedRegionValue,
}: {
  drawId: string;
  mode: CelebrationMotionMode;
  width: number;
  height: number;
  protectedRegion?: CelebrationBounds | null;
}): CelebrationScene | null {
  const width = finiteDimension(widthValue);
  const height = finiteDimension(heightValue);
  const profile = celebrationProfileForViewport(mode, width, height);
  if (!profile) return null;

  const limits = CELEBRATION_LIMITS[profile];
  const protectedRegion = normalizedBounds(protectedRegionValue, width, height);
  const random = new PresentationRandom(presentationSeed(`${drawId}:${profile}`));
  const particles: CelebrationParticle[] = [];
  let kindIndex = 0;

  for (const [kind, count] of Object.entries(EFFECT_COUNTS[profile]) as Array<
    [CelebrationParticleKind, number]
  >) {
    for (let index = 0; index < count; index += 1) {
      particles.push(makeParticle(
        kind,
        kindIndex,
        random,
        width,
        height,
        limits.durationMs,
        protectedRegion,
      ));
      kindIndex += 1;
    }
  }

  return {
    drawId,
    profile,
    durationMs: limits.durationMs,
    maxBackingPixels: limits.maxBackingPixels,
    protectedRegion,
    particles: particles.slice(0, limits.maxParticles),
  };
}
