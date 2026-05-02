/* utils.js — small shared helpers for static page scripts */
(() => {
  "use strict";

  if (window.MochiriiUtils) return;

  const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const SPOTIFY_KINDS = new Set(["album", "artist", "episode", "playlist", "show", "track"]);

  function text(value, fallback = "") {
    const s = String(value ?? "").trim();
    return s ? s : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clearElement(el) {
    if (el) el.innerHTML = "";
  }

  function resolveElement(target, root = document) {
    return typeof target === "string" ? root.querySelector(target) : target;
  }

  function setText(target, value, fallback = "") {
    const el = resolveElement(target);
    if (!el) return;
    el.textContent = text(value, fallback);
  }

  function setImg(target, src, alt) {
    const img = resolveElement(target);
    if (!img) return;
    const s = text(src, "");
    if (s) img.src = s;
    if (typeof alt === "string") img.alt = alt;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    const raw = await res.text();
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status}).`);
    try {
      return JSON.parse(raw);
    } catch {
      const head = raw.slice(0, 80).replace(/\s+/g, " ").trim();
      throw new Error(`Invalid JSON in ${url}. First bytes: "${head}"`);
    }
  }

  function formatDateUTC(value, options = {}, fallback) {
    const s = text(value, "");
    if (!s) return fallback ?? "";
    const { locale, ...intlOptions } = options || {};

    const match = s.match(DATE_ONLY_RE);
    const date = match
      ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
      : new Date(s);

    if (Number.isNaN(date.getTime())) return fallback ?? s;

    return date.toLocaleDateString(locale, {
      ...intlOptions,
      timeZone: "UTC",
    });
  }

  function isExternalHttpUrl(href) {
    return /^https?:\/\//i.test(String(href || ""));
  }

  function normalizeTags(tags, limit = 12) {
    return asArray(tags)
      .map((tag) => text(tag, ""))
      .filter(Boolean)
      .slice(0, limit);
  }

  function toSpotifyEmbedSrc(input) {
    const s = text(input, "");
    if (!s) return "";

    try {
      const url = new URL(s);
      if (url.hostname !== "open.spotify.com") return "";

      const parts = url.pathname.split("/").filter(Boolean);
      const isEmbed = parts[0] === "embed";
      const kind = isEmbed ? parts[1] : parts[0];
      const id = isEmbed ? parts[2] : parts[1];

      if (SPOTIFY_KINDS.has(kind) && id) {
        return `https://open.spotify.com/embed/${kind}/${encodeURIComponent(id)}?utm_source=generator`;
      }
    } catch {
      return "";
    }

    return "";
  }

  window.MochiriiUtils = {
    asArray,
    clearElement,
    escapeHtml,
    fetchJson,
    formatDateUTC,
    isExternalHttpUrl,
    normalizeTags,
    resolveElement,
    setImg,
    setText,
    text,
    toSpotifyEmbedSrc,
  };
})();
