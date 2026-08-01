import { appendFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";

const host = "127.0.0.1";
const appPort = 8765;
const fixturePort = 8766;
const feedPath = "/functions/v1/list-approved-gallery-submissions";
const analyticsScriptPaths = new Set([
  "/_vercel/insights/script.js",
  "/_vercel/speed-insights/script.js",
]);
const mode = process.argv[2];

if (mode === "serve") {
  const logPath = requiredPath(process.argv[3], "fixture request log");
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${host}:${fixturePort}`);
    if (request.method === "GET" && url.pathname === "/healthz") {
      response.writeHead(204, { "Cache-Control": "no-store" });
      response.end();
      return;
    }

    let status = 404;
    let body = "";
    let contentType = "application/json";
    if (
      request.method === "GET" && analyticsScriptPaths.has(url.pathname) &&
      !url.search
    ) {
      status = 200;
      body = "void 0;";
      contentType = "application/javascript; charset=utf-8";
    } else if (
      request.method === "POST" && url.pathname === feedPath && !url.search
    ) {
      const requestBody = await readBoundedBody(request, 4096);
      const parsed = parseListRequest(requestBody);
      if (parsed) {
        status = 200;
        body = JSON.stringify({
          ok: true,
          data: {
            schemaVersion: 2,
            items: [],
            count: 0,
            totalEligible: 0,
            facets: {
              "member-submissions": 0,
              portraits: 0,
              gatherings: 0,
              action: 0,
              scenery: 0,
              companions: 0,
            },
            hasMore: false,
            nextCursor: null,
            partial: false,
            complete: true,
            deliveryFailures: 0,
            delivery: "bounded-edge-media",
            cacheSeconds: 15,
          },
          message: "No member-submitted images are available yet.",
        });
      } else {
        status = 400;
      }
    }

    appendFileSync(
      logPath,
      `${
        JSON.stringify({
          method: request.method || "",
          path: url.pathname,
          status,
        })
      }\n`,
      "utf8",
    );
    response.writeHead(status, {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body || JSON.stringify({ ok: false }));
  });

  server.listen(fixturePort, host, () => {
    process.stdout.write(
      `Gallery Lighthouse fixture listening on ${host}:${fixturePort}.\n`,
    );
  });
  const close = () => server.close(() => process.exit(0));
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
} else if (mode === "verify") {
  const logPath = requiredPath(process.argv[3], "fixture request log");
  const reportPaths = process.argv.slice(4).map((value) =>
    requiredPath(value, "Lighthouse report")
  );
  if (reportPaths.length !== 3) {
    throw new Error(
      "Expected Home, Recruitment, and Gallery Lighthouse reports.",
    );
  }

  const fixtureRows = readLines(logPath).map(parseJsonRecord);
  if (
    !fixtureRows.some((row) =>
      row.method === "POST" && row.path === feedPath && row.status === 200
    )
  ) {
    throw new Error(
      "The local Gallery audit never reached the deterministic fixture.",
    );
  }
  if (
    fixtureRows.some((row) => !isExpectedFixtureRow(row))
  ) {
    throw new Error(
      "The local Gallery fixture received an unexpected request.",
    );
  }

  const allowedOrigin = `http://${host}:${appPort}`;
  const expectedPaths = ["/", "/recruitment", "/gallery"];
  for (const [index, reportPath] of reportPaths.entries()) {
    const reportText = readFileSync(reportPath, "utf8");
    if (/https:\/\/[^"\s]*\.supabase\.co/iu.test(reportText)) {
      throw new Error(`${reportPath} recorded a hosted Supabase request.`);
    }
    const report = parseJsonRecord(reportText);
    if (report.runtimeError) {
      throw new Error(`${reportPath} contains a Lighthouse runtime error.`);
    }
    for (const field of ["requestedUrl", "finalDisplayedUrl"]) {
      if (typeof report[field] !== "string") {
        throw new Error(`${reportPath} is missing ${field}.`);
      }
      const target = new URL(report[field]);
      if (
        target.origin !== allowedOrigin ||
        target.pathname !== expectedPaths[index]
      ) {
        throw new Error(
          `${reportPath} does not represent the expected local route.`,
        );
      }
    }
    const items = report.audits?.["network-requests"]?.details?.items;
    if (!Array.isArray(items)) {
      throw new Error(
        `${reportPath} has no Lighthouse network-request evidence.`,
      );
    }
    for (const item of items) {
      if (
        !item || typeof item.url !== "string" || !/^https?:/iu.test(item.url)
      ) continue;
      if (new URL(item.url).origin !== allowedOrigin) {
        throw new Error(`${reportPath} recorded a non-local HTTP request.`);
      }
      if (
        Number.isFinite(item.statusCode) &&
        (item.statusCode < 200 || item.statusCode >= 400)
      ) {
        throw new Error(`${reportPath} recorded a failed HTTP request.`);
      }
    }
    const consoleItems = report.audits?.["errors-in-console"]?.details?.items;
    if (!Array.isArray(consoleItems) || consoleItems.length !== 0) {
      throw new Error(`${reportPath} recorded a browser console error.`);
    }
  }
  console.log(
    "Local Lighthouse network contract OK: 3 reports, zero hosted/provider HTTP requests.",
  );
} else {
  throw new Error(
    "Usage: gallery-lighthouse-local-fixture.mjs serve <log> | verify <log> <home.json> <recruitment.json> <gallery.json>",
  );
}

function requiredPath(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`Missing ${label} path.`);
  }
  return resolve(value);
}

function readLines(path) {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean);
}

function parseJsonRecord(value) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object.");
  }
  return parsed;
}

async function readBoundedBody(request, maximumBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maximumBytes) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseListRequest(value) {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const keys = Object.keys(parsed).sort();
    return keys.join("\n") ===
          ["action", "category", "cursor", "pageSize", "query", "sort"]
            .sort().join("\n") &&
        parsed.action === "list" && parsed.pageSize === 24 &&
        parsed.cursor === null && parsed.sort === "newest" &&
        parsed.category === null && parsed.query === null
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function isExpectedFixtureRow(row) {
  return row.status === 200 && (
    (row.method === "POST" && row.path === feedPath) ||
    (row.method === "GET" && analyticsScriptPaths.has(row.path))
  );
}
