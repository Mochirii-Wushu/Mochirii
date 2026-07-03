import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];
const SOCIAL_HOST = "https://social.mochirii.com";

const header = read("apps/web/components/SiteHeader.tsx");
const footer = read("apps/web/components/SiteFooter.tsx");
const socialPanel = read("apps/web/components/member-workflow/SocialHubPanel.tsx");
const socialPage = read("apps/web/app/social/page.tsx");
const accountPanel = read("apps/web/components/member-workflow/AccountPanel.tsx");
const currentState = read("docs/current-live-state.md");
const runbook = read("docs/integration-operations-runbook.md");

const navGroups = between(header, "const navGroups", "const publicUtilityLinks");
const publicUtilityLinks = between(header, "const publicUtilityLinks", "const accountWorkflowLinks");
const accountWorkflowLinks = between(header, "const accountWorkflowLinks", "const focusableSelector");

const publicItems = [...extractItems(navGroups), ...extractItems(publicUtilityLinks)];
const accountItems = extractItems(accountWorkflowLinks);
const footerItems = extractItems(footer);

const forbiddenGroupHrefs = ["/members", "/social", "/gallery-submit", "/leader-dashboard"];

for (const href of forbiddenGroupHrefs) {
  if (navGroups.includes(`href: "${href}"`)) {
    failures.push(`SiteHeader navGroups must not expose workflow href ${href}; keep it under Account.`);
  }
}

assertIncludes("SiteHeader", header, `const SOCIAL_HOST = "${SOCIAL_HOST}"`);
assertIncludes("SiteHeader dropdown Social", navGroups, `href: SOCIAL_HOST, label: "Social", nav: "social-host", external: true`);
assertIncludes("SiteHeader dropdown Mochi Social", navGroups, `href: "/games/mochi-social", label: "Mochi Social", nav: "games/mochi-social", auth: "signed-in"`);
assertIncludes("SiteHeader group auth filtering", header, "&& !navItemHidden(item, authState)");
assertIncludes("SiteHeader moderator probe", header, "checkLeaderGalleryModerationAccess");
assertIncludes("SiteHeader lazy moderator trigger", header, `void ensureModeratorAccess();`);
assertIncludes("SiteHeader mobile moderator trigger", header, "setMobileOpen(true)");
assertIncludes("SiteHeader account controls", header, `aria-controls="nav-menu-account"`);
assertIncludes("SiteHeader account controls", header, `aria-haspopup="true"`);
assertIncludes("SiteHeader account controls", header, `aria-expanded={openGroup === "account"}`);
assertIncludes("SiteHeader moderator auth marker", header, `"data-auth-moderator"`);

assertNotIncludes("SiteHeader public nav", publicUtilityLinks, `href: "/social", label: "Social"`);
assertNotIncludes("SiteHeader public utility Social", publicUtilityLinks, `href: SOCIAL_HOST, label: "Social"`);
assertNotIncludes("SiteHeader account Social Status", accountWorkflowLinks, `href: "/social", label: "Social Status"`);
assertNotIncludes("SiteHeader account Mochi Social", accountWorkflowLinks, `href: "/games/mochi-social"`);

assertIncludes("SiteFooter", footer, `const SOCIAL_HOST = "${SOCIAL_HOST}"`);
assertIncludes("SiteFooter Social", footer, `href: SOCIAL_HOST, label: "Social", external: true`);
assertNotIncludes("SiteFooter", footer, "hidden:");
assertNotIncludes("SiteFooter", footer, "data-auth-");
assertNotIncludes("SiteFooter public Social", footer, `href: "/social", label: "Social"`);

assertIncludes("SocialHubPanel", socialPanel, `const SOCIAL_HOST = "${SOCIAL_HOST}"`);
assertIncludes("SocialHubPanel", socialPanel, `href={SOCIAL_HOST}`);
assertIncludes("SocialHubPanel", socialPanel, "Mochirii Social Status");
assertIncludes("SocialHubPanel live copy", socialPanel, "Open Mochirii Social to start or continue the guild social sign-in.");
assertNotIncludes("SocialHubPanel", socialPanel, "target=\"_blank\"");
assertNotIncludes("SocialHubPanel", socialPanel, "href={text(account?.profile_url)}");
assertIncludes("AccountPanel", accountPanel, `const SOCIAL_HOST = "${SOCIAL_HOST}"`);
assertIncludes("AccountPanel", accountPanel, `href={SOCIAL_HOST}`);
assertIncludes("AccountPanel", accountPanel, `href="/social">Social Status`);
assertNotIncludes("AccountPanel stale copy", accountPanel, "SSO compatibility gate passes");

assertIncludes("social page metadata", socialPage, "Mochirii Social Status");
assertIncludes("current live state", currentState, "public website information surface");
assertIncludes("integration runbook", runbook, "public information site");

checkScenario("signed-out", { signedIn: false, activeMember: false, moderator: false });
checkScenario("signed-in", { signedIn: true, activeMember: false, moderator: false });
checkScenario("active-member", { signedIn: true, activeMember: true, moderator: false });
checkScenario("moderator", { signedIn: true, activeMember: true, moderator: true });
checkFooter();

if (failures.length) {
  console.error("Site navigation check failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Site navigation OK.");
console.log("- Header Social and Mochi Social live in the Guild dropdown only.");
console.log("- Footer Social points to social.mochirii.com.");
console.log("- /social remains the private Social Status page.");

function read(file) {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    failures.push(`${file}: missing required file.`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    failures.push(`Could not extract section ${startMarker} -> ${endMarker}.`);
    return "";
  }
  return text.slice(start, end);
}

function extractItems(source) {
  const items = [];
  const pattern = /\{\s*href:\s*(?:"([^"]+)"|([A-Z_]+)),\s*label:\s*"([^"]+)"(?<rest>[^}]*)\}/g;
  for (const match of source.matchAll(pattern)) {
    const href = match[1] || (match[2] === "SOCIAL_HOST" ? SOCIAL_HOST : match[2]);
    const rest = match.groups?.rest || "";
    items.push({
      href,
      label: match[3],
      nav: rest.match(/nav:\s*"([^"]+)"/)?.[1] || match[3].toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      auth: rest.match(/auth:\s*"([^"]+)"/)?.[1] || "",
      external: /external:\s*true/.test(rest),
    });
  }
  return items;
}

function visible(item, state) {
  if (item.auth === "signed-out") return !state.signedIn;
  if (item.auth === "signed-in") return state.signedIn;
  if (item.auth === "verified") return state.activeMember;
  if (item.auth === "moderator") return state.moderator;
  return true;
}

function checkScenario(label, state) {
  const items = [...publicItems, ...(state.signedIn ? accountItems : [])].filter((item) => visible(item, state));
  checkDuplicates(`header ${label}`, items);

  if (state.signedIn && items.some((item) => item.href === "/social" && item.label === "Social")) {
    failures.push(`header ${label}: /social must be labelled Social Status, not Social.`);
  }

  if (!items.some((item) => item.href === SOCIAL_HOST && item.label === "Social" && item.external)) {
    failures.push(`header ${label}: expected public Social link to ${SOCIAL_HOST}.`);
  }
}

function checkFooter() {
  checkDuplicates("footer", footerItems);
  if (!footerItems.some((item) => item.href === SOCIAL_HOST && item.label === "Social" && item.external)) {
    failures.push(`footer: expected visible Social link to ${SOCIAL_HOST}.`);
  }
}

function checkDuplicates(label, items) {
  const hrefs = new Map();
  const labels = new Map();
  for (const item of items) {
    const hrefKey = item.href.toLowerCase();
    const labelKey = item.label.toLowerCase();
    hrefs.set(hrefKey, [...(hrefs.get(hrefKey) || []), item.label]);
    labels.set(labelKey, [...(labels.get(labelKey) || []), item.href]);
  }

  for (const [href, labelsForHref] of hrefs) {
    if (labelsForHref.length > 1) failures.push(`${label}: duplicate visible href ${href} (${labelsForHref.join(", ")}).`);
  }

  for (const [itemLabel, hrefsForLabel] of labels) {
    if (hrefsForLabel.length > 1) failures.push(`${label}: duplicate visible label ${itemLabel} (${hrefsForLabel.join(", ")}).`);
  }
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertNotIncludes(label, text, snippet) {
  if (text.includes(snippet)) failures.push(`${label}: unexpected snippet found: ${snippet}`);
}
