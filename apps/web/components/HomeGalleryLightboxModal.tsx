"use client";

import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import type { GallerySpotlightItem } from "@/components/HomeGalleryLightbox";
import {
  useBodyPortalRoot,
  useBodyScrollLock,
} from "@/components/useLightboxOverlay";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusable(root: HTMLElement | null) {
  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => {
    if (el.hidden || el.closest("[hidden]")) return false;
    return el.getClientRects().length > 0;
  });
}

export function HomeGalleryLightboxModal({
  item,
  onClose,
}: {
  item: GallerySpotlightItem;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const portalRoot = useBodyPortalRoot();
  const modalCaption = useMemo(() => item.caption || item.alt, [item]);

  useBodyScrollLock(true);

  useEffect(() => {
    if (!portalRoot) return undefined;

    const focusTimer = window.setTimeout(
      () => closeRef.current?.focus({ preventScroll: true }),
      0,
    );

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, portalRoot]);

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const focusable = getFocusable(modalRef.current);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  if (!portalRoot) return null;

  return createPortal(
    <div
      id="modalRoot"
      ref={modalRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery image viewer"
      tabIndex={-1}
      onKeyDown={trapTab}
    >
      <div
        id="modalBackdrop"
        className="lightbox-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="lightbox-shell" role="document">
        <button
          id="modalClose"
          ref={closeRef}
          className="lightbox-close"
          type="button"
          aria-label="Close viewer"
          onClick={onClose}
        >
          âœ•
        </button>

        <figure className="lightbox-card">
          <img
            id="modalImage"
            src={item.full}
            alt={item.alt}
            className="lightbox-img"
            decoding="async"
          />
          <figcaption id="modalCaption" className="lightbox-caption">
            {modalCaption}
          </figcaption>
        </figure>
      </div>
    </div>,
    portalRoot,
  );
}
