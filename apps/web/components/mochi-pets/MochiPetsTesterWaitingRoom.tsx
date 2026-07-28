"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { MochiPetsArrivalScene } from "./MochiPetsArrivalScene";

export function MochiPetsTesterWaitingRoom() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="mochi-game-shell mochi-game-shell--unlocked" aria-labelledby="mochi-pets-title">
      <MochiPetsArrivalScene />

      <header className="mochi-game-status">
        <div className="mochi-game-status__copy">
          <div className="mochi-game-brand">
            <Image
              src="/assets/img/brand/emblem.webp"
              alt=""
              aria-hidden="true"
              width={48}
              height={48}
              sizes="48px"
            />
            <p className="eyebrow">Mōchirīī Tester Space</p>
          </div>
          <h1 id="mochi-pets-title" ref={titleRef} tabIndex={-1}>Mochi Pets</h1>
          <p>
            Your verified Mōchirīī membership and current tester passcode have opened the private tester space.
          </p>
        </div>
        <form className="mochi-lock-form" method="post" action="/games/mochi-pets/tester-logout">
          <button className="hero-cta" type="submit">Lock tester space</button>
        </form>
      </header>

      <section
        className="mochi-game-panel mochi-connection-panel"
        aria-labelledby="mochi-pets-connection-title"
      >
        <p className="mochi-gate-kicker">Guild-only access</p>
        <h2 id="mochi-pets-connection-title">Welcome to the tester space</h2>
        <p>
          Your member access and tester passcode are confirmed.
        </p>
        <dl className="mochi-connection-facts">
          <div>
            <dt>Access</dt>
            <dd>Confirmed</dd>
          </div>
          <div>
            <dt>Membership</dt>
            <dd>Verified</dd>
          </div>
          <div>
            <dt>Tester passcode</dt>
            <dd>Accepted</dd>
          </div>
        </dl>
      </section>

      <aside className="mochi-game-panel mochi-waiting-notes" aria-label="Mochi Pets private access guidance">
        <h2>Keep tester access private</h2>
        <ul>
          <li>Use this space only with your own verified Mōchirīī website account.</li>
          <li>Keep the current tester passcode within the approved guild tester group.</li>
          <li>Lock the tester space when you finish.</li>
        </ul>
      </aside>
    </section>
  );
}
