import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const portIndex = process.argv.indexOf("--port");
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 8765;

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

function resolveRequest(url = "/") {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const target = normalize(join(root, pathname === "/" ? "index.html" : pathname));
  if (!target.startsWith(root)) return null;
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, "index.html");
  return target;
}

const server = createServer((req, res) => {
  const target = resolveRequest(req.url);
  if (!target || !existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "content-type": types[extname(target)] || "application/octet-stream" });
  createReadStream(target).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}/`);
});
