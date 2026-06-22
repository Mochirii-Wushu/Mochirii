import Image from "next/image";

type TesterGateError = "invalid" | "missing-config" | null;

const errorCopy: Record<Exclude<TesterGateError, null>, string> = {
  invalid: "That password did not work. Check the tester invite and try again.",
  "missing-config": "This playtest gate is not ready yet. Please check back after the next tester notice.",
};

export function MochiSocialTesterPasswordGate({ error }: { error: TesterGateError }) {
  const hasError = Boolean(error);
  const descriptionId = "mochi-social-gate-description";
  const errorId = "mochi-social-gate-error";

  return (
    <section className="mochi-game-shell mochi-game-shell--locked" aria-label="Mochi Social tester access">
      <div className="mochi-arrival-scene" aria-hidden="true">
        <Image
          className="mochi-arrival-scene__image"
          src="/assets/img/mochi-social/gate-arrival.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 980px) calc(100vw - 48px), 38vw"
        />
        <div className="mochi-arrival-scene__caption">
          <span>Guild arrival</span>
          <strong>Closed Mochirii playtest</strong>
        </div>
      </div>
      <header className="mochi-game-status mochi-game-status--arrival">
        <div className="mochi-game-status__copy">
          <p className="eyebrow">Mochirii World</p>
          <h1>Mochi Social</h1>
          <p id={descriptionId}>
            A cozy 3D room where approved testers create a curated character, gather with guild friends,
            and meet the shared starter pet Lirabao.
          </p>
        </div>
        <dl>
          <div>
            <dt>Playtest</dt>
            <dd>Closed alpha</dd>
          </div>
          <div>
            <dt>Purchases</dt>
            <dd>None</dd>
          </div>
          <div>
            <dt>Best on</dt>
            <dd>Desktop</dd>
          </div>
        </dl>
      </header>
      <div className="mochi-game-preview-contract mochi-game-preview-contract--locked" aria-label="Mochi Social preview contract">
        <span>Shared 3D room</span>
        <span>One room together</span>
        <span>Shared Lirabao</span>
        <span>Room preview</span>
      </div>
      <form
        className="mochi-game-panel mochi-tester-login"
        method="post"
        action="/games/mochi-social/tester-login"
        aria-describedby={hasError ? `${descriptionId} ${errorId}` : descriptionId}
      >
        <div>
          <p className="mochi-gate-kicker">Guild invitation</p>
          <h2>Enter Mochi World</h2>
          <p>Use the tester password from your Mochirii playtest invite.</p>
          <span className="sr-only">Tester password required</span>
        </div>
        {error ? (
          <p className="form-message mochi-form-message" id={errorId} role="alert">
            {errorCopy[error]}
          </p>
        ) : null}
        <label htmlFor="current-password">
          <span>Tester password</span>
          <input
            id="current-password"
            autoComplete="current-password"
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={hasError ? errorId : descriptionId}
            name="testerPassword"
            required
            type="password"
          />
        </label>
        <button className="hero-cta hero-cta--primary mochi-gate-submit" type="submit">Unlock playtest</button>
      </form>
      <aside className="mochi-game-panel mochi-gate-notes" aria-label="Mochi Social access notes">
        <section>
          <h2>What you can test</h2>
          <ul>
            <li>Create a character from curated alpha presets.</li>
            <li>Enter the Jade Lantern room and make sure the room opens smoothly.</li>
            <li>Try local chat, waves, emotes, and nearby tester presence.</li>
            <li>Interact with the shared Lirabao pet state.</li>
          </ul>
        </section>
        <section>
          <h2>Your playtest mission</h2>
          <ol>
            <li>Create a character preset.</li>
            <li>Wave or chat with another tester.</li>
            <li>Care for Lirabao and confirm the shared pet state updates.</li>
            <li>Send feedback before you leave.</li>
          </ol>
        </section>
        <section className="mochi-preview-safety">
          <h2>Good to know</h2>
          <ul>
            <li>No real money, purchases, rewards, or permanent item value.</li>
            <li>Desktop is recommended for this early build.</li>
            <li>The tester password opens the room preview; sign in with your Mochirii account for saved character and Lirabao progress.</li>
            <li>This closed playtest stays focused on one shared guild room and Lirabao care.</li>
          </ul>
        </section>
      </aside>
    </section>
  );
}
