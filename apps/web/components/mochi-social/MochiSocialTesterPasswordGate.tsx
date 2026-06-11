type TesterGateError = "invalid" | "missing-config" | null;

const errorCopy: Record<Exclude<TesterGateError, null>, string> = {
  invalid: "That tester password did not unlock Mochi Social.",
  "missing-config": "The tester password is not configured for this preview yet.",
};

export function MochiSocialTesterPasswordGate({ error }: { error: TesterGateError }) {
  return (
    <section className="mochi-game-shell" aria-label="Mochi Social tester access">
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
        <span>Tester-gated page</span>
      </div>
      <form className="mochi-game-panel mochi-tester-login" method="post" action="/games/mochi-social/tester-login">
        <h2>Tester password required</h2>
        <p>Enter the closed preview password to open the live Mochi Social game page.</p>
        {error ? <p className="form-message" role="alert">{errorCopy[error]}</p> : null}
        <label>
          <span>Tester password</span>
          <input
            autoComplete="current-password"
            name="testerPassword"
            required
            type="password"
          />
        </label>
        <button className="hero-cta hero-cta--primary" type="submit">Open game</button>
      </form>
    </section>
  );
}
