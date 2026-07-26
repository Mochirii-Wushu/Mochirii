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

if (!["both", "configured", "unconfigured"].includes(requestedScenario)) {
  throw new Error(`Unsupported scenario: ${requestedScenario}`);
}
if (requestedScenario !== "unconfigured") {
  await runScenario({
    label: "configured",
    configured: true,
    password: syntheticPassword,
    sessionSecret: syntheticSessionSecret,
  });
}
if (requestedScenario !== "configured") {
  await runScenario({ label: "unconfigured", configured: false });
}

console.log("Mochi Pets local configured/unconfigured smoke completed.");

async function runScenario({ label, configured, password = "", sessionSecret = "" }) {
  const appPort = await reserveLoopbackPort();
  const browserPort = await reserveLoopbackPort();
  const baseUrl = `http://127.0.0.1:${appPort}`;
  const browserBaseUrl = `https://localhost:${browserPort}`;
  const serverEnv = cleanTesterEnvironment();
  const smokeEnv = cleanTesterEnvironment();
  const browserCookieObservation = { total: 0, valid: 0 };
  let proxy = null;
  let certificateDirectory = null;

  if (configured) {
    serverEnv.MOCHI_PETS_TESTER_PASSWORD = password;
    serverEnv.MOCHI_PETS_TESTER_SESSION_SECRET = sessionSecret;
    smokeEnv.MOCHI_PETS_TESTER_PASSWORD = password;
  }

  const server = spawn(
    process.execPath,
    [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(appPort)],
    { cwd: webRoot, env: serverEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  server.stdout.on("data", (chunk) => { output = boundedOutput(output, chunk); });
  server.stderr.on("data", (chunk) => { output = boundedOutput(output, chunk); });

  try {
    console.log(`Mochi Pets ${label} production-server smoke starting.`);
    await waitUntilReady(server, baseUrl, () => output);
    const certificate = createEphemeralLocalCertificate();
    certificateDirectory = certificate.directory;
    proxy = await startHttpsProxy({
      listenPort: browserPort,
      upstreamPort: appPort,
      key: certificate.key,
      cert: certificate.cert,
      browserCookieObservation,
    });
    await runChild(
      process.execPath,
      [
        smokeScript,
        "--base-url",
        baseUrl,
        "--browser-base-url",
        browserBaseUrl,
        "--allow-self-signed-localhost",
        "--browser",
        requestedBrowser,
        ...(configured ? [] : ["--expect-unconfigured"]),
      ],
      { cwd: root, env: smokeEnv, stdio: "inherit" },
      `${label} doorway smoke`,
      10 * 60_000,
    );
    if (configured && (
      browserCookieObservation.total === 0
      || browserCookieObservation.valid !== browserCookieObservation.total
    )) {
      throw new Error("Browser login responses did not preserve the complete secure cookie contract.");
    }
    if (!configured && browserCookieObservation.total !== 0) {
      throw new Error("The unconfigured browser scenario unexpectedly received a tester session cookie.");
    }
    console.log(`Mochi Pets ${label} production-server smoke passed.`);
  } finally {
    try {
      await stopHttpsProxy(proxy);
    } finally {
      try {
        if (certificateDirectory) {
          rmSync(certificateDirectory, { recursive: true, force: true });
        }
      } finally {
        await stopChild(server);
      }
    }
  }
}

function cleanTesterEnvironment() {
  const env = { ...process.env };
  const testerKeys = new Set([
    "MOCHI_PETS_TESTER_PASSWORD",
    "MOCHI_PETS_TESTER_SESSION_SECRET",
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
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-sha256",
      "-days",
      "1",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
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
    process.env.ProgramFiles
      ? join(process.env.ProgramFiles, "Git", "usr", "bin", "openssl.exe")
      : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes("\\") && !existsSync(candidate)) continue;
    const probe = spawnSync(candidate, ["version"], {
      stdio: "ignore",
      timeout: 10_000,
      windowsHide: true,
    });
    if (!probe.error && probe.status === 0) return candidate;
  }

  throw new Error("OpenSSL is required to run the local HTTPS browser smoke.");
}

function startHttpsProxy({ listenPort, upstreamPort, key, cert, browserCookieObservation }) {
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
        observeBrowserSessionCookie(request, upstreamResponse, browserCookieObservation);
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });

      upstream.once("error", () => {
        if (!response.headersSent) {
          response.writeHead(502, { "Cache-Control": "no-store" });
        }
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

function observeBrowserSessionCookie(request, response, observation) {
  if (request.method !== "POST") return;
  const requestPath = new URL(request.url ?? "/", "https://localhost").pathname;
  if (requestPath !== "/games/mochi-pets/tester-login") return;

  const setCookie = response.headers["set-cookie"];
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const cookie of cookies) {
    if (!cookie.startsWith("mochi_pets_tester_access=")) continue;
    observation.total += 1;
    const hasCompleteContract = /;\s*HttpOnly(?:;|$)/i.test(cookie)
      && /;\s*Secure(?:;|$)/i.test(cookie)
      && /;\s*SameSite=Lax(?:;|$)/i.test(cookie)
      && /;\s*Path=\/games\/mochi-pets(?:;|$)/i.test(cookie);
    if (hasCompleteContract) observation.valid += 1;
  }
}

function stopHttpsProxy(proxy) {
  if (!proxy) return Promise.resolve();
  return new Promise((resolveStop, reject) => {
    proxy.close((error) => error ? reject(error) : resolveStop());
    proxy.closeAllConnections?.();
  });
}

async function waitUntilReady(child, baseUrl, getOutput) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js server exited before readiness.\n${getOutput()}`);
    }
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
    await Promise.race([
      exited,
      new Promise((resolveWait) => setTimeout(resolveWait, 5_000)),
    ]);
    return;
  }

  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolveExit) => child.once("exit", () => resolveExit(true))),
    new Promise((resolveWait) => setTimeout(() => resolveWait(false), 5_000)),
  ]);
  if (exited) return;

  child.kill("SIGKILL");
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
