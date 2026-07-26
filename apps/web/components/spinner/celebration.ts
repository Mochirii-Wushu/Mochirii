export type CelebrationHandle = {
  finished: Promise<void>;
  stop: () => void;
};

type CelebrationMode = "full" | "reduced" | "off";

type ParticleKind =
  | "spark"
  | "ribbon"
  | "streak"
  | "bubble"
  | "petal"
  | "bloom";

type Particle = {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  delay: number;
  life: number;
  color: string;
  rotation: number;
  spin: number;
  gravity: number;
  phase: number;
};

const PALETTE = [
  "#f8dc8f",
  "#c8a24b",
  "#59c9a5",
  "#1f7a63",
  "#ef9fbd",
  "#d997b5",
  "#91d7ff",
  "#dcebf5",
  "#bd8dff",
  "#ff806e",
] as const;

const UINT32_RANGE = 4_294_967_296;

class CryptoRandom {
  private values = new Uint32Array(256);

  private cursor = this.values.length;

  private refill() {
    const secureCrypto = globalThis.crypto;
    if (!secureCrypto?.getRandomValues) {
      throw new Error("Secure randomness is unavailable.");
    }
    secureCrypto.getRandomValues(this.values);
    this.cursor = 0;
  }

  unit() {
    if (this.cursor >= this.values.length) this.refill();
    const value = this.values[this.cursor];
    this.cursor += 1;
    return value / UINT32_RANGE;
  }

  between(min: number, max: number) {
    return min + (max - min) * this.unit();
  }

  pick<T>(items: readonly T[]) {
    return items[Math.floor(this.unit() * items.length)] ?? items[0];
  }
}

function configureCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width || window.innerWidth);
  const height = Math.max(1, rect.height || window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width, height };
}

function makeParticles(
  random: CryptoRandom,
  width: number,
  height: number,
  mode: Exclude<CelebrationMode, "off">,
) {
  const particles: Particle[] = [];
  const scale = mode === "full" ? 1 : 0.34;
  const count = (full: number) => Math.max(1, Math.round(full * scale));

  // Firework sparks: bursts are offset in time so the scene swells instead of flashing.
  const burstCount = mode === "full" ? 5 : 2;
  const sparksPerBurst = mode === "full" ? 15 : 7;
  for (let burst = 0; burst < burstCount; burst += 1) {
    const originX = random.between(width * 0.12, width * 0.88);
    const originY = random.between(height * 0.1, height * 0.48);
    const delay = random.between(0.08, mode === "full" ? 2.6 : 0.8);
    const color = random.pick(PALETTE);
    for (let ray = 0; ray < sparksPerBurst; ray += 1) {
      const angle = (ray / sparksPerBurst) * Math.PI * 2 + random.between(-0.12, 0.12);
      const speed = random.between(42, 128);
      particles.push({
        kind: "spark",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: random.between(1.2, 3.4),
        delay,
        life: random.between(1.2, 2.4),
        color,
        rotation: angle,
        spin: 0,
        gravity: random.between(24, 48),
        phase: random.between(0, Math.PI * 2),
      });
    }
  }

  for (let index = 0; index < count(16); index += 1) {
    particles.push({
      kind: "ribbon",
      x: random.between(0, width),
      y: random.between(-height * 0.12, height * 0.08),
      vx: random.between(-24, 24),
      vy: random.between(55, 105),
      size: random.between(4, 8),
      delay: random.between(0, 1.2),
      life: random.between(2.8, 4.9),
      color: random.pick(PALETTE),
      rotation: random.between(0, Math.PI * 2),
      spin: random.between(-3.4, 3.4),
      gravity: random.between(3, 14),
      phase: random.between(0, Math.PI * 2),
    });
  }

  for (let index = 0; index < count(10); index += 1) {
    particles.push({
      kind: "streak",
      x: random.between(-width * 0.25, width * 0.55),
      y: random.between(height * 0.08, height * 0.82),
      vx: random.between(90, 190),
      vy: random.between(-18, 18),
      size: random.between(10, 28),
      delay: random.between(0.05, 1.8),
      life: random.between(1.1, 2.1),
      color: random.pick(PALETTE),
      rotation: random.between(-0.14, 0.14),
      spin: 0,
      gravity: 0,
      phase: random.between(0, Math.PI * 2),
    });
  }

  for (let index = 0; index < count(18); index += 1) {
    particles.push({
      kind: "bubble",
      x: random.between(width * 0.04, width * 0.96),
      y: random.between(height * 0.74, height * 1.08),
      vx: random.between(-18, 18),
      vy: random.between(-76, -28),
      size: random.between(5, 18),
      delay: random.between(0, 1.6),
      life: random.between(2, 4.2),
      color: random.pick(PALETTE),
      rotation: 0,
      spin: 0,
      gravity: -2,
      phase: random.between(0, Math.PI * 2),
    });
  }

  for (let index = 0; index < count(22); index += 1) {
    particles.push({
      kind: "petal",
      x: random.between(0, width),
      y: random.between(-height * 0.16, height * 0.15),
      vx: random.between(-20, 20),
      vy: random.between(35, 82),
      size: random.between(5, 11),
      delay: random.between(0, 1.6),
      life: random.between(3.1, 5.3),
      color: random.pick(["#f7c7d8", "#d997b5", "#f5e7ed", "#ef9fbd"]),
      rotation: random.between(0, Math.PI * 2),
      spin: random.between(-2.2, 2.2),
      gravity: random.between(4, 11),
      phase: random.between(0, Math.PI * 2),
    });
  }

  for (let index = 0; index < count(10); index += 1) {
    particles.push({
      kind: "bloom",
      x: random.between(width * 0.08, width * 0.92),
      y: random.between(height * 0.08, height * 0.88),
      vx: 0,
      vy: 0,
      size: random.between(34, 88),
      delay: random.between(0, 2.1),
      life: random.between(1.4, 2.7),
      color: random.pick(["#c8a24b", "#59c9a5", "#91d7ff", "#ef9fbd"]),
      rotation: 0,
      spin: 0,
      gravity: 0,
      phase: random.between(0, Math.PI * 2),
    });
  }

  return particles.slice(0, mode === "full" ? 160 : 52);
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: Particle,
  elapsed: number,
) {
  const age = elapsed - particle.delay;
  if (age < 0 || age > particle.life) return;
  const progress = age / particle.life;
  const fade = Math.sin(Math.PI * Math.min(1, progress));
  const x = particle.x + particle.vx * age + Math.sin(age * 2.8 + particle.phase) * 8;
  const y = particle.y + particle.vy * age + particle.gravity * age * age * 0.5;
  const rotation = particle.rotation + particle.spin * age;

  context.save();
  context.globalAlpha = Math.max(0, fade) * 0.88;
  context.translate(x, y);
  context.rotate(rotation);

  if (particle.kind === "spark") {
    context.strokeStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = 8;
    context.lineCap = "round";
    context.lineWidth = particle.size;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-particle.vx * 0.035, -particle.vy * 0.035);
    context.stroke();
  } else if (particle.kind === "ribbon") {
    context.strokeStyle = particle.color;
    context.lineWidth = particle.size;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-12, 0);
    context.bezierCurveTo(-4, -10, 4, 10, 12, 0);
    context.stroke();
  } else if (particle.kind === "streak") {
    const streakLength = 110 + particle.size * 4;
    const gradient = context.createLinearGradient(0, 0, streakLength, 0);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.34, particle.color);
    gradient.addColorStop(1, "transparent");
    context.strokeStyle = gradient;
    context.lineWidth = particle.size * (0.45 + 0.55 * fade);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(streakLength * 0.5, -9, streakLength, 1);
    context.stroke();
  } else if (particle.kind === "bubble") {
    context.strokeStyle = particle.color;
    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    context.lineWidth = 1.4;
    context.beginPath();
    context.arc(0, 0, particle.size, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.beginPath();
    context.arc(-particle.size * 0.32, -particle.size * 0.34, Math.max(1, particle.size * 0.13), 0, Math.PI * 2);
    context.fill();
  } else if (particle.kind === "petal") {
    context.fillStyle = particle.color;
    context.beginPath();
    context.ellipse(0, 0, particle.size * 0.58, particle.size, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.35)";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(0, -particle.size * 0.7);
    context.lineTo(0, particle.size * 0.7);
    context.stroke();
  } else {
    const radius = particle.size * (0.25 + progress * 0.9);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(0.22, `${particle.color}80`);
    gradient.addColorStop(1, "transparent");
    context.globalAlpha = (1 - progress) * 0.5;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

/**
 * Starts a time-bounded, decorative celebration. The returned handle is always
 * safe to stop more than once. The canvas remains outside the accessibility tree.
 */
export function startCelebration(
  canvas: HTMLCanvasElement,
  mode: CelebrationMode,
  signal?: AbortSignal,
): CelebrationHandle {
  let animationFrame = 0;
  let settled = false;
  let configured: ReturnType<typeof configureCanvas> = null;
  let resolveFinished: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  const stop = () => {
    if (settled) return;
    settled = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    const configured = configureCanvas(canvas);
    configured?.context.clearRect(0, 0, configured.width, configured.height);
    signal?.removeEventListener("abort", stop);
    window.removeEventListener("resize", resize);
    resolveFinished();
  };

  const resize = () => {
    configured = configureCanvas(canvas) ?? configured;
  };

  if (mode === "off" || signal?.aborted) {
    stop();
    return { finished, stop };
  }

  configured = configureCanvas(canvas);
  if (!configured) {
    stop();
    return { finished, stop };
  }

  let particles: Particle[];
  try {
    particles = makeParticles(new CryptoRandom(), configured.width, configured.height, mode);
  } catch {
    stop();
    return { finished, stop };
  }

  const duration = mode === "full" ? 4_800 : 2_450;
  const startedAt = performance.now();

  const render = (timestamp: number) => {
    if (settled) return;
    if (!configured || !canvas.isConnected) {
      stop();
      return;
    }

    const elapsedMs = timestamp - startedAt;
    configured.context.clearRect(0, 0, configured.width, configured.height);
    for (const particle of particles) {
      drawParticle(configured.context, particle, elapsedMs / 1_000);
    }

    if (elapsedMs >= duration) {
      stop();
      return;
    }
    animationFrame = requestAnimationFrame(render);
  };

  signal?.addEventListener("abort", stop, { once: true });
  window.addEventListener("resize", resize, { passive: true });
  animationFrame = requestAnimationFrame(render);
  return { finished, stop };
}
