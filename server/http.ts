import { createHash, timingSafeEqual } from "node:crypto";

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export const fail = (status: number, error: string, message: string) => json({ error, message }, status);

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Single-user lock: the request must carry the site password set in APP_PASSWORD.
 * Returns an error response to send, or null when the caller is allowed in.
 * Fails closed: with no password configured, nothing personal is served.
 */
export async function requireAuth(req: Request): Promise<Response | null> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return fail(500, "not_configured", "Set APP_PASSWORD in your Vercel project settings, then redeploy.");
  let given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  try {
    given = decodeURIComponent(given);
  } catch {
    // keep as sent
  }
  if (!timingSafeEqual(digest(given), digest(expected))) {
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return fail(401, "unauthorized", "Wrong password.");
  }
  return null;
}

export async function readJson(req: Request, maxBytes = 512_000): Promise<unknown> {
  const raw = await req.text();
  if (raw.length > maxBytes) throw new Error("body too large");
  return raw ? JSON.parse(raw) : null;
}
