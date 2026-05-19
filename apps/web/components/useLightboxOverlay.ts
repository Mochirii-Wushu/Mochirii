"use client";

import { useEffect, useState } from "react";

export function useBodyPortalRoot() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setPortalRoot(document.body), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return portalRoot;
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return undefined;

    const { body, documentElement } = document;
    const scrollY = window.scrollY || documentElement.scrollTop || 0;
    const scrollbarWidth = Math.max(0, window.innerWidth - documentElement.clientWidth);
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousLeft = body.style.left;
    const previousRight = body.style.right;
    const previousPaddingRight = body.style.paddingRight;
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    }

    return () => {
      const restoreScroll = () => window.scrollTo(0, scrollY);

      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.left = previousLeft;
      body.style.right = previousRight;
      body.style.paddingRight = previousPaddingRight;
      restoreScroll();
      window.requestAnimationFrame(restoreScroll);
      window.setTimeout(restoreScroll, 0);
    };
  }, [locked]);
}
