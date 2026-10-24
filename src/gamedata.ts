import { create } from "zustand";
import type { Arc, GameData, GameEvent, Item, Quest } from "./game.js";

interface GameState {
  status: "loading" | "ready" | "error";
  data: GameData | null;
  items: Record<string, Item>;
  quests: Record<string, Quest>;
  arcs: Record<string, Arc>;
  events: GameEvent[];
}

export const useGame = create<GameState>(() => ({ status: "loading", data: null, items: {}, quests: {}, arcs: {}, events: [] }));

const index = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x]));

export async function loadGame() {
  try {
    const res = await fetch("/api/game");
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as GameData;
    useGame.setState({ status: "ready", data, items: index(data.items), quests: index(data.quests), arcs: index(data.arcs) });
  } catch {
    useGame.setState({ status: "error" });
  }
}

export async function loadEvents() {
  try {
    const res = await fetch("/api/events");
    if (!res.ok) return;
    const { events } = (await res.json()) as { events: GameEvent[] };
    useGame.setState({ events });
  } catch {
    // the schedule is a nice-to-have
  }
}

/** Placeholder for ids MetaForge doesn't know (old saves, removed items). */
export function unknownItem(id: string): Item {
  return {
    id,
    name: id.replace(/-/g, " "),
    type: "",
    sub: "",
    rarity: "",
    value: 0,
    icon: "",
    desc: "",
    flavor: "",
    loot: "",
    maps: [],
    bench: "",
    stats: {},
    craft: [],
    recycle: [],
    from: [],
    usedIn: [],
    drops: [],
    sold: [],
    mods: [],
    slots: [],
    ammo: "",
    guide: "",
  };
}

export const itemOf = (items: Record<string, Item>, id: string) => items[id] ?? unknownItem(id);
export const useItem = (id: string) => itemOf(useGame((s) => s.items), id);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Name search: exact, then prefix, then substring; shorter names first within each. */
export function searchItems(list: Item[], query: string, limit = 12) {
  const q = norm(query);
  if (!q) return [];
  return list
    .map((it) => {
      const n = norm(it.name);
      return { it, s: n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : -1 };
    })
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.it.name.length - b.it.name.length)
    .slice(0, limit)
    .map((x) => x.it);
}
