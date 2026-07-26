import Image from "next/image";
import { MochiPetsArrivalScene } from "./MochiPetsArrivalScene";

type TesterGateError = "invalid" | "unavailable" | null;

const errorCopy: Record<Exclude<TesterGateError, null>, string> = {
  invalid: "That password did not work. Check the tester invitation and try again.",
  unavailable: "Tester access is temporarily unavailable. Please try again after the next guild update.",
};

export function MochiPetsTesterPasswordGate({ error }: { error: TesterGateError }) {
  const hasError = Boolean(error);
  const descriptionId = "mochi-pets-gate-description";
  const errorId = "mochi-pets-gate-error";

  return (
    <section className="mochi-game-shell mochi-game-shell--locked" aria-labelledby="mochi-pets-title">
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
            <p className="eyebrow">Mōchirīī Guild Project</p>
          </div>
          <h1 id="mochi-pets-title">Mochi Pets</h1>
          <p id={descriptionId}>
            The private tester doorway is ready while the next Mochi Pets game begins later from a fresh Unity project.
          </p>
        </div>
        <dl aria-label="Mochi Pets project status">
          <div>
            <dt>Access</dt>
            <dd>Tester password</dd>
          </div>
          <div>
            <dt>Game build</dt>
            <dd>Not connected</dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>Fresh restart</dd>
          </div>
        </dl>
      </header>

      <form
        className="mochi-game-panel mochi-tester-login"
        method="post"
        action="/games/mochi-pets/tester-login"
        aria-describedby={hasError ? `${descriptionId} ${errorId}` : descriptionId}
      >
        <div>
          <p className="mochi-gate-kicker">Guild invitation</p>
          <h2>Enter the tester space</h2>
          <p>Use the password provided with your Mochirii tester invitation.</p>
        </div>
        {error ? (
          <p className="form-message mochi-form-message" id={errorId} role="alert">
            {errorCopy[error]}
          </p>
        ) : null}
        <label htmlFor="mochi-pets-tester-password">
          <span>Tester password</span>
          <input
            id="mochi-pets-tester-password"
            autoComplete="current-password"
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={hasError ? errorId : descriptionId}
            name="testerPassword"
            required
            type="password"
          />
        </label>
        <button className="hero-cta hero-cta--primary mochi-gate-submit" type="submit">
          Unlock tester space
        </button>
      </form>

      <aside className="mochi-game-panel mochi-gate-notes" aria-label="Mochi Pets tester information">
        <section>
          <h2>What is ready</h2>
          <ul>
            <li>The Mochirii tester-password doorway and private eight-hour browser session.</li>
            <li>A protected waiting area for approved guild testers.</li>
            <li>A versioned connection point for the new game repository.</li>
          </ul>
        </section>
        <section>
          <h2>What comes next</h2>
          <ul>
            <li>A first reviewed build from the fresh Mochi Pets Unity project.</li>
            <li>A reviewed game build with its own security and data contract.</li>
            <li>Preview testing before any build is connected here.</li>
          </ul>
        </section>
      </aside>

      <div className="mochi-game-preview-contract" aria-label="Mochi Pets launch boundaries">
        <span>Private tester doorway</span>
        <span>New Unity foundation</span>
        <span>No playable build yet</span>
        <span>No purchases</span>
      </div>
    </section>
  );
}
