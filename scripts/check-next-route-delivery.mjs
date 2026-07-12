import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function expectIncludes(label, source, snippet) {
  if (!source.includes(snippet)) failures.push(`${label}: missing ${snippet}`);
}

function expectExcludes(label, source, snippet) {
  if (source.includes(snippet)) failures.push(`${label}: must not include ${snippet}`);
}

const rootLayout = read("apps/web/app/layout.tsx");
const nextConfig = read("apps/web/next.config.ts");
const globalStyles = [
  "tokens-base.css",
  "shared-ui.css",
  "shell-header-nav.css",
  "shell-mobile-menu.css",
  "shell-footer.css",
  "mochi-pets.css",
];
const routeStyles = [
  "public-join.css",
  "public-events.css",
  "public-side-pages.css",
  "public-content-shared.css",
  "public-home-seal.css",
  "public-home-media.css",
  "public-home-bulletins.css",
  "public-home-doors.css",
  "public-home-visual.css",
  "public-profiles.css",
  "public-profile-cards.css",
  "public-ceremony.css",
  "public-gallery.css",
  "member-workflow.css",
  "member-account.css",
  "member-forms.css",
  "member-gallery-submit.css",
  "member-leader-dashboard.css",
  "shell-lightbox.css",
];

globalStyles.forEach((style) => expectIncludes("root layout", rootLayout, style));
routeStyles.forEach((style) => expectExcludes("root layout", rootLayout, style));

[
  'const workspaceRoot = resolve(appRoot, "../..");',
  "outputFileTracingRoot: workspaceRoot,",
  "root: workspaceRoot,",
].forEach((snippet) => expectIncludes("Next workspace root", nextConfig, snippet));

const routeContracts = {
  "apps/web/app/page.tsx": [
    "public-content-shared.css",
    "public-home-seal.css",
    "public-home-media.css",
    "public-home-bulletins.css",
    "public-home-doors.css",
    "public-home-visual.css",
    "shell-lightbox.css",
  ],
  "apps/web/app/join/page.tsx": ["public-join.css", "public-content-shared.css"],
  "apps/web/app/events/page.tsx": ["public-events.css", "public-side-pages.css", "public-content-shared.css", "public-gallery.css"],
  "apps/web/app/announcements/page.tsx": ["public-side-pages.css", "public-content-shared.css"],
  "apps/web/app/raffles/page.tsx": ["public-events.css", "public-side-pages.css", "public-content-shared.css"],
  "apps/web/app/spotify/page.tsx": ["public-side-pages.css", "public-content-shared.css", "public-gallery.css"],
  "apps/web/app/spotlight/page.tsx": ["public-side-pages.css", "public-content-shared.css", "public-profiles.css", "public-profile-cards.css"],
  "apps/web/app/gallery/page.tsx": ["public-content-shared.css", "public-gallery.css", "shell-lightbox.css"],
  "apps/web/app/leaders/page.tsx": ["public-content-shared.css", "public-profiles.css", "public-profile-cards.css", "public-ceremony.css"],
  "apps/web/app/ranks/page.tsx": ["public-content-shared.css", "public-ceremony.css"],
  "apps/web/app/tome/page.tsx": ["public-content-shared.css", "public-ceremony.css"],
  "apps/web/app/recruitment/page.tsx": ["public-content-shared.css", "public-profiles.css"],
  "apps/web/app/twills/page.tsx": ["public-content-shared.css", "public-profiles.css"],
  "apps/web/app/account/page.tsx": ["public-content-shared.css", "member-workflow.css", "member-account.css", "member-forms.css"],
  "apps/web/app/auth/page.tsx": ["public-content-shared.css", "member-workflow.css", "member-forms.css"],
  "apps/web/app/social/page.tsx": ["public-content-shared.css", "member-workflow.css"],
  "apps/web/app/oauth/consent/page.tsx": ["public-content-shared.css", "member-workflow.css", "member-forms.css"],
  "apps/web/app/gallery-submit/page.tsx": ["public-content-shared.css", "member-workflow.css", "member-forms.css", "member-gallery-submit.css"],
  "apps/web/app/leader-dashboard/page.tsx": ["public-content-shared.css", "member-workflow.css", "member-forms.css", "member-gallery-submit.css", "member-leader-dashboard.css"],
};

for (const [file, styles] of Object.entries(routeContracts)) {
  const source = read(file);
  styles.forEach((style) => expectIncludes(file, source, style));
}

const homePage = read("apps/web/app/page.tsx");
expectExcludes("home page", homePage, 'import { HomeBirthdaySplash } from "@/components/HomeBirthdaySplash";');
[
  "async function OptionalBirthdaySplash",
  "if (config.enabled !== true) return null;",
  'await import("@/components/HomeBirthdaySplash")',
].forEach((snippet) => expectIncludes("home page", homePage, snippet));

const spotlightTitle = read("apps/web/components/public-pages/SpotlightWinnerTitle.tsx");
expectExcludes("spotlight title", spotlightTitle, '"use client"');
expectExcludes("spotlight title", spotlightTitle, "useEffect");
expectIncludes("spotlight title", spotlightTitle, "export async function SpotlightWinnerTitle");

const spotlightLookup = read("apps/web/lib/supabase/spotlight.ts");
expectIncludes("spotlight lookup", spotlightLookup, 'import "server-only";');
expectIncludes("spotlight lookup", spotlightLookup, "next: { revalidate: 3600 }");

const lightbox = read("apps/web/components/HomeGalleryLightbox.tsx");
const lightboxModal = read("apps/web/components/HomeGalleryLightboxModal.tsx");
expectIncludes("home gallery", lightbox, "lazy(() =>");
expectIncludes("home gallery", lightbox, "<Suspense fallback={null}>");
expectExcludes("home gallery", lightbox, "createPortal");
expectIncludes("home gallery modal", lightboxModal, "createPortal");
expectIncludes("home gallery modal", lightboxModal, "useBodyScrollLock(true)");

if (failures.length) {
  console.error(`Next route delivery validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Next route delivery validation OK.");
