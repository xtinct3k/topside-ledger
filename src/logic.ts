import { GOALS, type Goal } from "./data";
import type { Progress } from "./store";

export type Status = "ever" | "done" | "locked" | "ready" | "next" | "open";

export const have = (p: Progress, k: string) => p.inv[k] || 0;
export const level = (p: Progress, k: string) => p.lvl[k] || 0;
export const flagOn = (p: Progress, k: string) => !!p.flag[k];

export const isDone = (p: Progress, g: Goal) =>
  g.ever ? false : g.st ? level(p, g.st) >= (g.lv ?? 1) : flagOn(p, g.done ?? "");
export const isLocked = (p: Progress, g: Goal) => !!g.needs && !flagOn(p, g.needs) && !isDone(p, g);
export const isReady = (p: Progress, g: Goal) =>
  g.req.every(([k, n]) => have(p, k) >= n) && (g.flags ?? []).every((f) => flagOn(p, f));

export function pct(p: Progress, g: Goal) {
  const parts = g.req.map(([k, n]) => Math.min(have(p, k), n) / n).concat((g.flags ?? []).map((f) => (flagOn(p, f) ? 1 : 0)));
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export const nextGoal = (p: Progress) => GOALS.find((g) => !isDone(p, g) && !isLocked(p, g));

export function statusOf(p: Progress, g: Goal, next: Goal | undefined): Status {
  if (g.ever) return "ever";
  if (isDone(p, g)) return "done";
  if (isLocked(p, g)) return "locked";
  if (isReady(p, g)) return "ready";
  if (next?.id === g.id) return "next";
  return "open";
}

/** Total of item k required by every unfinished goal. */
export const needed = (p: Progress, k: string) =>
  GOALS.filter((g) => !isDone(p, g)).reduce((a, g) => a + (g.req.find((r) => r[0] === k)?.[1] ?? 0), 0);

export interface HaulRow {
  k: string;
  n: number;
  left: number;
}

/** Items needed across unfinished goals: missing first, then by largest share still missing. */
export function haulRows(p: Progress): HaulRow[] {
  const tot: Record<string, number> = {};
  GOALS.filter((g) => !isDone(p, g)).forEach((g) => g.req.forEach(([k, n]) => (tot[k] = (tot[k] ?? 0) + n)));
  return Object.entries(tot)
    .map(([k, n]) => ({ k, n, left: Math.max(0, n - have(p, k)) }))
    .sort((x, y) => Number(y.left > 0) - Number(x.left > 0) || y.left / y.n - x.left / x.n);
}
