const WINDOW_MS = 15 * 60 * 1_000;
const MAX_FAILURES = 5;
const MAX_TRACKED_MEMBERS = 10_000;

type AttemptWindow = {
  failures: number;
  startedAt: number;
};

export function createMochiPetsTesterRateLimiter() {
  const attempts = new Map<string, AttemptWindow>();

  function currentWindow(memberBinding: string, now: number) {
    const existing = attempts.get(memberBinding);
    if (!existing || now - existing.startedAt >= WINDOW_MS) {
      attempts.delete(memberBinding);
      return null;
    }
    return existing;
  }

  function prune(now: number) {
    for (const [key, attempt] of attempts) {
      if (now - attempt.startedAt >= WINDOW_MS) attempts.delete(key);
    }
    while (attempts.size >= MAX_TRACKED_MEMBERS) {
      const oldest = attempts.keys().next().value;
      if (typeof oldest !== "string") break;
      attempts.delete(oldest);
    }
  }

  return {
    check(memberBinding: string, now = Date.now()) {
      if (!memberBinding) return { allowed: false as const, retryAfterSeconds: Math.ceil(WINDOW_MS / 1_000) };
      const attempt = currentWindow(memberBinding, now);
      if (!attempt || attempt.failures < MAX_FAILURES) return { allowed: true as const };
      return {
        allowed: false as const,
        retryAfterSeconds: Math.max(1, Math.ceil((attempt.startedAt + WINDOW_MS - now) / 1_000)),
      };
    },
    recordFailure(memberBinding: string, now = Date.now()) {
      prune(now);
      const attempt = currentWindow(memberBinding, now);
      attempts.delete(memberBinding);
      attempts.set(memberBinding, attempt
        ? { ...attempt, failures: attempt.failures + 1 }
        : { failures: 1, startedAt: now });
    },
    clear(memberBinding: string) {
      attempts.delete(memberBinding);
    },
  };
}
