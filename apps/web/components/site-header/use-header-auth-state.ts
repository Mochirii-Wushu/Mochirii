"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDedupedLoader,
  scheduleDeferredTask,
} from "./deferred-task";
import type { HeaderAuthState } from "./header-navigation";

const signedOutState: HeaderAuthState = {
  signedIn: false,
  activeMember: false,
  moderator: false,
};

type HeaderAuthRuntime = typeof import("./header-auth-runtime");

const loadHeaderAuthRuntime = createDedupedLoader<HeaderAuthRuntime>(
  () => import("./header-auth-runtime"),
);

export function useHeaderAuthState() {
  const [authState, setAuthState] = useState<HeaderAuthState>(signedOutState);
  const authStateRef = useRef<HeaderAuthState>(signedOutState);
  const moderatorStateRef = useRef<"unknown" | "checking" | "allowed" | "denied">("unknown");
  const mountedRef = useRef(false);
  const lifecycleRef = useRef(0);
  const runtimeRef = useRef<HeaderAuthRuntime | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const startRef = useRef<Promise<void> | null>(null);
  const startAttemptRef = useRef<symbol | null>(null);
  const refreshSequenceRef = useRef(0);

  const publishAuthState = useCallback((nextState: HeaderAuthState) => {
    authStateRef.current = nextState;
    setAuthState(nextState);
  }, []);

  const publishModeratorState = useCallback((nextState: "unknown" | "checking" | "allowed" | "denied") => {
    moderatorStateRef.current = nextState;
  }, []);

  const failClosed = useCallback(() => {
    refreshSequenceRef.current += 1;
    publishAuthState(signedOutState);
    publishModeratorState("unknown");
  }, [publishAuthState, publishModeratorState]);

  const refreshAuthState = useCallback(async (runtime: HeaderAuthRuntime) => {
    const sequence = refreshSequenceRef.current + 1;
    refreshSequenceRef.current = sequence;

    try {
      const nextState = await runtime.readHeaderAuthState();
      if (!mountedRef.current || refreshSequenceRef.current !== sequence) return;
      publishAuthState(nextState);
      publishModeratorState("unknown");
    } catch {
      if (!mountedRef.current || refreshSequenceRef.current !== sequence) return;
      failClosed();
    }
  }, [failClosed, publishAuthState, publishModeratorState]);

  const ensureAuthLoaded = useCallback(() => {
    if (startRef.current) return startRef.current;
    const lifecycle = lifecycleRef.current;
    const attempt = Symbol("header-auth-load");
    startAttemptRef.current = attempt;

    const start = (async () => {
      try {
        const runtime = await loadHeaderAuthRuntime();
        if (!mountedRef.current || lifecycleRef.current !== lifecycle) return;
        runtimeRef.current = runtime;

        await refreshAuthState(runtime);
        if (!mountedRef.current || lifecycleRef.current !== lifecycle || subscriptionRef.current) return;

        subscriptionRef.current = runtime.subscribeToHeaderAuthState(() => {
          void refreshAuthState(runtime);
        });
      } catch {
        if (mountedRef.current && lifecycleRef.current === lifecycle) failClosed();
        if (startAttemptRef.current === attempt) startRef.current = null;
      }
    })();

    startRef.current = start;
    return start;
  }, [failClosed, refreshAuthState]);

  useEffect(() => {
    const lifecycle = lifecycleRef.current + 1;
    lifecycleRef.current = lifecycle;
    mountedRef.current = true;
    const cancelDeferredLoad = scheduleDeferredTask(
      window,
      () => void ensureAuthLoaded(),
      1500,
    );

    return () => {
      mountedRef.current = false;
      lifecycleRef.current += 1;
      refreshSequenceRef.current += 1;
      cancelDeferredLoad();
      subscriptionRef.current?.();
      subscriptionRef.current = null;
      runtimeRef.current = null;
      startRef.current = null;
      startAttemptRef.current = null;
    };
  }, [ensureAuthLoaded]);

  const ensureModeratorAccess = useCallback(async () => {
    await ensureAuthLoaded();
    if (!authStateRef.current.signedIn || moderatorStateRef.current !== "unknown") return;

    publishModeratorState("checking");
    try {
      const runtime = runtimeRef.current || await loadHeaderAuthRuntime();
      const allowed = await runtime.readHeaderModeratorAccess();
      if (!mountedRef.current) return;
      if (!authStateRef.current.signedIn) {
        publishModeratorState("unknown");
        return;
      }

      publishAuthState({ ...authStateRef.current, moderator: allowed });
      publishModeratorState(allowed ? "allowed" : "denied");
    } catch {
      if (!mountedRef.current || !authStateRef.current.signedIn) return;
      publishAuthState({ ...authStateRef.current, moderator: false });
      publishModeratorState("denied");
    }
  }, [ensureAuthLoaded, publishAuthState, publishModeratorState]);

  return { authState, ensureAuthLoaded, ensureModeratorAccess };
}
