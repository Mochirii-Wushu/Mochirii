import { existsSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const FORBIDDEN_SHARED_PORTS = new Set([
  54321, 54322, 54323, 54324, 54325, 54326, 54327,
]);
const PROJECT_ID_RE = /^mochirii-event-social-[a-z0-9](?:[a-z0-9-]{6,70}[a-z0-9])$/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function validateEventSocialPgTapTarget(environment) {
  const projectId = environment.EVENT_SOCIAL_ISOLATED_PROJECT_ID?.trim() || "";
  const rawUrl = environment.EVENT_SOCIAL_PGTAP_DB_URL?.trim() || "";
  const password = environment.EVENT_SOCIAL_PGTAP_DB_PASSWORD || "";
  if (!PROJECT_ID_RE.test(projectId)) {
    throw new Error(
      "EVENT_SOCIAL_ISOLATED_PROJECT_ID must be a unique mochirii-event-social-* project name.",
    );
  }
  if (!rawUrl) {
    throw new Error("EVENT_SOCIAL_PGTAP_DB_URL is required.");
  }
  if (password.length < 1 || password.length > 512) {
    throw new Error("EVENT_SOCIAL_PGTAP_DB_PASSWORD must be provided securely.");
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("EVENT_SOCIAL_PGTAP_DB_URL must be a valid PostgreSQL URL.");
  }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    throw new Error("The event-social pgTAP target must use PostgreSQL.");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname) || !url.port) {
    throw new Error("The event-social pgTAP target must be an explicit loopback port.");
  }
  const port = Number(url.port);
  if (
    !Number.isSafeInteger(port) || port < 1024 || port > 65535 ||
    FORBIDDEN_SHARED_PORTS.has(port)
  ) {
    throw new Error(
      "The event-social pgTAP target must use a unique port outside 54321-54327.",
    );
  }
  if (url.search || url.hash || !url.username || url.password || !url.pathname) {
    throw new Error("The event-social pgTAP URL shape is not allowed.");
  }
  return { projectId, rawUrl, port, password };
}

function resolveSupabaseBinary(environment) {
  const explicit = environment.SUPABASE_BIN?.trim() || "";
  if (explicit) {
    if (!isAbsolute(explicit) || !existsSync(explicit)) {
      throw new Error("SUPABASE_BIN must name an existing absolute binary path.");
    }
    return explicit;
  }
  for (const directory of (environment.PATH || "").split(delimiter)) {
    if (!directory) continue;
    for (const filename of process.platform === "win32"
      ? ["supabase.exe", "supabase"]
      : ["supabase"]) {
      const candidate = join(directory, filename);
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error("Supabase CLI binary not found; set SUPABASE_BIN explicitly.");
}

export function runEventSocialPgTap(environment = process.env) {
  const target = validateEventSocialPgTapTarget(environment);
  const supabase = resolveSupabaseBinary(environment);
  console.log(
    `Running event-social pgTAP against isolated project ${target.projectId} on loopback port ${target.port}.`,
  );
  const childEnvironment = { ...environment, PGPASSWORD: target.password };
  delete childEnvironment.EVENT_SOCIAL_PGTAP_DB_PASSWORD;
  const result = spawnSync(
    supabase,
    [
      "test",
      "db",
      "--db-url",
      target.rawUrl,
      "supabase/tests/event_social_publication_scheduler_test.sql",
    ],
    {
      cwd: process.cwd(),
      env: childEnvironment,
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEventSocialPgTap();
}
