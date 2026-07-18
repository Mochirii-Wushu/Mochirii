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
      const addButton = section.querySelector("[data-add-to-cart]");
      const quantity = section.querySelector("[data-product-quantity]");

      if (price && option?.dataset.price) price.textContent = option.dataset.price;
      if (availability) availability.textContent = available ? "In stock" : "Sold out";
      if (addButton) {
        addButton.disabled = !available;
        addButton.textContent = available ? "Add to cart" : "Sold out";
      }
      if (quantity) quantity.disabled = !available;

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
})();
