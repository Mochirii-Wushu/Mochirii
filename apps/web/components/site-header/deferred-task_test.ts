import {
  createDedupedLoader,
  hasExactCookieName,
  scheduleDeferredTask,
  shouldScheduleAutomaticAuthLoad,
  type DeferredTaskHost,
} from "./deferred-task.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("createDedupedLoader shares one active load", async () => {
  let calls = 0;
  let finish: (value: string) => void = () => {
    throw new Error("pending loader resolver was not assigned");
  };
  const pending = new Promise<string>((resolve) => {
    finish = resolve;
  });
  const load = createDedupedLoader(() => {
    calls += 1;
    return pending;
  });

  const first = load();
  const second = load();
  assert(first === second, "concurrent callers must share one promise");
  assert(calls === 0, "the loader should start in a microtask");

  await Promise.resolve();
  assert(calls === 1, "the loader must run exactly once");
  finish("ready");
  assert(await first === "ready", "the shared load must resolve normally");
});

Deno.test("createDedupedLoader retries after a failed load", async () => {
  let calls = 0;
  const load = createDedupedLoader(async () => {
    calls += 1;
    if (calls === 1) throw new Error("temporary failure");
    return "ready";
  });

  let rejected = false;
  try {
    await load();
  } catch {
    rejected = true;
  }

  assert(rejected, "the first failure must remain visible to the caller");
  assert(await load() === "ready", "a later interaction must be able to retry");
  assert(calls === 2, "the failed load must be cleared before retrying");
});

Deno.test("scheduleDeferredTask prefers idle work with a deadline", () => {
  let scheduled: () => void = () => {
    throw new Error("idle callback was not assigned");
  };
  let deadline = 0;
  let cancelled = 0;
  const host = {
    requestIdleCallback(callback: () => void, options?: { timeout: number }) {
      scheduled = callback;
      deadline = options?.timeout || 0;
      return 17;
    },
    cancelIdleCallback(handle: number) {
      cancelled = handle;
    },
    setTimeout() {
      throw new Error("timer fallback must not run when idle callbacks exist");
    },
    clearTimeout() {},
  } satisfies DeferredTaskHost;

  let runs = 0;
  const cancel = scheduleDeferredTask(host, () => {
    runs += 1;
  }, 1500);

  assert(deadline === 1500, "required idle work must have a 1500ms deadline");
  scheduled();
  assert(runs === 1, "the idle callback must run the task");
  cancel();
  assert(cancelled === 17, "cleanup must cancel the idle callback");
});

Deno.test("scheduleDeferredTask falls back to a cancellable timer", () => {
  let scheduled: () => void = () => {
    throw new Error("timer callback was not assigned");
  };
  let delay = 0;
  let cancelled = 0;
  const host = {
    setTimeout(callback: () => void, timeout: number) {
      scheduled = callback;
      delay = timeout;
      return 23;
    },
    clearTimeout(handle: number) {
      cancelled = handle;
    },
  } satisfies DeferredTaskHost;

  let runs = 0;
  const cancel = scheduleDeferredTask(host, () => {
    runs += 1;
  }, 1500);

  assert(delay === 1500, "the compatibility timer must preserve the deadline");
  scheduled();
  assert(runs === 1, "the fallback timer must run the task");
  cancel();
  assert(cancelled === 23, "cleanup must cancel the fallback timer");
});

Deno.test("hasExactCookieName accepts only the reviewed session cookie and numeric chunks", () => {
  const expected = "sb-reviewed-project-auth-token";
  assert(hasExactCookieName(`${expected}=opaque`, expected), "the exact cookie must be recognized");
  assert(
    hasExactCookieName(`other=value; ${expected}.0=opaque; ${expected}.1=opaque`, expected),
    "numeric session chunks must be recognized",
  );
  assert(
    !hasExactCookieName(`${expected}-code-verifier=opaque`, expected),
    "the PKCE cookie must not schedule the member runtime",
  );
  assert(
    !hasExactCookieName(`${expected}.attacker=opaque; prefix-${expected}=opaque`, expected),
    "confusable cookie names must be rejected",
  );
  assert(
    !hasExactCookieName(`${expected}.00=opaque; ${expected}.01=opaque`, expected),
    "noncanonical numeric chunks must be rejected",
  );
  assert(!hasExactCookieName(`${expected}=opaque`, "bad.name"), "invalid expected names must fail closed");
});

Deno.test("automatic auth loading follows exact cookie presence and fails safe when cookies are unreadable", () => {
  const expected = "sb-reviewed-project-auth-token";
  assert(
    !shouldScheduleAutomaticAuthLoad(() => "unrelated=value", expected),
    "a signed-out page must not schedule the member runtime",
  );
  assert(
    shouldScheduleAutomaticAuthLoad(() => `${expected}=opaque`, expected),
    "the exact session cookie must schedule authoritative auth readback",
  );
  assert(
    shouldScheduleAutomaticAuthLoad(() => `${expected}.1=opaque`, expected),
    "a canonical chunked session cookie must schedule authoritative auth readback",
  );
  assert(
    shouldScheduleAutomaticAuthLoad(() => {
      throw new Error("cookie access unavailable");
    }, expected),
    "unavailable cookie access must preserve authoritative auth readback",
  );
});
