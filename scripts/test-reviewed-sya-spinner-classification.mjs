import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const priorVersion = "20260727160000";
const fixtureSql = readFileSync(
  resolve(root, "supabase/tests/fixtures/reviewed_sya_spinner_classification.sql"),
  "utf8",
);
const migrationSql = readFileSync(
  resolve(root, "supabase/migrations/20260727211442_classify_reviewed_sya_spinner_draw.sql"),
  "utf8",
);
const readbackSql = readFileSync(
  resolve(root, "supabase/operations/validate_reviewed_sya_spinner_classification.sql"),
  "utf8",
);
const projectId = readFileSync(resolve(root, "supabase/config.toml"), "utf8")
  .match(/^project_id\s*=\s*"([a-z0-9_-]+)"/mu)?.[1];
if (!projectId) throw new Error("Could not resolve the local Supabase project ID.");
const databaseContainer = `supabase_db_${projectId}`;
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is required for the local migration test.");

let primaryFailure;
try {
  resetTo(priorVersion);
  psql(fixtureSql);
  assertReadbackState("t|t|t|t|f|t|f");
  psql(migrationSql);
  assertDatabaseState("official|official|official|3");
  assertReadbackState("t|t|t|f|t|t|t");

  // The exact migration must be replay-safe after a successful classification.
  psql(migrationSql);
  assertDatabaseState("official|official|official|3");
  assertReadbackState("t|t|t|f|t|t|t");

  resetTo(priorVersion);
  psql(fixtureSql);
  assertReadbackState("t|t|t|t|f|t|f");
  psql(`
    create function public.test_force_reviewed_sya_classification_rollback()
    returns trigger
    language plpgsql
    as $test$
    begin
      if new.draw_mode = 'official' then
        raise exception 'forced reviewed Sya classification rollback test'
          using errcode = '23514';
      end if;
      return new;
    end;
    $test$;

    create trigger test_force_reviewed_sya_classification_rollback
      before update of draw_mode on public.spinner_discord_outbox
      for each row execute function public.test_force_reviewed_sya_classification_rollback();
  `);
  psql(migrationSql, {
    expectFailure: true,
    expectedError: /ERROR:\s+23514:\s+forced reviewed Sya classification rollback test/iu,
  });
  assertDatabaseState("unclassified|unclassified|unclassified|3");
  assertReadbackState("t|t|t|t|f|t|f");
} catch (error) {
  primaryFailure = error;
} finally {
  try {
    resetTo();
  } catch (resetError) {
    if (!primaryFailure) primaryFailure = resetError;
  }
}

if (primaryFailure) throw primaryFailure;
console.log("Reviewed Sya spinner classification migration test OK.");
console.log("- Exact populated state classified once and replayed idempotently.");
console.log("- A forced post-receipt failure rolled back all rows and trigger changes.");

function resetTo(version) {
  const args = [npmCli, "exec", "--", "supabase", "db", "reset", "--local", "--no-seed"];
  if (version) args.push("--version", version);
  run(process.execPath, args, `Supabase reset${version ? ` through ${version}` : " to current"}`);
}

function psql(sql, { expectFailure = false, expectedError } = {}) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", databaseContainer, "psql", "-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-U", "postgres", "-d", "postgres"],
    { cwd: root, encoding: "utf8", input: sql, maxBuffer: 2 * 1024 * 1024 },
  );
  if (expectFailure ? result.status === 0 : result.status !== 0) {
    throw new Error(expectFailure
      ? "The partial reviewed-draw state unexpectedly passed."
      : `Local SQL failed: ${bounded(result.stderr || result.stdout)}`);
  }
  if (expectFailure && expectedError && !expectedError.test(String(result.stderr || result.stdout))) {
    throw new Error(`The migration failed for an unexpected reason: ${bounded(result.stderr || result.stdout)}`);
  }
  return String(result.stdout || "").trim();
}

function assertDatabaseState(expected) {
  const actual = psql(`
    select concat_ws('|',
      (select draw_mode from public.spinner_draw_receipts where draw_id = '11111111-1010-4010-8010-101010101010'),
      (select draw_mode from public.spinner_discord_outbox where draw_id = '11111111-1010-4010-8010-101010101010'),
      (select draw_mode from public.spinner_live_state where singleton_id = 1),
      (select count(*) from pg_trigger
       where (tgrelid, tgname) in (
         ('public.spinner_draw_receipts'::regclass, 'spinner_draw_receipts_immutable'),
         ('public.spinner_discord_outbox'::regclass, 'spinner_discord_outbox_draw_mode_immutable'),
         ('public.spinner_live_state'::regclass, 'spinner_live_state_set_draw_mode')
       ) and tgenabled <> 'D')
    );
  `).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).at(-1);
  if (actual !== expected) {
    throw new Error(`Unexpected reviewed-draw state: expected ${expected}, received ${actual || "empty"}.`);
  }
}

function assertReadbackState(expected) {
  const actual = psql(readbackSql)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (actual !== expected) {
    throw new Error(`Unexpected aggregate readback: expected ${expected}, received ${actual || "empty"}.`);
  }
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${bounded(result.stderr || result.stdout)}`);
  }
}

function bounded(value) {
  return String(value || "").replace(/\s+/gu, " ").trim().slice(0, 1200);
}
