"use client";

import Image from "next/image";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startCelebration, type CelebrationHandle } from "./celebration";
import { resolveCelebrationMotionMode } from "./celebration-scene";
import {
  parseStoredMotion,
  SETTINGS_STORAGE_KEY,
  type MotionMode,
  type ParticipantV1,
} from "./raffle";
import {
  spinnerLiveMotionRotations,
  spinnerLiveTimeline,
  type SpinnerLivePhase,
  type SpinnerLiveResultV1,
  type SpinnerLiveSnapshotV1,
} from "./live";
import { useSpinnerLive } from "./use-spinner-live";
import { drawWheel } from "./wheel";

type VisibleWinner = {
  drawId: string;
  participant: ParticipantV1;
  selectedIndex: number;
  participantCount: number;
};
type WheelMotion = {
  drawId: string;
  startRotation: number;
  finalRotation: number;
  durationMs: number;
  delayMs: number;
};
type WheelMotionStyle = CSSProperties & {
  "--spinner-wheel-start"?: string;
  "--spinner-wheel-finish"?: string;
};
type CelebrationStyle = CSSProperties & {
  "--spinner-celebration-delay"?: string;
};

function snapshotKey(snapshot: SpinnerLiveSnapshotV1) {
  return `${snapshot.revision}:${snapshot.phase}:${snapshot.drawId || "idle"}`;
}

export function ViewerRaffleSpinner() {
  const [participants, setParticipants] = useState<ParticipantV1[]>([]);
  const [phase, setPhase] = useState<SpinnerLivePhase>("idle");
  const [winner, setWinner] = useState<VisibleWinner | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelMotion, setWheelMotion] = useState<WheelMotion | null>(null);
  const [effectsActive, setEffectsActive] = useState(false);
  const [celebrationRequestId, setCelebrationRequestId] = useState(0);
  const [celebrationAnimationDelayMs, setCelebrationAnimationDelayMs] = useState(0);
  const [status, setStatus] = useState("Connecting to the shared draw stage.");
  const [motionMode, setMotionMode] = useState<MotionMode>("reduced");
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);

  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const wheelFrameRef = useRef<HTMLDivElement>(null);
  const celebrationCanvasRef = useRef<HTMLCanvasElement>(null);
  const winnerRevealRef = useRef<HTMLDivElement>(null);
  const pendingCelebrationRef = useRef<{
    drawId: string;
    revealAt: string | null;
  } | null>(null);
  const celebrationRef = useRef<CelebrationHandle | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedKeyRef = useRef("");
  const celebratedDrawIdRef = useRef<string | null>(null);
  const liveSnapshotRef = useRef<SpinnerLiveSnapshotV1 | null>(null);
  const preferredMotionRef = useRef<MotionMode>("reduced");
  const effectiveMotionRef = useRef<MotionMode>("reduced");
  const refreshLiveRef = useRef<(() => void) | null>(null);
  const serverClockOffsetRef = useRef(0);
  const mountedRef = useRef(true);

  const numberedParticipants = useMemo(
    () => participants.map((participant, index) => ({ ...participant, number: index + 1 })),
    [participants],
  );

  const stopTimeline = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
  }, []);

  const stopCelebration = useCallback(() => {
    pendingCelebrationRef.current = null;
    celebrationRef.current?.stop();
    celebrationRef.current = null;
    setEffectsActive(false);
  }, []);

  const playWinnerCelebration = useCallback((drawId: string, revealAt: string | null) => {
    const selectedMode = effectiveMotionRef.current;
    if (celebratedDrawIdRef.current === drawId || document.hidden || selectedMode === "off") return;
    stopCelebration();
    const canvas = celebrationCanvasRef.current;
    if (!canvas) return;
    celebratedDrawIdRef.current = drawId;
    const authoritativeNowMs = Date.now() + serverClockOffsetRef.current;
    const parsedRevealAtMs = revealAt ? Date.parse(revealAt) : Number.NaN;
    const handleRevealAtMs = Number.isFinite(parsedRevealAtMs)
      ? parsedRevealAtMs
      : authoritativeNowMs;
    const handle = startCelebration(canvas, {
      mode: selectedMode,
      drawId,
      revealAtMs: handleRevealAtMs,
      authoritativeNowMs,
      protectedRegion: winnerRevealRef.current?.getBoundingClientRect() ?? null,
    });
    if (!handle.active) return;
    setCelebrationAnimationDelayMs(-Math.min(4_800, Math.max(0, authoritativeNowMs - handleRevealAtMs)));
    celebrationRef.current = handle;
    setEffectsActive(true);
    void handle.finished.then(() => {
      if (!mountedRef.current || celebrationRef.current !== handle) return;
      celebrationRef.current = null;
      setEffectsActive(false);
    });
  }, [stopCelebration]);

  const queueWinnerCelebration = useCallback((drawId: string, revealAt: string | null) => {
    pendingCelebrationRef.current = { drawId, revealAt };
    setCelebrationRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    const pending = pendingCelebrationRef.current;
    if (!pending || phase !== "revealed") return;
    const animationFrame = requestAnimationFrame(() => {
      if (pendingCelebrationRef.current !== pending) return;
      pendingCelebrationRef.current = null;
      playWinnerCelebration(pending.drawId, pending.revealAt);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [celebrationRequestId, phase, playWinnerCelebration]);

  const revealSnapshot = useCallback((snapshot: SpinnerLiveSnapshotV1) => {
    if (!snapshot.winner || snapshot.selectedIndex == null || !snapshot.drawId) return;
    stopTimeline();
    setWheelMotion(null);
    setWheelRotation(snapshot.finalRotation);
    setPhase("revealed");
    setWinner({
      drawId: snapshot.drawId,
      participant: snapshot.winner,
      selectedIndex: snapshot.selectedIndex,
      participantCount: snapshot.participants.length,
    });
    setStatus(`Winner: ${snapshot.winner.displayName}.`);
    queueWinnerCelebration(snapshot.drawId, snapshot.revealAt);
  }, [queueWinnerCelebration, stopTimeline]);

  const applyLiveResult = useCallback((result: SpinnerLiveResultV1) => {
    const { snapshot, serverNow } = result;
    const serverNowMs = Date.parse(serverNow);
    if (Number.isFinite(serverNowMs)) {
      serverClockOffsetRef.current = serverNowMs - Date.now();
    }
    const key = snapshotKey(snapshot);
    if (appliedKeyRef.current === key) return;
    appliedKeyRef.current = key;
    liveSnapshotRef.current = snapshot;
    setParticipants(snapshot.participants);

    if (snapshot.phase === "idle") {
      stopTimeline();
      stopCelebration();
      setWinner(null);
      setPhase("idle");
      setWheelMotion(null);
      setWheelRotation(snapshot.finalRotation);
      setStatus(snapshot.participants.length >= 2
        ? `${snapshot.participants.length} equal chances are ready. Waiting for a moderator to spin.`
        : "Waiting for a moderator to prepare the next roster.");
      return;
    }

    const revealAtMs = snapshot.revealAt ? Date.parse(snapshot.revealAt) : 0;
    if (snapshot.phase === "revealed" || Date.parse(serverNow) >= revealAtMs) {
      revealSnapshot(snapshot);
      return;
    }

    stopTimeline();
    setWinner(null);
    setPhase("spinning");
    const timeline = spinnerLiveTimeline(snapshot, serverNow, motionMode);
    const rotations = spinnerLiveMotionRotations(snapshot, motionMode);
    setWheelMotion(null);
    setWheelRotation(snapshot.startRotation);
    setStatus(`The roster is locked. Revealing one of ${snapshot.participants.length} equal chances…`);

    if (timeline.motionDurationMs > 0 && snapshot.drawId) {
      setWheelMotion({
        drawId: snapshot.drawId,
        startRotation: rotations.startRotation,
        finalRotation: rotations.finalRotation,
        durationMs: timeline.motionDurationMs,
        delayMs: timeline.motionDelayMs,
      });
    }
    revealTimerRef.current = setTimeout(() => {
      appliedKeyRef.current = "";
      refreshLiveRef.current?.();
    }, timeline.revealDelayMs + 60);
  }, [motionMode, revealSnapshot, stopCelebration, stopTimeline]);

  const { connected, error, refresh } = useSpinnerLive({
    enabled: motionPreferenceReady,
    onResult: applyLiveResult,
  });

  useEffect(() => {
    refreshLiveRef.current = () => void refresh();
    return () => {
      refreshLiveRef.current = null;
    };
  }, [refresh]);

  useEffect(() => {
    mountedRef.current = true;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readPreference = (storedValue: string | null) => storedValue == null
      ? "reduced"
      : parseStoredMotion(storedValue);
    try {
      preferredMotionRef.current = readPreference(window.localStorage.getItem(SETTINGS_STORAGE_KEY));
    } catch {
      preferredMotionRef.current = "reduced";
    }
    const updateMotion = () => {
      const nextMotionMode = resolveCelebrationMotionMode(
        preferredMotionRef.current,
        media.matches,
      );
      if (nextMotionMode !== effectiveMotionRef.current) stopCelebration();
      effectiveMotionRef.current = nextMotionMode;
      setMotionMode(nextMotionMode);
      setMotionPreferenceReady(true);
      appliedKeyRef.current = "";
      void refreshLiveRef.current?.();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_STORAGE_KEY) return;
      preferredMotionRef.current = readPreference(event.newValue);
      updateMotion();
    };
    updateMotion();
    media.addEventListener("change", updateMotion);
    window.addEventListener("storage", onStorage);
    return () => {
      mountedRef.current = false;
      media.removeEventListener("change", updateMotion);
      window.removeEventListener("storage", onStorage);
    };
  }, [stopCelebration]);

  useEffect(() => {
    const canvas = wheelCanvasRef.current;
    const frame = wheelFrameRef.current;
    if (!canvas || !frame) return;
    const render = () => drawWheel(canvas, participants);
    render();
    void document.fonts?.ready.then(() => {
      if (mountedRef.current) render();
    });
    const observer = new ResizeObserver(render);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [participants, wheelMotion?.drawId]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) stopCelebration();
      const snapshot = liveSnapshotRef.current;
      if (snapshot?.phase !== "spinning") return;
      if (!document.hidden) appliedKeyRef.current = "";
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [stopCelebration]);

  useEffect(() => {
    if (!error) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) stopCelebration();
    });
    return () => {
      cancelled = true;
    };
  }, [error, stopCelebration]);

  useEffect(() => () => {
    stopTimeline();
    celebrationRef.current?.stop();
    celebrationRef.current = null;
  }, [stopTimeline]);

  const wheelStyle: WheelMotionStyle = {
    transform: `rotate(${wheelRotation}deg)`,
    ...(wheelMotion ? {
      animationName: "spinner-live-wheel-turn",
      animationDuration: `${wheelMotion.durationMs}ms`,
      animationDelay: `${wheelMotion.delayMs}ms`,
      animationTimingFunction: "cubic-bezier(0.12, 0.72, 0.12, 1)",
      animationFillMode: "both",
      "--spinner-wheel-start": `${wheelMotion.startRotation}deg`,
      "--spinner-wheel-finish": `${wheelMotion.finalRotation}deg`,
    } : {}),
  };

  return (
    <main
      className={`raffle-app raffle-app--viewer ${effectsActive ? "is-celebrating" : ""} ${motionMode === "reduced" ? "is-motion-reduced" : ""}`}
      id="main"
      style={{ "--spinner-celebration-delay": `${celebrationAnimationDelayMs}ms` } as CelebrationStyle}
    >
      {motionPreferenceReady && motionMode !== "off" ? (
        <canvas ref={celebrationCanvasRef} className="celebration-canvas" aria-hidden="true" />
      ) : null}

      <header className="raffle-masthead">
        <div className="raffle-brand-lockup">
          <span className="eyebrow">Mōchirīī Guild · Live Draw</span>
          <h1>Mōchirīī Moonwheel</h1>
          <p>Every name, one equal chance. Watching the shared draw in real time.</p>
        </div>
        <p className={`live-stage-badge ${connected ? "is-connected" : ""}`} role="status">
          {connected ? "Live stage connected" : "Reconnecting to live stage"}
        </p>
      </header>

      <div className="raffle-layout">
        <section className="draw-stage" aria-labelledby="draw-stage-title" aria-busy={phase === "spinning"}>
          <div className="stage-heading">
            <div>
              <span className="eyebrow">Moonlit selection chamber</span>
              <h2 id="draw-stage-title">Draw Stage</h2>
            </div>
            <span className="chance-badge">{participants.length} equal {participants.length === 1 ? "chance" : "chances"}</span>
          </div>

          <div
            ref={wheelFrameRef}
            className={`wheel-frame ${phase === "spinning" && motionMode === "full" && wheelMotion ? "is-spinning" : ""}`}
          >
            <div className="wheel-pointer" aria-hidden="true"><span /></div>
            <div
              key={wheelMotion?.drawId ?? "settled"}
              className="wheel-rotor"
              style={wheelStyle}
            >
              <canvas ref={wheelCanvasRef} className="wheel-canvas" aria-hidden="true" />
              <span className="wheel-hub" aria-hidden="true">
                <Image src="/assets/img/brand/emblem.webp" alt="" fill sizes="(max-width: 720px) 84px, 118px" priority />
              </span>
            </div>
          </div>

          <div
            ref={winnerRevealRef}
            className={`winner-reveal ${phase === "revealed" && winner ? "is-visible" : ""}`}
          >
            {phase === "revealed" && winner ? (
              <>
                <span className="eyebrow">The moonwheel has spoken</span>
                <h3>{winner.participant.displayName}</h3>
                <p>Entry {winner.selectedIndex + 1} of {winner.participantCount}</p>
              </>
            ) : (
              <>
                <span className="eyebrow">{phase === "spinning" ? "The shared draw is underway" : "Awaiting the next draw"}</span>
                <h3>{phase === "spinning" ? "Fate is turning…" : "Fortune gathers"}</h3>
              </>
            )}
          </div>

          <p className="draw-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
          {error ? <p className="inline-notice" role="status">{error}</p> : null}
          {effectsActive ? <p className="visually-hidden" role="status">Winner celebration in progress.</p> : null}
        </section>

        <aside className="roster-panel roster-panel--viewer" aria-labelledby="roster-title">
          <div className="roster-heading">
            <div>
              <span className="eyebrow">Ordered entries</span>
              <h2 id="roster-title">Raffle Roster</h2>
            </div>
            <span className="roster-count" aria-label={`${participants.length} names`}>{participants.length}</span>
          </div>

          <div className="roster-scroll" tabIndex={0} role="region" aria-label="Numbered raffle participants">
            {numberedParticipants.length ? (
              <ol className="participant-list">
                {numberedParticipants.map((participant) => (
                  <li key={participant.id} className="participant-row participant-row--viewer">
                    <span className="participant-number" aria-hidden="true">{participant.number}</span>
                    <span className="participant-name"><span className="visually-hidden">Entry {participant.number}: </span>{participant.displayName}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-roster">
                <span aria-hidden="true">蓮</span>
                <h3>Awaiting roster</h3>
                <p>A moderator will prepare the next shared draw.</p>
              </div>
            )}
          </div>

          <p className="privacy-note">View-only live stage · The active roster remains until replaced or cleared · Draw records may retain names for 30 days</p>
        </aside>
      </div>
    </main>
  );
}
