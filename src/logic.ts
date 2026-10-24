import { GEAR_TYPES, type GameData, type Item, type Quest, type Station, type StationLevel } from "./game.js";
import type { Progress, Raid } from "./state.js";

type P = Pick<Progress, "inv" | "lvl" | "quest" | "reserve">;

export const have = (p: Pick<P, "inv">, k: string) => p.inv[k] || 0;
export const level = (p: Pick<P, "lvl">, k: string) => p.lvl[k] || 0;

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const roman = (n: number) => ROMAN[n] ?? String(n);

export interface Plan {
  /** Count every future station level, or only each station's next one. */
  horizon: "next" | "all";
  /** Count items that unfinished quests ask for. */
  quests: boolean;
}

export const DEFAULT_PLAN: Plan = { horizon: "all", quests: true };

export interface Need {
  kind: "station" | "quest" | "reserve";
  /** Station, quest or item id. */
  ref: string;
  label: string;
  n: number;
}

/** Everything still to be handed in, per item. */
export function needsIndex(p: P, g: Pick<GameData, "stations" | "quests">, plan: Plan) {
  const m = new Map<string, Need[]>();
  const add = (id: string, need: Need) => {
    const list = m.get(id);
    if (list) list.push(need);
    else m.set(id, [need]);
  };
  for (const s of g.stations) {
    const cur = level(p, s.id);
    for (const L of s.levels) {
      if (L.lv <= cur || (plan.horizon === "next" && L.lv !== cur + 1)) continue;
      for (const [id, n] of L.req) add(id, { kind: "station", ref: s.id, label: `${s.name} ${roman(L.lv)}`, n });
    }
  }
  if (plan.quests) {
    for (const q of g.quests) {
      if (p.quest[q.id]) continue;
      for (const [id, n] of q.req) add(id, { kind: "quest", ref: q.id, label: q.name, n });
    }
  }
  for (const [id, n] of Object.entries(p.reserve)) if (n > 0) add(id, { kind: "reserve", ref: id, label: "Reserve", n });
  return m;
}

export type Verdict = "short" | "keep" | "sell" | "recycle" | "gear";

export interface Row {
  id: string;
  item: Item;
  have: number;
  need: number;
  keep: number;
  spare: number;
  short: number;
  verdict: Verdict;
  reason: string;
  /** Coins the spare units fetch, by selling or by selling what they recycle into. */
  spareValue: number;
  needs: Need[];
}

export const recycleValue = (it: Item, items: Record<string, Item>) => it.recycle.reduce((a, [id, n]) => a + (items[id]?.value ?? 0) * n, 0);

const listNames = (labels: string[]) => {
  const u = [...new Set(labels)];
  return u.length > 2 ? `${u.slice(0, 2).join(", ")} +${u.length - 2}` : u.join(", ");
};

/**
 * Every item you hold or still need, with what to do about it.
 * Short: you need more. Keep: all of it is spoken for. Sell or Recycle: the spare,
 * recycling when its parts cover a shortfall or are worth more than the item. Gear: loadout items, your call.
 */
export function advise(p: P, g: Pick<GameData, "stations" | "quests">, items: Record<string, Item>, plan: Plan, fallback: (id: string) => Item): Row[] {
  const idx = needsIndex(p, g, plan);
  const ids = new Set([...Object.keys(p.inv), ...idx.keys()]);
  const base = [...ids].map((id) => {
    const needs = idx.get(id) ?? [];
    const need = needs.reduce((a, x) => a + x.n, 0);
    const h = have(p, id);
    return { id, item: items[id] ?? fallback(id), have: h, need, keep: Math.min(h, need), spare: Math.max(0, h - need), short: Math.max(0, need - h), needs };
  });
  const shortIds = new Set(base.filter((r) => r.short > 0).map((r) => r.id));

  return base.map((r): Row => {
    const labels = r.needs.map((x) => x.label);
    if (r.short > 0) return { ...r, verdict: "short", reason: `${r.short} more for ${listNames(labels)}`, spareValue: 0 };
    if (r.spare === 0) return { ...r, verdict: "keep", reason: `For ${listNames(labels)}`, spareValue: 0 };
    const kept = r.keep ? `Keep ${r.keep} for ${listNames(labels)}. ` : "";
    if (GEAR_TYPES.has(r.item.type)) return { ...r, verdict: "gear", reason: `${kept}Loadout item: your call.`, spareValue: r.spare * r.item.value };
    const rv = recycleValue(r.item, items);
    const feeds = r.item.recycle.filter(([id]) => shortIds.has(id)).map(([id]) => items[id]?.name ?? id);
    if (feeds.length) return { ...r, verdict: "recycle", reason: `${kept}Recycle: gives ${listNames(feeds)}, which you still need.`, spareValue: r.spare * rv };
    if (rv > r.item.value) return { ...r, verdict: "recycle", reason: `${kept}Recycle: parts worth ${coins(rv)} vs ${coins(r.item.value)} sold.`, spareValue: r.spare * rv };
    return { ...r, verdict: "sell", reason: `${kept}Sell the rest${r.item.value ? ` at ${coins(r.item.value)} each` : ""}.`, spareValue: r.spare * r.item.value };
  });
}

export const coins = (n: number) => `${Math.round(n).toLocaleString("en-US")}¢`;

export type LevelState = "built" | "ready" | "short";

/** Status of one station level against the stash. */
export function levelState(p: P, s: Station, L: StationLevel): LevelState {
  if (level(p, s.id) >= L.lv) return "built";
  return L.req.every(([id, n]) => have(p, id) >= n) ? "ready" : "short";
}

export type QuestState = "done" | "locked" | "ready" | "open";

export function questState(p: P, q: Quest): QuestState {
  if (p.quest[q.id]) return "done";
  if (q.prereq.some((id) => !p.quest[id])) return "locked";
  return q.req.length && q.req.every(([id, n]) => have(p, id) >= n) ? "ready" : "open";
}

export interface RaidStats {
  total: number;
  extracted: number;
  rate: number;
  parts: number;
  /** Per map: raids, extracts, and how many still-needed parts came home there. */
  maps: { map: string; raids: number; extracted: number; useful: number }[];
}

export function raidStats(raids: Raid[], needed: Set<string>, mapOrder: string[]): RaidStats {
  const byMap = new Map<string, { map: string; raids: number; extracted: number; useful: number }>();
  let extracted = 0;
  let parts = 0;
  for (const r of raids) {
    const m = byMap.get(r.map) ?? { map: r.map, raids: 0, extracted: 0, useful: 0 };
    m.raids++;
    if (r.outcome === "extracted") {
      extracted++;
      m.extracted++;
      for (const it of r.items) {
        parts += it.n;
        if (needed.has(it.id)) m.useful += it.n;
      }
    }
    byMap.set(r.map, m);
  }
  const maps = [...byMap.values()].sort((a, b) => b.raids - a.raids || mapOrder.indexOf(a.map) - mapOrder.indexOf(b.map));
  return { total: raids.length, extracted, rate: raids.length ? extracted / raids.length : 0, parts, maps };
}
