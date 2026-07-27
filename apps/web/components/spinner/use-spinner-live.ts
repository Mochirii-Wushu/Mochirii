"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSpinnerLiveSnapshot,
  spinnerLivePollInterval,
  type SpinnerLiveResultV1,
} from "./live";

const ERROR_POLL_MS = 2_500;

export function useSpinnerLive({
  enabled = true,
  onResult,
}: {
  enabled?: boolean;
  onResult(result: SpinnerLiveResultV1): void;
}) {
  const callbackRef = useRef(onResult);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const mountedRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbackRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || runningRef.current) return null;
    runningRef.current = true;
    try {
      const result = await fetchSpinnerLiveSnapshot();
      if (!mountedRef.current) return null;
      callbackRef.current(result);
      setConnected(true);
      setError(null);
      return result;
    } catch (reason) {
      if (!mountedRef.current) return null;
      setConnected(false);
      setError(reason instanceof Error ? reason.message : "The live draw could not be synchronized.");
      return null;
    } finally {
      runningRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const poll = async () => {
      const result = await refresh();
      if (cancelled) return;
      const delay = !result
        ? ERROR_POLL_MS
        : spinnerLivePollInterval(result.snapshot, result.serverNow);
      timerRef.current = setTimeout(poll, delay);
    };

    void poll();
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onPageShow = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refresh]);

  return { connected, error, refresh };
}
