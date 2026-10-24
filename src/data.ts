import type { IconName } from "./icons.js";

export type Rarity = "c" | "u" | "r" | "e" | "l" | "";

export interface Item {
  name: string;
  rarity: Rarity;
  icon: IconName;
  where: string;
}

export interface Station {
  id: string;
  name: string;
  max: number;
  icon: IconName;
}

export interface Goal {
  id: string;
  title: string;
  /** Station whose level completes this goal. */
  st?: string;
  lv?: number;
  /** Flag that completes this goal when there is no station. */
  done?: string;
  /** Checkboxes that must be ticked before it can be built. */
  flags?: string[];
  /** Flag that must be set before this goal unlocks. */
  needs?: string;
  /** Never completes; a standing stockpile. */
  ever?: boolean;
  req: [item: string, count: number][];
}

const item = (name: string, rarity: Rarity, icon: IconName, where: string): Item => ({ name, rarity, icon, where });

/** Tracked items, keyed by MetaForge item id so live data (icons, loot areas) lines up. */
export const ITEMS: Record<string, Item> = {
  fabric: item("Fabric", "c", "cloth", "Residential and medical loot. Scrappy brings some back too."),
  "arc-alloy": item("ARC Alloy", "u", "ingot", "Wasps and Hornets. Recycle spare Hornet Drivers for 2 each."),
  toaster: item("Toaster", "r", "toaster", "Kitchen cabinets: Ruby Residences (Dam), Grandioso Apartments (Buried City)."),
  "arc-motion-core": item("ARC Motion Core", "r", "chip", "Larger ARC wrecks and Harvester Payload debris."),
  "fireball-burner": item("Fireball Burner", "u", "flame", "Destroy Fireballs, the rolling flame ARC."),
  "power-cable": item("Power Cable", "r", "cable", "Electrical zones. Power Generation Complex on Dam."),
  "electrical-components": item("Electrical Components", "u", "pcb", "Craft at Refiner I, or recycle tech junk."),
  "hornet-driver": item("Hornet Driver", "r", "drone", "Hornets. Shoot the rear thrusters."),
  "damaged-heat-sink": item("Damaged Heat Sink", "r", "fins", "Electrical and tech loot. Turn on Track Resources in game."),
  "snitch-scanner": item("Snitch Scanner", "u", "eye", "Loot every Snitch you shoot down."),
  "synthesized-fuel": item("Synthesized Fuel", "r", "can", "Fireflies drop it."),
  "crude-explosives": item("Crude Explosives", "u", "tnt", "Craft at Refiner I. Pops drop it too."),
  "pop-trigger": item("Pop Trigger", "u", "pin", "Destroy Pops, the small rolling ARC."),
  "rusted-gear": item("Rusted Gear", "r", "gear", "Mechanical loot zones."),
  "advanced-mechanical-components": item("Adv. Mechanical Components", "r", "gear", "Refiner II: 2 Steel Springs + 2 Mechanical Components."),
  "sentinel-part": item("Sentinel Firing Core", "r", "cross", "Sentinels at the Breach and R&A (Dam), or Courier wrecks."),
  planks: item("Planks", "c", "planks", "Buy from Celeste, or loot industrial areas."),
  "sheet-metal": item("Sheet Metal", "c", "plate", "Residential and commercial areas, best on Pendola Pass."),
  "advanced-electrical-components": item("Adv. Electrical Components", "r", "pcb", "Refiner II: 3 Wires + 2 Electrical Components."),
  "mini-pump": item("Mini Pump", "u", "pump", "Tech lockers. Blue Gate Control Room locker is the best bet."),
  "battered-paperback": item("Battered Paperback", "c", "book", "Observatory and Fallen Emperor (Pendola), Grandioso (Buried City)."),
  "arc-insulated-coupler": item("ARC Insulated Coupler", "e", "coupler", "Harvester Payload, the big central container. Redirection only."),
  "arc-conductive-coupler": item("ARC Conductive Coupler", "e", "coupler", "Harvester Payload, the big central container. Redirection only."),
  "arc-plated-coupler": item("ARC Plated Coupler", "e", "coupler", "Harvester Payload, the big central container. Redirection only."),
  "simple-gun-parts": item("Simple Gun Parts", "u", "bolt", "Wasps and Hornets, Celeste for seeds, or recycle spare guns."),
  "mechanical-components": item("Mechanical Components", "u", "gear", "Craft at Refiner I: 7 Metal + 3 Rubber."),
  spring: item("Steel Spring", "u", "spring", "Mechanical loot zones."),
  "wires-recipe": item("Wires", "u", "wires", "Power Generation Complex (Dam). Recycle Fried Motherboards for 15."),
};

/** Item ids used before the switch to MetaForge ids; old saves and backups are remapped on load. */
export const LEGACY_IDS: Record<string, string> = {
  arc_alloy: "arc-alloy",
  arc_motion_core: "arc-motion-core",
  fireball_burner: "fireball-burner",
  power_cable: "power-cable",
  elec_comp: "electrical-components",
  hornet_driver: "hornet-driver",
  heat_sink: "damaged-heat-sink",
  snitch_scanner: "snitch-scanner",
  synth_fuel: "synthesized-fuel",
  crude_expl: "crude-explosives",
  pop_trigger: "pop-trigger",
  rusted_gear: "rusted-gear",
  adv_mech: "advanced-mechanical-components",
  sentinel_core: "sentinel-part",
  sheet_metal: "sheet-metal",
  adv_elec: "advanced-electrical-components",
  mini_pump: "mini-pump",
  paperback: "battered-paperback",
  coupler_ins: "arc-insulated-coupler",
  coupler_con: "arc-conductive-coupler",
  coupler_pla: "arc-plated-coupler",
  simple_gp: "simple-gun-parts",
  mech_comp: "mechanical-components",
  steel_spring: "spring",
  wires: "wires-recipe",
};

export const RARITY_NAME: Record<Rarity, string> = { c: "Common", u: "Uncommon", r: "Rare", e: "Epic", l: "Legendary", "": "Other" };
export const RARITY_COLOR: Record<Rarity, string> = { c: "var(--r-c)", u: "var(--r-u)", r: "var(--r-r)", e: "var(--r-e)", l: "var(--r-l)", "": "var(--r-x)" };

/** MetaForge rarity label to our short code. */
export function rarityCode(label: string | null | undefined): Rarity {
  switch ((label ?? "").toLowerCase()) {
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
    default:
      return "";
  }
}

export const STATIONS: Station[] = [
  { id: "workbench", name: "Workbench", max: 3, icon: "hammer" },
  { id: "gunsmith", name: "Gunsmith", max: 4, icon: "rifle" },
  { id: "gear", name: "Gear Bench", max: 3, icon: "shield" },
  { id: "medical", name: "Medical", max: 3, icon: "med" },
  { id: "explosives", name: "Explosives", max: 3, icon: "bomb" },
  { id: "utility", name: "Utility", max: 3, icon: "wrench" },
  { id: "refiner", name: "Refiner", max: 3, icon: "flask" },
  { id: "research", name: "Research", max: 4, icon: "atom" },
];

export const FLAGS: Record<string, string> = {
  retreat_photo: "Homestead photo",
  retreat_dmg: "ARC damage at site",
  conduit_bp: "Learn blueprint",
};

/** Flags that mark a project itself complete (Goal.done). */
export const PROJECT_FLAGS: Record<string, string> = {
  outpost: "Sheltered Retreat built",
  conduit: "Emperor Key made",
};

export const MAPS = ["Dam", "Buried City", "Spaceport", "Blue Gate", "Stella Montis", "Pendola Pass"];

export const GOALS: Goal[] = [
  { id: "med1", title: "Medical Lab", st: "medical", lv: 1, req: [["fabric", 50], ["arc-alloy", 6]] },
  { id: "ref2", title: "Refiner II", st: "refiner", lv: 2, req: [["toaster", 3], ["arc-motion-core", 5], ["fireball-burner", 8]] },
  { id: "retreat", title: "Sheltered Retreat", done: "outpost", flags: ["retreat_photo", "retreat_dmg"], req: [["planks", 3], ["sheet-metal", 5], ["arc-alloy", 10], ["advanced-electrical-components", 3]] },
  { id: "gear2", title: "Gear Bench II", st: "gear", lv: 2, req: [["power-cable", 3], ["electrical-components", 5], ["hornet-driver", 5]] },
  { id: "util2", title: "Utility II", st: "utility", lv: 2, req: [["damaged-heat-sink", 2], ["electrical-components", 5], ["snitch-scanner", 6]] },
  { id: "expl2", title: "Explosives II", st: "explosives", lv: 2, req: [["synthesized-fuel", 3], ["crude-explosives", 5], ["pop-trigger", 5]] },
  { id: "rs1", title: "Research Station I", st: "research", lv: 1, needs: "outpost", req: [["mini-pump", 3], ["planks", 35], ["battered-paperback", 5]] },
  { id: "gun3", title: "Gunsmith III", st: "gunsmith", lv: 3, req: [["rusted-gear", 3], ["advanced-mechanical-components", 5], ["sentinel-part", 4]] },
  { id: "conduit", title: "Emperor Key", done: "conduit", flags: ["conduit_bp"], req: [["arc-insulated-coupler", 1], ["arc-conductive-coupler", 1], ["arc-plated-coupler", 1]] },
  { id: "stock", title: "Stockpile", ever: true, req: [["simple-gun-parts", 20], ["mechanical-components", 10], ["spring", 10], ["wires-recipe", 15]] },
];
