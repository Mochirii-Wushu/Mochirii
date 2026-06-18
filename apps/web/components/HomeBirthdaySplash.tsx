"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CelebrationSplashConfig = {
  enabled?: boolean;
  startsAt?: string;
  endsAt?: string;
  title?: string;
  message?: string;
};

const DISPLAY_MS = 5200;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function parseOptionalDate(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function isSplashActive(config: CelebrationSplashConfig | null | undefined) {
  if (!config?.enabled) return false;

  const now = Date.now();
  const startsAt = parseOptionalDate(config.startsAt);
  const endsAt = parseOptionalDate(config.endsAt);

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return false;
  if (startsAt !== null && now < startsAt) return false;
  if (endsAt !== null && now > endsAt) return false;

  return Boolean(cleanText(config.title) && cleanText(config.message));
}

export function HomeBirthdaySplash({ config }: { config?: CelebrationSplashConfig | null }) {
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const title = cleanText(config?.title);
  const message = cleanText(config?.message);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!isSplashActive(config)) return undefined;

    const showTimer = window.setTimeout(() => setVisible(true), 0);

    return () => window.clearTimeout(showTimer);
  }, [config]);

  useEffect(() => {
    if (!visible) return undefined;

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 80);
    const autoTimer = window.setTimeout(dismiss, DISPLAY_MS);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(autoTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, visible]);

  if (!visible) return null;

  return (
    <div className="birthday-splash" role="dialog" aria-modal="true" aria-labelledby="birthdaySplashTitle">
      <div className="birthday-splash__firework birthday-splash__firework--one" aria-hidden="true" />
      <div className="birthday-splash__firework birthday-splash__firework--two" aria-hidden="true" />
      <div className="birthday-splash__firework birthday-splash__firework--three" aria-hidden="true" />
      <section className="birthday-splash__panel" aria-describedby="birthdaySplashMessage">
        <button ref={closeRef} className="birthday-splash__close" type="button" onClick={dismiss} aria-label="Close birthday splash">
          Close
        </button>
        <p className="birthday-splash__kicker">A lantern-bright wish</p>
        <h2 id="birthdaySplashTitle" className="birthday-splash__title">
          {title}
        </h2>
        <p id="birthdaySplashMessage" className="birthday-splash__message">
          {message}
        </p>
      </section>
    </div>
  );
}
