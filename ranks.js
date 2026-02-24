// ranks.js — Ranks page rendering only (pills are spans, never links)
"use strict";

(() => {
  if (document.body?.dataset?.page !== "ranks") return;

  const DATA_URL = "./data/ranks.json";
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

    const arr = safeArr(paragraphs)
      .map((p) => safeText(p, ""))
      .filter(Boolean);

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

  function renderRanks(wrap, ranks) {
    if (!wrap) return;
    clear(wrap);

    const arr = safeArr(ranks);
    if (!arr.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "—";
      wrap.appendChild(p);
      return;
    }

    arr.forEach((r) => {
      const card = document.createElement("div");
      card.className = "glass-card glass-card--soft glass-pad";
      card.style.boxShadow = "none";

      const h = document.createElement("h3");
      h.className = "section-title section-title--sm";
      h.style.marginBottom = "8px";
      h.textContent = safeText(r?.name, "Rank");

      const body = document.createElement("div");
      body.className = "prose-stack";
      renderParagraphs(body, r?.body);

      card.appendChild(h);
      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  function showError(msg) {
    const el = qs("#ranksError");
    if (!el) return;
    el.classList.remove("sr-only");
    el.textContent = msg;
  }

  // NEW: hide/clear error on success
  function clearError() {
    const el = qs("#ranksError");
    if (!el) return;
    el.classList.add("sr-only");
    el.textContent = "";
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

      // NEW: ensure prior errors don't persist
      clearError();

      // Hero (NEW: safe setters to prevent null crashes)
      setNodeText("#ranksKicker", safeText(data?.hero?.kicker, "Ranks"));
      setNodeText("#ranksHeading", safeText(data?.hero?.title, "Ranks & Progression"));
      setNodeText("#ranksIntro", safeText(data?.hero?.intro, ""));

      setImg(qs("#ranksHeroImage"), data?.hero?.image, "Ranks and progression banner artwork");

      // Keep atmosphere disabled (site style already hides it), but allow future use safely
      const atmos = safeText(data?.hero?.atmosphereImage, "");
      const atmosEl = qs("#ranksAtmosphere");
      if (atmosEl) atmosEl.src = atmos;

      renderPills(qs("#ranksHeroPills"), data?.hero?.pills);

      // Progression
      setNodeText("#progressionTitle", safeText(data?.progression?.title, "Progression"));
      renderPills(qs("#progressionPills"), data?.progression?.pills);
      renderParagraphs(qs("#progressionBody"), data?.progression?.body);

      // Senior
      setNodeText("#seniorTitle", safeText(data?.tiers?.senior?.title, "Senior Leadership"));
      setNodeText("#seniorDesc", safeText(data?.tiers?.senior?.description, ""));
      setNodeText("#seniorNote", safeText(data?.tiers?.senior?.note, ""));
      setImg(qs("#seniorImage"), data?.tiers?.senior?.image, "Senior Leadership artwork");
      renderRanks(qs("#seniorRanks"), data?.tiers?.senior?.ranks);

      // Middle (pills only)
      setNodeText("#middleTitle", safeText(data?.tiers?.middle?.title, "Middle Leadership"));
      setNodeText("#middleDesc", safeText(data?.tiers?.middle?.description, ""));
      setNodeText("#middleNote", safeText(data?.tiers?.middle?.note, ""));
      setImg(qs("#middleImage"), data?.tiers?.middle?.image, "Middle Leadership artwork");
      renderPills(qs("#middlePills"), data?.tiers?.middle?.pills);
      renderRanks(qs("#middleRanks"), data?.tiers?.middle?.ranks);

      // Members (pills only)
      setNodeText("#membersTitle", safeText(data?.tiers?.members?.title, "Members"));
      setNodeText("#membersDesc", safeText(data?.tiers?.members?.description, ""));
      setNodeText("#membersNote", safeText(data?.tiers?.members?.note, ""));
      setImg(qs("#membersImage"), data?.tiers?.members?.image, "Members artwork");
      renderPills(qs("#membersPills"), data?.tiers?.members?.pills);
      renderRanks(qs("#membersRanks"), data?.tiers?.members?.ranks);
    } catch (err) {
      console.error(err);
      showError(`Ranks content failed to load: ${String(err?.message || err)}`);
    }
  })();
})();