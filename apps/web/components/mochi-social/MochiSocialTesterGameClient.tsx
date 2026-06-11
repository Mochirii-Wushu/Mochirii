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
    <section className="mochi-game-shell" aria-label="Mochi Social tester game">
      <header className="mochi-game-status">
        <div>
          <p className="eyebrow">Tester Preview</p>
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
            <dd>Password</dd>
          </div>
        </dl>
      </header>
      <div className="mochi-game-preview-contract" aria-label="Mochi Social preview contract">
        <span>Chain mode: configured-preview-stub</span>
        <span>Economy: test soft currency</span>
        <span>Market: fixed price only</span>
        <span data-mochi-bridge-state>Bridge: {bridgeStatus}</span>
      </div>
      <form className="mochi-lock-form" method="post" action="/games/mochi-social/tester-logout">
        <button className="hero-cta" type="submit">Lock game page</button>
      </form>
      {message ? <p className="form-message">{message}</p> : null}
      <iframe
        ref={iframeRef}
        className="mochi-game-frame"
        title="Mochi Social"
        src={embedUrl}
        allow="fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={sendGuestStateToGame}
      />
    </section>
  );
}
