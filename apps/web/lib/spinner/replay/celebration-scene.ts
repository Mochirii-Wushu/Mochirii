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

export type CelebrationParticle = Readonly<{
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
}>;

const EFFECT_COUNTS: Readonly<Record<CelebrationParticleKind, number>> = Object.freeze({
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
});

const PALETTE = [
  "#ffe6a3", "#d4aa4f", "#63e4ba", "#24a884", "#ff9fc6", "#e884bb",
  "#73d9ff", "#e7f5ff", "#c69cff", "#ff806e", "#7cfff0", "#ffcf70",
] as const;
const PETAL_PALETTE = ["#ffd3e2", "#ef9fbd", "#f8edf2", "#e884bb"] as const;

class PresentationRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 0x6d2b79f5;
  }

  unit(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 4_294_967_296;
  }

  between(min: number, max: number): number {
    return min + (max - min) * this.unit();
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.unit() * items.length)] ?? items[0];
  }
}

function seed32(value: string): number {
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

function timing(random: PresentationRandom, kindIndex: number) {
  const duration = 4.8;
  const delay = Math.min(
    duration * 0.56,
    random.between(duration * 0.015, duration * 0.46) + (kindIndex % 4) / 4 * duration * 0.08,
  );
  return {
    delay,
    life: Math.min(duration - delay, random.between(duration * 0.28, duration * 0.56)),
  };
}

function makeParticle(
  kind: CelebrationParticleKind,
  kindIndex: number,
  random: PresentationRandom,
  width: number,
  height: number,
): CelebrationParticle {
  const life = timing(random, kindIndex);
  const base: CelebrationParticle = {
    kind,
    x: random.between(width * 0.04, width * 0.96),
    y: random.between(height * 0.04, height * 0.96),
    vx: random.between(-24, 24),
    vy: random.between(-32, 32),
    size: random.between(3, 12),
    length: random.between(26, 110),
    ...life,
    color: kind === "petal" ? random.pick(PETAL_PALETTE) : random.pick(PALETTE),
    accent: random.pick(PALETTE),
    rotation: random.between(-Math.PI, Math.PI),
    spin: random.between(-2.4, 2.4),
    gravity: random.between(0, 18),
    phase: random.between(0, Math.PI * 2),
    alpha: random.between(0.48, 0.78),
  };
  const top = () => ({
    x: random.between(width * 0.02, width * 0.98),
    y: random.between(-height * 0.14, height * 0.12),
  });

  if (kind === "ribbon") return { ...base, ...top(), vy: random.between(52, 102), size: random.between(3, 7), gravity: random.between(3, 12) };
  if (kind === "petal") return { ...base, ...top(), vy: random.between(34, 78), size: random.between(5, 10), gravity: random.between(3, 9) };
  if (kind === "bubble") return { ...base, y: random.between(height * 0.76, height * 1.08), vx: random.between(-14, 14), vy: random.between(-72, -28), size: random.between(5, 17), gravity: -2 };
  if (kind === "droplet") return { ...base, ...top(), vx: random.between(-30, 30), vy: random.between(56, 126), size: random.between(3, 9), gravity: random.between(12, 26) };
  if (kind === "streak" || kind === "neon-stream") {
    const fromLeft = random.unit() < 0.5;
    return {
      ...base,
      x: fromLeft ? -width * 0.18 : width * 1.18,
      y: kind === "neon-stream"
        ? (random.unit() < 0.5 ? random.between(height * 0.08, height * 0.3) : random.between(height * 0.68, height * 0.92))
        : base.y,
      vx: (fromLeft ? 1 : -1) * random.between(kind === "neon-stream" ? 70 : 110, kind === "neon-stream" ? 132 : 210),
      vy: random.between(-12, 12),
      size: random.between(kind === "neon-stream" ? 3 : 6, kind === "neon-stream" ? 8 : 18),
      length: random.between(kind === "neon-stream" ? 150 : 90, kind === "neon-stream" ? 260 : 180),
      gravity: 0,
      rotation: fromLeft ? 0 : Math.PI,
    };
  }
  if (kind === "firework") return { ...base, y: random.between(height * 0.08, height * 0.48), vx: 0, vy: 0, size: random.between(28, 58), length: random.between(8, 13), gravity: 0, spin: 0 };
  if (kind === "spark") {
    const angle = random.between(0, Math.PI * 2);
    const speed = random.between(48, 138);
    return { ...base, y: random.between(height * 0.08, height * 0.68), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: random.between(1.2, 3.6), gravity: random.between(18, 42), rotation: angle, spin: 0 };
  }
  if (kind === "star") return { ...base, vx: random.between(-16, 16), vy: random.between(-42, -8), size: random.between(3, 8), gravity: random.between(2, 8) };
  if (kind === "paint-splash") return { ...base, vx: random.between(-12, 12), vy: random.between(-10, 10), size: random.between(13, 32), gravity: 0, alpha: random.between(0.34, 0.58) };
  if (kind === "bloom") return { ...base, vx: 0, vy: 0, size: random.between(34, 86), gravity: 0, spin: 0, alpha: random.between(0.28, 0.46) };
  return base;
}

/** The visual seed is domain-separated from the raffle selection entropy. */
export function createCelebrationScene(visualSeedSha256: string, width: number, height: number) {
  const random = new PresentationRandom(seed32(`${visualSeedSha256}:film:standard`));
  const particles: CelebrationParticle[] = [];
  let kindIndex = 0;
  for (const [kind, count] of Object.entries(EFFECT_COUNTS) as Array<[CelebrationParticleKind, number]>) {
    for (let index = 0; index < count; index += 1) {
      particles.push(makeParticle(kind, kindIndex, random, width, height));
      kindIndex += 1;
    }
  }
  return Object.freeze({ durationMs: 4_800 as const, particles: Object.freeze(particles.slice(0, 156)) });
}
