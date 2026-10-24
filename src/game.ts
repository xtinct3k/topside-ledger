// Game data shape shared by the browser and the API. Pure: no browser or Node APIs.
// Built from MetaForge's community database (https://metaforge.app/arc-raiders).

/** Item id and count. */
export type Stack = [id: string, n: number];

/** c common, u uncommon, r rare, e epic, l legendary, a amplified, "" none. */
export type Rarity = "c" | "u" | "r" | "e" | "l" | "a" | "";

export interface Item {
  id: string;
  name: string;
  type: string;
  sub: string;
  rarity: Rarity;
  /** Base trader value in coins. */
  value: number;
  icon: string;
  desc: string;
  flavor: string;
  /** Loot area tags, e.g. "Commercial, Residential". */
  loot: string;
  /** Maps with known spawn points. */
  maps: string[];
  /** Where it's crafted, e.g. "Med Stations 1". */
  bench: string;
  /** Non-zero stats only. */
  stats: Record<string, number | string>;
  craft: Stack[];
  recycle: Stack[];
  /** Items that recycle into this one. */
  from: Stack[];
  /** Items crafted with this one. */
  usedIn: Stack[];
  /** ARC ids that drop it. */
  drops: string[];
  sold: { trader: string; price: number }[];
  mods: string[];
  slots: string[];
  ammo: string;
  guide: string;
}

export interface StationLevel {
  lv: number;
  req: Stack[];
  /** Requirements beyond items, e.g. ["rounds-played", 3]. */
  unlock: Stack[];
  /** Item ids this level lets you craft. */
  crafts: string[];
}

export interface Station {
  id: string;
  name: string;
  max: number;
  levels: StationLevel[];
}

export interface Quest {
  id: string;
  name: string;
  trader: string;
  desc: string;
  objectives: string[];
  req: Stack[];
  rewards: Stack[];
  /** Quest ids that must be completed first. */
  prereq: string[];
  xp: number;
  image: string;
  guide: string;
  order: number;
}

export interface Arc {
  id: string;
  name: string;
  desc: string;
  icon: string;
  image: string;
}

export interface Trader {
  name: string;
  stock: { id: string; price: number }[];
}

export interface GameData {
  items: Item[];
  stations: Station[];
  quests: Quest[];
  arcs: Arc[];
  traders: Trader[];
  /** ISO time the bundle was built. */
  at: string;
}

export interface GameEvent {
  name: string;
  map: string;
  icon: string;
  start: number;
  end: number;
}

export const RARITY_NAME: Record<Rarity, string> = { c: "Common", u: "Uncommon", r: "Rare", e: "Epic", l: "Legendary", a: "Amplified", "": "—" };

export function rarityCode(label: unknown): Rarity {
  switch (String(label ?? "").toLowerCase()) {
    case "common":
      return "c";
    case "uncommon":
      return "u";
    case "rare":
      return "r";
    case "epic":
      return "e";
    case "legendary":
      return "l";
    case "amplified":
      return "a";
    default:
      return "";
  }
}

/** Item types you carry into raids rather than sell by the pound. */
export const GEAR_TYPES = new Set(["Weapon", "Quick Use", "Ammunition", "Shield", "Augment", "Modification", "Key", "Blueprint"]);
