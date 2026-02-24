/* gallery.js — data-driven Gallery renderer (gallery page only) */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "gallery") return;

  const JSON_URL = "./data/gallery.json";

  const $ = (sel, root = document) => root.querySelector(sel);

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value ?? "";
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
  }

  function buildItemButton(item) {
    const src = String(item?.src ?? "").trim();
    if (!src) return null;

    const alt = String(item?.alt ?? item?.caption ?? "Gallery image");
    const caption = String(item?.caption ?? "");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-thumb"; // your CSS can style this (or leave it unused)
    btn.dataset.full = src;
    btn.dataset.caption = caption;

    btn.innerHTML = `
      <img
        src="${esc(src)}"
        alt="${esc(alt)}"
        loading="lazy"
        decoding="async"
      />
    `;

    return btn;
  }

  function renderGrid(gridEl, items) {
    if (!gridEl) return;
    gridEl.innerHTML = "";

    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      const node = buildItemButton(item);
      if (node) frag.appendChild(node);
    });

    gridEl.appendChild(frag);
  }

  function initLightbox() {
    const root = $("#lightbox");
    const img = $("#lightboxImg");
    const cap = $("#lightboxCaption");

    const isOpen = () => root && !root.classList.contains("hidden");

    const open = (src, caption, alt) => {
      if (!root || !img) return;
      img.src = src || "";
      img.alt = alt || caption || "Gallery image";
      setText(cap, caption || "");
      root.classList.remove("hidden");
      root.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };

    const close = () => {
      if (!root || !img) return;
      root.classList.add("hidden");
      root.setAttribute("aria-hidden", "true");
      img.src = "";
      img.alt = "";
      setText(cap, "");
      document.body.style.overflow = "";
    };

    // Click-off + close button via data-close (matches your HTML)
    root?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.closest && t.closest("[data-close]")) close();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) close();
    });

    return { open, close };
  }

  function wireGridClicks(gridEl, lightbox) {
    if (!gridEl || !lightbox) return;

    gridEl.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-full]");
      if (!btn) return;

      e.preventDefault();

      const src = btn.dataset.full || "";
      const caption = btn.dataset.caption || "";
      const thumbImg = $("img", btn);
      const alt = thumbImg?.getAttribute("alt") || caption || "Gallery image";

      lightbox.open(src, caption, alt);
    });
  }

  function flattenItems(data) {
    const albums = Array.isArray(data?.albums) ? data.albums : [];
    const first = albums[0];
    const items = Array.isArray(first?.items) ? first.items : [];
    return items;
  }

  function applyMeta(data) {
    const metaTitle = String(data?.meta?.title ?? "").trim();
    const metaDesc = String(data?.meta?.description ?? "").trim();

    const titleEl = $("#galleryTitle");
    const descEl = $("#galleryDesc");

    if (titleEl && metaTitle) setText(titleEl, metaTitle);
    if (descEl && metaDesc) setText(descEl, metaDesc);
  }

  async function boot() {
    const grid = $("#galleryGrid");
    if (!grid) return;

    const lightbox = initLightbox();

    try {
      const data = await fetchJSON(JSON_URL);
      applyMeta(data);
      const items = flattenItems(data);
      renderGrid(grid, items);
      wireGridClicks(grid, lightbox);
    } catch (err) {
      console.error(err);
      const errEl = $("#galleryError");
      if (errEl) {
        errEl.classList.remove("sr-only");
        errEl.textContent = "Unable to load gallery content.";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();