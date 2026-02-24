"use strict";

(function () {
  // CONFIG
  const PAGE = document.body?.dataset?.page;
  if (PAGE !== "spotlight") return;

  const DATA_URL = "./data/spotlight.json";

  // SELECTORS
  const $ = (sel, root = document) => root.querySelector(sel);

  // HELPERS
  const safeText = (v, fallback = "") => {
    const s = (v ?? "").toString().trim();
    return s ? s : fallback;
  };

  const safeArray = (v) => (Array.isArray(v) ? v : []);

  const fmtDate = (iso) => {
    const s = safeText(iso, "");
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
  };

  const setText = (sel, value, fallback = "") => {
    const node = $(sel);
    if (!node) return;
    node.textContent = safeText(value, fallback);
  };

  const setImg = (sel, src, alt) => {
    const img = $(sel);
    if (!img) return;
    const s = safeText(src, "");
    if (s) img.src = s;
    if (typeof alt === "string") img.alt = alt;
  };

  const showError = (msg) => {
    const err = $("#spotlightError");
    if (!err) return;
    err.textContent = msg;
    err.classList.remove("sr-only");
  };

  const mk = (tag, text = "") => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    return el;
  };

  // RENDER
  function renderHero(hero, spotlight) {
    setImg(
      "#spotlightHeroImage",
      safeText(hero?.image, "./assets/img/spotlight/hero.webp"),
      safeText(hero?.alt, "Member Spotlight banner artwork")
    );

    setText("#spotlightKicker", spotlight?.kicker, "Member Spotlight");
    setText("#spotlightHeading", spotlight?.title, "Spotlight");

    const dateNode = $("#spotlightDate");
    if (dateNode) dateNode.textContent = fmtDate(spotlight?.date);

    setText("#spotlightTag", spotlight?.tag, "");
    setText("#spotlightIntro", spotlight?.intro, "");
  }

  function renderBadges(badges) {
    const wrap = $("#spotlightBadges");
    if (!wrap) return;

    wrap.innerHTML = "";
    safeArray(badges)
      .map((b) => safeText(b, "").slice(0, 34))
      .filter(Boolean)
      .slice(0, 10)
      .forEach((label) => {
        const pill = mk("span", label);
        wrap.appendChild(pill);
      });
  }

  function renderBody(body) {
    const wrap = $("#spotlightBody");
    if (!wrap) return;

    wrap.innerHTML = "";
    const arr = Array.isArray(body) ? body : [body];
    const clean = arr.map((p) => safeText(p, "")).filter(Boolean);

    if (!clean.length) {
      wrap.appendChild(mk("p", "Spotlight write-up goes here."));
      return;
    }

    clean.forEach((text) => wrap.appendChild(mk("p", text)));
  }

  function renderConclusion(conclusion) {
    const wrap = $("#spotlightConclusion");
    if (!wrap) return;

    wrap.innerHTML = "";
    const text = safeText(conclusion, "");
    if (!text) return;

    const p = mk("p", text);
    wrap.appendChild(p);
  }

  function renderHighlights(items) {
    const ul = $("#spotlightHighlights");
    if (!ul) return;

    ul.innerHTML = "";
    const clean = safeArray(items).map((t) => safeText(t, "")).filter(Boolean).slice(0, 10);

    if (!clean.length) {
      const li = mk("li", "Add a few highlights for this month’s member here.");
      ul.appendChild(li);
      return;
    }

    clean.forEach((text) => {
      const li = mk("li", text);
      ul.appendChild(li);
    });
  }

  // DATA
  async function loadData() {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status})`);
    return res.json();
  }

  (async function run() {
    try {
      const data = await loadData();
      renderHero(data?.hero, data?.spotlight);
      renderBadges(data?.spotlight?.badges);
      renderBody(data?.spotlight?.body);
      renderConclusion(data?.spotlight?.conclusion);
      renderHighlights(data?.spotlight?.highlights);
    } catch (err) {
      console.error(err);
      showError(`Spotlight content failed to load: ${err?.message || "Unknown error"}`);
    }
  })();
})();
