import Image from "next/image";
import Link from "next/link";
import type { FormEventHandler } from "react";
import { MochiPetsArrivalScene } from "./MochiPetsArrivalScene";

export type TesterGateError = "invalid" | "member_required" | "rate_limited" | "unavailable" | null;
export type MemberGateState = "checking" | "signed-out" | "not-verified" | "ready" | "unavailable";

const errorCopy: Record<Exclude<TesterGateError, null>, string> = {
  invalid: "That password did not work. Check the tester invitation and try again.",
  member_required: "Verified Mochirii membership and the current tester passcode are both required.",
  rate_limited: "Too many passcode attempts. Wait a few minutes, then try again.",
  unavailable: "We couldn’t confirm your access. Please try again.",
};

const memberStateCopy: Record<Exclude<MemberGateState, "ready">, { title: string; body: string }> = {
  checking: {
    title: "Checking member access",
    body: "Confirming your Mochirii website sign-in.",
  },
  "signed-out": {
    title: "Website sign-in required",
    body: "Sign in with your Mochirii website account before entering the tester passcode.",
  },
  "not-verified": {
    title: "Verified membership required",
    body: "Your website sign-in is active, but verified Mochirii membership is still required.",
  },
  unavailable: {
    title: "We couldn’t confirm your access",
    body: "Please try again.",
  },
};

export function MochiPetsTesterPasswordGate({
  error,
  memberState,
  busy,
  onRetry,
  onSubmit,
}: {
  error: TesterGateError;
  memberState: MemberGateState;
  busy: boolean;
  onRetry: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
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
            <p className="eyebrow">Mōchirīī Guild World</p>
          </div>
          <h1 id="mochi-pets-title">Mochi Pets</h1>
          <p id={descriptionId}>
            A shared 3D guild home beyond the Jianghu, bringing Mochirii members together with a Mochi companion of their own across iPhone and desktop.
          </p>
        </div>
      </header>

      {memberState === "ready" ? (
        <form
          className="mochi-game-panel mochi-tester-login"
          method="post"
          action="/games/mochi-pets/tester-login"
          aria-describedby={hasError ? `${descriptionId} ${errorId}` : descriptionId}
          onSubmit={onSubmit}
        >
          <div>
            <p className="mochi-gate-kicker">Private tester access</p>
            <h2>Enter the tester space</h2>
            <p>Verified Mochirii membership is confirmed. Enter the current tester passcode to continue.</p>
          </div>
          {error ? (
            <p className="form-message mochi-form-message" id={errorId} role="alert">
              {errorCopy[error]}
            </p>
          ) : null}
          <label htmlFor="mochi-pets-tester-password">
            <span>Tester passcode</span>
            <input
              id="mochi-pets-tester-password"
              autoComplete="off"
              aria-invalid={hasError ? "true" : "false"}
              aria-describedby={hasError ? errorId : descriptionId}
              maxLength={128}
              minLength={15}
              name="testerPassword"
              required
              type="password"
            />
          </label>
          <button className="hero-cta hero-cta--primary mochi-gate-submit" disabled={busy} type="submit">
            {busy ? "Checking access" : "Unlock tester space"}
          </button>
        </form>
      ) : (
        <section
          className="mochi-game-panel mochi-tester-login"
          aria-live={memberState === "unavailable" ? undefined : "polite"}
          role={memberState === "unavailable" ? "alert" : undefined}
        >
          <div>
            <p className="mochi-gate-kicker">Private tester access</p>
            <h2>{memberStateCopy[memberState].title}</h2>
            <p>{memberStateCopy[memberState].body}</p>
          </div>
          {memberState === "signed-out" ? (
            <Link className="hero-cta hero-cta--primary mochi-gate-submit" href="/auth?redirect=%2Fgames%2Fmochi-pets">
              Sign in to Mochirii
            </Link>
          ) : memberState === "not-verified" ? (
            <Link className="hero-cta mochi-gate-submit" href="/account">
              Review member access
            </Link>
          ) : memberState === "unavailable" ? (
            <button className="hero-cta mochi-gate-submit" onClick={onRetry} type="button">
              Try again
            </button>
          ) : null}
        </section>
      )}

      <aside className="mochi-game-panel mochi-gate-notes" aria-label="Mochi Pets tester information">
        <section>
          <h2>Tester doorway</h2>
          <ul>
            <li>Verified Mochirii website membership.</li>
            <li>The current Mochi Pets tester passcode.</li>
            <li>Both checks are required before the private space opens.</li>
          </ul>
        </section>
      </aside>

    </section>
  );
}
