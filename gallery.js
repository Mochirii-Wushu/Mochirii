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
  const SORT_PARAM = "sort";
  const SEARCH_PARAM = "q";
  const COPY_SUCCESS = "Link copied";
  const COPY_FAILURE = "Copy failed";
  const MEMBER_CATEGORY = "member-submissions";
  const DEFAULT_SORT = "random";
  const SORT_MODES = new Set([DEFAULT_SORT, "newest", "oldest"]);

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

  const normalizeSearchQuery = (value) =>
    text(value, "")
      .replace(/\s+/g, " ")
      .slice(0, 80);

  const normalizeSearchIndex = (value) =>
    text(value, "")
      .toLowerCase()
      .replace(/\s+/g, " ");

  function getItemCategory(item) {
    return getItemCategories(item)[0] || "";
  }

  function getItemCategories(item) {
    const values = Array.isArray(item?.categories) && item.categories.length
      ? item.categories
      : [item?.category];

    return [...new Set(values.map((value) => normalizeSlug(value)).filter(Boolean))];
  }

  function getItemTags(item) {
    return [...new Set(asArray(item?.tags).map((value) => normalizeSlug(value)).filter(Boolean))];
  }

  function hasCategory(categories, slug) {
    return categories.some((category) => category.slug === slug);
  }

  function normalizeCategory(categories, value) {
    const slug = normalizeSlug(value);
    return slug && hasCategory(categories, slug) ? slug : ALL_CATEGORY;
  }

  function normalizeSort(value) {
    const sort = text(value, "").toLowerCase();
    return SORT_MODES.has(sort) ? sort : DEFAULT_SORT;
  }

  function readGalleryStateFromUrl(categories) {
    const params = new URLSearchParams(window.location.search);
    const hasCategoryParam = params.has(CATEGORY_PARAM);
    const requested = normalizeSlug(params.get(CATEGORY_PARAM));
    const valid = requested && hasCategory(categories, requested);
    const hasSortParam = params.has(SORT_PARAM);
    const requestedSort = text(params.get(SORT_PARAM), "").toLowerCase();
    const validSort = SORT_MODES.has(requestedSort);
    const query = normalizeSearchQuery(params.get(SEARCH_PARAM));

    return {
      category: valid ? requested : ALL_CATEGORY,
      sort: validSort ? requestedSort : DEFAULT_SORT,
      query,
      hasParam: hasCategoryParam || hasSortParam,
      valid: (!hasCategoryParam || Boolean(valid)) && (!hasSortParam || validSort),
    };
  }

  function updateGalleryUrl(category, sort, query, { replace = false } = {}) {
    const url = new URL(window.location.href);
    if (category === ALL_CATEGORY) {
      url.searchParams.delete(CATEGORY_PARAM);
    } else {
      url.searchParams.set(CATEGORY_PARAM, category);
    }
    if (sort === DEFAULT_SORT) {
      url.searchParams.delete(SORT_PARAM);
    } else {
      url.searchParams.set(SORT_PARAM, sort);
    }
    const cleanQuery = normalizeSearchQuery(query);
    if (cleanQuery) {
      url.searchParams.set(SEARCH_PARAM, cleanQuery);
    } else {
      url.searchParams.delete(SEARCH_PARAM);
    }

    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;

    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ galleryCategory: category, gallerySearch: cleanQuery }, "", next);
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

  function updateSortState(sortEl, activeSort) {
    if (sortEl) sortEl.value = activeSort;
  }

  function filterItems(items, category) {
    return category === ALL_CATEGORY ? items : items.filter((item) => getItemCategories(item).includes(category));
  }

  function matchesSearch(item, query) {
    const terms = normalizeSearchIndex(query).split(" ").filter(Boolean);
    if (!terms.length) return true;

    const index = normalizeSearchIndex([
      item?.alt,
      item?.caption,
      item?.id,
      ...getItemCategories(item),
      ...getItemTags(item),
    ].join(" "));

    return terms.every((term) => index.includes(term));
  }

  function shuffleGalleryItems(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }

  function sortTime(item) {
    const time = Date.parse(item?.sortTimestamp || "");
    return Number.isFinite(time) ? time : 0;
  }

  function compareItemId(a, b) {
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  }

  function orderGalleryItems(items, sortMode) {
    if (sortMode === DEFAULT_SORT) return shuffleGalleryItems(items);

    return [...items].sort((a, b) => {
      const aTime = sortTime(a);
      const bTime = sortTime(b);
      if (aTime !== bTime) {
        return sortMode === "newest" ? bTime - aTime : aTime - bTime;
      }
      return compareItemId(a, b);
    });
  }

  function formatCount(count, total, categoryLabel, query) {
    const noun = count === 1 ? "image" : "images";
    const searchSuffix = query ? ` matching "${query}"` : "";
    if (!categoryLabel || categoryLabel === "All") return `Showing ${count} of ${total} ${total === 1 ? "image" : "images"}${searchSuffix}.`;
    return `Showing ${count} ${noun} in ${categoryLabel}${searchSuffix}.`;
  }

  function emptyText(categoryLabel, query) {
    if (!query) return "No images in this category yet.";
    if (!categoryLabel || categoryLabel === "All") return `No images match "${query}".`;
    return `No images in ${categoryLabel} match "${query}".`;
  }

  function flattenItems(data) {
    const albums = Array.isArray(data?.albums) ? data.albums : [];
    const first = albums[0];
    const items = Array.isArray(first?.items) ? first.items : [];
    return items;
  }

  function normalizeStaticItem(item) {
    return {
      ...item,
      source: "static",
      sortTimestamp: text(item?.galleryAddedAt, ""),
    };
  }

  function buildMemberCaption(title, caption) {
    const cleanTitle = text(title, "");
    const cleanCaption = text(caption, "");

    if (cleanTitle && cleanCaption) return `${cleanTitle} — ${cleanCaption}`;
    if (cleanTitle) return cleanTitle;
    if (cleanCaption) return cleanCaption;
    return "Member submission";
  }

  function buildMemberLightboxCaption(title, caption, uploaderName) {
    const base = buildMemberCaption(title, caption);
    const uploader = text(uploaderName, "");
    return uploader ? `${base} · Submitted by ${uploader}` : base;
  }

  function approvedSubmissionToItem(submission) {
    const signedUrl = String(submission?.signed_url || "").trim();
    if (!signedUrl) return null;

    const title = text(submission?.title, "");
    const rawCaption = text(submission?.caption, "");
    const uploaderName = text(submission?.uploader_discord_name, "") || text(submission?.uploader_display_name, "");
    const caption = buildMemberLightboxCaption(title, rawCaption, uploaderName);
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
      sortTimestamp: submission?.created_at || "",
      created_at: submission?.created_at || "",
      reviewed_at: submission?.reviewed_at || "",
      uploader: uploaderName,
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
      const staticItems = flattenItems(data).map(normalizeStaticItem);
      const approvedItems = await loadApprovedSubmissionItems();
      const items = [...staticItems, ...approvedItems];
      const filters = $("#galleryFilters");
      const sortSelect = $("#gallerySort");
      const searchInput = $("#gallerySearch");
      const searchClear = $("#gallerySearchClear");
      const count = $("#galleryCount");
      const empty = $("#galleryEmpty");
      const copyLink = $("#galleryCopyLink");
      const shareStatus = $("#galleryShareStatus");
      const categories = buildCategories(data, items);
      const initialState = readGalleryStateFromUrl(categories);
      let activeCategory = initialState.category;
      let activeSort = initialState.sort;
      let activeSearch = initialState.query;

      const applyGalleryState = (category, sort, query, { updateUrl = false, replaceUrl = false } = {}) => {
        activeCategory = normalizeCategory(categories, category);
        activeSort = normalizeSort(sort);
        activeSearch = normalizeSearchQuery(query);
        const visibleItems = orderGalleryItems(filterItems(items, activeCategory).filter((item) => matchesSearch(item, activeSearch)), activeSort);
        const activeLabel = categories.find((entry) => entry.slug === activeCategory)?.label || "All";

        renderGrid(grid, visibleItems);
        updateFilterState(filters, activeCategory);
        updateSortState(sortSelect, activeSort);
        if (searchInput) searchInput.value = activeSearch;
        if (searchClear) searchClear.hidden = !activeSearch;

        if (count) setText(count, formatCount(visibleItems.length, items.length, activeLabel, activeSearch));
        if (empty) {
          setText(empty, emptyText(activeLabel, activeSearch));
          empty.hidden = visibleItems.length > 0;
        }
        grid.hidden = visibleItems.length === 0;
        if (shareStatus) shareStatus.textContent = "";

        if (updateUrl || replaceUrl) {
          updateGalleryUrl(activeCategory, activeSort, activeSearch, { replace: replaceUrl });
        }
      };

      renderFilters(filters, categories, activeCategory, (category) => {
        applyGalleryState(category, activeSort, activeSearch, { updateUrl: true });
      });
      sortSelect?.addEventListener("change", () => {
        applyGalleryState(activeCategory, sortSelect.value, activeSearch, { updateUrl: true });
      });
      searchInput?.addEventListener("input", () => {
        applyGalleryState(activeCategory, activeSort, searchInput.value, { replaceUrl: true });
      });
      searchClear?.addEventListener("click", () => {
        applyGalleryState(activeCategory, activeSort, "", { updateUrl: true });
        searchInput?.focus();
      });
      applyGalleryState(activeCategory, activeSort, activeSearch, { replaceUrl: initialState.hasParam && !initialState.valid });

      window.addEventListener("popstate", () => {
        const nextState = readGalleryStateFromUrl(categories);
        applyGalleryState(nextState.category, nextState.sort, nextState.query);
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
