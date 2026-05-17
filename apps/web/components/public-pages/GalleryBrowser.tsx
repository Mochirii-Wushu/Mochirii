"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Category = {
  slug?: string;
  label?: string;
};

type GalleryItem = {
  id?: string;
  src?: string;
  full?: string;
  thumb?: string;
  alt?: string;
  caption?: string;
  category?: string;
  categories?: string[];
  galleryAddedAt?: string;
};

const allCategory = "all";
const defaultSort = "random";
const sortModes = new Set([defaultSort, "newest", "oldest"]);
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function text(value: unknown, fallback = "") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

function publicPath(value: unknown, fallback = "") {
  const raw = text(value, fallback);
  if (!raw) return "";
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(raw)) return raw;
  if (raw.startsWith("./")) return `/${raw.slice(2)}`;
  return `/${raw}`;
}

function normalizeSlug(value: unknown) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function itemCategories(item: GalleryItem) {
  const values = Array.isArray(item.categories) && item.categories.length ? item.categories : [item.category];
  return [...new Set(values.map(normalizeSlug).filter(Boolean))];
}

function sortTime(item: GalleryItem) {
  const time = Date.parse(text(item.galleryAddedAt));
  return Number.isFinite(time) ? time : 0;
}

function getFocusable(root: HTMLElement | null) {
  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => {
    if (el.hidden || el.closest("[hidden]")) return false;
    return el.getClientRects().length > 0;
  });
}

function fallbackCopyText(value: string) {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-999px";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();

  try {
    return document.execCommand("copy");
  } finally {
    field.remove();
  }
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  return fallbackCopyText(value);
}

export function GalleryBrowser({
  categories,
  items,
}: {
  categories: Category[];
  items: GalleryItem[];
}) {
  const [activeCategory, setActiveCategory] = useState(allCategory);
  const [activeSort, setActiveSort] = useState(defaultSort);
  const [shareStatus, setShareStatus] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const usableItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          full: publicPath(item.full || item.src),
          thumb: publicPath(item.thumb || item.src || item.full),
          alt: text(item.alt || item.caption, "Gallery image"),
          caption: text(item.caption),
        }))
        .filter((item) => item.full && item.thumb),
    [items],
  );

  const filterCategories = useMemo(() => {
    const counts = new Map([[allCategory, usableItems.length]]);
    usableItems.forEach((item) => {
      itemCategories(item).forEach((slug) => counts.set(slug, (counts.get(slug) || 0) + 1));
    });

    const declared = categories
      .map((category) => {
        const slug = normalizeSlug(category.slug);
        if (!slug || !counts.has(slug)) return null;
        return { slug, label: text(category.label, toTitle(slug)), count: counts.get(slug) || 0 };
      })
      .filter((item): item is { slug: string; label: string; count: number } => Boolean(item));

    const seen = new Set(declared.map((category) => category.slug));
    const inferred = [...counts.keys()]
      .filter((slug) => slug !== allCategory && !seen.has(slug))
      .sort()
      .map((slug) => ({ slug, label: toTitle(slug), count: counts.get(slug) || 0 }));

    return [{ slug: allCategory, label: "All", count: counts.get(allCategory) || 0 }, ...declared, ...inferred];
  }, [categories, usableItems]);

  const visibleItems = useMemo(() => {
    const filtered =
      activeCategory === allCategory
        ? usableItems
        : usableItems.filter((item) => itemCategories(item).includes(activeCategory));

    if (activeSort === "newest" || activeSort === "oldest") {
      return [...filtered].sort((a, b) => {
        const delta = sortTime(a) - sortTime(b);
        if (delta !== 0) return activeSort === "newest" ? -delta : delta;
        return text(a.id).localeCompare(text(b.id));
      });
    }

    return filtered;
  }, [activeCategory, activeSort, usableItems]);

  const openItem = openIndex === null ? null : visibleItems[openIndex] || null;
  const activeLabel = filterCategories.find((category) => category.slug === activeCategory)?.label || "All";
  const countText =
    activeLabel === "All"
      ? `Showing ${visibleItems.length} of ${usableItems.length} ${usableItems.length === 1 ? "image" : "images"}.`
      : `Showing ${visibleItems.length} ${visibleItems.length === 1 ? "image" : "images"} in ${activeLabel}.`;

  const closeModal = useCallback(() => {
    setOpenIndex(null);
    window.setTimeout(() => {
      lastFocusRef.current?.focus({ preventScroll: true });
      lastFocusRef.current = null;
    }, 0);
  }, []);

  useEffect(() => {
    const readState = () => {
      const params = new URLSearchParams(window.location.search);
      const category = normalizeSlug(params.get("category"));
      const sort = text(params.get("sort")).toLowerCase();
      const validCategory = filterCategories.some((item) => item.slug === category);

      setActiveCategory(category && validCategory ? category : allCategory);
      setActiveSort(sortModes.has(sort) ? sort : defaultSort);
    };

    readState();
    window.addEventListener("popstate", readState);
    return () => window.removeEventListener("popstate", readState);
  }, [filterCategories]);

  useEffect(() => {
    if (!openItem) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const scrollY = window.scrollY || 0;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 0);

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      window.scrollTo(0, scrollY);
    };
  }, [closeModal, openItem]);

  const updateUrl = (category: string, sort: string) => {
    const url = new URL(window.location.href);
    if (category === allCategory) url.searchParams.delete("category");
    else url.searchParams.set("category", category);

    if (sort === defaultSort) url.searchParams.delete("sort");
    else url.searchParams.set("sort", sort);

    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.pushState({ galleryCategory: category }, "", next);
  };

  const chooseCategory = (category: string) => {
    setActiveCategory(category);
    setShareStatus("");
    updateUrl(category, activeSort);
  };

  const chooseSort = (sort: string) => {
    const nextSort = sortModes.has(sort) ? sort : defaultSort;
    setActiveSort(nextSort);
    setShareStatus("");
    updateUrl(activeCategory, nextSort);
  };

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

  const copyCurrentLink = async () => {
    try {
      const copied = await copyText(window.location.href);
      setShareStatus(copied ? "Link copied" : "Copy failed");
    } catch {
      setShareStatus("Copy failed");
    }
  };

  return (
    <>
      <div className="gallery-toolbar" aria-label="Gallery browsing">
        <div className="gallery-controls">
          <div id="galleryFilters" className="gallery-filters" aria-label="Gallery categories">
            {filterCategories.map((category) => (
              <button
                className="gallery-filter"
                type="button"
                data-category={category.slug}
                aria-pressed={category.slug === activeCategory}
                aria-label={`${category.label}, ${category.count} ${category.count === 1 ? "image" : "images"}`}
                key={category.slug}
                onClick={() => chooseCategory(category.slug)}
              >
                {category.label} · {category.count}
              </button>
            ))}
          </div>
          <label className="gallery-order" htmlFor="gallerySort">
            <span className="gallery-order__label">Gallery order</span>
            <select
              id="gallerySort"
              className="gallery-order__select"
              aria-label="Gallery order"
              value={activeSort}
              onChange={(event) => chooseSort(event.target.value)}
            >
              <option value="random">Random mix</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <button id="galleryCopyLink" className="gallery-copy-link" type="button" onClick={copyCurrentLink}>
            Copy link
          </button>
        </div>
        <p id="galleryShareStatus" className="gallery-share-status muted" role="status" aria-live="polite" aria-atomic="true">
          {shareStatus}
        </p>
        <p id="galleryCount" className="gallery-count muted" role="status" aria-live="polite">
          {countText}
        </p>
      </div>

      <p id="galleryEmpty" className="gallery-empty" role="status" hidden={visibleItems.length > 0}>
        No images in this category yet.
      </p>

      <div id="galleryGrid" className="gallery-grid" aria-live="polite" hidden={visibleItems.length === 0}>
        {visibleItems.map((item, index) => (
          <button
            className="gallery-thumb"
            type="button"
            data-full={item.full}
            data-caption={item.caption}
            data-category={itemCategories(item)[0] || undefined}
            key={text(item.id, item.full)}
            onClick={() => openModal(index)}
          >
            <img src={item.thumb} alt={item.alt} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>

      <div
        id="lightbox"
        ref={modalRef}
        className={openItem ? "lightbox" : "lightbox hidden"}
        aria-hidden={!openItem}
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
        onKeyDown={trapTab}
      >
        <div id="lightboxBackdrop" className="lightbox-backdrop" data-close aria-hidden="true" onClick={closeModal} />
        <div className="lightbox-shell" role="document">
          <button
            id="lightboxClose"
            ref={closeRef}
            className="lightbox-close"
            type="button"
            data-close
            aria-label="Close viewer"
            onClick={closeModal}
          >
            ✕
          </button>
          <figure className="lightbox-card">
            <img id="lightboxImg" src={openItem?.full || ""} alt={openItem?.alt || ""} className="lightbox-img" decoding="async" />
            <figcaption id="lightboxCaption" className="lightbox-caption">
              {openItem?.caption || openItem?.alt || ""}
            </figcaption>
          </figure>
        </div>
      </div>
    </>
  );
}
