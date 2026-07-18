import { execFileSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable");

const raw = execFileSync(
  process.execPath,
  [npmCli, "sbom", "--package-lock-only", "--sbom-format", "spdx", "--sbom-type", "application"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);
const sbom = JSON.parse(raw);

if (
  sbom.spdxVersion !== "SPDX-2.3" ||
  sbom.dataLicense !== "CC0-1.0" ||
  !Array.isArray(sbom.packages) ||
  sbom.packages.length < 2 ||
  !Array.isArray(sbom.relationships)
) {
  console.error("SPDX SBOM generation or validation failed.");
  process.exit(1);
}

console.log(`SPDX SBOM is valid and contains ${sbom.packages.length} packages.`);
