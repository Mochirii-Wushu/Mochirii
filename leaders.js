// leaders.js — Leaders page rendering only (no Tailwind; uses styles.css classes)
"use strict";

(() => {
  if (document.body?.dataset?.page !== "leaders") return;

  const DATA_URL = "./data/leaders.json";
  const qs = (sel, root = document) => root.querySelector(sel);

  function safeText(v, fb = "") {
    const s = (v ?? "").toString().trim();
    return s.length ? s : fb;
  }
  function safeArr(v) {
    return Array.isArray(v) ? v : [];
  }
  function clear(node) {
    if (node) node.innerHTML = "";
  }
  function setImg(imgEl, src, alt) {
    if (!imgEl) return;
    const s = safeText(src, "");
    if (s) imgEl.src = s;
    if (typeof alt === "string") imgEl.alt = alt;
  }

  // NEW: safe text setter to avoid null crashes
  function setNodeText(selOrEl, value) {
    const el = typeof selOrEl === "string" ? qs(selOrEl) : selOrEl;
    if (!el) return;
    el.textContent = value ?? "";
  }

  function pillSpan(label) {
    const span = document.createElement("span");
    span.textContent = label;
    return span;
  }
  function renderPills(wrap, pills) {
    if (!wrap) return;
    clear(wrap);
    safeArr(pills)
      .map((p) => safeText(p, ""))
      .filter(Boolean)
      .slice(0, 10)
      .forEach((t) => wrap.appendChild(pillSpan(t)));
  }
  function renderParagraphs(wrap, paragraphs) {
    if (!wrap) return;
    clear(wrap);
    const arr = safeArr(paragraphs).map((p) => safeText(p, "")).filter(Boolean);
    if (!arr.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "—";
      wrap.appendChild(p);
      return;
    }
    arr.forEach((txt) => {
      const p = document.createElement("p");
      p.textContent = txt;
      wrap.appendChild(p);
    });
  }
  function showError(msg) {
    const el = qs("#leadersError");
    if (!el) return;
    el.classList.remove("sr-only");
    el.textContent = msg;
  }

  // NEW: hide/clear error on success
  function clearError() {
    const el = qs("#leadersError");
    if (!el) return;
    el.classList.add("sr-only");
    el.textContent = "";
  }

  function leaderCard(leader) {
    const col = document.createElement("div");
    col.className = "col-4";

    const card = document.createElement("article");
    card.className = "glass-card glass-card--soft";
    card.style.overflow = "hidden";

    const media = document.createElement("div");
    media.style.position = "relative";
    media.style.aspectRatio = "3 / 4";

    const img = document.createElement("img");
    img.src = safeText(leader.image, "./assets/img/leaders/leader-silhouette.webp");
    img.alt = safeText(leader.alt, `${safeText(leader.role, "Leader")} portrait`);
    img.loading = "lazy";
    img.decoding = "async";
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    const scrim = document.createElement("div");
    scrim.style.position = "absolute";
    scrim.style.inset = "0";
    scrim.style.background = "rgba(0,0,0,.25)";

    const plate = document.createElement("div");
    plate.style.position = "absolute";
    plate.style.left = "16px";
    plate.style.right = "16px";
    plate.style.bottom = "16px";

    const plateInner = document.createElement("div");
    plateInner.className = "glass-card glass-card--primary";
    plateInner.style.padding = "14px";
    plateInner.style.borderRadius = "18px";
    plateInner.style.boxShadow = "none";

    const top = document.createElement("div");
    top.style.display = "flex";
    top.style.alignItems = "center";
    top.style.justifyContent = "space-between";
    top.style.gap = "10px";
    top.style.flexWrap = "wrap";

    const roleWrap = document.createElement("div");
    roleWrap.className = "badge-row";
    roleWrap.style.marginTop = "0";
    roleWrap.appendChild(pillSpan(safeText(leader.role, "Role")));

    const avail = document.createElement("span");
    avail.className = "meta-text";
    avail.textContent = safeText(leader.availability, "");

    top.appendChild(roleWrap);
    top.appendChild(avail);

    const name = document.createElement("h3");
    name.className = "section-title section-title--sm";
    name.style.margin = "10px 0 0";
    name.textContent = safeText(leader.name, "Leader");

    const summary = document.createElement("p");
    summary.className = "muted";
    summary.style.margin = "10px 0 0";
    summary.textContent = safeText(leader.summary, "");

    plateInner.appendChild(top);
    plateInner.appendChild(name);
    plateInner.appendChild(summary);

    const href = safeText(leader.profileHref, "");
    if (href) {
      const a = document.createElement("a");
      a.href = href;
      a.className = "footer-link";
      a.style.display = "inline-flex";
      a.style.marginTop = "12px";
      a.textContent = safeText(leader.profileLabel, "Open profile");
      plateInner.appendChild(a);
    }

    plate.appendChild(plateInner);

    media.appendChild(img);
    media.appendChild(scrim);
    media.appendChild(plate);

    card.appendChild(media);
    col.appendChild(card);
    return col;
  }

  function responsibilityCard(item) {
    const col = document.createElement("div");
    col.className = "col-4";

    const wrap = document.createElement("article");
    wrap.className = "glass-card glass-card--soft";
    wrap.style.overflow = "hidden";

    const media = document.createElement("div");
    media.style.position = "relative";
    media.style.aspectRatio = "16 / 10";

    const img = document.createElement("img");
    img.src = safeText(item.image, "");
    img.alt = safeText(item.alt, "Responsibilities visual panel");
    img.loading = "lazy";
    img.decoding = "async";
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    const scrim = document.createElement("div");
    scrim.style.position = "absolute";
    scrim.style.inset = "0";
    scrim.style.background = "rgba(0,0,0,.18)";

    const plate = document.createElement("div");
    plate.style.position = "absolute";
    plate.style.left = "16px";
    plate.style.right = "16px";
    plate.style.bottom = "16px";

    const plateInner = document.createElement("div");
    plateInner.className = "glass-card glass-card--primary";
    plateInner.style.padding = "14px";
    plateInner.style.borderRadius = "18px";
    plateInner.style.boxShadow = "none";

    const h = document.createElement("h3");
    h.className = "section-title section-title--sm";
    h.style.margin = "0";
    h.textContent = safeText(item.title, "Responsibility");

    const p = document.createElement("p");
    p.className = "muted";
    p.style.margin = "10px 0 0";
    p.textContent = safeText(item.description, "");

    plateInner.appendChild(h);
    plateInner.appendChild(p);
    plate.appendChild(plateInner);

    if (img.src) media.appendChild(img);
    media.appendChild(scrim);
    media.appendChild(plate);

    wrap.appendChild(media);
    col.appendChild(wrap);
    return col;
  }

  async function loadData() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status}).`);
    try {
      return JSON.parse(text);
    } catch {
      const head = text.slice(0, 80).replace(/\s+/g, " ").trim();
      throw new Error(`Invalid JSON in ${DATA_URL}. First bytes: "${head}"`);
    }
  }

  (async () => {
    try {
      const data = await loadData();
      clearError();

      // Hero (NEW: safe setters)
      setNodeText("#leadersKicker", safeText(data?.hero?.kicker, "Leaders"));
      setNodeText("#leadersHeading", safeText(data?.hero?.title, "Leaders Hall"));
      setImg(qs("#leadersHeroImage"), data?.hero?.image, "Leaders Hall banner artwork");

      // Keep atmosphere unused by default, but safe for future data parity
      const atmosEl = qs("#leadersAtmosphere");
      if (atmosEl) atmosEl.src = safeText(data?.hero?.atmosphereImage, "");

      renderParagraphs(qs("#leadersIntro"), data?.hero?.introBody);
      renderPills(qs("#leadersHeroPills"), data?.hero?.pills);

      // Panel
      setNodeText("#leadersPanelTitle", safeText(data?.panel?.title, "Guild Leadership"));
      setNodeText("#leadersPanelBadge", safeText(data?.panel?.badge, "Contact & Profiles"));
      setImg(qs("#leadersPanelImage"), data?.panel?.image, "Leadership hall artwork");
      renderParagraphs(qs("#leadersPanelBody"), data?.panel?.body);
      setNodeText("#leadersPanelNote", safeText(data?.panel?.note, ""));

      // Council
      setNodeText("#leadersGridTitle", safeText(data?.council?.title, "The Council"));
      setNodeText("#leadersGridDesc", safeText(data?.council?.description, ""));

      const grid = qs("#leadersGrid");
      clear(grid);

      const leaders = safeArr(data?.leaders).slice(0, 12);
      if (!leaders.length) {
        const shell = document.createElement("div");
        shell.className = "col-4 glass-card glass-card--soft glass-pad";
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "—";
        shell.appendChild(p);
        grid?.appendChild(shell);
      } else {
        leaders.forEach((l) => grid?.appendChild(leaderCard(l)));
      }

      // Responsibilities
      setNodeText("#respTitle", safeText(data?.responsibilities?.title, "Responsibilities"));
      setNodeText("#respDesc", safeText(data?.responsibilities?.description, ""));

      const respGrid = qs("#respGrid");
      clear(respGrid);
      safeArr(data?.responsibilities?.items)
        .slice(0, 6)
        .forEach((it) => respGrid?.appendChild(responsibilityCard(it)));
    } catch (err) {
      console.error(err);
      showError(`Leaders content failed to load: ${String(err?.message || err)}`);
    }
  })();
})();