/* recruitment.js — data-driven Recruitment renderer (no global rules, no header/footer logic) */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "recruitment") return;

  const JSON_URL = "./data/recruitment.json";

  const $ = (sel, root = document) => root.querySelector(sel);

  function setText(el, value) {
    if (!el) return;
    el.textContent = value ?? "";
  }

  function clearEl(el) {
    if (!el) return;
    el.innerHTML = "";
  }

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
  }

  function addBadgeRow(rowEl, labels) {
    if (!rowEl) return;
    clearEl(rowEl);
    safeArray(labels).forEach((label) => {
      const span = document.createElement("span");
      span.textContent = String(label);
      rowEl.appendChild(span);
    });
  }

  function addProseBlocks(rootEl, blocks) {
    if (!rootEl) return;
    clearEl(rootEl);

    const frag = document.createDocumentFragment();
    safeArray(blocks).forEach((text) => {
      const p = document.createElement("p");
      p.textContent = String(text ?? "");
      frag.appendChild(p);
    });

    rootEl.appendChild(frag);
  }

function fmtMonth(iso) {
  const s = String(iso ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

  function setHeroImages(data) {
    const hero = $("#recruitmentHeroImage");
    const atmos = $("#recruitmentAtmosphere");

    const heroSrc = data?.hero?.image;
    const heroAlt = data?.hero?.alt;

    if (heroSrc) hero?.setAttribute("src", heroSrc);
    if (heroAlt) hero?.setAttribute("alt", heroAlt);

    const atmosSrc = data?.hero?.atmosphere;
    if (atmos && atmosSrc) {
      atmos.setAttribute("src", atmosSrc);
      // If you later enable atmos display in CSS, this will be ready.
    }
  }

  function setAudio(data) {
    const audio = $("#recruitmentAudio");
    const titleEl = $("#recruitmentAudioTitle");
    const descEl = $("#recruitmentAudioDesc");
    const badgesEl = $("#recruitmentAudioBadges");

    const audioTitle = data?.audio?.title || "A Note";
    const audioDesc = data?.audio?.description || "";
    const sources = safeArray(data?.audio?.sources);

    setText(titleEl, audioTitle);
    setText(descEl, audioDesc);

    if (!audio) return;

audio.innerHTML = "";

if (!sources.length) {
  audio.removeAttribute("controls");
  setText(descEl, audioDesc || "Audio unavailable.");
  addBadgeRow(badgesEl, []);
  return;
}

audio.setAttribute("controls", "controls");

// Rebuild sources safely.
sources.forEach((srcObj) => {
  const src = srcObj?.src;
  const type = srcObj?.type;
  if (!src) return;

  const s = document.createElement("source");
  s.setAttribute("src", src);
  if (type) s.setAttribute("type", type);
  audio.appendChild(s);
});

    // Friendly badges like “mp3”, “ogg”
    const formats = sources
      .map((s) => {
        const t = String(s?.type || "");
        if (!t) return "";
        const slash = t.indexOf("/");
        return slash >= 0 ? t.slice(slash + 1) : t;
      })
      .filter(Boolean);

    addBadgeRow(badgesEl, formats.length ? formats.map((f) => `Audio: ${f}`) : []);
  }

  function applyMeta(data) {
    setText($("#recruitmentKicker"), data?.meta?.kicker || "Recruitment");
    setText($("#recruitmentHeading"), data?.meta?.heading || "Recruitment Tips");
    setText($("#recruitmentAuthor"), data?.meta?.author || "");
    setText($("#recruitmentUpdated"), fmtMonth(data?.meta?.updated));
    setText($("#recruitmentIntro"), data?.meta?.intro || "");

    addBadgeRow($("#recruitmentBadges"), safeArray(data?.meta?.badges));

    setText($("#recruitmentBodyTitle"), data?.content?.title || "Recruitment");
  }

  function applyContent(data) {
    addProseBlocks($("#recruitmentBody"), safeArray(data?.content?.paragraphs));
    addProseBlocks($("#recruitmentConclusion"), safeArray(data?.content?.conclusion));
  }

async function boot() {
  const errorEl = $("#recruitmentError");

  try {
    const data = await fetchJSON(JSON_URL);
    setHeroImages(data);
    applyMeta(data);
    setAudio(data);
    applyContent(data);

    if (errorEl) {
      errorEl.classList.add("sr-only");
      setText(errorEl, "");
    }
  } catch (err) {
    console.error(err);
    if (errorEl) {
      errorEl.classList.remove("sr-only");
      setText(errorEl, "Unable to load recruitment content.");
    }
  }
}

  document.addEventListener("DOMContentLoaded", boot);
})();
