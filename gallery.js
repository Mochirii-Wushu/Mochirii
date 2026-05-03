/* gallery.js — data-driven Gallery renderer (gallery page only) */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "gallery") return;

  const JSON_URL = "./data/gallery.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const U = window.MochiriiUtils;

  const asArray = U.asArray;
  const esc = U.escapeHtml;
  const setText = U.setText;
  const fetchJSON = U.fetchJson;
  const text = U.text;

  const ALL_CATEGORY = "all";

  const toTitle = (slug) =>
    String(slug || "")
      .split("-")
      .filter(Boolean)
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(" ");

  const normalizeSlug = (value) =>
    text(value, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  function getItemCategory(item) {
    return normalizeSlug(item?.category);
  }

  function buildItemButton(item) {
    const full = String(item?.full ?? item?.src ?? "").trim();
    const thumb = String(item?.thumb ?? item?.src ?? "").trim();
    if (!full || !thumb) return null;

    const alt = String(item?.alt ?? item?.caption ?? "Gallery image");
    const caption = String(item?.caption ?? "");
    const category = getItemCategory(item);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-thumb";
    btn.dataset.full = full;
    btn.dataset.caption = caption;
    if (category) btn.dataset.category = category;

    btn.innerHTML = `
      <img
        src="${esc(thumb)}"
        alt="${esc(alt)}"
        loading="lazy"
        decoding="async"
      />
    `;

    return btn;
  }

  function buildCategories(data, items) {
    const used = new Set(
      items
        .map((item) => getItemCategory(item))
        .filter(Boolean)
    );

    const declared = asArray(data?.categories)
      .map((category) => {
        const slug = normalizeSlug(category?.slug);
        const label = text(category?.label, toTitle(slug));
        return slug && used.has(slug) ? { slug, label } : null;
      })
      .filter(Boolean);

    const seen = new Set(declared.map((category) => category.slug));
    const inferred = [...used]
      .filter((slug) => !seen.has(slug))
      .sort()
      .map((slug) => ({ slug, label: toTitle(slug) }));

    return [
      { slug: ALL_CATEGORY, label: "All" },
      ...declared,
      ...inferred,
    ];
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

  function renderFilters(filtersEl, categories, activeCategory, onSelect) {
    if (!filtersEl) return;
    filtersEl.innerHTML = "";

    const frag = document.createDocumentFragment();
    categories.forEach((category) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-filter";
      btn.dataset.category = category.slug;
      btn.setAttribute("aria-pressed", category.slug === activeCategory ? "true" : "false");
      btn.textContent = category.label;
      btn.addEventListener("click", () => onSelect(category.slug));
      frag.appendChild(btn);
    });

    filtersEl.appendChild(frag);
  }

  function updateFilterState(filtersEl, activeCategory) {
    filtersEl?.querySelectorAll(".gallery-filter").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.category === activeCategory ? "true" : "false");
    });
  }

  function filterItems(items, category) {
    if (category === ALL_CATEGORY) return items;
    return items.filter((item) => getItemCategory(item) === category);
  }

  function formatCount(count, total, categoryLabel) {
    const noun = count === 1 ? "image" : "images";
    if (!categoryLabel || categoryLabel === "All") return `Showing ${count} of ${total} ${total === 1 ? "image" : "images"}.`;
    return `Showing ${count} ${noun} in ${categoryLabel}.`;
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

    try {
      const data = await fetchJSON(JSON_URL);
      applyMeta(data);
      const items = flattenItems(data);
      const filters = $("#galleryFilters");
      const count = $("#galleryCount");
      const empty = $("#galleryEmpty");
      const categories = buildCategories(data, items);
      let activeCategory = ALL_CATEGORY;

      const applyFilter = (category) => {
        activeCategory = category || ALL_CATEGORY;
        const visibleItems = filterItems(items, activeCategory);
        const activeLabel = categories.find((entry) => entry.slug === activeCategory)?.label || "All";

        renderGrid(grid, visibleItems);
        updateFilterState(filters, activeCategory);

        if (count) setText(count, formatCount(visibleItems.length, items.length, activeLabel));
        if (empty) empty.hidden = visibleItems.length > 0;
        grid.hidden = visibleItems.length === 0;
      };

      renderFilters(filters, categories, activeCategory, applyFilter);
      applyFilter(activeCategory);
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
