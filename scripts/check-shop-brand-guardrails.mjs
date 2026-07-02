import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = [
  "account.html",
  "account.js",
  "announcements.html",
  "announcements.js",
  "auth.html",
  "auth.js",
  "tome.html",
  "tome.js",
  "data",
  "events.html",
  "events.js",
  "footer.html",
  "gallery-submit.html",
  "gallery-submit.js",
  "gallery.html",
  "gallery.js",
  "header.html",
  "home.js",
  "index.html",
  "join.html",
  "join.js",
  "leader-dashboard.html",
  "leader-dashboard.js",
  "leaders.html",
  "leaders.js",
  "raffles.html",
  "raffles.js",
  "ranks.html",
  "ranks.js",
  "recruitment.html",
  "recruitment.js",
  "spotify.html",
  "spotify.js",
  "spotlight.html",
  "spotlight.js",
  "styles.css",
  "twills.html",
  "twills.js",
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
];

const textExtensions = new Set([".css", ".html", ".js", ".json", ".tsx", ".ts"]);
const blocked = [
  { label: "legacy shop brand", pattern: /\bVelesari\b|\bvelesari\b|shop\.velesari\.trade|velesari\.trade/i },
  { label: "supplier or third-party cosmetics brand", pattern: /\bSelfnamed\b|\bselfnamed\b|\bM(?:Á|A|Ã)DARA\b|\bMadara\b/i },
  { label: "supplier-facing commerce phrase", pattern: /\bprivate label\b|\bdropshipping\b|\boffer your customers\b|\bprofessional skincare offerings\b/i },
];

const failures = [];

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(filePath) {
  if (!existsSync(filePath)) return [];
  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    return readdirSync(filePath).flatMap((entry) => walk(path.join(filePath, entry)));
  }
  return [filePath];
}

for (const scanRoot of scanRoots) {
  const absolute = path.join(root, scanRoot);
  for (const file of walk(absolute).filter(isTextFile)) {
    const relativePath = path.relative(root, file).split(path.sep).join("/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      blocked.forEach((rule) => {
        if (rule.pattern.test(line)) {
          failures.push(`${relativePath}:${index + 1} ${rule.label}: ${line.trim()}`);
        }
      });
    });
  }
}

if (failures.length) {
  console.error("Shop brand guardrails failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Shop brand guardrails OK.");
