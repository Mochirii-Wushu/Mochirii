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
          <p>You have access to the private tester space. The new game build has not been connected yet.</p>
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
        <p className="mochi-gate-kicker">Game connection</p>
        <h2 id="mochi-pets-connection-title">Waiting for the new project</h2>
        <p>
          This doorway is ready to receive a reviewed release from the fresh Mochi Pets Unity project.
          Until then, it stays safely disconnected and does not call the retired prototype or its backend.
        </p>
        <dl className="mochi-connection-facts">
          <div>
            <dt>Connection status</dt>
            <dd>{connection.status === "not-connected" ? "Not connected" : connection.status}</dd>
          </div>
          <div>
            <dt>Contract version</dt>
            <dd>{connection.protocolVersion}</dd>
          </div>
          <div>
            <dt>Fresh source project</dt>
            <dd>{connection.repository.sourceState === "scaffolded" ? "Prepared" : "Not prepared"}</dd>
          </div>
          <div>
            <dt>Web build</dt>
            <dd>{connection.platforms.web.artifact ?? "Not available"}</dd>
          </div>
          <div>
            <dt>iOS game</dt>
            <dd>{connection.platforms.ios.artifact ?? "Not available"}</dd>
          </div>
          <div>
            <dt>Guild connection</dt>
            <dd>{connection.social.identityState === "not-connected" ? "Not connected" : "Connected"}</dd>
          </div>
        </dl>
      </section>

      <aside className="mochi-game-panel mochi-waiting-notes" aria-label="Mochi Pets clean restart boundaries">
        <h2>Clean restart preserved</h2>
        <ul>
          <li>No previous game source, saved progress, runtime, or game credential is connected.</li>
          <li>The fresh Unity source project is prepared, with no playable artifact connected.</li>
          <li>Game authentication and data access will be reviewed separately from this tester doorway.</li>
        </ul>
      </aside>
    </section>
  );
}
