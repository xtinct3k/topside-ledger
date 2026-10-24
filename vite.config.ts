import { existsSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Serves api/*.ts locally with the same Web Request/Response handlers Vercel runs. */
function devApi(): Plugin {
  return {
    name: "topside-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith("/api/")) return next();
        const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, "");
        const file = path.resolve("api", `${name}.ts`);
        if (!name || !existsSync(file)) {
          res.statusCode = 404;
          return res.end();
        }
        try {
          const mod = await server.ssrLoadModule(file);
          const handler = mod[req.method ?? "GET"];
          if (typeof handler !== "function") {
            res.statusCode = 405;
            return res.end();
          }
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const response: Response = await handler(new Request(url, { method: req.method, headers, body: hasBody ? new Uint8Array(await readBody(req)) : undefined }));
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.ssrFixStacktrace(e as Error);
          console.error(e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "dev_error", message: String(e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env.local (APP_PASSWORD, ANTHROPIC_API_KEY, Redis) visible to the dev API handlers.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), devApi()] };
});
