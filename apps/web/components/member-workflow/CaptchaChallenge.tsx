"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthCaptchaProvider } from "@/lib/supabase/auth-providers";

type CaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | number;
  reset?: (widgetId?: string | number) => void;
  remove?: (widgetId?: string | number) => void;
};

type CaptchaWindow = Window & {
  turnstile?: CaptchaApi;
  hcaptcha?: CaptchaApi;
  __mochiriiCaptchaScriptLoads?: Partial<Record<AuthCaptchaProvider, Promise<void>>>;
};

type CaptchaChallengeProps = {
  provider: AuthCaptchaProvider;
  siteKey: string;
  resetKey: number;
  onToken: (token: string) => void;
  onStatus: (status: string) => void;
};

const SCRIPT_URLS: Record<AuthCaptchaProvider, string> = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit",
};

function apiName(provider: AuthCaptchaProvider) {
  return provider === "turnstile" ? "turnstile" : "hcaptcha";
}

function getCaptchaApi(provider: AuthCaptchaProvider) {
  const name = apiName(provider);
  return (window as CaptchaWindow)[name];
}

function ensureCaptchaScript(provider: AuthCaptchaProvider) {
  const win = window as CaptchaWindow;
  win.__mochiriiCaptchaScriptLoads ||= {};
  if (win.__mochiriiCaptchaScriptLoads[provider]) return win.__mochiriiCaptchaScriptLoads[provider];

  win.__mochiriiCaptchaScriptLoads[provider] = new Promise<void>((resolve, reject) => {
    if (getCaptchaApi(provider)) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[data-mochirii-captcha="${provider}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Security check could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URLS[provider];
    script.async = true;
    script.defer = true;
    script.dataset.mochiriiCaptcha = provider;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Security check could not load."));
    document.head.appendChild(script);
  });

  return win.__mochiriiCaptchaScriptLoads[provider];
}

export function CaptchaChallenge({ provider, siteKey, resetKey, onToken, onStatus }: CaptchaChallengeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | number | null>(null);
  const [message, setMessage] = useState("Loading security check.");

  useEffect(() => {
    let cancelled = false;

    function update(status: string, token = "") {
      if (cancelled) return;
      setMessage(status);
      onStatus(status);
      onToken(token);
    }

    async function renderCaptcha() {
      if (!containerRef.current) return;
      update("Loading security check.");
      containerRef.current.innerHTML = "";

      try {
        await ensureCaptchaScript(provider);
        if (cancelled || !containerRef.current) return;

        const api = getCaptchaApi(provider);
        if (!api?.render) throw new Error("Security check did not initialize.");

        widgetRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          size: "normal",
          callback: (token: string) => update("Security check complete.", token),
          "expired-callback": () => update("Security check expired. Complete it again."),
          "error-callback": () => update("Security check failed to load. Refresh and try again."),
        });
        update("Complete the security check before requesting a code.");
      } catch {
        update("Security check failed to load. Refresh and try again.");
      }
    }

    void renderCaptcha();

    return () => {
      cancelled = true;
      const api = getCaptchaApi(provider);
      if (widgetRef.current !== null) {
        if (api?.remove) api.remove(widgetRef.current);
        else if (api?.reset) api.reset(widgetRef.current);
      }
      widgetRef.current = null;
    };
  }, [provider, resetKey, siteKey, onStatus, onToken]);

  return (
    <div className="captcha-challenge" aria-label="Security check">
      <div ref={containerRef} className="captcha-challenge__widget" />
      <p className="captcha-challenge__status" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
