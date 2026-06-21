"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentSession, onAuthStateChange } from "@/lib/supabase/auth";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { getMochiSocialAlphaSession, submitMochiSocialFeedback, type MochiSocialAlphaSession } from "@/lib/mochi-social/alpha";
import { resolveMochiSocialBridgeMessage, type MochiSocialBridgeStatus } from "@/lib/mochi-social/bridge";

type LoadState = "loading" | "signed-out" | "blocked" | "terms" | "ready" | "error";

const gameOrigin = (process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "https://mochi-social-game.fly.dev").replace(/\/+$/, "");
const supabaseFunctionsUrl = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "";

export function MochiSocialAlphaClient() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [session, setSession] = useState<MochiSocialAlphaSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<MochiSocialBridgeStatus>("waiting");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const embedUrl = useMemo(() => `${gameOrigin}/embed`, []);

  const sendAuthToGame = useCallback((token: string | null) => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;

    if (token) {
      frame.postMessage(
        {
          type: "MOCHI_SOCIAL_AUTH",
          protocolVersion: 1,
          payload: { accessToken: token },
          functionsUrl: supabaseFunctionsUrl || undefined,
        },
        gameOrigin,
      );
      return;
    }

    frame.postMessage({ type: "MOCHI_SOCIAL_SIGN_OUT", protocolVersion: 1 }, gameOrigin);
  }, []);

  const refresh = useCallback(async (acknowledgeTerms = false) => {
    setBusy(true);
    setMessage("");

    const auth = await getCurrentSession();
    const token = auth.data?.session?.access_token || null;
    setAccessToken(token);

    if (!auth.ok || !token) {
      setState("signed-out");
      setBusy(false);
      return;
    }

    const result = await getMochiSocialAlphaSession({ acknowledgeTerms });
    if (!result.ok || !result.data) {
      setState("error");
      setMessage(result.message || "Mochi Social alpha access could not be checked.");
      setBusy(false);
      return;
    }

    setSession(result.data);
    if (!result.data.hasAccess) {
      setState("blocked");
    } else if (!result.data.termsAccepted) {
      setState("terms");
    } else {
      setState("ready");
      window.setTimeout(() => sendAuthToGame(token), 100);
    }
    setBusy(false);
  }, [sendAuthToGame]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void refresh();
    });
    const subscription = onAuthStateChange((_event, nextSession) => {
      const token = nextSession?.access_token || null;
      setAccessToken(token);
      sendAuthToGame(token);
      void refresh();
    });

    return () => {
      cancelled = true;
      subscription.data?.subscription?.unsubscribe();
    };
  }, [refresh, sendAuthToGame]);

  useEffect(() => {
    const handleGameMessage = (event: MessageEvent) => {
      if (event.origin !== gameOrigin || !event.data || typeof event.data !== "object") return;
      const bridgeMessage = resolveMochiSocialBridgeMessage(event.data);
      if (bridgeMessage.action === "ignore") return;

      if (bridgeMessage.action === "send-auth") {
        setBridgeStatus(bridgeMessage.status);
        sendAuthToGame(accessToken);
        return;
      }

      if (bridgeMessage.action === "set-status") {
        setBridgeStatus(bridgeMessage.status);
        return;
      }

      setBridgeStatus(bridgeMessage.status);
      setMessage(bridgeMessage.message);
    };

    window.addEventListener("message", handleGameMessage);
    return () => window.removeEventListener("message", handleGameMessage);
  }, [accessToken, sendAuthToGame]);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = feedback.trim();
    if (!text) return;
    setBusy(true);
    const result = await submitMochiSocialFeedback({
      category: "alpha",
      message: text,
      session_id: session?.userId,
    });
    setBusy(false);
    if (result.ok) {
      setFeedback("");
      setMessage("Feedback saved for the alpha notes.");
    } else {
      setMessage(result.message || "Feedback could not be saved.");
    }
  };

  return (
    <section className="mochi-game-shell" aria-label="Mochi Social alpha">
      <header className="mochi-game-status">
        <div>
          <p className="eyebrow">Closed Alpha</p>
          <h1>Mochi Social</h1>
        </div>
        <dl>
          <div>
            <dt>Engine</dt>
            <dd>Unity WebGL</dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>Shared alpha</dd>
          </div>
          <div>
            <dt>Pet</dt>
            <dd>Lirabao</dd>
          </div>
        </dl>
      </header>
      <div className="mochi-game-preview-contract" aria-label="Mochi Social preview contract">
        <span>Engine: Unity WebGL</span>
        <span>Room: {session?.unity?.roomKey || "jade-lantern-room-alpha"}</span>
        <span>Mode: single shared room</span>
        <span>Capacity: {session?.unity?.roomCapacity || 25} testers</span>
        <span>Pet: shared Lirabao</span>
        <span>Value: No real value</span>
        <span>Progress: {session?.progress ? `account sync r${session.progress.revision}` : "account sync ready"}</span>
        <span data-mochi-bridge-state>Bridge: {bridgeStatus}</span>
      </div>

      {message ? <p className="form-message">{message}</p> : null}
      {state === "loading" ? <div className="mochi-game-panel">Checking alpha access...</div> : null}

      {state === "signed-out" ? (
        <div className="mochi-game-panel">
          <h2>Sign in required</h2>
          <p>Use your Mochirii account before entering the closed Mochi Social alpha.</p>
          <Link className="hero-cta hero-cta--primary" href="/auth">Sign in</Link>
        </div>
      ) : null}

      {state === "blocked" ? (
        <div className="mochi-game-panel">
          <h2>Alpha allowlist required</h2>
          <p>Your account is signed in, but it is not active on the Mochi Social alpha tester list yet.</p>
        </div>
      ) : null}

      {state === "terms" ? (
        <div className="mochi-game-panel">
          <h2>Alpha acknowledgement</h2>
          <p>Alpha characters and the shared Lirabao state are test-only, have no real value, chat is logged for moderation, and the build may reset before release.</p>
          <button className="hero-cta hero-cta--primary" type="button" onClick={() => refresh(true)} disabled={busy}>
            I understand and enter alpha
          </button>
        </div>
      ) : null}

      {state === "error" ? (
        <div className="mochi-game-panel">
          <h2>Alpha unavailable</h2>
          <p>Try again later, or contact a leader if you should have alpha access.</p>
          <button className="hero-cta" type="button" onClick={() => refresh()} disabled={busy}>Retry</button>
        </div>
      ) : null}

      {state === "ready" ? (
        <>
          <iframe
            ref={iframeRef}
            className="mochi-game-frame"
            title="Mochi Social"
            src={embedUrl}
            allow="fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => sendAuthToGame(accessToken)}
          />
          <p className="mochi-game-note">
            Signed-in alpha play uses Supabase membership plus Unity Custom ID for account persistence. Tester-password preview remains guest-only. Enjin Canary configured-preview-stub stays future-only and no-real-value.
          </p>
          <form className="mochi-feedback" onSubmit={submitFeedback}>
            <label>
              <span>Alpha feedback</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Bug, feel, character preset, room join, Lirabao interaction, or anything that felt off."
              />
            </label>
            <button className="hero-cta" type="submit" disabled={busy || !feedback.trim()}>Send feedback</button>
          </form>
        </>
      ) : null}
    </section>
  );
}
