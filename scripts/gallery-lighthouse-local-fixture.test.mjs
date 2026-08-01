import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const verifier = resolve("scripts/gallery-lighthouse-local-fixture.mjs");
const origin = "http://127.0.0.1:8765";

function report(
  pathname,
  requestUrls = [`${origin}${pathname}`],
  { consoleItems = [], statusCode = 200 } = {},
) {
  return {
    requestedUrl: `${origin}${pathname}`,
    finalDisplayedUrl: `${origin}${pathname}`,
    audits: {
      "network-requests": {
        details: { items: requestUrls.map((url) => ({ statusCode, url })) },
      },
      "errors-in-console": {
        details: { items: consoleItems },
      },
    },
  };
}

function writeEvidence(
  directory,
  {
    galleryConsoleItems,
    galleryStatusCode,
    galleryUrls,
    logRow,
    malformedHome = false,
  } = {},
) {
  const log = join(directory, "fixture.jsonl");
  const home = join(directory, "home.json");
  const recruitment = join(directory, "recruitment.json");
  const gallery = join(directory, "gallery.json");
  writeFileSync(
    log,
    `${
      JSON.stringify(
        logRow || {
          method: "POST",
          path: "/functions/v1/list-approved-gallery-submissions",
          status: 200,
        },
      )
    }\n`,
  );
  writeFileSync(home, JSON.stringify(malformedHome ? {} : report("/")));
  writeFileSync(recruitment, JSON.stringify(report("/recruitment")));
  writeFileSync(
    gallery,
    JSON.stringify(report("/gallery", galleryUrls, {
      consoleItems: galleryConsoleItems,
      statusCode: galleryStatusCode,
    })),
  );
  return [log, home, recruitment, gallery];
}

function verify(paths) {
  return execFileSync(process.execPath, [verifier, "verify", ...paths], {
    encoding: "utf8",
    stdio: "pipe",
  });
}

test("local Lighthouse evidence accepts only the three exact loopback routes", () => {
  const directory = mkdtempSync(join(tmpdir(), "mochirii-gallery-lighthouse-"));
  try {
    assert.match(
      verify(writeEvidence(directory)),
      /zero hosted\/provider HTTP requests/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("local Lighthouse evidence rejects provider traffic and malformed reports", () => {
  const directory = mkdtempSync(join(tmpdir(), "mochirii-gallery-lighthouse-"));
  try {
    assert.throws(
      () =>
        verify(writeEvidence(directory, {
          galleryUrls: [
            `${origin}/gallery`,
            "https://project.supabase.co/functions/v1/list-approved-gallery-submissions",
          ],
        })),
      /Command failed/,
    );
    assert.throws(
      () => verify(writeEvidence(directory, { malformedHome: true })),
      /Command failed/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("local Lighthouse evidence rejects unexpected fixture requests", () => {
  const directory = mkdtempSync(join(tmpdir(), "mochirii-gallery-lighthouse-"));
  try {
    assert.throws(
      () =>
        verify(writeEvidence(directory, {
          logRow: { method: "GET", path: "/unexpected", status: 404 },
        })),
      /Command failed/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("local Lighthouse evidence rejects failed requests and console errors", () => {
  const directory = mkdtempSync(join(tmpdir(), "mochirii-gallery-lighthouse-"));
  try {
    assert.throws(
      () => verify(writeEvidence(directory, { galleryStatusCode: 404 })),
      /Command failed/,
    );
    assert.throws(
      () =>
        verify(writeEvidence(directory, {
          galleryConsoleItems: [{ description: "fixture error" }],
        })),
      /Command failed/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
