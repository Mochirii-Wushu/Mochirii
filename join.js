/* join.js — Join page behavior + rendering only
   Owns: fetching join.json, binding content into join.html placeholders
   Avoids: header/footer logic (site.js), styling or spacing rules
*/
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "join") return;

  const DATA_URL = "./data/join.json";
  const qs = (sel, root = document) => root.querySelector(sel);

  function safeText(v, fallback = "") {
    const s = (v ?? "").toString().trim();
    return s.length ? s : fallback;
  }

  function setText(sel, value) {
    const el = qs(sel);
    if (el) el.textContent = value ?? "";
  }

  function setImg(sel, src, alt) {
    const img = qs(sel);
    if (!img) return;
    if (src !== undefined) img.src = src;
    if (alt !== undefined) img.alt = alt;
  }

  function clearAndAppend(parent, nodes) {
    if (!parent) return;
    parent.innerHTML = "";
    const list = Array.isArray(nodes) ? nodes : [];
    list.forEach((n) => parent.appendChild(n));
  }

  function isExternalHref(href) {
    const h = String(href || "");
    return /^https?:\/\//i.test(h);
  }

  function makeBadge(text, href) {
    const span = document.createElement("span");
    const label = safeText(text, "");
    if (!label) return span;

    if (href) {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;

      // NEW: match other pages’ external-link safety behavior
      if (isExternalHref(href)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }

      span.appendChild(a);
    } else {
      span.textContent = label;
    }
    return span;
  }

  function buildStepLi(step, idx) {
    const li = document.createElement("li");

    const n = safeText(step?.number, String(idx + 1));
    const title = safeText(step?.title, "Step");
    const desc = safeText(step?.description, "");

    const strong = document.createElement("strong");
    strong.textContent = `${n}. ${title}`;
    li.appendChild(strong);

    if (desc) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = desc;
      li.appendChild(p);
    }

    return li;
  }

  function buildCultureBlock(item) {
    const wrap = document.createElement("div");

    const h = document.createElement("h3");
    h.className = "section-title section-title--sm";
    h.textContent = safeText(item?.title, "Note");
    wrap.appendChild(h);

    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = safeText(item?.description, "");
    wrap.appendChild(p);

    return wrap;
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
  }

  function fmtMonth(iso) {
    const s = String(iso ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  }

  function showError(msg) {
    const err = qs("#joinError");
    if (!err) return;
    err.classList.remove("sr-only");
    err.textContent = msg;
  }

  function clearError() {
    const err = qs("#joinError");
    if (!err) return;
    err.classList.add("sr-only");
    err.textContent = "";
  }

  function applyHero(data) {
    const hero = data.hero || {};

    setImg("#joinHeroImage", hero.image, hero.imageAlt);

    const atmosSrc = safeText(hero.atmosphereImage, "");
    if (atmosSrc) setImg("#joinAtmosphere", atmosSrc, "");
    else {
      const atmos = qs("#joinAtmosphere");
      if (atmos) atmos.removeAttribute("src");
    }

    setText("#joinKicker", hero.kicker);
    setText("#joinHeading", hero.title);

    // NEW: allow ISO in json; still displays readable if you keep old strings
    const updated = safeText(hero.updated, "");
    setText("#joinUpdated", updated ? `Updated ${fmtMonth(updated)}` : "");

    setText("#joinTimezone", hero.timezone);
    setText("#joinIntro", hero.intro);

    const badges = Array.isArray(hero.badges) ? hero.badges.map((b) => makeBadge(b)) : [];
    clearAndAppend(qs("#joinBadges"), badges);
  }

  function applySteps(data) {
    setText("#joinStepsTitle", data.steps?.title);

    const intro = Array.isArray(data.steps?.intro)
      ? data.steps.intro.map((t) => {
          const p = document.createElement("p");
          p.textContent = t;
          return p;
        })
      : [];
    clearAndAppend(qs("#joinStepsIntro"), intro);

    const items = Array.isArray(data.steps?.items) ? data.steps.items : [];
    const steps = items.map(buildStepLi);
    clearAndAppend(qs("#joinStepsList"), steps);
  }

  function applyQuickStart(data) {
    setText("#joinQuickTitle", data.quickStart?.title);

    const body = Array.isArray(data.quickStart?.body)
      ? data.quickStart.body.map((t) => {
          const p = document.createElement("p");
          p.textContent = t;
          return p;
        })
      : [];
    clearAndAppend(qs("#joinQuickBody"), body);

    const links = Array.isArray(data.quickStart?.links)
      ? data.quickStart.links.map((l) => makeBadge(l.label, l.href))
      : [];
    clearAndAppend(qs("#joinLinks"), links);
  }

  function applyCulture(data) {
    setText("#joinCultureTitle", data.culture?.title);

    const intro = Array.isArray(data.culture?.intro)
      ? data.culture.intro.map((t) => {
          const p = document.createElement("p");
          p.textContent = t;
          return p;
        })
      : [];
    clearAndAppend(qs("#joinCultureIntro"), intro);

    const cards = Array.isArray(data.culture?.cards) ? data.culture.cards.map(buildCultureBlock) : [];
    clearAndAppend(qs("#joinCultureCards"), cards);
  }

  function applyNotes(data) {
    setText("#joinFaqTitle", data.notes?.title);

    const body = Array.isArray(data.notes?.body)
      ? data.notes.body.map((t) => {
          const p = document.createElement("p");
          p.textContent = t;
          return p;
        })
      : [];
    clearAndAppend(qs("#joinNotes"), body);

    const links = Array.isArray(data.notes?.links)
      ? data.notes.links.map((l) => makeBadge(l.label, l.href))
      : [];
    clearAndAppend(qs("#joinNotesBadges"), links);
  }

  async function boot() {
    try {
      const data = await fetchJSON(DATA_URL);
      applyHero(data);
      applySteps(data);
      applyQuickStart(data);
      applyCulture(data);
      applyNotes(data);
      clearError();
    } catch (err) {
      console.error(err);
      showError("Unable to load join content.");
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();