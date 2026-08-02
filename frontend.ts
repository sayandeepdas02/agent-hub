/**
 * Frontend server — serves pages and proxies /api/* to the backend.
 *
 * Run (dev):  tsx frontend.ts
 * Run (prod): NODE_ENV=production tsx frontend.ts
 *
 * Environment:
 *   PORT         Port to listen on (default: 3000)
 *   BACKEND_URL  Where the API server lives, e.g. https://api.example.com
 *                When unset the server handles everything itself (monolith mode).
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

const app = next({ dev });
const handle = app.getRequestHandler();

function proxyToBackend(req: IncomingMessage, res: ServerResponse) {
  const target = new URL(req.url ?? "/", backendUrl!);
  const isHttps = target.protocol === "https:";
  const makeRequest = isHttps ? httpsRequest : httpRequest;

  const proxyReq = makeRequest(
    {
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers: { ...req.headers, host: target.hostname },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on("error", (err) => {
    console.error("[proxy]", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad gateway" }));
    }
  });

  req.pipe(proxyReq, { end: true });
}

app.prepare().then(() => {
  createServer((req, res) => {
    if (backendUrl && req.url?.startsWith("/api/")) {
      proxyToBackend(req, res);
      return;
    }
    handle(req, res);
  }).listen(port, () => {
    if (backendUrl) {
      console.log(`> Frontend server ready on http://localhost:${port}`);
      console.log(`> Proxying /api/* → ${backendUrl}`);
    } else {
      console.log(`> Monolith server ready on http://localhost:${port} (set BACKEND_URL to split)`);
    }
  });
});
