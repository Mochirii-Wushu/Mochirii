export type DeferredTaskHost = {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (handle: number) => void;
};

export function createDedupedLoader<T>(load: () => Promise<T>) {
  let activeLoad: Promise<T> | null = null;

  return () => {
    if (activeLoad) return activeLoad;

    activeLoad = Promise.resolve()
      .then(load)
      .catch((error) => {
        activeLoad = null;
        throw error;
      });

    return activeLoad;
  };
}

export function scheduleDeferredTask(
  host: DeferredTaskHost,
  task: () => void,
  timeout: number,
) {
  if (typeof host.requestIdleCallback === "function") {
    const handle = host.requestIdleCallback(task, { timeout });
    return () => host.cancelIdleCallback?.(handle);
  }

  const handle = host.setTimeout(task, timeout);
  return () => host.clearTimeout(handle);
}

export function hasExactCookieName(cookieHeader: string, expectedName: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(expectedName)) return false;
  const escapedName = expectedName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `(?:^|;\\s*)${escapedName}(?:\\.0|\\.[1-9]\\d*)?=`,
    "u",
  ).test(cookieHeader);
}

export function shouldScheduleAutomaticAuthLoad(
  readCookieHeader: () => string,
  expectedName: string,
) {
  try {
    return hasExactCookieName(readCookieHeader(), expectedName);
  } catch {
    // Preserve the authoritative readback when browser cookie access is unavailable.
    return true;
  }
}
