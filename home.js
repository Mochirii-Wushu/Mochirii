/* home.js — Home page renderer (data only) */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "home") return;

  const HOME_JSON_URL = "./data/home.json";
  const GALLERY_JSON_URL = "./data/gallery.json";
  const HOME_GALLERY_COUNT = 4;
  const GALLERY_CATEGORY_LABELS = {
    portraits: "Portraits",
    gatherings: "Gatherings",
    action: "Action",
    scenery: "Scenery",
    companions: "Companions",
  };
  const VALID_GALLERY_CATEGORIES = new Set(Object.keys(GALLERY_CATEGORY_LABELS));
  const $ = (sel, root = document) => root.querySelector(sel);
  const U = window.MochiriiUtils;

  /* Helpers */
  const setText = U.setText;
  const esc = U.escapeHtml;
  const safeArray = U.asArray;
  const fetchJSON = U.fetchJson;

  function cleanLabel(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  function joinLabel(parts) {
    return parts.map(cleanLabel).filter(Boolean).join(" - ");
  }

  function normalizeSlug(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function fmtDate(iso) {
    return U.formatDateUTC(iso, {
      locale: "en-US",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function typeLabel(type) {
    const t = String(type ?? "").trim().toLowerCase();
    const map = {
      event: "Event",
      raffle: "Raffle",
      announcement: "Announcement",
      member: "Member",
      meta: "Update",
    };
    return map[t] || "Update";
  }

  function galleryCategoryLabel(slug) {
    return GALLERY_CATEGORY_LABELS[slug] || "Gallery";
  }

  /* Hero */
  function renderHero(hero) {
    const heroImg = $("#heroImage");
    const heroAtmos = $("#heroAtmosphere");
    const subtitle = $("#homeSubtitle");
    const desc = $("#heroDescriptor");
    const badges = $("#heroBadges");

    if (heroImg && hero?.image) heroImg.src = hero.image;
    setText(subtitle, hero?.subtitle ?? "");

    if (heroAtmos) {
      const a = String(hero?.atmosphereImage ?? "").trim();
      heroAtmos.src = a || "";
    }

    if (desc) {
      desc.innerHTML = "";
      const parts = safeArray(hero?.descriptor)
        .map((p) => String(p ?? "").trim())
        .filter(Boolean);

      desc.innerHTML = parts.length
        ? parts.map((p) => `<p>${esc(p)}</p>`).join("")
        : `<p class="muted">No description provided.</p>`;
    }

    if (badges) {
      badges.innerHTML = "";
      safeArray(hero?.badges)
        .slice(0, 8)
        .forEach((b) => {
          const span = document.createElement("span");
          span.textContent = String(b ?? "");
          badges.appendChild(span);
        });
    }
  }

  /* Guild seal */
  function renderSeal(seal) {
    const img = $("#sealImage");
    const title = $("#sealTitle");
    const verse = $("#sealVerse");

    if (img) {
      const src = String(seal?.image ?? "").trim();
      if (src) img.src = src;
      img.alt = String(seal?.imageAlt ?? img.alt ?? "Guild seal");
    }

    setText(title, seal?.title ?? "Guild Seal");

    if (verse) {
      const lines = safeArray(seal?.verse)
        .map((v) => String(v ?? "").trim())
        .filter(Boolean);

      verse.innerHTML = lines.length ? lines.map((l) => esc(l)).join("<br>") : "—";
    }
  }

  const CELEBRATION_SPLASH_DISPLAY_MS = 5200;

  function parseOptionalSplashDate(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const timestamp = Date.parse(raw);
    return Number.isFinite(timestamp) ? timestamp : Number.NaN;
  }

  function isCelebrationSplashActive(config) {
    if (!config?.enabled) return false;

    const now = Date.now();
    const startsAt = parseOptionalSplashDate(config.startsAt);
    const endsAt = parseOptionalSplashDate(config.endsAt);

    if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return false;
    if (startsAt !== null && now < startsAt) return false;
    if (endsAt !== null && now > endsAt) return false;

    return Boolean(cleanLabel(config.title) && cleanLabel(config.message));
  }

  function renderCelebrationSplash(config) {
    if (!isCelebrationSplashActive(config)) return;

    const splash = document.createElement("div");
    splash.className = "birthday-splash";
    splash.setAttribute("role", "dialog");
    splash.setAttribute("aria-modal", "true");
    splash.setAttribute("aria-labelledby", "birthdaySplashTitle");
    splash.innerHTML = `
      <div class="birthday-splash__firework birthday-splash__firework--one" aria-hidden="true"></div>
      <div class="birthday-splash__firework birthday-splash__firework--two" aria-hidden="true"></div>
      <div class="birthday-splash__firework birthday-splash__firework--three" aria-hidden="true"></div>
      <section class="birthday-splash__panel" aria-describedby="birthdaySplashMessage">
        <button class="birthday-splash__close" type="button" aria-label="Close birthday splash">Close</button>
        <p class="birthday-splash__kicker">A lantern-bright wish</p>
        <h2 id="birthdaySplashTitle" class="birthday-splash__title">${esc(config.title)}</h2>
        <p id="birthdaySplashMessage" class="birthday-splash__message">${esc(config.message)}</p>
      </section>
    `;

    const dismiss = () => {
      document.removeEventListener("keydown", onKeyDown);
      splash.remove();
    };

    function onKeyDown(event) {
      if (event.key === "Escape") dismiss();
    }

    document.body.appendChild(splash);
    const closeButton = $(".birthday-splash__close", splash);
    closeButton?.addEventListener("click", dismiss);
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeButton?.focus(), 80);
    window.setTimeout(dismiss, CELEBRATION_SPLASH_DISPLAY_MS);
  }

  /* Bulletin */
  function renderFeaturedBulletin(item) {
    const a = $("#featuredBulletin");
    const img = $("#featuredBulletinImage");
    const type = $("#featuredBulletinType");
    const date = $("#featuredBulletinDate");
    const title = $("#featuredBulletinTitle");
    const summary = $("#featuredBulletinSummary");

    if (a) {
      a.href = String(item?.href ?? "#");
      a.setAttribute(
        "aria-label",
        joinLabel(["Featured bulletin", typeLabel(item?.type), fmtDate(item?.date), item?.title, item?.summary]),
      );
    }

    if (img) {
      img.src = String(item?.image ?? "./assets/img/bulletins/featured.webp");
      img.alt = String(item?.imageAlt ?? "");
    }

    setText(type, typeLabel(item?.type));
    setText(date, fmtDate(item?.date));
    setText(title, item?.title ?? "");
    setText(summary, item?.summary ?? "");
  }

  function renderBulletins(list) {
    const root = $("#bulletinList");
    if (!root) return;

    root.innerHTML = "";

    safeArray(list)
      .slice(0, 5)
      .forEach((it) => {
        const card = document.createElement("a");
        card.className = "home-bulletin";
        card.href = String(it?.href ?? "#");

        card.innerHTML = `
          <div class="home-bulletin__media">
            <img class="home-bulletin__img" src="${esc(it?.image ?? "./assets/img/bulletins/featured.webp")}" alt="${esc(it?.imageAlt ?? "Bulletin cover")}" loading="lazy" decoding="async" />
            <div class="home-bulletin__scrim" aria-hidden="true"></div>
            <div class="home-bulletin__tag">${esc(typeLabel(it?.type))}</div>
          </div>
          <div class="home-bulletin__body">
            <div class="home-bulletin__date">${esc(fmtDate(it?.date))}</div>
            <div class="home-bulletin__title">${esc(it?.title ?? "")}</div>
            <div class="home-bulletin__summary">${esc(it?.summary ?? "")}</div>
          </div>
        `;

        root.appendChild(card);
      });
  }

  /* Doors */
  function renderDoors(tiles) {
    const root = $("#doorsGrid");
    if (!root) return;

    root.innerHTML = "";

    safeArray(tiles)
      .slice(0, 4)
      .forEach((it) => {
        const a = document.createElement("a");
        a.className = "home-door";
        a.href = String(it?.href ?? "#");

        a.innerHTML = `
          <div class="home-door__media">
            <img class="home-door__img" src="${esc(it?.image ?? "")}" alt="${esc(it?.alt ?? "")}" loading="lazy" decoding="async" />
            <div class="home-door__scrim" aria-hidden="true"></div>
            <div class="home-door__label">${esc(it?.label ?? "")}</div>
          </div>
          <div class="home-door__plate">
            <div class="home-door__title">${esc(it?.title ?? "")}</div>
            <div class="home-door__subtitle">${esc(it?.subtitle ?? "")}</div>
          </div>
        `;

        root.appendChild(a);
      });
  }

  /* Spotlight */
  function renderSpotlight(spotlight) {
    const card = $("#spotlightCard");
    const img = $("#spotlightImage");
    const tag = $("#spotlightTag");
    const title = $("#spotlightTitle");
    const summary = $("#spotlightSummary");

    if (card) {
      card.href = String(spotlight?.href ?? "#");
      card.setAttribute(
        "aria-label",
        joinLabel(["Member spotlight", spotlight?.tag, spotlight?.title, spotlight?.summary, "Spotlight Appreciation"]),
      );
    }

    if (img) {
      img.src = String(spotlight?.image ?? "./assets/img/featured/spotlight.webp");
      img.alt = String(spotlight?.imageAlt ?? "");
    }

    setText(tag, spotlight?.tag ?? "");
    setText(title, spotlight?.title ?? "");
    setText(summary, spotlight?.summary ?? "");
  }

  /* Gallery */
  function galleryHref(category) {
    const slug = normalizeSlug(category);
    return VALID_GALLERY_CATEGORIES.has(slug)
      ? `./gallery.html?category=${encodeURIComponent(slug)}`
      : "./gallery.html";
  }

  function getGalleryCategory(item) {
    const firstCategory = Array.isArray(item?.categories) ? item.categories[0] : item?.category;
    return normalizeSlug(firstCategory);
  }

  function flattenGalleryItems(data) {
    return safeArray(data?.albums).flatMap((album) => safeArray(album?.items));
  }

  function normalizeGalleryItem(item) {
    const full = String(item?.full ?? item?.src ?? "").trim();
    const thumb = String(item?.thumb ?? "").trim();
    const src = thumb || full;
    if (!src || !full) return null;

    const category = getGalleryCategory(item);
    const alt = String(item?.alt ?? item?.caption ?? "Gallery image");
    const caption = String(item?.caption ?? "");
    const key = String(item?.id ?? full ?? src);

    return {
      key,
      image: src,
      full,
      alt,
      caption,
      category,
      categoryLabel: galleryCategoryLabel(category),
      href: galleryHref(category),
    };
  }

  function shuffleItems(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }

  function pickGallerySpotlightItems(data, count = HOME_GALLERY_COUNT) {
    const seen = new Set();
    const usable = flattenGalleryItems(data)
      .map(normalizeGalleryItem)
      .filter(Boolean)
      .filter((item) => {
        const duplicateKey = item.full || item.image || item.key;
        if (seen.has(duplicateKey)) return false;
        seen.add(duplicateKey);
        return true;
      });

    if (usable.length < count) return [];
    return shuffleItems(usable).slice(0, count);
  }

  function renderGallery(items) {
    const root = $("#galleryGrid");
    if (!root) return;

    root.innerHTML = "";

    safeArray(items)
      .slice(0, 12)
      .forEach((it) => {
        const src = String(it?.image ?? "").trim();
        if (!src) return;

        const full = String(it?.full ?? src);
        const alt = String(it?.alt ?? "Guild screenshot");
        const caption = String(it?.caption ?? "");

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "home-thumb";
        btn.setAttribute("aria-label", `Open image: ${cleanLabel(caption || alt || "Guild screenshot")}`);

        btn.innerHTML = `
          <img
            class="home-thumb__img"
            src="${esc(src)}"
            alt="${esc(alt)}"
            data-full="${esc(full)}"
            data-caption="${esc(caption)}"
            loading="lazy"
            decoding="async"
          />
          <span class="home-thumb__scrim" aria-hidden="true"></span>
        `;

        root.appendChild(btn);
      });
  }

  function renderGallerySpotlightLinks(items) {
    const root = $("#galleryGrid");
    if (!root) return;

    root.innerHTML = "";

    safeArray(items)
      .slice(0, HOME_GALLERY_COUNT)
      .forEach((it) => {
        const src = String(it?.image ?? "").trim();
        if (!src) return;

        const alt = String(it?.alt ?? "Gallery image");
        const caption = String(it?.caption ?? "");
        const categoryLabel = cleanLabel(it?.categoryLabel ?? "Gallery");
        const labelText = cleanLabel(caption || alt || "Gallery image");
        const href = String(it?.href ?? "./gallery.html");

        const link = document.createElement("a");
        link.className = "home-thumb";
        link.href = href;
        link.dataset.homeGalleryLink = "true";
        link.dataset.caption = caption;
        link.setAttribute("aria-label", `View ${categoryLabel} Gallery images: ${labelText}`);
        if (caption) link.title = caption;

        link.innerHTML = `
          <img
            class="home-thumb__img"
            src="${esc(src)}"
            alt="${esc(alt)}"
            data-caption="${esc(caption)}"
            loading="lazy"
            decoding="async"
          />
          <span class="home-thumb__scrim" aria-hidden="true"></span>
        `;

        root.appendChild(link);
      });
  }

  async function rotateGallerySpotlight() {
    try {
      const data = await fetchJSON(GALLERY_JSON_URL);
      const selected = pickGallerySpotlightItems(data);
      if (selected.length === HOME_GALLERY_COUNT) renderGallerySpotlightLinks(selected);
    } catch (err) {
      console.warn("Home Gallery spotlight kept fallback data.", err);
    }
  }

  function preserveGallerySpotlightLinkClick(e) {
    if (!e.target.closest("#galleryGrid [data-home-gallery-link]")) return;
    e.stopImmediatePropagation();
  }

  function pickFeatured(bulletins) {
    const arr = safeArray(bulletins);
    return arr.find((b) => b && b.pinned === true) || arr[0] || null;
  }

  /* Boot */
  async function boot() {
    try {
      const data = await fetchJSON(HOME_JSON_URL);

      setText($("#bulletinIntro"), data?.copy?.bulletinIntro || "The latest in Mōchirīī news.");
      setText(
        $("#doorsIntro"),
        data?.copy?.doorsIntro || "What we expect, how progression works, meet the leaders, and learn the culture."
      );
      setText($("#spotlightIntro"), data?.copy?.spotlightIntro || "Shoutout to this month's top guild member.");
      setText($("#galleryIntro"), data?.copy?.galleryIntro || "Recent screenshots and shared moments.");

      renderHero(data?.hero);
      renderSeal(data?.seal);
      renderCelebrationSplash(data?.celebrationSplash);

      const featured = pickFeatured(data?.bulletins);
      if (featured) {
        renderFeaturedBulletin(featured);
        renderBulletins(safeArray(data?.bulletins).filter((b) => b && b !== featured));
      }

      renderDoors(data?.tiles);
      renderSpotlight(data?.spotlight);
      renderGallery(data?.gallery);
      rotateGallerySpotlight();
    } catch (err) {
      console.error(err);
      const heroDesc = $("#heroDescriptor");
      if (heroDesc) heroDesc.innerHTML = `<p class="muted">Home content failed to load.</p>`;
    }
  }

  document.addEventListener("click", preserveGallerySpotlightLinkClick, true);
  document.addEventListener("DOMContentLoaded", boot);
})();
