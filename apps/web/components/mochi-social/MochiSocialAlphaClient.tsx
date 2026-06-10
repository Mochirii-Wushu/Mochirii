"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentSession, onAuthStateChange } from "@/lib/supabase/auth";
import { getMochiSocialAlphaSession, submitMochiSocialFeedback, type MochiSocialAlphaSession } from "@/lib/mochi-social/alpha";

type LoadState = "loading" | "signed-out" | "blocked" | "terms" | "ready" | "error";

const gameOrigin = (process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "https://mochi-social-game.fly.dev").replace(/\/+$/, "");

export function MochiSocialAlphaClient() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [session, setSession] = useState<MochiSocialAlphaSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
        </dl>
      </header>

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
