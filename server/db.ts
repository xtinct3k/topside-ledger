import { Redis } from "@upstash/redis";
import { sanitize, type Ledger, type Progress } from "../src/state.js";

const KEY = "topside-ledger:ledger";

// Upstash created through the Vercel Marketplace injects the KV_* names; a direct Upstash setup uses UPSTASH_*.
function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

// Local `npm run dev` without Redis keeps the ledger in memory so the app is still usable.
const local = globalThis as typeof globalThis & { __topsideLedger?: Ledger };
const onVercel = () => !!process.env.VERCEL;

export class StorageMissing extends Error {}

function toLedger(raw: unknown): Ledger {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Ledger>;
  return { ...sanitize(raw), rev: Number(r.rev) || 0, updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null };
}

export async function loadLedger(): Promise<Ledger> {
  const db = redis();
  if (db) return toLedger(await db.get(KEY));
  if (onVercel()) throw new StorageMissing();
  return local.__topsideLedger ?? toLedger(null);
}

/**
 * Write only if nobody else wrote since `baseRev` was read.
 * On a clash, returns the stored ledger so the caller can adopt it.
 */
export async function saveLedger(p: Progress, baseRev: number): Promise<{ ok: boolean; ledger: Ledger }> {
  const current = await loadLedger();
  if (current.rev !== baseRev) return { ok: false, ledger: current };
  const next: Ledger = { ...sanitize(p), rev: current.rev + 1, updatedAt: new Date().toISOString() };
  const db = redis();
  if (db) await db.set(KEY, next);
  else local.__topsideLedger = next;
  return { ok: true, ledger: next };
}
