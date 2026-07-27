"use client";

export type AuthenticatedRoute = "account" | "oauth-consent" | "leader-dashboard";
type TimingOutcome = "complete" | "error";
export type TimingBucket = "under-250ms" | "250-749ms" | "750-1499ms" | "1500-2999ms" | "3000ms-plus";

export const authenticatedRouteTimingEvent = "mochirii:authenticated-route-timing";

export function authenticatedRouteTimingBucket(durationMs: number): TimingBucket {
  if (durationMs < 250) return "under-250ms";
  if (durationMs < 750) return "250-749ms";
  if (durationMs < 1500) return "750-1499ms";
  if (durationMs < 3000) return "1500-2999ms";
  return "3000ms-plus";
}

function recordTiming(route: AuthenticatedRoute, outcome: TimingOutcome, start: number) {
  if (typeof performance === "undefined") return;

  const end = performance.now();
  const bucket = authenticatedRouteTimingBucket(Math.max(0, end - start));
  const name = `mochirii:authenticated-route:${route}:load:${outcome}:${bucket}`;

  try {
    performance.measure(name, { start, end });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(authenticatedRouteTimingEvent, {
        detail: { route, phase: "load", outcome, bucket },
      }));
    }
  } catch {
    // Observability must never interrupt account access.
  }
}

export async function measureAuthenticatedRouteTask<T>(
  route: AuthenticatedRoute,
  task: () => Promise<T>,
): Promise<T> {
  const start = typeof performance === "undefined" ? 0 : performance.now();

  try {
    const value = await task();
    recordTiming(route, "complete", start);
    return value;
  } catch (error) {
    recordTiming(route, "error", start);
    throw error;
  }
}
