"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useBodyPortalRoot, useBodyScrollLock } from "@/components/useLightboxOverlay";

export type GallerySpotlightItem = {
  key: string;
  image: string;
  full: string;
  alt: string;
  caption: string;
};

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

export function HomeGalleryLightbox({
  items,
}: {
  items: GallerySpotlightItem[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const portalRoot = useBodyPortalRoot();
  const openItem = openIndex === null ? null : items[openIndex] || null;

  const modalCaption = useMemo(() => {
    if (!openItem) return "";
    return openItem.caption || openItem.alt;
  }, [openItem]);

  useBodyScrollLock(Boolean(openItem));

  const closeModal = useCallback(() => {
    setOpenIndex(null);
    window.setTimeout(() => {
      lastFocusRef.current?.focus({ preventScroll: true });
      lastFocusRef.current = null;
    }, 0);
  }, []);

  useEffect(() => {
    if (!openItem) return undefined;

    window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 0);

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeModal, openItem]);

  const openModal = (index: number) => {
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    setOpenIndex(index);
  };

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

  const lightbox = (
    <div
      id="modalRoot"
      ref={modalRef}
      className={openItem ? "lightbox" : "lightbox hidden"}
      aria-hidden={!openItem}
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
        onClick={closeModal}
      />

      <div className="lightbox-shell" role="document">
        <button
          id="modalClose"
          ref={closeRef}
          className="lightbox-close"
          type="button"
          aria-label="Close viewer"
          onClick={closeModal}
        >
          ✕
        </button>

        <figure className="lightbox-card">
          {openItem ? (
            <img
              id="modalImage"
              src={openItem.full}
              alt={openItem.alt}
              className="lightbox-img"
              decoding="async"
            />
          ) : null}
          <figcaption id="modalCaption" className="lightbox-caption">
            {modalCaption}
          </figcaption>
        </figure>
      </div>
    </div>
  );

  return (
    <>
      <div id="galleryGrid" className="home-gallery" aria-label="Gallery thumbnails">
        {items.map((item, index) => (
          <button
            className="home-thumb"
            type="button"
            aria-label={`Open image: ${item.caption || item.alt || "Guild screenshot"}`}
            key={item.key}
            onClick={() => openModal(index)}
          >
            <img
              className="home-thumb__img"
              src={item.image}
              alt={item.alt}
              data-full={item.full}
              data-caption={item.caption}
              loading="lazy"
              decoding="async"
            />
            <span className="home-thumb__scrim" aria-hidden="true" />
          </button>
        ))}
      </div>

      {portalRoot ? createPortal(lightbox, portalRoot) : null}
    </>
  );
}
