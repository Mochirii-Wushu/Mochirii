import { readText } from "./repo-paths.mjs";

export const appCssFiles = [
  "apps/web/app/styles/tokens-base.css",
  "apps/web/app/styles/shared-ui.css",
  "apps/web/app/styles/public-pages.css",
  "apps/web/app/styles/member-workflow.css",
  "apps/web/app/styles/shell-lightbox.css",
  "apps/web/app/styles/shell-header-nav.css",
  "apps/web/app/styles/shell-mobile-menu.css",
  "apps/web/app/styles/shell-footer.css",
  "apps/web/app/styles/mochi-pets.css",
];

export function readAppCss() {
  return appCssFiles.map((file) => readText(file)).join("\n");
}
