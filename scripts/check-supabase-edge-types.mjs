import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

const functions = [
  "verify-discord-member",
  "list-gallery-review-queue",
  "moderate-gallery-submission",
  "list-approved-gallery-submissions",
  "submit-discord-gallery-image",
  "reaper-discord-interactions",
  "list-instagram-publish-queue",
  "publish-instagram-gallery-submission",
];

function denoBinary() {
  if (process.env.DENO_BIN) return process.env.DENO_BIN;

  const localInstall = path.join(os.homedir(), ".deno", "bin", process.platform === "win32" ? "deno.exe" : "deno");
  if (existsSync(localInstall)) return localInstall;

  return "deno";
}

const deno = denoBinary();
let failed = false;

for (const name of functions) {
  const importMap = `supabase/functions/${name}/deno.json`;
  const entrypoint = `supabase/functions/${name}/index.ts`;
  console.log(`Checking Supabase Edge Function types: ${name}`);

  const result = spawnSync(
    deno,
    [
      "check",
      "--node-modules-dir=auto",
      "--lock=deno.lock",
      "--frozen=true",
      `--import-map=${importMap}`,
      entrypoint,
    ],
    {
      cwd: root,
      stdio: "inherit",
    },
  );

  if (result.error) {
    failed = true;
    console.error(`${name}: unable to run Deno: ${result.error.message}`);
  } else if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error("Supabase Edge Function type validation failed.");
  process.exit(1);
}

console.log("Supabase Edge Function type validation OK.");
