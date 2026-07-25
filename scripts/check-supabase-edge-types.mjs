import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const edgeRuntimeTypes = "jsr:@supabase/functions-js@2.110.8/edge-runtime.d.ts";
const supabaseClient = "npm:@supabase/supabase-js@2.110.8";

const functions = [
  "verify-discord-member",
  "verify-member-access",
  "review-member-verification",
  "list-gallery-review-queue",
  "moderate-gallery-submission",
  "delete-rejected-gallery-submission",
  "list-approved-gallery-submissions",
  "submit-discord-gallery-image",
  "reaper-discord-interactions",
  "reaper-discord-member-sync",
  "send-vote-reminder",
  "send-member-spotlight-poll",
  "publish-member-spotlight-winner",
  "get-current-spotlight-winner",
  "list-instagram-publish-queue",
  "publish-instagram-gallery-submission",
  "mark-instagram-gallery-submission-shared",
  "check-instagram-api-status",
  "list-member-profiles",
  "list-visible-profile-cards",
  "get-member-profile",
  "submit-member-profile-media",
  "list-member-profile-media-queue",
  "moderate-member-profile-media",
  "mochi-pets-alpha-session",
  "mochi-pets-unity-auth",
  "mochi-pets-alpha-action",
  "mochi-pets-alpha-progress",
  "mochi-pets-alpha-admin",
  "submit-mochi-pets-feedback",
  "sync-pixelfed-social-account",
];

function denoBinary() {
  if (process.env.DENO_BIN) return process.env.DENO_BIN;

  const localInstall = path.join(os.homedir(), ".deno", "bin", process.platform === "win32" ? "deno.exe" : "deno");
  if (existsSync(localInstall)) return localInstall;

  return "deno";
}

const deno = denoBinary();
let failed = false;

const functionRoot = path.join(root, "supabase", "functions");
const discoveredFunctions = readdirSync(functionRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(functionRoot, entry.name, "deno.json")))
  .map((entry) => entry.name)
  .sort();
const expectedFunctions = [...functions].sort();

if (JSON.stringify(discoveredFunctions) !== JSON.stringify(expectedFunctions)) {
  failed = true;
  console.error("Supabase Edge Function manifest inventory does not match the reviewed function list.");
  console.error(`Expected: ${expectedFunctions.join(", ")}`);
  console.error(`Found: ${discoveredFunctions.join(", ")}`);
}

for (const name of functions) {
  const importMap = path.join(functionRoot, name, "deno.json");
  try {
    const imports = JSON.parse(readFileSync(importMap, "utf8")).imports ?? {};
    if (imports["@supabase/functions-js/edge-runtime.d.ts"] !== edgeRuntimeTypes) {
      failed = true;
      console.error(`${name}: Edge Runtime types must resolve exactly to ${edgeRuntimeTypes}.`);
    }
    if (imports["@supabase/supabase-js"] !== supabaseClient) {
      failed = true;
      console.error(`${name}: Supabase client must resolve exactly to ${supabaseClient}.`);
    }
    if (Object.hasOwn(imports, "@supabase/functions-js")) {
      failed = true;
      console.error(`${name}: remove the unused @supabase/functions-js alias.`);
    }
  } catch (error) {
    failed = true;
    console.error(`${name}: unable to read deployment dependency manifest: ${error.message}`);
  }
}

if (failed) {
  console.error("Supabase Edge Function dependency contract validation failed.");
  process.exit(1);
}

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
