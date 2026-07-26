import Image from "next/image";
import type { MochiPetsConnection } from "@/lib/mochi-pets/connection";
import { MochiPetsArrivalScene } from "./MochiPetsArrivalScene";

export function MochiPetsTesterWaitingRoom({ connection }: { connection: MochiPetsConnection }) {
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
          <h1 id="mochi-pets-title">Mochi Pets</h1>
          <p>
            Tester access is active for this page. A fresh Mochi Pets game is planned for the browser and Mochirii iPhone app, but neither version is playable yet.
          </p>
        </div>
        <form className="mochi-lock-form" method="post" action="/games/mochi-pets/tester-logout">
          <button className="hero-cta" type="submit">Lock tester space</button>
        </form>
      </header>

      <section
        className="mochi-game-panel mochi-connection-panel"
        aria-labelledby="mochi-pets-connection-title"
        data-mochi-pets-connection-state={connection.status}
      >
        <p className="mochi-gate-kicker">Future game</p>
        <h2 id="mochi-pets-connection-title">A fresh start for browser and iPhone</h2>
        <p>
          Mochi Pets will begin as a new game for this page and the Mochirii iPhone app. Guild members are planned to use Mochirii member access across both, with conversation continuing through Mochirii Social. Development and play have not launched.
        </p>
        <dl className="mochi-connection-facts">
          <div>
            <dt>Play status</dt>
            <dd>{connection.status === "not-connected" ? "Not playable yet" : "Available to testers"}</dd>
          </div>
          <div>
            <dt>Fresh start</dt>
            <dd>Planned</dd>
          </div>
          <div>
            <dt>Browser game</dt>
            <dd>Not playable yet</dd>
          </div>
          <div>
            <dt>iPhone game</dt>
            <dd>Not playable yet</dd>
          </div>
          <div>
            <dt>Member access</dt>
            <dd>Planned for both</dd>
          </div>
          <div>
            <dt>Guild conversation</dt>
            <dd>Planned through Mochirii Social</dd>
          </div>
        </dl>
      </section>

      <aside className="mochi-game-panel mochi-waiting-notes" aria-label="Mochi Pets fresh-start plan">
        <h2>Starting fresh</h2>
        <ul>
          <li>The retired prototype and its progress are not being restored.</li>
          <li>The browser and iPhone versions will come from the same new Mochi Pets game.</li>
          <li>Mochirii member access is planned across both versions, and guild conversation will stay in Mochirii Social.</li>
          <li>Game development has not begun, and no playable release or iPhone game connection is available.</li>
        </ul>
      </aside>
    </section>
  );
}
