export type AuthorizationLoadQueue = {
  request: () => Promise<void>;
  stop: () => void;
};

/**
 * Serializes consent-detail reads. Supabase binds an authorization request to
 * the first authenticated reader and locks that row while it is inspected, so
 * overlapping INITIAL_SESSION and SIGNED_IN callbacks must never race.
 */
export function createAuthorizationLoadQueue(load: () => Promise<void>): AuthorizationLoadQueue {
  let stopped = false;
  let queued = false;
  let tail = Promise.resolve();

  return {
    request() {
      if (stopped || queued) return tail;

      queued = true;
      const run = tail.then(async () => {
        queued = false;
        if (!stopped) await load();
      });

      // Keep the queue usable after a handled UI/network error without
      // creating an unhandled rejection in a later queued request.
      tail = run.catch(() => undefined);
      return tail;
    },
    stop() {
      stopped = true;
      queued = false;
    },
  };
}
