/* events.js — data-driven Events renderer (page-scoped; no header/footer logic; no global rules) */
(() => {
  "use strict";

  const JSON_URL = "./data/events.json";

  const $ = (sel, root = document) => root.querySelector(sel);

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

  // NEW: consistent human-readable date for meta.updated
  function formatDate(iso) {
    const s = String(iso ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
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

  function renderUpcoming(mount, items) {
    if (!mount) return;

    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      mount.innerHTML = `<p class="muted">No upcoming events posted yet.</p>`;
      return;
    }

    const frag = document.createDocumentFragment();

    list.forEach((it) => {
      const card = document.createElement("section");
      card.className = "glass-card glass-card--soft glass-pad";
      const metaLine = [it?.date, it?.time, it?.timezone].filter(Boolean).join(" • ");

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

      renderFeatured($("#featuredCard"), data?.featured);
      renderUpcoming($("#eventsUpcoming"), data?.upcoming);
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