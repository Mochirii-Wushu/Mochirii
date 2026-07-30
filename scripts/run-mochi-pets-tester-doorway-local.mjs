import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const webRoot = resolve(root, "apps/web");
const nextBin = resolve(webRoot, "node_modules/next/dist/bin/next");
const smokeScript = resolve(root, "scripts/smoke-mochi-pets-tester-doorway.mjs");
const args = process.argv.slice(2);
const requestedBrowser = readArg("--browser", "all");
const requestedScenario = readArg("--scenario", "both");
const syntheticPassword = `synthetic-${randomBytes(24).toString("base64url")}`;
const syntheticSessionSecret = randomBytes(48).toString("base64url");
const syntheticPublishableKey = "synthetic-public-smoke-key";

if (!["both", "configured", "unconfigured"].includes(requestedScenario)) {
  throw new Error(`Unsupported scenario: ${requestedScenario}`);
}

const certificate = createEphemeralLocalCertificate();
const verifierPort = await reserveLoopbackPort();
const verifier = await startMockMemberVerifier({
  port: verifierPort,
  key: certificate.key,
  cert: certificate.cert,
  publishableKey: syntheticPublishableKey,
});
const publicSmokeEnvironment = {
  NEXT_PUBLIC_SITE_URL: "https://localhost",
  NEXT_PUBLIC_SUPABASE_URL: `https://localhost:${verifierPort}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: syntheticPublishableKey,
  NODE_EXTRA_CA_CERTS: certificate.certPath,
};

try {
  if (requestedScenario !== "unconfigured") {
    await runScenario({
      label: "configured",
      configured: true,
      password: syntheticPassword,
      sessionSecret: syntheticSessionSecret,
      certificate,
      publicEnvironment: publicSmokeEnvironment,
      verifier,
    });
  }
  if (requestedScenario !== "configured") {
    await runScenario({
      label: "unconfigured",
      configured: false,
      certificate,
      publicEnvironment: publicSmokeEnvironment,
      verifier,
    });
  }
  console.log("Mochi Pets local configured/unconfigured smoke completed.");
} finally {
  await stopHttpsServer(verifier.server);
  rmSync(certificate.directory, { recursive: true, force: true });
}

async function buildWebForSmoke(publicEnvironment) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("npm_execpath is required for the isolated Mochi Pets smoke build.");
  console.log("Mochi Pets isolated production build starting.");
  await runChild(
    process.execPath,
    [npmCli, "--prefix", webRoot, "run", "build"],
    {
      cwd: root,
      env: publicEnvironment,
      stdio: "inherit",
    },
    "isolated Mochi Pets production build",
    5 * 60_000,
  );
}

async function runScenario({
  label,
  configured,
  password = "",
  sessionSecret = "",
  certificate,
  publicEnvironment,
  verifier,
}) {
  const appPort = await reserveLoopbackPort();
  const browserPort = await reserveLoopbackPort();
  const readinessUrl = `http://127.0.0.1:${appPort}`;
  const browserBaseUrl = `https://localhost:${browserPort}`;
  const serverEnv = { ...cleanTesterEnvironment(), ...publicEnvironment };
  const smokeEnv = {
    ...cleanTesterEnvironment(),
    ...publicEnvironment,
    MOCHI_PETS_SMOKE_PASSWORD: syntheticPassword,
  };
  let proxy = null;

  if (configured) {
    Object.assign(serverEnv, {
      ["MOCHI_PETS_TESTER_PASSWORD"]: password,
      ["MOCHI_PETS_TESTER_SESSION_SECRET"]: sessionSecret,
    });
  }

  await buildWebForSmoke(serverEnv);

  const server = spawn(
    process.execPath,
    [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(appPort)],
    { cwd: webRoot, env: serverEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  server.stdout.on("data", (chunk) => { output = boundedOutput(output, chunk); });
  server.stderr.on("data", (chunk) => { output = boundedOutput(output, chunk); });
  const verifierCountBefore = verifier.requestCount;

  try {
    console.log(`Mochi Pets ${label} production-server smoke starting.`);
    await waitUntilReady(server, readinessUrl, () => output);
    proxy = await startHttpsProxy({
      listenPort: browserPort,
      upstreamPort: appPort,
      key: certificate.key,
      cert: certificate.cert,
      cspConnectOrigin: publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    });
    await runChild(
      process.execPath,
      [
        smokeScript,
        "--base-url",
        browserBaseUrl,
        "--supabase-auth-cookie-name",
        "sb-localhost-auth-token",
        "--allow-self-signed-localhost",
        "--browser",
        requestedBrowser,
        ...(configured ? [] : ["--expect-unconfigured"]),
      ],
      { cwd: root, env: smokeEnv, stdio: "inherit" },
      `${label} doorway smoke`,
      12 * 60_000,
    );
    if (configured && verifier.requestCount <= verifierCountBefore) {
      throw new Error("Configured smoke did not reach the local member verifier.");
    }
    if (!configured && verifier.requestCount !== verifierCountBefore) {
      throw new Error("Unconfigured smoke reached the local member verifier instead of failing closed first.");
    }
    console.log(`Mochi Pets ${label} production-server smoke passed.`);
  } finally {
    try {
      await stopHttpsServer(proxy);
    } finally {
      await stopChild(server);
    }
  }
}

function cleanTesterEnvironment() {
  const env = { ...process.env };
  const testerKeys = new Set([
    "MOCHI_PETS_TESTER_PASSWORD",
    "MOCHI_PETS_TESTER_SESSION_SECRET",
    "MOCHI_PETS_SMOKE_PASSWORD",
  ]);
  for (const key of Object.keys(env)) {
    if (testerKeys.has(key.toUpperCase())) delete env[key];
  }
  return env;
}

function reserveLoopbackPort() {
  return new Promise((resolvePort, reject) => {
    const socket = createNetServer();
    socket.unref();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      if (!address || typeof address === "string") {
        socket.close(() => reject(new Error("Could not reserve a loopback port.")));
        return;
      }
      socket.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

function createEphemeralLocalCertificate() {
  const openssl = resolveOpenSsl();
  const directory = mkdtempSync(join(tmpdir(), "mochirii-mochi-pets-smoke-"));
  const keyPath = join(directory, "localhost-key.pem");
  const certPath = join(directory, "localhost-cert.pem");
  const result = spawnSync(
    openssl,
    [
      "req", "-x509", "-newkey", "rsa:2048", "-sha256", "-days", "1", "-nodes",
      "-keyout", keyPath, "-out", certPath, "-subj", "/CN=localhost",
      "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ],
    { encoding: "utf8", stdio: "pipe", timeout: 30_000, windowsHide: true },
  );
  if (result.error || result.status !== 0) {
    rmSync(directory, { recursive: true, force: true });
    const detail = result.error?.message || result.stderr?.trim() || `exit ${result.status}`;
    throw new Error(`Could not create the ephemeral localhost certificate: ${detail}`);
  }
  try {
    return {
      directory,
      certPath,
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

function resolveOpenSsl() {
  const candidates = [
    "openssl",
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Git", "usr", "bin", "openssl.exe") : null,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes("\\") && !existsSync(candidate)) continue;
    const probe = spawnSync(candidate, ["version"], { stdio: "ignore", timeout: 10_000, windowsHide: true });
    if (!probe.error && probe.status === 0) return candidate;
  }
  throw new Error("OpenSSL is required to run the local HTTPS browser smoke.");
}

function startMockMemberVerifier({ port, key, cert, publishableKey }) {
  const state = { requestCount: 0, server: null };
  const server = createHttpsServer({ key, cert }, async (request, response) => {
    if (request.method === "OPTIONS") {
      const requestedHeaders = String(request.headers["access-control-request-headers"] || "");
      response.writeHead(204, {
        "Access-Control-Allow-Headers": requestedHeaders || "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, no-store",
      });
      response.end();
      return;
    }
    if (request.url === "/auth/v1/user" && request.method === "GET") {
      const authorization = String(request.headers.authorization || "");
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      const claims = decodeSyntheticClaims(token);
      if (!claims || claims.scenario === "invalid") return sendJson(response, 401, { message: "Unauthorized" });
      return sendJson(response, 200, {
        id: claims.sub,
        aud: "authenticated",
        role: "authenticated",
        email: "smoke-member@example.invalid",
        app_metadata: {},
        user_metadata: {},
        identities: [],
        created_at: "2026-01-01T00:00:00.000Z",
      });
    }
    if (request.url?.startsWith("/rest/v1/member_profiles?") && request.method === "GET") {
      const authorization = String(request.headers.authorization || "");
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      const claims = decodeSyntheticClaims(token);
      if (!claims || claims.scenario === "invalid") return sendJson(response, 401, { message: "Unauthorized" });
      return sendJson(response, 200, {
        id: claims.sub,
        member_status: claims.scenario === "member" ? "active" : "pending",
        has_required_discord_roles: claims.scenario === "member",
        discord_verified_at: claims.scenario === "member" ? new Date().toISOString() : null,
      });
    }
    if (request.url !== "/functions/v1/verify-member-access") {
      return sendJson(response, 404, { ok: false });
    }
    state.requestCount += 1;
    if (request.method !== "POST" || request.headers.apikey !== publishableKey) {
      return sendJson(response, 401, { ok: false });
    }
    const body = await readBoundedBody(request, 1_024);
    if (body !== '{"refreshDiscord":false}') return sendJson(response, 400, { ok: false });
    const authorization = String(request.headers.authorization || "");
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const claims = decodeSyntheticClaims(token);
    if (!claims) return sendJson(response, 401, { ok: false });
    if (claims.scenario === "provider-error") return sendJson(response, 500, { ok: false });
    if (claims.scenario === "invalid") return sendJson(response, 401, { ok: false });

    const eligible = claims.scenario === "member";
    const active = claims.scenario !== "inactive";
    return sendJson(response, 200, {
      ok: true,
      data: {
        galleryEligible: eligible,
        discordVerified: eligible,
        memberStatus: active ? "active" : "inactive",
        profile: {
          id: claims.sub,
          member_status: active ? "active" : "inactive",
        },
      },
    });
  });
  state.server = server;
  return new Promise((resolveStart, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.removeListener("error", reject);
      resolveStart(state);
    });
  });
}

function decodeSyntheticClaims(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.sub || "")) return null;
    if (!["member", "nonmember", "inactive", "provider-error", "invalid"].includes(payload.scenario)) return null;
    return payload;
  } catch {
    return null;
  }
}

function readBoundedBody(request, maximumBytes) {
  return new Promise((resolveBody) => {
    const chunks = [];
    let byteLength = 0;
    request.on("data", (chunk) => {
      byteLength += chunk.length;
      if (byteLength <= maximumBytes) chunks.push(chunk);
    });
    request.on("end", () => resolveBody(byteLength <= maximumBytes ? Buffer.concat(chunks).toString("utf8") : null));
    request.on("error", () => resolveBody(null));
  });
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function startHttpsProxy({ listenPort, upstreamPort, key, cert, cspConnectOrigin }) {
  return new Promise((resolveProxy, reject) => {
    const proxy = createHttpsServer({ key, cert }, (request, response) => {
      const upstream = httpRequest({
        hostname: "127.0.0.1",
        port: upstreamPort,
        path: request.url,
        method: request.method,
        headers: {
          ...request.headers,
          host: `localhost:${listenPort}`,
          "x-forwarded-host": `localhost:${listenPort}`,
          "x-forwarded-proto": "https",
        },
      }, (upstreamResponse) => {
        const headers = { ...upstreamResponse.headers };
        const contentSecurityPolicy = headers["content-security-policy"];
        if (typeof contentSecurityPolicy === "string" && cspConnectOrigin) {
          headers["content-security-policy"] = contentSecurityPolicy.replace(
            "connect-src 'self'",
            `connect-src 'self' ${cspConnectOrigin}`,
          );
        }
        response.writeHead(upstreamResponse.statusCode ?? 502, headers);
        upstreamResponse.pipe(response);
      });
      upstream.once("error", () => {
        if (!response.headersSent) response.writeHead(502, { "Cache-Control": "no-store" });
        response.end();
      });
      request.pipe(upstream);
    });
    proxy.once("error", reject);
    proxy.listen(listenPort, "127.0.0.1", () => {
      proxy.removeListener("error", reject);
      resolveProxy(proxy);
    });
  });
}

function stopHttpsServer(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolveStop, reject) => {
    server.close((error) => error ? reject(error) : resolveStop());
    server.closeAllConnections?.();
  });
}

async function waitUntilReady(child, baseUrl, getOutput) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next.js server exited before readiness.\n${getOutput()}`);
    try {
      const response = await fetch(`${baseUrl}/games/mochi-pets`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // The loopback listener is not ready yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Next.js server did not become ready.\n${getOutput()}`);
}

function runChild(command, commandArgs, options, label, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, commandArgs, options);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      forceStopChildTree(child);
      reject(new Error(`${label} exceeded ${timeoutMs}ms and was terminated.`));
    }, timeoutMs);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolveRun();
      else reject(new Error(`${label} exited with code ${code ?? "none"} and signal ${signal ?? "none"}.`));
    });
  });
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
    forceStopChildTree(child);
    await Promise.race([exited, new Promise((resolveWait) => setTimeout(resolveWait, 5_000))]);
    return;
  }
  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolveExit) => child.once("exit", () => resolveExit(true))),
    new Promise((resolveWait) => setTimeout(() => resolveWait(false), 5_000)),
  ]);
  if (!exited) child.kill("SIGKILL");
}

function forceStopChildTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGKILL");
  }
}

function boundedOutput(current, chunk) {
  return `${current}${String(chunk)}`.slice(-8_000);
}

function readArg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
