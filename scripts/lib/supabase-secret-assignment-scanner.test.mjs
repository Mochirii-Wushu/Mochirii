import assert from "node:assert/strict";
import test from "node:test";
import { findSecretEnvironmentAssignments } from "./supabase-secret-assignment-scanner.mjs";

function assignments(file, line) {
  return findSecretEnvironmentAssignments(file, line).map(({ dialect, key, value }) => ({
    dialect,
    key,
    value,
  }));
}

test("does not treat PostgreSQL SET assignments as cmd.exe secrets", () => {
  const sqlCases = [
    "set claim_token = p_claim_token,",
    "set claim_token=p_claim_token,",
    "SET CLAIM_TOKEN = P_CLAIM_TOKEN,",
    "set claim_token = null,",
    "set api_token = excluded.api_token",
  ];

  for (const line of sqlCases) {
    assert.deepEqual(assignments("supabase/migrations/example.sql", line), []);
    assert.deepEqual(assignments("supabase/migrations/example.SQL", line), []);
  }
});

test("retains unambiguous secret-assignment detection inside SQL files", () => {
  assert.deepEqual(assignments("supabase/migrations/example.sql", "API_TOKEN=placeholder"), [
    { dialect: "dotenv-posix", key: "API_TOKEN", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("supabase/migrations/example.sql", "$env:API_TOKEN=placeholder"), [
    { dialect: "powershell", key: "API_TOKEN", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("supabase/migrations/example.sql", "setx API_TOKEN placeholder"), [
    { dialect: "cmd-setx", key: "API_TOKEN", value: "placeholder" },
  ]);
});

test("detects dotenv and POSIX shell assignments", () => {
  assert.deepEqual(assignments(".env.example", "API_TOKEN=placeholder"), [
    { dialect: "dotenv-posix", key: "API_TOKEN", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("script.sh", "export CLIENT_SECRET='placeholder'"), [
    { dialect: "dotenv-posix", key: "CLIENT_SECRET", value: "'placeholder'" },
  ]);
  assert.deepEqual(assignments("script.sh", "run; env DATABASE_URL=placeholder"), [
    { dialect: "dotenv-posix", key: "DATABASE_URL", value: "placeholder" },
  ]);
});

test("detects PowerShell environment assignments", () => {
  assert.deepEqual(assignments("script.ps1", "$env:API_TOKEN = \"placeholder\""), [
    { dialect: "powershell", key: "API_TOKEN", value: "\"placeholder\"" },
  ]);
});

test("detects cmd set and setx assignments outside SQL", () => {
  assert.deepEqual(assignments("script.cmd", "set API_TOKEN=placeholder"), [
    { dialect: "cmd-set", key: "API_TOKEN", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("script.bat", "set \"API_TOKEN=placeholder\""), [
    { dialect: "cmd-set", key: "API_TOKEN", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("script.bat", "SET api_token=placeholder"), [
    { dialect: "cmd-set", key: "api_token", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("script.cmd", "work & set API_TOKEN=placeholder"), [
    { dialect: "cmd-set", key: "API_TOKEN", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("script.cmd", "setx API_TOKEN placeholder"), [
    { dialect: "cmd-setx", key: "API_TOKEN", value: "placeholder" },
  ]);
  assert.deepEqual(assignments("guide.md", "set API_TOKEN=placeholder"), [
    { dialect: "cmd-set", key: "API_TOKEN", value: "placeholder" },
  ]);
});

test("does not match cmd text without a command boundary", () => {
  assert.deepEqual(assignments("script.cmd", "echo set API_TOKEN=placeholder"), []);
});
