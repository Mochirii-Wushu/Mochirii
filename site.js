/* Mount */
(() => {
  "use strict";

  const HEADER_URL = "./header.html";
  const FOOTER_URL = "./footer.html";

  const $ = (sel, root = document) => root.querySelector(sel);

  function currentFile() {
    const p = window.location.pathname || "";
    return p.split("/").pop() || "index.html";
  }

function pageKeyFromFile(file) {
  const f = (file || "").toLowerCase();
  if (f === "" || f === "index.html") return "home";
  if (f.includes("announcements")) return "announcements";
  if (f.includes("raffles")) return "raffles";
  if (f.includes("events")) return "events";
  if (f.includes("join")) return "join";
  if (f.includes("ranks")) return "ranks";
  if (f.includes("leaders")) return "leaders";
  if (f.includes("codex")) return "codex";
  if (f.includes("recruitment")) return "recruitment";
  if (f.includes("gallery")) return "gallery";
  if (f.includes("spotlight")) return "spotlight";
  if (f.includes("spotify")) return "spotify";
  return "home";
}

  function setActiveNav(headerRoot, key) {
    if (!headerRoot) return;

    const links = headerRoot.querySelectorAll("[data-nav]");
    links.forEach((a) => {
      a.classList.remove("is-active");
      a.removeAttribute("aria-current");
    });

    const active = headerRoot.querySelector(`[data-nav="${key}"]`);
    if (!active) return;

    active.classList.add("is-active");
    active.setAttribute("aria-current", "page");
  }

  function initHeaderScrollState(headerRoot) {
    if (!headerRoot) return;

    const update = () => {
      const scrolled = window.scrollY > 8;
      headerRoot.dataset.state = scrolled ? "scrolled" : "top";
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* Mobile */
  function initMobileMenu(headerRoot) {
    if (!headerRoot) return;

    const btn = $("#menu-btn", headerRoot);
    const shell = $("#mobile-menu", headerRoot);
    if (!btn || !shell) return;

    const openMenu = () => {
      shell.hidden = false;
      shell.dataset.open = "true";
      btn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      const firstLink = shell.querySelector(".mobile-link");
      if (firstLink) firstLink.focus({ preventScroll: true });
    };

    const closeMenu = () => {
      shell.dataset.open = "false";
      btn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      window.setTimeout(() => {
        shell.hidden = true;
      }, 180);
      btn.focus({ preventScroll: true });
    };

    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      expanded ? closeMenu() : openMenu();
    });

    shell.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) closeMenu();
    });

    const nav = shell.querySelector(".mobile-nav");
    if (nav) {
      nav.addEventListener("click", (e) => {
        if (e.target.closest("a")) closeMenu();
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !shell.hidden) closeMenu();
    });
  }

  /* Dropdowns */
  function initDropdownNav(headerRoot) {
    if (!headerRoot) return;

    const groups = Array.from(headerRoot.querySelectorAll("[data-dropdown]"));
    if (!groups.length) return;

    const btnSel = "[data-dropdown-btn]";
    const menuSel = "[data-dropdown-menu], .nav-menu";

    const getBtn = (g) => g.querySelector(btnSel);
    const getMenu = (g) => g.querySelector(menuSel);

    const closeAll = () => {
      groups.forEach((g) => {
        const btn = getBtn(g);
        const menu = getMenu(g);
        if (!btn || !menu) return;
        btn.setAttribute("aria-expanded", "false");
        menu.hidden = true;
        g.dataset.open = "false";
      });
    };

    const openGroup = (g) => {
      closeAll();
      const btn = getBtn(g);
      const menu = getMenu(g);
      if (!btn || !menu) return;
      btn.setAttribute("aria-expanded", "true");
      menu.hidden = false;
      g.dataset.open = "true";
    };

    const toggleGroup = (g) => {
      const btn = getBtn(g);
      const menu = getMenu(g);
      if (!btn || !menu) return;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      expanded ? closeAll() : openGroup(g);
    };

    groups.forEach((g, idx) => {
      const btn = getBtn(g);
      const menu = getMenu(g);
      if (!btn || !menu) return;

      btn.setAttribute("aria-expanded", "false");
      menu.hidden = true;
      g.dataset.open = "false";

      if (!menu.id) menu.id = `nav-menu-${idx + 1}`;
      if (!btn.getAttribute("aria-controls")) btn.setAttribute("aria-controls", menu.id);

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleGroup(g);
      });

      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          toggleGroup(g);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          openGroup(g);
          const first = menu.querySelector("a,button,[role='menuitem']");
          if (first) first.focus({ preventScroll: true });
        }
      });

      menu.addEventListener("click", (e) => {
        if (e.target.closest("a")) closeAll();
      });
    });

    document.addEventListener("click", (e) => {
      const inside = e.target.closest("[data-dropdown]");
      if (!inside) closeAll();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll();
    });

    closeAll();
  }

  /* Footer */
  function setFooterYear(footerRoot) {
    if (!footerRoot) return;
    const year = new Date().getFullYear();
    const el = footerRoot.querySelector("#copyright-text");
    if (el) el.textContent = `© ${year} Mōchirīī`;
  }

  /* Lightbox — supports BOTH modalRoot (home) + lightbox (gallery) */
  function initLightbox() {
    const root =
      $("#modalRoot") ||
      $("#lightbox") ||
      document.querySelector(".lightbox");

    if (!root) return;

    const backdrop =
      $("#modalBackdrop", root) ||
      $("#lightboxBackdrop", root) ||
      root.querySelector("[data-backdrop]") ||
      root.querySelector(".lightbox-backdrop");

    const closeBtn =
      $("#modalClose", root) ||
      $("#lightboxClose", root) ||
      root.querySelector("[data-close]") ||
      root.querySelector("button");

    // IMPORTANT: explicitly support gallery’s #lightboxImg
    const img =
      $("#modalImage", root) ||
      $("#lightboxImg", root) ||
      root.querySelector("img");

    const caption =
      $("#modalCaption", root) ||
      $("#lightboxCaption", root) ||
      root.querySelector("figcaption, .lightbox-caption, [data-caption]");

    if (!backdrop || !closeBtn || !img) return;

    let lastFocus = null;
    let scrollY = 0;
    let prevBody = null;

    const lockScroll = () => {
      scrollY = window.scrollY || 0;
      prevBody = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
      };

      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };

    const unlockScroll = () => {
      if (prevBody) {
        document.body.style.position = prevBody.position;
        document.body.style.top = prevBody.top;
        document.body.style.left = prevBody.left;
        document.body.style.right = prevBody.right;
        document.body.style.width = prevBody.width;
        document.body.style.overflow = prevBody.overflow;
      } else {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
      }
      window.scrollTo(0, scrollY);
      prevBody = null;
    };

    const show = () => {
      root.classList.remove("hidden");
      root.hidden = false;
      root.setAttribute("aria-hidden", "false");

      root.style.position = "fixed";
      root.style.inset = "0";
      root.style.zIndex = "9999";
      root.style.display = "block";
      root.style.pointerEvents = "auto";

      backdrop.style.position = "absolute";
      backdrop.style.inset = "0";
      backdrop.style.background = "rgba(0,0,0,.55)";
      backdrop.style.pointerEvents = "auto";
    };

    const hide = () => {
      root.setAttribute("aria-hidden", "true");
      root.classList.add("hidden");
      root.hidden = true;

      img.src = "";
      img.alt = "";
      if (caption) caption.textContent = "";

      root.style.position = "";
      root.style.inset = "";
      root.style.zIndex = "";
      root.style.display = "";
      root.style.pointerEvents = "";

      backdrop.style.position = "";
      backdrop.style.inset = "";
      backdrop.style.background = "";
      backdrop.style.pointerEvents = "";

      unlockScroll();

      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
      lastFocus = null;
    };

    const open = (src, altText = "", capText = "") => {
      if (!src) return;
      lastFocus = document.activeElement;

      show();

      img.src = src;
      img.alt = altText || "";
      if (caption) caption.textContent = capText || "";

      lockScroll();
      closeBtn.focus({ preventScroll: true });
    };

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hide();
    });

    backdrop.addEventListener("click", (e) => {
      e.preventDefault();
      hide();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.getAttribute("aria-hidden") === "false") hide();
    });

    // CAPTURE-PHASE: grab gallery clicks before gallery.js can lock the page
    document.addEventListener(
      "click",
      (e) => {
        // Catch clicks on an entire gallery item, not just the <img>
        const galleryItem =
          e.target.closest("#galleryGrid a, #galleryGrid .gallery-item, #galleryGrid .gallery-card, #galleryGrid .gallery-thumb") ||
          e.target.closest(".gallery-grid a, .gallery-grid .gallery-item, .gallery-grid .gallery-card, .gallery-grid .gallery-thumb");

        const homeGalleryImg = e.target.closest(".home-gallery img");
        const galleryImg = e.target.closest("#galleryGrid img, .gallery-grid img");

        // If you clicked a gallery item wrapper, find the image inside it
        const pickedImg =
          galleryImg ||
          homeGalleryImg ||
          (galleryItem ? galleryItem.querySelector("img") : null);

        if (!pickedImg) return;

        e.preventDefault();
        e.stopPropagation();

        const looksLikeImage = (s) => /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(s);

        const link = pickedImg.closest("a") || galleryItem?.closest("a");
        const href = link?.getAttribute("href") || "";

        const dataFull =
          pickedImg.getAttribute("data-full") ||
          pickedImg.getAttribute("data-src") ||
          pickedImg.getAttribute("data-fullsrc") ||
          pickedImg.getAttribute("data-large") ||
          "";

        const fullSrc =
          dataFull ||
          (looksLikeImage(href) ? href : "") ||
          pickedImg.currentSrc ||
          pickedImg.src;

        const altText = pickedImg.getAttribute("alt") || "";
        const capText = pickedImg.getAttribute("data-caption") || "";

        try {
          open(fullSrc, altText, capText);
        } catch (err) {
          console.error(err);
          try { hide(); } catch {}
        }
      },
      true
    );
  }

  /* Mount */
  async function mount(url, mountSelector) {
    const mountEl = $(mountSelector);
    if (!mountEl) return null;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      mountEl.innerHTML = await res.text();
      return mountEl;
    } catch {
      return null;
    }
  }

  async function boot() {
    const key = pageKeyFromFile(currentFile());

    const headerMount = await mount(HEADER_URL, "#header");
    if (headerMount) {
      const headerRoot = headerMount.querySelector("header") || headerMount;
      setActiveNav(headerRoot, key);
      initHeaderScrollState(headerRoot);
      initMobileMenu(headerRoot);
      initDropdownNav(headerRoot);
    }

    const footerMount = await mount(FOOTER_URL, "#footer");
    if (footerMount) {
      const footerRoot = footerMount.querySelector("footer") || footerMount;
      setFooterYear(footerRoot);
    }

    initLightbox();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();