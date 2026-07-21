(() => {
  document.documentElement.classList.add("theme-js-ready");

  const samePageHashTarget = (link) => {
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return null;
    }
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname ||
        url.search !== window.location.search || url.hash.length < 2) {
      return null;
    }
    let targetId;
    try {
      targetId = decodeURIComponent(url.hash.slice(1));
    } catch {
      return null;
    }
    return document.getElementById(targetId);
  };

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey) {
      return;
    }
    const link = event.target.closest?.('a[href*="#"]');
    if (!link) return;
    const target = samePageHashTarget(link);
    if (!target) return;
    window.requestAnimationFrame(() => {
      const needsTemporaryTabIndex = !target.matches("a[href], button, input, select, textarea, [tabindex]");
      if (needsTemporaryTabIndex) target.setAttribute("tabindex", "-1");
      target.focus();
      if (needsTemporaryTabIndex) {
        target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
      }
    });
  });

  for (const section of document.querySelectorAll("[data-product-section]")) {
    const variantSelect = section.querySelector("[data-product-variant-select]");
    if (!variantSelect) continue;

    variantSelect.addEventListener("change", () => {
      const option = variantSelect.selectedOptions[0];
      const available = option?.dataset.available === "true";
      const price = section.querySelector("[data-product-price]");
      const availability = section.querySelector("[data-product-availability]");
      const variantStatus = section.querySelector("[data-product-variant-status]");
      const addButton = section.querySelector("[data-add-to-cart]");
      const quantity = section.querySelector("[data-product-quantity]");
      const availabilityText = available ? "In stock" : "Out of stock";

      if (price && option?.dataset.price) price.textContent = option.dataset.price;
      if (availability) availability.textContent = availabilityText;
      if (addButton) {
        addButton.disabled = !available;
        addButton.textContent = available ? "Add to cart" : "Out of stock";
      }
      if (quantity) quantity.disabled = !available;
      if (variantStatus && option) {
        const variantName = option.textContent.trim().replace(/\s+/g, " ").replace(/\s+-\s+Out of stock$/, "");
        const variantPrice = option.dataset.price ? ` Price ${option.dataset.price}.` : "";
        variantStatus.textContent = `${variantName}.${variantPrice} ${availabilityText}.`;
      }

      const mediaId = option?.dataset.mediaId;
      if (mediaId) {
        const media = [...section.querySelectorAll("[data-product-media-id]")]
          .find((item) => item.dataset.productMediaId === mediaId);
        media?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "nearest",
          inline: "start"
        });
      }

      const productUrl = section.dataset.productUrl;
      if (productUrl && window.history?.replaceState) {
        const url = new URL(productUrl, window.location.origin);
        url.searchParams.set("variant", variantSelect.value);
        window.history.replaceState({}, "", url);
      }
    });
  }

  for (const form of document.querySelectorAll(".contact-form")) {
    const errorSummary = form.querySelector("[data-contact-error-summary]");
    if (errorSummary) {
      window.requestAnimationFrame(() => {
        errorSummary.focus({ preventScroll: true });
        errorSummary.scrollIntoView({ block: "center" });
      });
    }

    let focusPending = false;
    for (const field of form.querySelectorAll("[data-contact-field]")) {
      const error = document.getElementById(field.dataset.errorId);
      const showFieldError = () => {
        field.setAttribute("aria-invalid", "true");
        if (!error) return;
        error.textContent = field.validationMessage || "Review this field.";
        error.hidden = false;
        field.setAttribute("aria-describedby", error.id);
      };

      field.addEventListener("invalid", (event) => {
        event.preventDefault();
        showFieldError();

        if (!focusPending) {
          focusPending = true;
          window.setTimeout(() => {
            field.focus();
            focusPending = false;
          }, 0);
        }
      });

      field.addEventListener("input", () => {
        if (!field.validity.valid) {
          if (field.getAttribute("aria-invalid") === "true") showFieldError();
          return;
        }
        field.removeAttribute("aria-invalid");
        field.removeAttribute("aria-describedby");
        if (error) {
          error.hidden = true;
          error.textContent = "";
        }
      });
    }
  }

  for (const toggle of document.querySelectorAll("[data-navigation-toggle]")) {
    const submenu = document.getElementById(toggle.getAttribute("aria-controls"));
    const item = toggle.closest(".site-nav__item");
    if (!submenu || !item) continue;

    const setExpanded = (expanded) => {
      toggle.setAttribute("aria-expanded", String(expanded));
      item.classList.toggle("site-nav__item--expanded", expanded);
      if (expanded) return;
      for (const descendantToggle of submenu.querySelectorAll("[data-navigation-toggle]")) {
        descendantToggle.setAttribute("aria-expanded", "false");
        descendantToggle.closest(".site-nav__item")?.classList.remove("site-nav__item--expanded");
      }
    };

    toggle.addEventListener("click", () => {
      setExpanded(toggle.getAttribute("aria-expanded") !== "true");
    });

    item.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return;
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
      toggle.focus();
    });
  }

  for (const mobileMenu of document.querySelectorAll(".mobile-menu")) {
    const summary = mobileMenu.querySelector(".mobile-menu__summary");
    const panel = mobileMenu.querySelector(".mobile-menu__panel");

    mobileMenu.addEventListener("toggle", () => {
      if (mobileMenu.open) return;
      for (const toggle of mobileMenu.querySelectorAll("[data-navigation-toggle]")) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.closest(".site-nav__item")?.classList.remove("site-nav__item--expanded");
      }
    });

    panel?.addEventListener("click", (event) => {
      if (!event.target.closest?.("a")) return;
      mobileMenu.open = false;
    });

    mobileMenu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !mobileMenu.open) return;
      event.preventDefault();
      mobileMenu.open = false;
      summary?.focus();
    });
  }
})();
