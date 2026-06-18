/* recruitment.js — data-driven Recruitment renderer (no global rules, no header/footer logic) */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "recruitment") return;

  const JSON_URL = "./data/recruitment.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const U = window.MochiriiUtils;

  const setText = U.setText;
  const safeArray = U.asArray;
  const fetchJSON = U.fetchJson;

  function clearEl(el) {
    if (!el) return;
    el.innerHTML = "";
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
  return U.formatDateUTC(iso, { locale: "en-US", year: "numeric", month: "long" });
}

  function formatAudioTime(value) {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const totalSeconds = Math.floor(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function configureAudioPlayer(audio, hasAudio) {
    const player = $("#recruitmentAudioPlayer");
    if (!audio || !player) return;

    const playButton = $("[data-audio-play]", player);
    const playIcon = $(".recruitment-audio-button__icon", playButton);
    const seekInput = $("[data-audio-seek]", player);
    const timeEl = $("[data-audio-time]", player);
    const muteButton = $("[data-audio-mute]", player);
    const volumeInput = $("[data-audio-volume]", player);
    const statusEl = $("[data-audio-status]", player);

    const setStatus = (message) => setText(statusEl, message || "");

    function setRangeFill() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
      const volume = Math.round((Number.isFinite(audio.volume) ? audio.volume : 1) * 100);
      player.style.setProperty("--audio-progress", `${progress}%`);
      player.style.setProperty("--audio-volume", `${volume}%`);
    }

    function syncPlayback() {
      const playing = !audio.paused && !audio.ended;
      player.dataset.state = playing ? "playing" : "paused";
      if (playIcon) playIcon.dataset.icon = playing ? "pause" : "play";
      playButton?.setAttribute("aria-label", playing ? "Pause recruitment audio" : "Play recruitment audio");
    }

    function syncMetadata() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      if (seekInput) {
        seekInput.max = String(duration || 0);
        seekInput.value = String(duration > 0 ? currentTime : 0);
        seekInput.disabled = !hasAudio || duration <= 0;
        seekInput.setAttribute("aria-valuetext", `${formatAudioTime(currentTime)} of ${formatAudioTime(duration)}`);
      }
      setText(timeEl, `${formatAudioTime(currentTime)} / ${formatAudioTime(duration)}`);
      setRangeFill();
    }

    function syncVolume() {
      const volume = Number.isFinite(audio.volume) ? audio.volume : 1;
      const muted = audio.muted || volume === 0;
      if (volumeInput) {
        volumeInput.value = String(volume);
        volumeInput.disabled = !hasAudio;
        volumeInput.setAttribute("aria-valuetext", `${Math.round(volume * 100)}%`);
      }
      muteButton?.setAttribute("aria-label", muted ? "Unmute recruitment audio" : "Mute recruitment audio");
      muteButton?.setAttribute("data-muted", muted ? "true" : "false");
      setRangeFill();
    }

    [playButton, muteButton, volumeInput].forEach((control) => {
      if (control) control.disabled = !hasAudio;
    });
    if (seekInput) seekInput.disabled = true;
    player.dataset.state = hasAudio ? "paused" : "unavailable";

    if (player.dataset.audioPlayerBound === "true") {
      syncPlayback();
      syncMetadata();
      syncVolume();
      return;
    }
    player.dataset.audioPlayerBound = "true";

    player.addEventListener("contextmenu", (event) => event.preventDefault());

    playButton?.addEventListener("click", async () => {
      if (!hasAudio) return;
      if (!audio.paused && !audio.ended) {
        audio.pause();
        return;
      }
      try {
        if (audio.networkState === audio.NETWORK_EMPTY) {
          audio.load();
        }
        await audio.play();
      } catch {
        setStatus("Unable to start audio playback.");
      }
    });

    seekInput?.addEventListener("input", () => {
      const nextTime = Number(seekInput.value);
      if (!Number.isFinite(nextTime)) return;
      audio.currentTime = nextTime;
      syncMetadata();
    });

    muteButton?.addEventListener("click", () => {
      audio.muted = !(audio.muted || audio.volume === 0);
      syncVolume();
    });

    volumeInput?.addEventListener("input", () => {
      const nextVolume = Math.min(1, Math.max(0, Number(volumeInput.value)));
      audio.volume = Number.isFinite(nextVolume) ? nextVolume : 1;
      audio.muted = audio.volume === 0;
      syncVolume();
    });

    audio.addEventListener("loadedmetadata", syncMetadata);
    audio.addEventListener("durationchange", syncMetadata);
    audio.addEventListener("timeupdate", syncMetadata);
    audio.addEventListener("play", () => {
      setStatus("");
      syncPlayback();
    });
    audio.addEventListener("pause", syncPlayback);
    audio.addEventListener("ended", () => {
      audio.currentTime = 0;
      syncPlayback();
      syncMetadata();
    });
    audio.addEventListener("volumechange", syncVolume);
    audio.addEventListener("error", () => {
      setStatus("Unable to load the audio note.");
      syncPlayback();
    });

    syncPlayback();
    syncMetadata();
    syncVolume();
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

    audio.textContent = "Your browser does not support the audio element.";
    audio.removeAttribute("src");
    audio.removeAttribute("controls");
    audio.setAttribute("controlsList", "nodownload");
    if (audio.controlsList?.add) audio.controlsList.add("nodownload");

    if (!sources.length) {
      setText(descEl, audioDesc || "Audio unavailable.");
      addBadgeRow(badgesEl, []);
      configureAudioPlayer(audio, false);
      return;
    }

    // Bind the approved asset path directly for reliable custom-control playback.
    audio.src = String(sources[0]?.src || "").trim();

    audio.load();
    configureAudioPlayer(audio, true);

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
