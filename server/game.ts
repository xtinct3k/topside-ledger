// MetaForge ARC Raiders database (https://metaforge.app/arc-raiders/api), trimmed into one GameData bundle.
// Community-maintained game data; they ask for caching and attribution.
import { rarityCode, type Arc, type GameData, type GameEvent, type Item, type Quest, type Stack, type Station, type Trader } from "../src/game.js";

const BASE = "https://metaforge.app/api/arc-raiders";
const FRESH_MS = 6 * 60 * 60 * 1000;
const EVENTS_FRESH_MS = 10 * 60 * 1000;
const memo = globalThis as typeof globalThis & {
  __mfGame?: { at: number; data: GameData };
  __mfEvents?: { at: number; data: GameEvent[] };
};

type Raw = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter((x): x is Raw => !!x && typeof x === "object") : []);
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});

async function get(path: string): Promise<Raw> {
  const res = await fetch(`${BASE}/${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`MetaForge ${path} responded ${res.status}`);
  const body: unknown = await res.json();
  // Most endpoints wrap results in { data }; hideout returns a bare array.
  return Array.isArray(body) ? { data: body } : obj(body);
}

/** Fetch every page of a paged endpoint in parallel after the first. */
async function pages(path: string, limit: number): Promise<Raw[]> {
  const sep = path.includes("?") ? "&" : "?";
  const first = await get(`${path}${sep}limit=${limit}&page=1`);
  const total = Math.min(num(obj(first.pagination).totalPages) || 1, 30);
  const rest = await Promise.all(Array.from({ length: total - 1 }, (_, i) => get(`${path}${sep}limit=${limit}&page=${i + 2}`)));
  return [first, ...rest].flatMap((p) => arr(p.data));
}

const stacks = (list: unknown, idOf: (r: Raw) => unknown, nOf: (r: Raw) => unknown): Stack[] =>
  arr(list)
    .map((r): Stack => [str(idOf(r)), num(nOf(r))])
    .filter(([id, n]) => id && n > 0);

function stats(block: unknown): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(obj(block))) {
    if (typeof v === "number" && v !== 0) out[k] = Math.round(v * 100) / 100;
    else if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

function toItem(r: Raw): Item {
  return {
    id: str(r.id),
    name: str(r.name),
    type: str(r.item_type),
    sub: str(r.subcategory),
    rarity: rarityCode(r.rarity),
    value: num(r.value),
    icon: str(r.icon),
    desc: str(r.description),
    flavor: str(r.flavor_text),
    loot: str(r.loot_area),
    maps: [...new Set(arr(r.locations).map((l) => str(l.map)).filter(Boolean))],
    bench: str(r.workbench),
    stats: stats(r.stat_block),
    craft: stacks(r.components, (c) => obj(c.component).id, (c) => c.quantity),
    recycle: stacks(r.recycle_components, (c) => obj(c.component).id, (c) => c.quantity),
    from: stacks(r.recycle_from, (c) => obj(c.item).id, (c) => c.quantity),
    usedIn: stacks(r.used_in, (c) => obj(c.item).id, (c) => c.quantity),
    drops: [...new Set(arr(r.dropped_by).map((d) => str(obj(d.arc).id)).filter(Boolean))],
    sold: arr(r.sold_by)
      .map((s) => ({ trader: str(s.trader_name), price: num(s.price) }))
      .filter((s) => s.trader),
    mods: arr(r.mods).map((m) => str(obj(m.mod).id)).filter(Boolean),
    slots: Array.isArray(r.loadout_slots) ? r.loadout_slots.map(str).filter(Boolean) : [],
    ammo: str(r.ammo_type),
    guide: str(r.guide_url),
  };
}

function toStation(r: Raw): Station {
  const levels = Object.entries(obj(r.levels))
    .map(([lv, d]) => {
      const L = obj(d);
      return {
        lv: Number(lv),
        req: stacks(L.requiredItems, (x) => x.id, (x) => x.quantity),
        unlock: stacks(L.unlockRequirements, (x) => x.id, (x) => x.quantity),
        crafts: Array.isArray(L.crafts) ? L.crafts.map(str).filter(Boolean) : [],
      };
    })
    .filter((l) => l.lv > 0)
    .sort((a, b) => a.lv - b.lv);
  return { id: str(r.id), name: str(r.name), max: num(r.maxLevel) || levels.length, levels };
}

function toQuest(r: Raw): Quest {
  const manifest = obj(r.manifest);
  return {
    id: str(r.id),
    name: str(r.name),
    trader: str(r.trader_name),
    desc: str(r.description),
    objectives: Array.isArray(r.objectives) ? r.objectives.map(str).filter(Boolean) : [],
    req: stacks(r.required_items, (x) => x.item_id, (x) => x.quantity),
    rewards: stacks(r.rewards, (x) => x.item_id, (x) => x.quantity),
    prereq: arr(manifest.prerequisites)
      .map((p) => str(p.quest_id))
      .filter(Boolean),
    xp: num(r.xp),
    image: str(r.image),
    guide: str(r.guide_url),
    order: num(r.sort_order),
  };
}

const toArc = (r: Raw): Arc => ({ id: str(r.id), name: str(r.name), desc: str(r.description), icon: str(r.icon), image: str(r.image) });

function toTraders(r: Raw): Trader[] {
  return Object.entries(obj(r.data)).map(([name, stock]) => ({
    name,
    stock: arr(stock)
      .map((s) => ({ id: str(s.id), price: num(s.trader_price) }))
      .filter((s) => s.id),
  }));
}

async function build(): Promise<GameData> {
  const [items, quests, hideout, arcs, traders] = await Promise.all([
    pages("items?includeComponents=true", 100),
    pages("quests", 100),
    get("hideout"),
    pages("arcs", 100),
    get("traders"),
  ]);
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const questList = quests.map(toQuest).filter((q) => q.id && q.name);
  // A prerequisite MetaForge doesn't list could never be ticked off, so it would lock its quest forever.
  const known = new Set(questList.map((q) => q.id));
  for (const q of questList) q.prereq = q.prereq.filter((id) => known.has(id));
  return {
    items: items.map(toItem).filter((i) => i.id && i.name).sort(byName),
    stations: arr(hideout.data).map(toStation).filter((s) => s.id),
    quests: questList,
    arcs: arcs.map(toArc).filter((a) => a.id).sort(byName),
    traders: toTraders(traders),
    at: new Date().toISOString(),
  };
}

/** Cached per function instance; serves stale data if MetaForge is down. */
export async function getGame(): Promise<GameData> {
  const hit = memo.__mfGame;
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data;
  try {
    const data = await build();
    if (!data.items.length) throw new Error("MetaForge returned no items");
    memo.__mfGame = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (hit) return hit.data;
    throw e;
  }
}

export async function getEvents(): Promise<GameEvent[]> {
  const hit = memo.__mfEvents;
  if (hit && Date.now() - hit.at < EVENTS_FRESH_MS) return hit.data;
  try {
    const raw = await get("events");
    const data = arr(raw.data)
      .map((e) => ({ name: str(e.name), map: str(e.map), icon: str(e.icon), start: num(e.startTime), end: num(e.endTime) }))
      .filter((e) => e.name && e.end > e.start)
      .sort((a, b) => a.start - b.start);
    memo.__mfEvents = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (hit) return hit.data;
    throw e;
  }
}
