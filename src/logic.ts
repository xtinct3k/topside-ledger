import { GOALS, ITEMS, MAPS, type Goal } from "./data.js";
import type { Progress, Raid } from "./state.js";

export type Status = "ever" | "done" | "locked" | "ready" | "next" | "open";
type P = Pick<Progress, "inv" | "lvl" | "flag">;

export const have = (p: P, k: string) => p.inv[k] || 0;
export const level = (p: P, k: string) => p.lvl[k] || 0;
export const flagOn = (p: P, k: string) => !!p.flag[k];

export const isDone = (p: P, g: Goal) => (g.ever ? false : g.st ? level(p, g.st) >= (g.lv ?? 1) : flagOn(p, g.done ?? ""));
export const isLocked = (p: P, g: Goal) => !!g.needs && !flagOn(p, g.needs) && !isDone(p, g);
export const isReady = (p: P, g: Goal) => g.req.every(([k, n]) => have(p, k) >= n) && (g.flags ?? []).every((f) => flagOn(p, f));

export function pct(p: P, g: Goal) {
  const parts = g.req.map(([k, n]) => Math.min(have(p, k), n) / n).concat((g.flags ?? []).map((f) => (flagOn(p, f) ? 1 : 0)));
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export const nextGoal = (p: P) => GOALS.find((g) => !isDone(p, g) && !isLocked(p, g));

export function statusOf(p: P, g: Goal, next: Goal | undefined): Status {
  if (g.ever) return "ever";
  if (isDone(p, g)) return "done";
  if (isLocked(p, g)) return "locked";
  if (isReady(p, g)) return "ready";
  if (next?.id === g.id) return "next";
  return "open";
}

/** Total of item k required by every unfinished goal. */
export const needed = (p: P, k: string) =>
  GOALS.filter((g) => !isDone(p, g)).reduce((a, g) => a + (g.req.find((r) => r[0] === k)?.[1] ?? 0), 0);

export interface HaulRow {
  k: string;
  n: number;
  left: number;
}

/** Items needed across unfinished goals: missing first, then by largest share still missing. */
export function haulRows(p: P): HaulRow[] {
  const tot: Record<string, number> = {};
  GOALS.filter((g) => !isDone(p, g)).forEach((g) => g.req.forEach(([k, n]) => (tot[k] = (tot[k] ?? 0) + n)));
  return Object.entries(tot)
    .map(([k, n]) => ({ k, n, left: Math.max(0, n - have(p, k)) }))
    .sort((x, y) => Number(y.left > 0) - Number(x.left > 0) || y.left / y.n - x.left / x.n);
}

export interface RaidStats {
  total: number;
  extracted: number;
  rate: number;
  parts: number;
  /** Per map: raids, extracts, and how many still-needed parts came home there. */
  maps: { map: string; raids: number; extracted: number; useful: number }[];
}

export function raidStats(p: P & { raids: Raid[] }): RaidStats {
  const neededIds = new Set(haulRows(p).filter((r) => r.left > 0).map((r) => r.k));
  const byMap = new Map<string, { map: string; raids: number; extracted: number; useful: number }>();
  let extracted = 0;
  let parts = 0;
  for (const r of p.raids) {
    const m = byMap.get(r.map) ?? { map: r.map, raids: 0, extracted: 0, useful: 0 };
    m.raids++;
    if (r.outcome === "extracted") {
      extracted++;
      m.extracted++;
      for (const it of r.items) {
        parts += it.n;
        if (neededIds.has(it.id) || ITEMS[it.id]) m.useful += it.n;
      }
    }
    byMap.set(r.map, m);
  }
  const maps = [...byMap.values()].sort((a, b) => b.raids - a.raids || MAPS.indexOf(a.map) - MAPS.indexOf(b.map));
  return { total: p.raids.length, extracted, rate: p.raids.length ? extracted / p.raids.length : 0, parts, maps };
}
