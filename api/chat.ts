import Anthropic from "@anthropic-ai/sdk";
import { runAssistant, type Mode, type Turn } from "../server/assistant.js";
import { getCatalog } from "../server/catalog.js";
import { StorageMissing, loadLedger, saveLedger } from "../server/db.js";
import { fail, json, readJson, requireAuth } from "../server/http.js";
import type { Progress } from "../src/state.js";

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, "assistant_off", "Add ANTHROPIC_API_KEY in your Vercel project settings to switch the assistant on.");

  let body: { message?: unknown; mode?: unknown; history?: unknown };
  try {
    body = ((await readJson(req, 64_000)) ?? {}) as typeof body;
  } catch {
    return fail(400, "bad_request", "Body must be JSON.");
  }
  const message = clip(body.message, 2000);
  if (!message) return fail(400, "bad_request", "Say something first.");
  const mode: Mode = body.mode === "log" ? "log" : "ask";
  const history: Turn[] = (Array.isArray(body.history) ? body.history : [])
    .map((t) => ({ role: (t as Turn)?.role === "assistant" ? "assistant" : "user", text: clip((t as Turn)?.text, 2000) }) as Turn)
    .filter((t) => t.text)
    .slice(-10);

  try {
    const [ledger, catalog] = await Promise.all([loadLedger(), getCatalog().catch(() => [])]);
    const out = await runAssistant({ mode, message, history, progress: ledger, catalog });

    let saved = ledger;
    if (out.ops.length) {
      // If another device saved meanwhile, replay the assistant's changes on top of that once.
      let base = ledger;
      for (let attempt = 0; attempt < 2; attempt++) {
        const next = out.ops.reduce<Progress>((p, op) => op(p), base);
        const r = await saveLedger(next, base.rev);
        saved = r.ledger;
        if (r.ok) break;
        base = r.ledger;
      }
    }
    return json({ reply: out.reply, actions: out.actions, ledger: saved });
  } catch (e) {
    if (e instanceof StorageMissing) return fail(500, "storage_missing", "Connect an Upstash Redis database in Vercel first.");
    if (e instanceof Anthropic.AuthenticationError) return fail(502, "bad_key", "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in Vercel.");
    if (e instanceof Anthropic.PermissionDeniedError) return fail(502, "bad_key", "The Anthropic API key isn't allowed to use this model.");
    if (e instanceof Anthropic.RateLimitError) return fail(429, "rate_limited", "Claude is busy or your spending limit was reached. Try again shortly.");
    if (e instanceof Anthropic.APIError) return fail(502, "claude_error", `Claude returned an error (${e.status ?? "network"}).`);
    throw e;
  }
}
