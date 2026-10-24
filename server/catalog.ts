// MetaForge ARC Raiders item database (https://metaforge.app/arc-raiders/api).
// Community-maintained game data; they ask for caching and attribution.

export interface CatalogItem {
  id: string;
  name: string;
  rarity: string;
  type: string;
  icon: string;
  value: number;
  loot: string;
}

const BASE = "https://metaforge.app/api/arc-raiders/items";
const FRESH_MS = 6 * 60 * 60 * 1000;
const memo = globalThis as typeof globalThis & { __mfCatalog?: { at: number; items: CatalogItem[] } };

interface RawItem {
  id?: unknown;
  name?: unknown;
  rarity?: unknown;
  item_type?: unknown;
  icon?: unknown;
  value?: unknown;
  loot_area?: unknown;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

async function fetchPage(page: number) {
  const res = await fetch(`${BASE}?limit=500&page=${page}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`MetaForge responded ${res.status}`);
  return (await res.json()) as { data?: RawItem[]; pagination?: { totalPages?: number } };
}

async function fetchAll(): Promise<CatalogItem[]> {
  const first = await fetchPage(1);
  const pages = Math.min(first.pagination?.totalPages ?? 1, 10);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2)));
  return [first, ...rest]
    .flatMap((p) => p.data ?? [])
    .filter((r) => str(r.id) && str(r.name))
    .map((r) => ({
      id: str(r.id),
      name: str(r.name),
      rarity: str(r.rarity),
      type: str(r.item_type),
      icon: str(r.icon),
      value: Number(r.value) || 0,
      loot: str(r.loot_area),
    }));
}

/** Cached per function instance; serves stale data if MetaForge is down. */
export async function getCatalog(): Promise<CatalogItem[]> {
  const hit = memo.__mfCatalog;
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.items;
  try {
    const items = await fetchAll();
    memo.__mfCatalog = { at: Date.now(), items };
    return items;
  } catch (e) {
    if (hit) return hit.items;
    throw e;
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function searchCatalog(items: CatalogItem[], query: string, limit = 8) {
  const q = norm(query);
  if (!q) return [];
  return items
    .map((it) => {
      const n = norm(it.name);
      const score = n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : -1;
      return { it, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.it.name.length - b.it.name.length)
    .slice(0, limit)
    .map((x) => x.it);
}
