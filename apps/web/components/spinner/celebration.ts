import {
  celebrationCanvasMetrics,
  celebrationElapsedMs,
  celebrationProfileForViewport,
  createCelebrationScene,
  resolveCelebrationMotionMode,
  type CelebrationBounds,
  type CelebrationMotionMode,
  type CelebrationParticle,
} from "./celebration-scene";

export type CelebrationHandle = {
  active: boolean;
  finished: Promise<void>;
  stop: () => void;
};

export type CelebrationStartOptions = {
  mode: CelebrationMotionMode;
  drawId: string;
  revealAtMs: number;
  authoritativeNowMs: number;
  protectedRegion?: Pick<DOMRect, "left" | "top" | "width" | "height"> | null;
  signal?: AbortSignal;
};

type ConfiguredCanvas = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  protectedRegion: CelebrationBounds | null;
};

function configureCanvas(
  canvas: HTMLCanvasElement,
  mode: Exclude<CelebrationMotionMode, "off">,
  protectedRegion: CelebrationStartOptions["protectedRegion"],
) {
  const rect = canvas.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(canvas);
  if (
    canvas.getClientRects().length === 0 || rect.width <= 0 || rect.height <= 0 ||
    computedStyle.display === "none" || computedStyle.visibility === "hidden"
  ) return null;
  const width = rect.width;
  const height = rect.height;
  const profile = celebrationProfileForViewport(mode, width, height);
  if (!profile) return null;

  const metrics = celebrationCanvasMetrics(
    width,
    height,
    window.devicePixelRatio || 1,
    profile,
  );
  canvas.width = metrics.pixelWidth;
  canvas.height = metrics.pixelHeight;

  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);

  const padding = 48;
  const relativeProtectedRegion = protectedRegion
    ? {
        x: protectedRegion.left - rect.left - padding,
        y: protectedRegion.top - rect.top - padding,
        width: protectedRegion.width + padding * 2,
        height: protectedRegion.height + padding * 2,
      }
    : null;

  return {
    context,
    width: metrics.width,
    height: metrics.height,
    protectedRegion: relativeProtectedRegion,
  } satisfies ConfiguredCanvas;
}

function starPath(
  context: CanvasRenderingContext2D,
  outerRadius: number,
  innerRadius: number,
  points = 5,
) {
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: CelebrationParticle,
  elapsed: number,
) {
  const age = elapsed - particle.delay;
  if (age < 0 || age > particle.life) return;

  const progress = age / particle.life;
  const fade = Math.sin(Math.PI * Math.min(1, progress));
  const drift = Math.sin(age * 2.8 + particle.phase);
  const x = particle.x + particle.vx * age + drift * 8;
  const y = particle.y + particle.vy * age + particle.gravity * age * age * 0.5;
  const rotation = particle.rotation + particle.spin * age;

  context.save();
  context.globalAlpha = Math.max(0, fade) * particle.alpha;
  context.translate(x, y);
  context.rotate(rotation);

  switch (particle.kind) {
    case "paint-splash": {
      const radius = particle.size * (0.55 + progress * 0.45);
      context.fillStyle = particle.color;
      context.shadowColor = particle.accent;
      context.shadowBlur = 10;
      context.beginPath();
      for (let index = 0; index < 12; index += 1) {
        const angle = (index / 12) * Math.PI * 2;
        const wobble = 0.68 + 0.28 * Math.sin(index * 2.17 + particle.phase);
        const px = Math.cos(angle) * radius * wobble;
        const py = Math.sin(angle) * radius * wobble;
        if (index === 0) context.moveTo(px, py);
        else context.quadraticCurveTo(
          Math.cos(angle - 0.14) * radius,
          Math.sin(angle - 0.14) * radius,
          px,
          py,
        );
      }
      context.closePath();
      context.fill();
      for (let drop = 0; drop < 4; drop += 1) {
        const angle = particle.phase + drop * 1.7;
        const distance = radius * (1.15 + drop * 0.19);
        context.beginPath();
        context.arc(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          Math.max(1.5, radius * (0.12 - drop * 0.015)),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      break;
    }
    case "neon-stream": {
      const gradient = context.createLinearGradient(0, 0, particle.length, 0);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.22, particle.color);
      gradient.addColorStop(0.72, particle.accent);
      gradient.addColorStop(1, "transparent");
      context.strokeStyle = gradient;
      context.shadowColor = particle.color;
      context.shadowBlur = 16;
      context.lineCap = "round";
      context.lineWidth = particle.size;
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
      break;
    }
    case "ribbon": {
      context.strokeStyle = particle.color;
      context.lineWidth = particle.size;
      context.lineCap = "round";
      context.shadowColor = particle.accent;
      context.shadowBlur = 5;
      context.beginPath();
      context.moveTo(-particle.length * 0.25, 0);
      context.bezierCurveTo(
        -particle.length * 0.1,
        -12,
        particle.length * 0.1,
        12,
        particle.length * 0.25,
        0,
      );
      context.stroke();
      break;
    }
    case "petal": {
      context.fillStyle = particle.color;
      context.beginPath();
      context.moveTo(0, -particle.size);
      context.bezierCurveTo(
        particle.size * 0.8,
        -particle.size * 0.35,
        particle.size * 0.68,
        particle.size * 0.72,
        0,
        particle.size,
      );
      context.bezierCurveTo(
        -particle.size * 0.68,
        particle.size * 0.72,
        -particle.size * 0.8,
        -particle.size * 0.35,
        0,
        -particle.size,
      );
      context.fill();
      context.strokeStyle = "rgba(255, 255, 255, 0.42)";
      context.lineWidth = 0.8;
      context.beginPath();
      context.moveTo(0, -particle.size * 0.72);
      context.lineTo(0, particle.size * 0.7);
      context.stroke();
      break;
    }
    case "bubble": {
      context.strokeStyle = particle.color;
      context.fillStyle = "rgba(255, 255, 255, 0.08)";
      context.lineWidth = 1.4;
      context.shadowColor = particle.accent;
      context.shadowBlur = 7;
      context.beginPath();
      context.arc(0, 0, particle.size, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = "rgba(255, 255, 255, 0.76)";
      context.beginPath();
      context.arc(
        -particle.size * 0.32,
        -particle.size * 0.34,
        Math.max(1, particle.size * 0.13),
        0,
        Math.PI * 2,
      );
      context.fill();
      break;
    }
    case "droplet": {
      context.fillStyle = particle.color;
      context.shadowColor = particle.accent;
      context.shadowBlur = 8;
      context.beginPath();
      context.moveTo(0, -particle.size * 1.25);
      context.bezierCurveTo(
        particle.size,
        -particle.size * 0.15,
        particle.size * 0.75,
        particle.size,
        0,
        particle.size,
      );
      context.bezierCurveTo(
        -particle.size * 0.75,
        particle.size,
        -particle.size,
        -particle.size * 0.15,
        0,
        -particle.size * 1.25,
      );
      context.fill();
      break;
    }
    case "streak": {
      const gradient = context.createLinearGradient(0, 0, particle.length, 0);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.34, particle.color);
      gradient.addColorStop(0.72, particle.accent);
      gradient.addColorStop(1, "transparent");
      context.strokeStyle = gradient;
      context.lineWidth = particle.size * (0.45 + 0.55 * fade);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(0, 0);
      context.quadraticCurveTo(particle.length * 0.5, -9, particle.length, 1);
      context.stroke();
      break;
    }
    case "firework": {
      const radius = particle.size * (0.18 + progress * 0.92);
      context.strokeStyle = particle.color;
      context.shadowColor = particle.accent;
      context.shadowBlur = 10;
      context.lineCap = "round";
      context.lineWidth = Math.max(1, 2.4 * (1 - progress));
      for (let ray = 0; ray < Math.round(particle.length); ray += 1) {
        const angle = (ray / particle.length) * Math.PI * 2 + particle.phase;
        context.beginPath();
        context.moveTo(
          Math.cos(angle) * radius * 0.34,
          Math.sin(angle) * radius * 0.34,
        );
        context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        context.stroke();
      }
      break;
    }
    case "star": {
      context.fillStyle = particle.color;
      context.shadowColor = particle.accent;
      context.shadowBlur = 10;
      starPath(context, particle.size, particle.size * 0.42);
      context.fill();
      break;
    }
    case "spark": {
      context.strokeStyle = particle.color;
      context.shadowColor = particle.accent;
      context.shadowBlur = 8;
      context.lineCap = "round";
      context.lineWidth = particle.size;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(-particle.vx * 0.035, -particle.vy * 0.035);
      context.stroke();
      break;
    }
    case "bloom": {
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
      break;
    }
  }

  context.restore();
}

function clearProtectedRegion(
  context: CanvasRenderingContext2D,
  protectedRegion: CelebrationBounds | null,
) {
  if (!protectedRegion) return;
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillRect(
    protectedRegion.x,
    protectedRegion.y,
    protectedRegion.width,
    protectedRegion.height,
  );
  context.restore();
}

/**
 * Starts a deterministic, time-bounded presentation for an already-selected
 * result. Its presentation seed is isolated from raffle selection randomness.
 */
export function startCelebration(
  canvas: HTMLCanvasElement,
  options: CelebrationStartOptions,
): CelebrationHandle {
  let animationFrame = 0;
  let settled = false;
  let active = false;
  let configured: ConfiguredCanvas | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let resolveFinished: () => void = () => undefined;
  const cleanups: Array<() => void> = [];
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  const stop = () => {
    if (settled) return;
    settled = true;
    active = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    for (const cleanup of cleanups.splice(0)) cleanup();
    try {
      configured?.context.clearRect(0, 0, configured.width, configured.height);
      canvas.width = 0;
      canvas.height = 0;
    } catch {
      // The presentation must fail closed without affecting the stored result.
    }
    resolveFinished();
  };

  const handle: CelebrationHandle = {
    get active() {
      return active;
    },
    finished,
    stop,
  };

  if (options.mode === "off" || options.signal?.aborted || document.hidden) {
    stop();
    return handle;
  }

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
  if (forcedColorsQuery.matches) {
    stop();
    return handle;
  }
  const effectiveMode = resolveCelebrationMotionMode(options.mode, reducedMotionQuery.matches);
  if (effectiveMode === "off") {
    stop();
    return handle;
  }

  try {
    configured = configureCanvas(canvas, effectiveMode, options.protectedRegion);
    if (!configured) {
      stop();
      return handle;
    }

    const scene = createCelebrationScene({
      drawId: options.drawId,
      mode: effectiveMode,
      width: configured.width,
      height: configured.height,
      protectedRegion: configured.protectedRegion,
    });
    if (!scene) {
      stop();
      return handle;
    }

    const initialElapsedMs = celebrationElapsedMs(
      options.revealAtMs,
      options.authoritativeNowMs,
      scene.durationMs,
    );
    if (initialElapsedMs >= scene.durationMs) {
      stop();
      return handle;
    }

    const startedAt = performance.now() - initialElapsedMs;
    const initialWidth = configured.width;
    const initialHeight = configured.height;

    const stopOnResize = () => stop();
    const stopOnVisibility = () => {
      if (document.hidden) stop();
    };
    const stopOnMotionReduction = (event: MediaQueryListEvent) => {
      if (event.matches) stop();
    };
    const stopOnForcedColors = (event: MediaQueryListEvent) => {
      if (event.matches) stop();
    };

    window.addEventListener("resize", stopOnResize, { passive: true });
    document.addEventListener("visibilitychange", stopOnVisibility);
    document.addEventListener("fullscreenchange", stopOnResize);
    reducedMotionQuery.addEventListener("change", stopOnMotionReduction);
    forcedColorsQuery.addEventListener("change", stopOnForcedColors);
    cleanups.push(
      () => window.removeEventListener("resize", stopOnResize),
      () => document.removeEventListener("visibilitychange", stopOnVisibility),
      () => document.removeEventListener("fullscreenchange", stopOnResize),
      () => reducedMotionQuery.removeEventListener("change", stopOnMotionReduction),
      () => forcedColorsQuery.removeEventListener("change", stopOnForcedColors),
    );

    if (options.signal) {
      options.signal.addEventListener("abort", stop, { once: true });
      cleanups.push(() => options.signal?.removeEventListener("abort", stop));
    }

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        const size = entries[0]?.contentRect;
        if (
          size &&
          (Math.abs(size.width - initialWidth) > 0.5 ||
            Math.abs(size.height - initialHeight) > 0.5)
        ) {
          stop();
        }
      });
      resizeObserver.observe(canvas);
    }

    const render = (timestamp: number) => {
      if (settled) return;
      try {
        if (!configured || !canvas.isConnected || document.hidden) {
          stop();
          return;
        }

        const elapsedMs = timestamp - startedAt;
        configured.context.clearRect(0, 0, configured.width, configured.height);
        for (const particle of scene.particles) {
          drawParticle(configured.context, particle, elapsedMs / 1_000);
        }
        clearProtectedRegion(configured.context, scene.protectedRegion);

        if (elapsedMs >= scene.durationMs) {
          stop();
          return;
        }
        animationFrame = requestAnimationFrame(render);
      } catch {
        stop();
      }
    };

    active = true;
    animationFrame = requestAnimationFrame(render);
    return handle;
  } catch {
    stop();
    return handle;
  }
}
