import { readText } from "./repo-paths.mjs";

export const appCssFiles = [
  "apps/web/app/styles/tokens-base.css",
  "apps/web/app/styles/shared-ui.css",
  "apps/web/app/styles/public-join.css",
  "apps/web/app/styles/public-events.css",
  "apps/web/app/styles/public-side-pages.css",
  "apps/web/app/styles/public-home.css",
  "apps/web/app/styles/public-profiles.css",
  "apps/web/app/styles/public-ceremony.css",
  "apps/web/app/styles/public-gallery.css",
  "apps/web/app/styles/member-workflow.css",
  "apps/web/app/styles/member-account.css",
  "apps/web/app/styles/member-forms.css",
  "apps/web/app/styles/member-gallery-submit.css",
  "apps/web/app/styles/member-leader-dashboard.css",
  "apps/web/app/styles/shell-lightbox.css",
  "apps/web/app/styles/shell-header-nav.css",
  "apps/web/app/styles/shell-mobile-menu.css",
  "apps/web/app/styles/shell-footer.css",
  "apps/web/app/styles/mochi-pets.css",
];

export function readAppCss() {
  return appCssFiles.map((file) => readText(file)).join("\n");
}
