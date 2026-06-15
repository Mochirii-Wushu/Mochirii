"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveMochiSocialBridgeMessage, type MochiSocialBridgeStatus } from "@/lib/mochi-social/bridge";

const gameOrigin = (process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "https://mochi-social-game.fly.dev").replace(/\/+$/, "");
const testerFeedbackStorageKey = "mochiSocial.testerFeedbackDraft";

type TesterFeedbackDraft = {
  category: "tester-password-alpha";
  message: string;
  bridgeStatus: MochiSocialBridgeStatus;
  gameOrigin: string;
  noRealValue: true;
  providerSubmitted: false;
  createdAt: string;
  handoffNote: string;
};

function buildTesterFeedbackHandoff(draft: Omit<TesterFeedbackDraft, "handoffNote">) {
  return [
    "Mochi Social Alpha Tester Feedback",
    `Category: ${draft.category}`,
    `Bridge status: ${draft.bridgeStatus}`,
    `Game origin: ${draft.gameOrigin}`,
    "No real value: true",
    "Provider submitted: false",
    `Created at: ${draft.createdAt}`,
    "",
    "Message:",
    draft.message,
  ].join("\n");
}

export function MochiSocialTesterGameClient() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<MochiSocialBridgeStatus>("waiting");
  const [message, setMessage] = useState("");
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [feedbackHandoff, setFeedbackHandoff] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const embedUrl = useMemo(() => `${gameOrigin}/embed`, []);

  const sendGuestStateToGame = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "MOCHI_SOCIAL_SIGN_OUT", protocolVersion: 1 }, gameOrigin);
  }, []);

  useEffect(() => {
    const handleGameMessage = (event: MessageEvent) => {
      if (event.origin !== gameOrigin || !event.data || typeof event.data !== "object") return;
      const bridgeMessage = resolveMochiSocialBridgeMessage(event.data);
      if (bridgeMessage.action === "ignore") return;

      if (bridgeMessage.action === "send-auth") {
        setBridgeStatus(bridgeMessage.status);
        sendGuestStateToGame();
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
  }, [sendGuestStateToGame]);

  useEffect(() => {
    if (bridgeStatus !== "waiting" && bridgeStatus !== "ready") return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      sendGuestStateToGame();
      if (attempts >= 8) window.clearInterval(interval);
    }, 750);

    sendGuestStateToGame();

    return () => window.clearInterval(interval);
  }, [bridgeStatus, sendGuestStateToGame]);

  const saveFeedbackDraft = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = feedbackDraft.trim();
    if (!text) return;

    const draftBase: Omit<TesterFeedbackDraft, "handoffNote"> = {
      category: "tester-password-alpha",
      message: text,
      bridgeStatus,
      gameOrigin,
      noRealValue: true,
      providerSubmitted: false,
      createdAt: new Date().toISOString(),
    };
    const draft: TesterFeedbackDraft = {
      ...draftBase,
      handoffNote: buildTesterFeedbackHandoff(draftBase),
    };

    window.localStorage.setItem(testerFeedbackStorageKey, JSON.stringify(draft));
    setFeedbackDraft("");
    setFeedbackHandoff(draft.handoffNote);
    setFeedbackMessage("Feedback draft saved locally for tester follow-up. No provider submission was made.");
  }, [bridgeStatus, feedbackDraft]);

  return (
    <section className="mochi-game-shell mochi-game-shell--unlocked" aria-label="Mochi Social tester game">
      <header className="mochi-game-status mochi-game-status--live">
        <div className="mochi-game-status__copy">
          <p className="eyebrow">Mochi Social unlocked</p>
          <h1>Mochi Social</h1>
          <p>
            Welcome in. Explore the town, raise your active spirit, and test social play with
            no purchases or permanent blockchain value.
          </p>
        </div>
        <dl>
          <div>
            <dt>Mode</dt>
            <dd>Closed alpha</dd>
          </div>
          <div>
            <dt>Value</dt>
            <dd>No purchases</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Tester pass</dd>
          </div>
          <div>
            <dt>Bridge</dt>
            <dd data-mochi-bridge-state>{bridgeStatus}</dd>
          </div>
        </dl>
      </header>
      <div className="mochi-game-preview-contract mochi-game-preview-contract--live" aria-label="Mochi Social preview contract">
        <span>Local town</span>
        <span>Mochi Spirit care</span>
        <span>Test coins only</span>
        <span>Market board preview</span>
        <span>No real value</span>
      </div>
      <div className="mochi-live-toolbar">
        <p>
          Blockchain features are in preview safety mode. Canary requests are test records only;
          nothing is permanent unless a later finalized chain proof is approved.
          <span className="mochi-preview-safety-inline"> Enjin Canary configured-preview-stub.</span>
        </p>
        <form className="mochi-lock-form" method="post" action="/games/mochi-social/tester-logout">
          <button className="hero-cta" type="submit">Lock game page</button>
        </form>
      </div>
      {message ? <p className="form-message mochi-form-message">{message}</p> : null}
      <div className="mochi-game-frame-shell" aria-label="Mochi Social embedded game">
        <iframe
          ref={iframeRef}
          className="mochi-game-frame"
          title="Mochi Social"
          src={embedUrl}
          allow="fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={sendGuestStateToGame}
        />
      </div>
      <form className="mochi-feedback mochi-feedback--tester" onSubmit={saveFeedbackDraft}>
        <label>
          <span>Alpha feedback draft</span>
          <textarea
            data-mochi-tester-feedback
            rows={3}
            maxLength={2000}
            value={feedbackDraft}
            onChange={(event) => setFeedbackDraft(event.target.value)}
            placeholder="Bug, feel, social loop, spirit care, trade preview, or anything that felt off."
          />
        </label>
        <button
          className="hero-cta"
          type="submit"
          data-mochi-tester-feedback-save
          disabled={!feedbackDraft.trim()}
        >
          Save feedback draft
        </button>
        {feedbackMessage ? (
          <p className="form-message mochi-form-message" data-mochi-tester-feedback-status role="status">
            {feedbackMessage}
          </p>
        ) : null}
        {feedbackHandoff ? (
          <label className="mochi-feedback__handoff">
            <span>Tester handoff note</span>
            <textarea
              data-mochi-tester-feedback-handoff
              readOnly
              rows={7}
              value={feedbackHandoff}
            />
          </label>
        ) : null}
      </form>
    </section>
  );
}
