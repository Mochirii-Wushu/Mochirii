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
            Welcome in. This password-unlocked preview can open the shared room,
            but saved character and shared Lirabao progress require your Mochirii member sign-in.
          </p>
        </div>
        <dl>
          <div>
            <dt>Mode</dt>
            <dd>Room check</dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>Jade Lantern</dd>
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
        <span>Shared 3D room</span>
        <span>One room together</span>
        <span>Shared Lirabao</span>
        <span>Guest only</span>
        <span>No real value</span>
      </div>
      <div className="mochi-live-toolbar">
        <p>
          This guest path is for checking that the room opens. It does not save member progress.
          All playtest progress has no real value.
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
    </section>
  );
}
