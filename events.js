/* events.js — data-driven Events renderer (page-scoped; no header/footer logic; no global rules) */
(() => {
  "use strict";

  const JSON_URL = "./data/events.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const U = window.MochiriiUtils;

  const setText = U.setText;
  const esc = U.escapeHtml;
  const fetchJSON = U.fetchJson;
  const safeArray = U.asArray;

  const FILTERS = {
    upcoming: {
      label: "Upcoming",
      empty: "No upcoming events are posted yet. Watch Discord; the next gathering will find its hour.",
    },
    past: {
      label: "Past",
      empty: "No past events are archived yet. The hall is ready for new memories.",
    },
    all: {
      label: "All",
      empty: "No events are posted yet. Discord carries the freshest word when the hall begins to gather.",
    },
  };

  const state = {
    events: [],
    activeFilter: "upcoming",
  };

  function formatDate(iso) {
    return U.formatDateUTC(iso, { year: "numeric", month: "short", day: "2-digit" });
  }

  function parseDateOnlyUTC(value) {
    const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month, day));

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function todayUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  function eventTimestamp(item) {
    return parseDateOnlyUTC(item?.date)?.getTime() ?? 0;
  }

  function eventStatus(item) {
    const eventDate = parseDateOnlyUTC(item?.date);
    if (!eventDate) return "upcoming";
    return eventDate.getTime() >= todayUTC().getTime() ? "upcoming" : "past";
  }

  function normalizeEvents(items) {
    return safeArray(items)
      .map((item, index) => ({
        ...item,
        _index: index,
        _status: eventStatus(item),
      }))
      .filter((item) => item?.title || item?.summary || item?.date);
  }

  function filteredEvents(events, filter) {
    const list = filter === "all" ? events : events.filter((item) => item._status === filter);
    const direction = filter === "past" ? -1 : 1;

    return [...list].sort((a, b) => {
      if (filter === "all" && a._status !== b._status) {
        return a._status === "upcoming" ? -1 : 1;
      }

      const delta = eventTimestamp(a) - eventTimestamp(b);
      if (delta !== 0) {
        const allDirection = filter === "all" && a._status === "past" ? -1 : direction;
        return delta * allDirection;
      }

      return a._index - b._index;
    });
  }

  function applyHero(meta) {
    const heroImg = $("#eventsHeroImage");
    const atmos = $("#eventsAtmosphere");

    if (heroImg && meta?.hero?.image) heroImg.src = meta.hero.image;
    if (atmos && meta?.hero?.atmosphere) atmos.src = meta.hero.atmosphere;
  }

  function applyMeta(meta) {
    setText($("#eventsKicker"), meta?.kicker || "Events");
    setText($("#eventsHeading"), meta?.title || "Events");
    setText($("#eventsIntro"), meta?.intro || "");

    // CHANGED: format meta.updated
    setText($("#eventsUpdated"), meta?.updated ? `Updated ${formatDate(meta.updated)}` : "");
    setText($("#eventsTimezone"), meta?.timezoneLabel || "");

    const badgesEl = $("#eventsBadges");
    const badges = Array.isArray(meta?.badges) ? meta.badges : [];
    if (badgesEl) {
      badgesEl.innerHTML = "";
      badges.forEach((b) => {
        const span = document.createElement("span");
        span.textContent = b;
        badgesEl.appendChild(span);
      });
    }
  }

  function renderFeatured(mount, featured) {
    if (!mount) return;

    if (!featured) {
      mount.innerHTML = `<p class="muted">No featured event right now.</p>`;
      return;
    }

    const bullets = Array.isArray(featured?.bullets) ? featured.bullets : [];
    const metaLine = [featured?.tag, featured?.date, featured?.time, featured?.timezone]
      .filter(Boolean)
      .join(" • ");

    mount.innerHTML = `
      <div class="glass-card glass-card--soft glass-pad">
        <p class="kicker">${esc(metaLine)}</p>

        <div style="margin-top:12px;">
          <img
            src="${esc(featured.image || "./assets/img/events/featured.webp")}"
            alt="${esc(featured.title || "Featured event")}"
            style="width:100%; border-radius:18px; border:1px solid rgba(255,255,255,.10);"
            loading="lazy"
            decoding="async"
          />
        </div>

        <h3 class="section-title section-title--sm" style="margin-top:14px;">${esc(featured.title || "")}</h3>
        <p class="lede">${esc(featured.summary || "")}</p>

        ${
          bullets.length
            ? `<ul class="list-stack">${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
            : ""
        }

        ${
          featured?.href
            ? `<div class="badge-row" style="margin-top:14px;">
                 <span><a href="${esc(featured.href)}" target="_blank" rel="noopener noreferrer">${esc(featured.linkLabel || "Open details")}</a></span>
               </div>`
            : ""
        }
      </div>
    `;
  }

  function renderEventBoard(mount, items, filter) {
    if (!mount) return;

    const list = filteredEvents(items, filter);
    const count = $("#eventsCount");
    const filterMeta = FILTERS[filter] || FILTERS.upcoming;

    if (count) {
      const noun = list.length === 1 ? "event" : "events";
      count.textContent = list.length ? `${filterMeta.label}: ${list.length} ${noun}` : `${filterMeta.label}: none posted`;
    }

    if (!list.length) {
      mount.innerHTML = `<p class="events-empty muted">${esc(filterMeta.empty)}</p>`;
      return;
    }

    const frag = document.createDocumentFragment();

    list.forEach((it) => {
      const card = document.createElement("section");
      card.className = "events-list__item";
      const metaLine = [formatDate(it?.date), it?.time, it?.timezone].filter(Boolean).join(" • ");

      card.innerHTML = `
        <p class="kicker">${esc(metaLine)}</p>
        <h4 class="section-title section-title--sm">${esc(it?.title || "Event")}</h4>
        <p class="muted">${esc(it?.summary || "")}</p>
        ${
          it?.image
            ? `<div style="margin-top:12px;">
                 <img
                   src="${esc(it.image)}"
                   alt="${esc(it.title || "Event")}"
                   style="width:100%; border-radius:16px; border:1px solid rgba(255,255,255,.10);"
                   loading="lazy"
                   decoding="async"
                 />
               </div>`
            : ""
        }
        <div class="badge-row" style="margin-top:14px;">
          <span><a href="${esc(it?.href || "https://discord.com/invite/dPafqMwWPK")}" target="_blank" rel="noopener noreferrer">Open details</a></span>
        </div>
      `;

      frag.appendChild(card);
    });

    mount.innerHTML = "";
    mount.appendChild(frag);
  }

  function setActiveFilter(filter) {
    state.activeFilter = FILTERS[filter] ? filter : "upcoming";

    document.querySelectorAll("[data-events-filter]").forEach((button) => {
      const active = button.getAttribute("data-events-filter") === state.activeFilter;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    renderEventBoard($("#eventsUpcoming"), state.events, state.activeFilter);
  }

  function initFilters() {
    document.querySelectorAll("[data-events-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveFilter(button.getAttribute("data-events-filter"));
      });
    });
  }

  function renderRecurring(introEl, mount, recurring) {
    if (introEl) setText(introEl, recurring?.intro || "");

    if (!mount) return;
    const items = Array.isArray(recurring?.items) ? recurring.items : [];

    if (!items.length) {
      mount.innerHTML = `<p class="muted">No recurring events posted yet.</p>`;
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list-stack";

    items.forEach((it) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${esc(it?.title || "")}</strong> — ${esc(it?.summary || "")}`;
      ul.appendChild(li);
    });

    mount.innerHTML = "";
    mount.appendChild(ul);
  }

  // CHANGED: avoid nesting prose-stack inside prose-stack
  function renderParticipation(mount, blocks) {
    if (!mount) return;

    const list = Array.isArray(blocks) ? blocks : [];
    if (!list.length) {
      mount.innerHTML = `<p class="muted">Participation details will be posted soon.</p>`;
      return;
    }

    const frag = document.createDocumentFragment();

    list.forEach((b) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <p><strong>${esc(b?.title || "")}</strong></p>
        <p class="muted">${esc(b?.body || "")}</p>
      `;
      frag.appendChild(wrap);
    });

    mount.innerHTML = "";
    mount.appendChild(frag);
  }

  async function boot() {
    if (document.body?.dataset?.page !== "events") return;

    const errEl = $("#eventsError");

    try {
      const data = await fetchJSON(JSON_URL);

      applyHero(data?.meta || {});
      applyMeta(data?.meta || {});

      setText($("#featuredLead"), data?.featured?.lead || "");

      state.events = normalizeEvents(data?.upcoming);
      state.activeFilter = "upcoming";

      renderFeatured($("#featuredCard"), data?.featured);
      initFilters();
      setActiveFilter(state.activeFilter);
      renderRecurring($("#eventsRhythmIntro"), $("#eventsRecurring"), data?.recurring || {});
      renderParticipation($("#eventsParticipation"), data?.participation);

      if (errEl) errEl.textContent = "";
    } catch (err) {
      console.error(err);
      if (errEl) errEl.textContent = "Unable to load events.";
      const upcoming = $("#eventsUpcoming");
      if (upcoming) upcoming.innerHTML = `<p class="muted">Unable to load events.</p>`;
      const featured = $("#featuredCard");
      if (featured) featured.innerHTML = `<p class="muted">Unable to load featured event.</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
