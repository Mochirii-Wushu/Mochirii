/* codex.js */
"use strict";

(() => {
  if (document.body?.dataset?.page !== "codex") return;

  const DATA_URL = "./data/codex.json";
  const $ = (sel, root = document) => root.querySelector(sel);

  function text(v, fb = "") {
    const s = String(v ?? "").trim();
    return s ? s : fb;
  }
  function arr(v) {
    return Array.isArray(v) ? v : [];
  }
  function empty(el) {
    if (el) el.innerHTML = "";
  }
  function setText(sel, v, fb = "") {
    const el = $(sel);
    if (el) el.textContent = text(v, fb);
  }
  function setImg(sel, src, alt) {
    const el = $(sel);
    if (!el) return;
    const s = text(src, "");
    if (s) el.src = s;
    if (typeof alt === "string") el.alt = alt;
  }
  function showError(msg) {
    const el = $("#codexError");
    if (!el) return;
    el.classList.remove("sr-only");
    el.textContent = msg;
  }

  function pills(mount, items) {
    if (!mount) return;
    empty(mount);
    arr(items)
      .map((p) => text(p, ""))
      .filter(Boolean)
      .slice(0, 12)
      .forEach((t) => {
        const span = document.createElement("span");
        span.textContent = t;
        mount.appendChild(span);
      });
  }

  function paragraphs(mount, items, fallback = "—") {
    if (!mount) return;
    empty(mount);

    const lines = arr(items).map((p) => text(p, "")).filter(Boolean);
    if (!lines.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = fallback;
      mount.appendChild(p);
      return;
    }

    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      mount.appendChild(p);
    });
  }

function miniCard(title, description) {
  const col = document.createElement("div");
  col.className = "col-6";

    const card = document.createElement("article");
    card.className = "glass-card glass-card--soft glass-pad";

    const h = document.createElement("h3");
    h.className = "section-title section-title--sm";
    h.style.margin = "0";
    h.textContent = text(title, "Title");

    const p = document.createElement("p");
    p.className = "muted";
    p.style.margin = "10px 0 0";
    p.textContent = text(description, "");

    card.appendChild(h);
    card.appendChild(p);
    col.appendChild(card);
    return col;
  }

function listBlock(title, items) {
  const col = document.createElement("div");
  col.className = "col-12";

    const card = document.createElement("article");
    card.className = "glass-card glass-card--soft glass-pad";

    const h = document.createElement("h3");
    h.className = "section-title section-title--sm";
    h.style.margin = "0";
    h.textContent = text(title, "Section");

    const ul = document.createElement("ul");
    ul.style.margin = "12px 0 0";
    ul.style.paddingLeft = "18px";

    arr(items)
      .map((it) => text(it, ""))
      .filter(Boolean)
      .slice(0, 10)
      .forEach((it) => {
        const li = document.createElement("li");
        li.textContent = it;
        ul.appendChild(li);
      });

    card.appendChild(h);
    card.appendChild(ul);
    col.appendChild(card);
    return col;
  }

  async function loadData() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    const raw = await res.text();
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status}).`);
    try {
      return JSON.parse(raw);
    } catch {
      const head = raw.slice(0, 80).replace(/\s+/g, " ").trim();
      throw new Error(`Invalid JSON in ${DATA_URL}. First bytes: "${head}"`);
    }
  }

  function renderSectionCards(gridEl, items, limit = 12) {
    if (!gridEl) return;
    empty(gridEl);
    arr(items).slice(0, limit).forEach((it) => {
      gridEl.appendChild(miniCard(it?.title, it?.description));
    });
  }

  function renderSectionBlocks(gridEl, blocks, limit = 6) {
    if (!gridEl) return;
    empty(gridEl);
    arr(blocks).slice(0, limit).forEach((b) => {
      gridEl.appendChild(listBlock(b?.title, b?.items));
    });
  }

  (async () => {
    try {
      const data = await loadData();

      // Hero
      setText("#codexKicker", data?.hero?.kicker, "Codex");
      setText("#codexHeading", data?.hero?.title, "The Codex");
      setImg("#codexHeroImage", data?.hero?.image, "The Codex banner artwork");
      paragraphs($("#codexIntro"), data?.hero?.introBody, text(data?.hero?.description, "—"));
      pills($("#codexHeroPills"), data?.hero?.pills);

      // Intro
      setText("#introBadge", data?.intro?.badge, "Values & Rhythm");
      setText("#introTitle", data?.intro?.title, "A living guide");
      setImg("#introImage", data?.intro?.image, "Codex artwork");
      paragraphs($("#introBody"), data?.intro?.body);

      // Tenets
      setText("#tenetsTitle", data?.tenets?.title, "Tenets");
      setText("#tenetsDesc", data?.tenets?.description, "");
      setImg("#tenetsImage", data?.tenets?.image, "Tenets artwork");
      setText("#tenetsCapTitle", data?.tenets?.captionTitle, "");
      setText("#tenetsCapDesc", data?.tenets?.caption, "");
      pills($("#tenetsPills"), data?.tenets?.pills);
      renderSectionCards($("#tenetsGrid"), data?.tenets?.items);
      setText("#tenetsNote", data?.tenets?.note, "");

      // Etiquette
      setText("#etiquetteBadge", data?.etiquette?.badge, "How we treat each other");
      setText("#etiquetteTitle", data?.etiquette?.title, "Etiquette");
      setText("#etiquetteDesc", data?.etiquette?.description, "");
      setImg("#etiquetteImage", data?.etiquette?.image, "Etiquette artwork");
      renderSectionBlocks($("#etiquetteBlocks"), data?.etiquette?.blocks);
      setText("#etiquetteNote", data?.etiquette?.note, "");

      // Rhythm
      setText("#rhythmTitle", data?.rhythm?.title, "Rhythm");
      setText("#rhythmDesc", data?.rhythm?.description, "");
      setImg("#rhythmImage", data?.rhythm?.image, "Guild rhythm artwork");
      setText("#rhythmCapTitle", data?.rhythm?.captionTitle, "");
      setText("#rhythmCapDesc", data?.rhythm?.caption, "");
      pills($("#rhythmPills"), data?.rhythm?.pills);
      renderSectionCards($("#rhythmGrid"), data?.rhythm?.items);
      setText("#rhythmNote", data?.rhythm?.note, "");

      // Recognition
      setText("#recTitle", data?.recognition?.title, "Recognition");
      setText("#recDesc", data?.recognition?.description, "");
      setImg("#recImage", data?.recognition?.image, "Recognition artwork");
      renderSectionCards($("#recGrid"), data?.recognition?.items);
      const recLink = $("#recLink");
      if (recLink) recLink.href = text(data?.recognition?.ranksHref, "./ranks.html");
    } catch (err) {
      console.error(err);
      showError(`Codex content failed to load: ${String(err?.message || err)}`);
    }
  })();
})();