(() => {
  document.documentElement.classList.add("theme-js-ready");

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
      const availabilityText = available ? "In stock" : "Sold out";

      if (price && option?.dataset.price) price.textContent = option.dataset.price;
      if (availability) availability.textContent = availabilityText;
      if (addButton) {
        addButton.disabled = !available;
        addButton.textContent = available ? "Add to cart" : "Sold out";
      }
      if (quantity) quantity.disabled = !available;
      if (variantStatus && option) {
        const variantName = option.textContent.trim().replace(/\s+/g, " ").replace(/\s+-\s+Sold out$/, "");
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
})();
