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
