"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useRef,
  useState,
} from "react";

const LazyHomeGalleryLightboxModal = lazy(() =>
  import("@/components/HomeGalleryLightboxModal").then(
    ({ HomeGalleryLightboxModal }) => ({ default: HomeGalleryLightboxModal }),
  ),
);

export type GallerySpotlightItem = {
  key: string;
  image: string;
  full: string;
  alt: string;
  caption: string;
};

export function HomeGalleryLightbox({
  items,
}: {
  items: GallerySpotlightItem[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const openItem = openIndex === null ? null : items[openIndex] || null;

  const closeModal = useCallback(() => {
    setOpenIndex(null);
    window.setTimeout(() => {
      lastFocusRef.current?.focus({ preventScroll: true });
      lastFocusRef.current = null;
    }, 0);
  }, []);

  const openModal = (index: number) => {
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    setOpenIndex(index);
  };

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

      {openItem ? (
        <Suspense fallback={null}>
          <LazyHomeGalleryLightboxModal
            key={openItem.key}
            item={openItem}
            onClose={closeModal}
          />
        </Suspense>
      ) : null}
    </>
  );
}
