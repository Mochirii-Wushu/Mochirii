"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  SPINNER_SESSION_HEARTBEAT_MS,
  type SpinnerAccessMode,
} from "@/lib/spinner/session-policy";
import { SPINNER_SESSION_INVALID_EVENT } from "./live";

async function requestSpinnerSession(init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch("/spinner/session", {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function SpinnerSessionGuard({
  mode,
  children,
}: {
  mode: SpinnerAccessMode;
  children: ReactNode;
}) {
  const [active, setActive] = useState(true);
  const checkingRef = useRef(false);
  const endingRef = useRef(false);
  const mountedRef = useRef(true);

  const endSession = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    if (mountedRef.current) setActive(false);

    try {
      await requestSpinnerSession({
        method: "DELETE",
        headers: { Accept: "application/json" },
        keepalive: true,
      }, 4_000);
    } catch {
      // The cookie remains bounded by its short server-issued expiry.
    } finally {
      if (!mountedRef.current) return;
      const returnPath = mode === "controller" ? "/leader-dashboard" : "/account";
      window.location.replace(`${returnPath}?spinner=expired`);
    }
  }, [mode]);

  const checkSession = useCallback(async () => {
    if (checkingRef.current || endingRef.current) return;
    checkingRef.current = true;
    try {
      const response = await requestSpinnerSession({
        method: "GET",
        headers: { Accept: "application/json" },
      }, 8_000);
      if (response.status !== 204) {
        await endSession();
        return;
      }

      const nextMode = response.headers.get("X-Spinner-Mode");
      if (nextMode !== "controller" && nextMode !== "viewer") {
        await endSession();
        return;
      }
      if (nextMode !== mode) window.location.replace("/spinner");
    } catch {
      await endSession();
    } finally {
      checkingRef.current = false;
    }
  }, [endSession, mode]);

  useEffect(() => {
    mountedRef.current = true;
    void checkSession();

    const interval = window.setInterval(() => void checkSession(), SPINNER_SESSION_HEARTBEAT_MS);
    const onFocus = () => void checkSession();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkSession();
    };
    const onSessionInvalid = () => void endSession();
    window.addEventListener("focus", onFocus);
    window.addEventListener(SPINNER_SESSION_INVALID_EVENT, onSessionInvalid);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(SPINNER_SESSION_INVALID_EVENT, onSessionInvalid);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkSession, endSession]);

  if (!active) {
    return (
      <main className="spinner-session-ended" id="main">
        <p role="status" aria-live="assertive">This private session has ended. Returning to the entry page.</p>
      </main>
    );
  }

  return children;
}
