"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentSession, onAuthStateChange } from "@/lib/supabase/auth";
import { getMochiSocialAlphaSession, submitMochiSocialFeedback, type MochiSocialAlphaSession } from "@/lib/mochi-social/alpha";
import { resolveMochiSocialBridgeMessage, type MochiSocialBridgeStatus } from "@/lib/mochi-social/bridge";

type LoadState = "loading" | "signed-out" | "blocked" | "terms" | "ready" | "error";

const gameOrigin = (process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "https://mochi-social-game.fly.dev").replace(/\/+$/, "");

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
            <dt>Network</dt>
            <dd>Enjin Canary</dd>
          </div>
          <div>
            <dt>Value</dt>
            <dd>No real value</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Allowlist</dd>
          </div>
          <div>
            <dt>Bridge</dt>
            <dd data-mochi-bridge-state role="status" aria-live="polite" aria-atomic="true">{bridgeStatus}</dd>
          </div>
        </dl>
      </header>
      <div className="mochi-game-preview-contract" aria-label="Mochi Social preview contract">
        <span>Chain mode: configured-preview-stub</span>
        <span>Economy: test soft currency</span>
        <span>Market: fixed price only</span>
        <span>Bridge: {bridgeStatus}</span>
      </div>

      {message ? (
        <p className="form-message" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      ) : null}
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
          <p>Mochi Social alpha assets are test-only, Enjin Canary assets have no real value, chat is logged for moderation, and the build may reset before release.</p>
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
          <section className="mochi-game-panel mochi-session-brief" aria-label="Mochi Social session cues">
            <div>
              <p className="mochi-gate-kicker">Session cues</p>
              <h2>Make this run count</h2>
            </div>
            <ul>
              <li>
                <strong>Try the loop.</strong>
                <span>Care for a Mochi Spirit, then note where the next step feels unclear.</span>
              </li>
              <li>
                <strong>Find another tester.</strong>
                <span>Use chat, waves, or emotes so presence feedback can be checked.</span>
              </li>
              <li>
                <strong>Touch the economy.</strong>
                <span>Inspect the market board with test coins only; no real value is created.</span>
              </li>
            </ul>
          </section>
          <iframe
            ref={iframeRef}
            className="mochi-game-frame"
            title="Mochi Social"
            src={embedUrl}
            allow="fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => sendAuthToGame(accessToken)}
          />
          <form className="mochi-feedback" onSubmit={submitFeedback}>
            <label>
              <span>Alpha feedback</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Bug, feel, trade flow, pet loop, or anything that felt off."
              />
            </label>
            <button className="hero-cta" type="submit" disabled={busy || !feedback.trim()}>Send feedback</button>
          </form>
        </>
      ) : null}
    </section>
  );
}
