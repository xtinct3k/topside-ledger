// Ledger shape shared by the browser and the API. Pure: no browser or Node APIs.
import { LEGACY_IDS, STATIONS } from "./data.js";

export type Outcome = "extracted" | "died" | "aborted";
export const OUTCOMES: Outcome[] = ["extracted", "died", "aborted"];

export interface RaidItem {
  id: string;
  n: number;
}

export interface Raid {
  id: string;
  /** ISO timestamp. */
  at: string;
  map: string;
  outcome: Outcome;
  items: RaidItem[];
  note: string;
}

export interface Progress {
  inv: Record<string, number>;
  lvl: Record<string, number>;
  flag: Record<string, boolean>;
  raids: Raid[];
}

/** Progress plus the server's revision counter, used to catch writes from two devices at once. */
export interface Ledger extends Progress {
  rev: number;
  updatedAt: string | null;
}

export const MAX_RAIDS = 500;

export const emptyProgress = (): Progress => ({ inv: {}, lvl: {}, flag: {}, raids: [] });

export const count = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
export const maxLevel = (k: string) => STATIONS.find((s) => s.id === k)?.max ?? 4;
export const itemId = (k: string) => LEGACY_IDS[k] ?? k;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function cleanRaid(o: unknown): Raid | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const at = typeof r.at === "string" && !Number.isNaN(Date.parse(r.at)) ? r.at : null;
  const outcome = OUTCOMES.includes(r.outcome as Outcome) ? (r.outcome as Outcome) : null;
  if (!at || !outcome) return null;
  const items = Array.isArray(r.items)
    ? r.items
        .map((x) => (x && typeof x === "object" ? { id: itemId(text((x as RaidItem).id, 80)), n: count((x as RaidItem).n) } : null))
        .filter((x): x is RaidItem => !!x && !!x.id && x.n > 0)
    : [];
  return { id: text(r.id, 40) || newId(), at, map: text(r.map, 40) || "Unknown", outcome, items, note: text(r.note, 500) };
}

/** Coerce anything (old saves, imported files, request bodies) into clean Progress. */
export function sanitize(o: unknown): Progress {
  const out = emptyProgress();
  if (!o || typeof o !== "object") return out;
  const src = o as Record<string, unknown>;
  const each = (col: "inv" | "lvl" | "flag", fn: (k: string, v: unknown) => void) => {
    const m = src[col];
    if (m && typeof m === "object" && !Array.isArray(m)) Object.entries(m).forEach(([k, v]) => fn(k, v));
  };
  each("inv", (k, v) => {
    const n = count(v);
    if (n) out.inv[itemId(k)] = n;
  });
  each("lvl", (k, v) => {
    const n = Math.min(count(v), maxLevel(k));
    if (n) out.lvl[k] = n;
  });
  each("flag", (k, v) => {
    if (v) out.flag[k] = true;
  });
  if (Array.isArray(src.raids)) {
    out.raids = src.raids
      .map(cleanRaid)
      .filter((r): r is Raid => !!r)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, MAX_RAIDS);
  }
  return out;
}

export const isEmpty = (p: Progress) =>
  !Object.keys(p.inv).length && !Object.keys(p.lvl).length && !Object.keys(p.flag).length && !p.raids.length;

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Stash change a raid causes: only extracted raids bring loot home. */
export function raidStashDelta(raid: Raid): RaidItem[] {
  return raid.outcome === "extracted" ? raid.items : [];
}

export function addToStash(inv: Record<string, number>, changes: RaidItem[], sign: 1 | -1 = 1) {
  const next = { ...inv };
  for (const { id, n } of changes) {
    const v = Math.max(0, (next[id] ?? 0) + sign * n);
    if (v) next[id] = v;
    else delete next[id];
  }
  return next;
}
