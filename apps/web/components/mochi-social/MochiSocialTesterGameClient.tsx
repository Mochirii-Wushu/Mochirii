"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveMochiSocialBridgeMessage, type MochiSocialBridgeStatus } from "@/lib/mochi-social/bridge";

const gameOrigin = (process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "https://mochi-social-game.fly.dev").replace(/\/+$/, "");

export function MochiSocialTesterGameClient() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<MochiSocialBridgeStatus>("waiting");
  const [message, setMessage] = useState("");
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
            <dd data-mochi-bridge-state role="status" aria-live="polite" aria-atomic="true">{bridgeStatus}</dd>
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
      {message ? (
        <p className="form-message mochi-form-message" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      ) : null}
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
    </section>
  );
}
