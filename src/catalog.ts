import { create } from "zustand";
import type { CatalogItem } from "../server/catalog.js";
import { ITEMS, rarityCode, type Rarity } from "./data.js";
import type { IconName } from "./icons.js";

export type { CatalogItem };

interface CatalogState {
  byId: Record<string, CatalogItem>;
  list: CatalogItem[];
}

export const useCatalog = create<CatalogState>(() => ({ byId: {}, list: [] }));

export async function loadCatalog() {
  try {
    const res = await fetch("/api/catalog");
    if (!res.ok) return;
    const { items } = (await res.json()) as { items: CatalogItem[] };
    useCatalog.setState({ list: items, byId: Object.fromEntries(items.map((i) => [i.id, i])) });
  } catch {
    // tracked items still render with built-in glyphs
  }
}

export interface ItemInfo {
  name: string;
  rarity: Rarity;
  glyph: IconName;
  icon?: string;
  where?: string;
  loot?: string;
  type?: string;
  value?: number;
}

export function itemInfo(id: string, byId: Record<string, CatalogItem>): ItemInfo {
  const ours = ITEMS[id];
  const mf = byId[id];
  return {
    name: ours?.name ?? mf?.name ?? id,
    rarity: ours?.rarity || rarityCode(mf?.rarity),
    glyph: ours?.icon ?? "chip",
    icon: mf?.icon || undefined,
    where: ours?.where,
    loot: mf?.loot || undefined,
    type: mf?.type || undefined,
    value: mf?.value || undefined,
  };
}

export const useItemInfo = (id: string) => itemInfo(id, useCatalog((s) => s.byId));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Tracked items first, then the rest of MetaForge's database. */
export function searchItems(query: string, byId: Record<string, CatalogItem>, list: CatalogItem[], limit = 8) {
  const q = norm(query);
  if (!q) return [];
  const score = (name: string) => {
    const n = norm(name);
    return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : -1;
  };
  const tracked = Object.entries(ITEMS)
    .map(([id, it]) => ({ id, s: score(it.name) - 0.5 }))
    .filter((x) => x.s >= -0.5);
  const rest = list.filter((c) => !ITEMS[c.id]).map((c) => ({ id: c.id, s: score(c.name) })).filter((x) => x.s >= 0);
  return [...tracked, ...rest]
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => ({ id: x.id, ...itemInfo(x.id, byId) }));
}
