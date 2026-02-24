/* raffles.js — data-driven Raffles renderer (page-scoped; no header/footer logic; no global rules) */
(() => {
  "use strict";

  // NEW: hard guard so this file does nothing on other pages
  if (document.body?.dataset?.page !== "raffles") return;

  const JSON_URL = "./data/raffles.json";

  const q = (sel, root = document) => root.querySelector(sel);

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

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
  }

  function renderBadges(mount, items) {
    if (!mount) return;
    const list = Array.isArray(items) ? items : [];
    mount.innerHTML = "";
    list.forEach((t) => {
      const span = document.createElement("span");
      span.textContent = t;
      mount.appendChild(span);
    });
  }

  function renderProseStack(mount, lines) {
    if (!mount) return;
    const list = Array.isArray(lines) ? lines : [];
    mount.innerHTML = "";
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "";
      mount.appendChild(p);
      return;
    }
    list.forEach((txt) => {
      const p = document.createElement("p");
      p.textContent = txt;
      mount.appendChild(p);
    });
  }

  function renderListStack(mount, items) {
    if (!mount) return;
    const list = Array.isArray(items) ? items : [];
    mount.innerHTML = "";
    if (!list.length) return;
    list.forEach((txt) => {
      const li = document.createElement("li");
      li.textContent = txt;
      mount.appendChild(li);
    });
  }

  function renderThisMonth(mount, data) {
    if (!mount) return;

    const date = data?.date || "";
    const time = data?.time || "";
    const tz = data?.timezone || "";
    const prizes = Array.isArray(data?.prizes) ? data.prizes : [];
    const notes = data?.notes || "";

    const meta = [date, time, tz].filter(Boolean).join(" • ");

    mount.innerHTML = `
      ${meta ? `<p class="kicker">${esc(meta)}</p>` : ""}
      ${prizes.length ? `<ul class="list-stack">${prizes.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      ${notes ? `<p class="muted">${esc(notes)}</p>` : ""}
    `;
  }

  // CHANGED: build anchors safely (no innerHTML)
  function renderLinks(mount, links) {
    if (!mount) return;
    const list = Array.isArray(links) ? links : [];
    mount.innerHTML = "";

    list.forEach((l) => {
      const href = l?.href;
      const label = l?.label;
      if (!href || !label) return;

      const span = document.createElement("span");
      const a = document.createElement("a");
      a.setAttribute("href", href);

      if (String(href).startsWith("http")) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }

      a.textContent = label;
      span.appendChild(a);
      mount.appendChild(span);
    });
  }

  async function boot() {
    const errEl = q("#rafflesError");

    try {
      const data = await loadJSON(JSON_URL);

      const meta = data?.meta || {};

      const heroImg = q("#rafflesHeroImage");
      const atmos = q("#rafflesAtmosphere");
      if (heroImg && meta?.hero?.image) heroImg.src = meta.hero.image;
      if (atmos && meta?.hero?.atmosphere) atmos.src = meta.hero.atmosphere;

      setText(q("#rafflesKicker"), meta?.kicker || "Raffles");
      setText(q("#rafflesHeading"), meta?.title || "Raffles");
      setText(q("#rafflesIntro"), meta?.intro || "");
      setText(q("#rafflesFrequency"), meta?.frequency || "");
      setText(q("#rafflesTimezone"), meta?.timezoneLabel || "");
      renderBadges(q("#rafflesBadges"), meta?.badges);

      renderProseStack(q("#rafflesHow"), data?.how);
      renderListStack(q("#rafflesRules"), data?.rules);
      renderThisMonth(q("#rafflesThisMonth"), data?.thisMonth);
      renderLinks(q("#rafflesLinks"), data?.links);
      renderProseStack(q("#rafflesNote"), data?.note);

      if (errEl) errEl.textContent = "";
    } catch (err) {
      console.error(err);
      if (errEl) errEl.textContent = "Unable to load raffles.";
      const how = q("#rafflesHow");
      if (how) how.innerHTML = `<p class="muted">Unable to load raffle content.</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();