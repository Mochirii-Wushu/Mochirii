import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("../apps/web/node_modules/sharp");

const root = process.cwd();
const source = "C:/Users/xtyty/Pictures/Mochirii/Guild Event Images.png";
const outputSize = { width: 1600, height: 640 };

const panels = [
  { file: "breaking-army.png", x: 0, y: 0 },
  { file: "guild-party.png", x: 0, y: 229 },
  { file: "monthly-gathering.png", x: 0, y: 458 },
  { file: "showdown.png", x: 0, y: 687 },
  { file: "guild-heros-realm.png", x: 859, y: 0 },
  { file: "guild-wars.png", x: 859, y: 229 },
  { file: "monthly-raffle.png", x: 859, y: 458 },
  { file: "united-resolve.png", x: 859, y: 687 },
];

const crop = { width: 858, height: 229 };

if (!existsSync(source)) {
  throw new Error(`Discord event cover source sheet is missing: ${source}`);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function renderPanel(panel) {
  const input = sharp(source).extract({ left: panel.x, top: panel.y, ...crop });
  const foreground = await input
    .clone()
    .resize(outputSize.width, outputSize.height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const background = await input
    .clone()
    .resize(outputSize.width, outputSize.height, { fit: "cover" })
    .blur(22)
    .modulate({ brightness: 0.45, saturation: 0.9 })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${outputSize.width}" height="${outputSize.height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgba(3,8,9,0.34)"/></svg>`,
        ),
        blend: "over",
      },
    ])
    .png()
    .toBuffer();

  return sharp(background)
    .composite([{ input: foreground, blend: "over" }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

const hashes = {};

for (const panel of panels) {
  const buffer = await renderPanel(panel);
  hashes[panel.file] = sha256(buffer);

  for (const base of ["assets/img/discord-events", "apps/web/public/assets/img/discord-events"]) {
    const outputDir = path.join(root, base);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, panel.file), buffer);
  }
}

console.log(JSON.stringify({ source, outputSize, hashes }, null, 2));
