/* spotify.js — Playlists page logic only (data fetch + render + filter) */
"use strict";

(() => {
  if (document.body?.dataset?.page !== "spotify") return;

  const els = {
    intro: document.getElementById("spotifyIntro"),
    grid: document.getElementById("spotifyGrid"),
    chips: document.getElementById("spotifyChips"),
    search: document.getElementById("spotifySearch"),
    empty: document.getElementById("spotifyEmpty"),
  };

  const state = {
    items: [],
    query: "",
    tag: "All",
    tags: ["All"],
  };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toEmbedSrc(input) {
    const s = String(input || "").trim();
    if (!s) return "";

    if (s.includes("open.spotify.com/embed/")) return s;

    try {
      const url = new URL(s);
      if (!url.hostname.includes("spotify.com")) return s;

      const parts = url.pathname.split("/").filter(Boolean);
      const kind = parts[0];
      const id = parts[1];
      if (kind && id) {
        return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`;
      }
      return s;
    } catch {
      return s;
    }
  }

  function normalizeTags(tags) {
    const arr = Array.isArray(tags) ? tags : [];
    return arr
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function buildTagIndex(items) {
    const set = new Set(["All"]);
    for (const it of items) {
      for (const t of normalizeTags(it.tags)) set.add(t);
    }
    return Array.from(set);
  }

  function renderChips() {
    if (!els.chips) return;

    els.chips.innerHTML = state.tags
      .map((tag) => {
        const pressed = tag === state.tag ? "true" : "false";
        return `<button type="button" class="spotify-chip" data-tag="${escapeHtml(
          tag
        )}" aria-pressed="${pressed}">${escapeHtml(tag)}</button>`;
      })
      .join("");
  }

  function matches(item) {
    const q = state.query.trim().toLowerCase();
    const tag = state.tag;

    const hay = [
      item.title,
      item.subtitle,
      item.description,
      ...(Array.isArray(item.tags) ? item.tags : []),
      item.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const tagOk = tag === "All" || normalizeTags(item.tags).includes(tag);
    const qOk = !q || hay.includes(q);

    return tagOk && qOk;
  }

  function renderGrid() {
    if (!els.grid || !els.empty) return;

    const filtered = state.items.filter(matches);

    els.grid.innerHTML = filtered
      .map((it) => {
        const title = escapeHtml(it.title || "Untitled");
        const subtitle = escapeHtml(it.subtitle || "");
        const type = escapeHtml(it.type || "playlist");
        const desc = escapeHtml(it.description || "");
        const height = Number(it.height) > 0 ? Number(it.height) : 352;

        const src = toEmbedSrc(it.embed || it.url);
        const safeSrc = escapeHtml(src);

        return `
        <article class="spotify-card glass-card glass-card--primary glass-pad" aria-label="${title}">
          <div class="spotify-card__head">
            <div>
              <h3 class="spotify-card__title">${title}</h3>
              <div class="spotify-card__meta">${subtitle ? subtitle + " • " : ""}${type}</div>
              ${desc ? `<p class="muted" style="margin:10px 0 0 0;">${desc}</p>` : ``}
            </div>
          </div>

          <div class="spotify-embed" style="margin-top:12px;">
            <iframe
              style="border-radius:12px"
              src="${safeSrc}"
              width="100%"
              height="${height}"
              frameborder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify embed: ${title}"
            ></iframe>
          </div>
        </article>
      `;
      })
      .join("");

    els.empty.hidden = filtered.length > 0;
  }

  async function load() {
    try {
      const res = await fetch("./data/spotify.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load spotify.json (${res.status})`);
      const data = await res.json();

      const items = Array.isArray(data.items) ? data.items : [];
      state.items = items.map((it) => ({
        title: it.title || "",
        subtitle: it.subtitle || "",
        description: it.description || "",
        type: it.type || "playlist",
        tags: normalizeTags(it.tags),
        url: it.url || "",
        embed: it.embed || "",
        height: it.height || 352,
      }));

      state.tags = buildTagIndex(state.items);
      if (els.intro) els.intro.textContent = data.intro || "Browse and play from the embedded shelf.";

      renderChips();
      renderGrid();
    } catch (err) {
      if (els.intro) els.intro.textContent = "Unable to load playlists right now.";
      if (els.grid) {
        els.grid.innerHTML = `<div class="spotify-empty"><p class="muted" style="margin:0;">${escapeHtml(
          err.message || String(err)
        )}</p></div>`;
      }
      if (els.empty) els.empty.hidden = true;
    }
  }

  function wireSearch() {
    if (!els.search) return;

    let t = null;
    els.search.addEventListener("input", () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        state.query = els.search.value || "";
        renderGrid();
      }, 80);
    });
  }

  function wireChips() {
    if (!els.chips) return;

    els.chips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tag]");
      if (!btn) return;
      state.tag = btn.getAttribute("data-tag") || "All";
      renderChips();
      renderGrid();
    });
  }

  if (els.grid && els.search && els.intro && els.chips && els.empty) {
    wireSearch();
    wireChips();
    load();
  }
})();