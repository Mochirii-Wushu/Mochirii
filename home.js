/* home.js — Home page renderer (data only) */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "home") return;

  const JSON_URL = "./data/home.json";
  const $ = (sel, root = document) => root.querySelector(sel);

  /* Helpers */
  function setText(el, value) {
    if (!el) return;
    el.textContent = value ?? "";
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
  }

  function fmtDate(iso) {
    const s = String(iso ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-US", {
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

  /* Hero */
  function renderHero(hero) {
    const heroImg = $("#heroImage");
    const heroAtmos = $("#heroAtmosphere");
    const desc = $("#heroDescriptor");
    const badges = $("#heroBadges");

    if (heroImg && hero?.image) heroImg.src = hero.image;

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

  /* Bulletin */
  function renderFeaturedBulletin(item) {
    const a = $("#featuredBulletin");
    const img = $("#featuredBulletinImage");
    const type = $("#featuredBulletinType");
    const date = $("#featuredBulletinDate");
    const title = $("#featuredBulletinTitle");
    const summary = $("#featuredBulletinSummary");

    if (a) a.href = String(item?.href ?? "#");

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
            <img class="home-bulletin__img" src="${esc(it?.image ?? "./assets/img/bulletins/item.webp")}" alt="${esc(it?.imageAlt ?? "Bulletin cover")}" loading="lazy" decoding="async" />
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

    if (card) card.href = String(spotlight?.href ?? "#");

    if (img) {
      img.src = String(spotlight?.image ?? "./assets/img/featured/spotlight.webp");
      img.alt = String(spotlight?.imageAlt ?? "");
    }

    setText(tag, spotlight?.tag ?? "");
    setText(title, spotlight?.title ?? "");
    setText(summary, spotlight?.summary ?? "");
  }

  /* Gallery */
  function renderGallery(items) {
    const root = $("#galleryGrid");
    if (!root) return;

    root.innerHTML = "";

    safeArray(items)
      .slice(0, 12)
      .forEach((it) => {
        const src = String(it?.image ?? "").trim();
        if (!src) return;

        const alt = String(it?.alt ?? "Guild screenshot");
        const caption = String(it?.caption ?? "");

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "home-thumb";
        btn.setAttribute("aria-label", caption ? `Open image: ${caption}` : "Open image");

        btn.innerHTML = `
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

        root.appendChild(btn);
      });
  }

  function pickFeatured(bulletins) {
    const arr = safeArray(bulletins);
    return arr.find((b) => b && b.pinned === true) || arr[0] || null;
  }

  /* Boot */
  async function boot() {
    try {
      const data = await fetchJSON(JSON_URL);

      setText($("#bulletinIntro"), data?.copy?.bulletinIntro || "The latest in Mōchirīī news.");
      setText(
        $("#doorsIntro"),
        data?.copy?.doorsIntro || "What we expect, how progression works, meet the leaders, and learn the culture."
      );
      setText($("#spotlightIntro"), data?.copy?.spotlightIntro || "Shoutout to this month's top guild member.");
      setText($("#galleryIntro"), data?.copy?.galleryIntro || "Recent screenshots and shared moments.");

      renderHero(data?.hero);
      renderSeal(data?.seal);

      const featured = pickFeatured(data?.bulletins);
      if (featured) {
        renderFeaturedBulletin(featured);
        renderBulletins(safeArray(data?.bulletins).filter((b) => b && b !== featured));
      }

      renderDoors(data?.tiles);
      renderSpotlight(data?.spotlight);
      renderGallery(data?.gallery);
    } catch (err) {
      console.error(err);
      const heroDesc = $("#heroDescriptor");
      if (heroDesc) heroDesc.innerHTML = `<p class="muted">Home content failed to load.</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();