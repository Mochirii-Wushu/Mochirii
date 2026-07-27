"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  latestOfficialRaffleWinnerApiIsEmpty,
  parseLatestOfficialRaffleWinnerApi,
  type LatestOfficialRaffleWinner,
} from "@/lib/raffle/latest-winner-core";
import { RaffleDateTime } from "./RaffleDateTime";

type RaffleMonthlyWinnerProps = {
  initialWinner: LatestOfficialRaffleWinner | null;
  enableRefresh?: boolean;
};

type AuthRuntime = typeof import("./raffle-winner-runtime");

export function RaffleMonthlyWinner({
  initialWinner,
  enableRefresh = true,
}: RaffleMonthlyWinnerProps) {
  const [winner, setWinner] = useState(initialWinner);
  const runtimeRef = useRef<AuthRuntime | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const lastRefreshStartedRef = useRef(0);

  const refresh = useCallback(async (knownAccessToken?: string | null) => {
    const generation = ++requestGenerationRef.current;
    requestControllerRef.current?.abort();
    lastRefreshStartedRef.current = Date.now();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const runtime = runtimeRef.current ?? await import("./raffle-winner-runtime");
      runtimeRef.current = runtime;
      const accessToken = knownAccessToken === undefined
        ? await runtime.readRaffleWinnerAccessToken()
        : knownAccessToken;
      const response = await fetch("/api/raffle/latest-winner", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) return;
      const payload = await response.json();
      const nextWinner = parseLatestOfficialRaffleWinnerApi(payload);
      if (!mountedRef.current || generation !== requestGenerationRef.current) return;
      if (nextWinner) setWinner(nextWinner);
      else if (latestOfficialRaffleWinnerApiIsEmpty(payload)) setWinner(null);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        // Preserve the last verified public result when a refresh is unavailable.
      }
    } finally {
      window.clearTimeout(timeout);
      if (generation === requestGenerationRef.current) {
        requestControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!enableRefresh) return;
    mountedRef.current = true;
    lastRefreshStartedRef.current = Date.now();
    let cancelled = false;
    let unsubscribe: () => void = () => {};
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    const refreshIfStale = () => {
      if (Date.now() - lastRefreshStartedRef.current >= 15_000) void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };
    const onFocus = () => refreshIfStale();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    void import("./raffle-winner-runtime").then((runtime) => {
      if (cancelled) return;
      runtimeRef.current = runtime;
      unsubscribe = runtime.subscribeToRaffleWinnerAuth((event, accessToken) => {
        if (event === "INITIAL_SESSION" && !accessToken) return;
        if (event === "SIGNED_OUT") {
          requestGenerationRef.current += 1;
          requestControllerRef.current?.abort();
          requestControllerRef.current = null;
          setWinner((current) => current ? { ...current, displayName: null } : null);
        }
        void refresh(accessToken);
      });
    });
    return () => {
      cancelled = true;
      mountedRef.current = false;
      requestGenerationRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      window.clearInterval(interval);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [enableRefresh, refresh]);

  if (!winner) return null;
  const visibleLabel = winner.displayName || winner.publicLabel;

  return (
    <section
      className="raffle-monthly-winner"
      aria-labelledby="raffleMonthlyWinnerHeading"
      aria-live="polite"
      data-member-name-visible={winner.displayName ? "true" : "false"}
    >
      <span className="raffle-winner-flare raffle-winner-flare--one" aria-hidden="true" />
      <span className="raffle-winner-flare raffle-winner-flare--two" aria-hidden="true" />
      <div className="raffle-winner-emblem" aria-hidden="true" />
      <div className="raffle-winner-copy">
        <p className="kicker">Monthly guild winner</p>
        <h2 id="raffleMonthlyWinnerHeading">{visibleLabel}</h2>
        <p className="raffle-winner-confirmation">
          {winner.displayName ? "Winner Confirmed" : "The monthly drawing is complete."}
        </p>
        <dl className="raffle-date-list raffle-winner-date">
          <RaffleDateTime instant={winner.selectedAt} label="Selected" />
        </dl>
      </div>
    </section>
  );
}
