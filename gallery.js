/* gallery.js — data-driven Gallery renderer (gallery page only) */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "gallery") return;

  const JSON_URL = "./data/gallery.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const U = window.MochiriiUtils;
  const S = window.MochiriiSupabase;

  const asArray = U.asArray;
  const esc = U.escapeHtml;
  const setText = U.setText;
  const fetchJSON = U.fetchJson;
  const text = U.text;

  const ALL_CATEGORY = "all";
  const CATEGORY_PARAM = "category";
  const COPY_SUCCESS = "Link copied";
  const COPY_FAILURE = "Copy failed";
  const MEMBER_CATEGORY = "member-submissions";

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
    return getItemCategories(item)[0] || "";
  }

  function getItemCategories(item) {
    const values = Array.isArray(item?.categories) && item.categories.length
      ? item.categories
      : [item?.category];

    return [...new Set(values.map((value) => normalizeSlug(value)).filter(Boolean))];
  }

  function hasCategory(categories, slug) {
    return categories.some((category) => category.slug === slug);
  }

  function normalizeCategory(categories, value) {
    const slug = normalizeSlug(value);
    return slug && hasCategory(categories, slug) ? slug : ALL_CATEGORY;
  }

  function readCategoryFromUrl(categories) {
    const params = new URLSearchParams(window.location.search);
    const hasParam = params.has(CATEGORY_PARAM);
    const requested = normalizeSlug(params.get(CATEGORY_PARAM));
    const valid = requested && hasCategory(categories, requested);

    return {
      category: valid ? requested : ALL_CATEGORY,
      hasParam,
      valid: !hasParam || Boolean(valid),
    };
  }

  function updateCategoryUrl(category, { replace = false } = {}) {
    const url = new URL(window.location.href);
    if (category === ALL_CATEGORY) {
      url.searchParams.delete(CATEGORY_PARAM);
    } else {
      url.searchParams.set(CATEGORY_PARAM, category);
    }

    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;

    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ galleryCategory: category }, "", next);
  }

  function setShareStatus(statusEl, message) {
    if (!statusEl) return;
    window.clearTimeout(setShareStatus.timer);
    statusEl.textContent = "";
    window.setTimeout(() => {
      statusEl.textContent = message;
      setShareStatus.timer = window.setTimeout(() => {
        statusEl.textContent = "";
      }, 2400);
    }, 0);
  }

  function fallbackCopyText(value) {
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

  async function copyText(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    return fallbackCopyText(value);
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
    const counts = new Map([[ALL_CATEGORY, items.length]]);

    items.forEach((item) => {
      getItemCategories(item).forEach((slug) => {
        counts.set(slug, (counts.get(slug) || 0) + 1);
      });
    });

    const declared = asArray(data?.categories)
      .map((category) => {
        const slug = normalizeSlug(category?.slug);
        const label = text(category?.label, toTitle(slug));
        return slug && counts.has(slug) ? { slug, label, count: counts.get(slug) } : null;
      })
      .filter(Boolean);

    const seen = new Set(declared.map((category) => category.slug));
    const inferred = [...counts.keys()]
      .filter((slug) => slug !== ALL_CATEGORY && !seen.has(slug))
      .sort()
      .map((slug) => ({ slug, label: toTitle(slug), count: counts.get(slug) }));

    return [
      { slug: ALL_CATEGORY, label: "All", count: counts.get(ALL_CATEGORY) },
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
      btn.setAttribute("aria-label", `${category.label}, ${category.count} ${category.count === 1 ? "image" : "images"}`);
      btn.textContent = `${category.label} · ${category.count}`;
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
    return items.filter((item) => getItemCategories(item).includes(category));
  }

  function shuffleGalleryItems(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
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

  function buildMemberCaption(title, caption) {
    const cleanTitle = text(title, "");
    const cleanCaption = text(caption, "");

    if (cleanTitle && cleanCaption) return `${cleanTitle} — ${cleanCaption}`;
    if (cleanTitle) return cleanTitle;
    if (cleanCaption) return cleanCaption;
    return "Member submission";
  }

  function approvedSubmissionToItem(submission) {
    const signedUrl = String(submission?.signed_url || "").trim();
    if (!signedUrl) return null;

    const title = text(submission?.title, "");
    const rawCaption = text(submission?.caption, "");
    const caption = buildMemberCaption(title, rawCaption);
    const category = normalizeSlug(submission?.category) || MEMBER_CATEGORY;
    const categories = category === MEMBER_CATEGORY ? [MEMBER_CATEGORY] : [category, MEMBER_CATEGORY];

    return {
      id: `member-${submission?.id || signedUrl}`,
      src: signedUrl,
      full: signedUrl,
      thumb: signedUrl,
      alt: title || rawCaption || "Approved member gallery image",
      caption,
      category,
      categories,
      source: "member",
      created_at: submission?.created_at || "",
      reviewed_at: submission?.reviewed_at || "",
      uploader: submission?.uploader_display_name || "",
    };
  }

  function shouldLoadApprovedFeed() {
    const host = window.location.hostname;
    if (new URLSearchParams(window.location.search).has("approvedFeed")) return true;
    return !["127.0.0.1", "localhost", "0.0.0.0"].includes(host);
  }

  async function loadApprovedSubmissionItems() {
    if (!shouldLoadApprovedFeed()) return [];
    if (typeof S?.listApprovedGallerySubmissions !== "function") return [];

    const result = await S.listApprovedGallerySubmissions();
    if (!result.ok) {
      console.warn("Approved member gallery feed failed.", result.error || result.message);
      return [];
    }

    const submissions = Array.isArray(result.data?.submissions) ? result.data.submissions : [];
    return submissions.map(approvedSubmissionToItem).filter(Boolean);
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
      const staticItems = flattenItems(data);
      const approvedItems = await loadApprovedSubmissionItems();
      const items = [...staticItems, ...approvedItems];
      const filters = $("#galleryFilters");
      const count = $("#galleryCount");
      const empty = $("#galleryEmpty");
      const copyLink = $("#galleryCopyLink");
      const shareStatus = $("#galleryShareStatus");
      const categories = buildCategories(data, items);
      const initialState = readCategoryFromUrl(categories);
      let activeCategory = initialState.category;

      const applyFilter = (category, { updateUrl = false, replaceUrl = false } = {}) => {
        activeCategory = normalizeCategory(categories, category);
        const visibleItems = shuffleGalleryItems(filterItems(items, activeCategory));
        const activeLabel = categories.find((entry) => entry.slug === activeCategory)?.label || "All";

        renderGrid(grid, visibleItems);
        updateFilterState(filters, activeCategory);

        if (count) setText(count, formatCount(visibleItems.length, items.length, activeLabel));
        if (empty) empty.hidden = visibleItems.length > 0;
        grid.hidden = visibleItems.length === 0;
        if (shareStatus) shareStatus.textContent = "";

        if (updateUrl || replaceUrl) {
          updateCategoryUrl(activeCategory, { replace: replaceUrl });
        }
      };

      renderFilters(filters, categories, activeCategory, (category) => {
        applyFilter(category, { updateUrl: true });
      });
      applyFilter(activeCategory, { replaceUrl: initialState.hasParam && !initialState.valid });

      window.addEventListener("popstate", () => {
        applyFilter(readCategoryFromUrl(categories).category);
      });

      copyLink?.addEventListener("click", async () => {
        try {
          const copied = await copyText(window.location.href);
          setShareStatus(shareStatus, copied ? COPY_SUCCESS : COPY_FAILURE);
        } catch {
          setShareStatus(shareStatus, COPY_FAILURE);
        }
      });
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
