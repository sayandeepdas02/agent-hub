/**
 * Standalone API server — handles only /api/* routes.
 *
 * Run (dev):  tsx backend.ts
 * Run (prod): NODE_ENV=production tsx backend.ts
 *
 * Environment:
 *   PORT        Port to listen on (default: 3001)
 *   DATABASE_URL, REDIS_URL, AWS_*, AUTH_SECRET, etc. — same as the monolith
 */

import { createServer } from "http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3001", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    if (!url.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found — this server handles /api/* only" }));
      return;
    }

    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> API server ready on http://localhost:${port}`);
  });
});
