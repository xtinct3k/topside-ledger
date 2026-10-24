import type { IconName } from "./icons";

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

export const ITEMS: Record<string, Item> = {
  fabric: item("Fabric", "c", "cloth", "Residential and medical loot. Scrappy brings some back too."),
  arc_alloy: item("ARC Alloy", "u", "ingot", "Wasps and Hornets. Recycle spare Hornet Drivers for 2 each."),
  toaster: item("Toaster", "r", "toaster", "Kitchen cabinets: Ruby Residences (Dam), Grandioso Apartments (Buried City)."),
  arc_motion_core: item("ARC Motion Core", "", "chip", "Larger ARC wrecks and Harvester Payload debris."),
  fireball_burner: item("Fireball Burner", "", "flame", "Destroy Fireballs, the rolling flame ARC."),
  power_cable: item("Power Cable", "r", "cable", "Electrical zones. Power Generation Complex on Dam."),
  elec_comp: item("Electrical Components", "u", "pcb", "Craft at Refiner I, or recycle tech junk."),
  hornet_driver: item("Hornet Driver", "r", "drone", "Hornets. Shoot the rear thrusters."),
  heat_sink: item("Damaged Heat Sink", "", "fins", "Electrical and tech loot. Turn on Track Resources in game."),
  snitch_scanner: item("Snitch Scanner", "", "eye", "Loot every Snitch you shoot down."),
  synth_fuel: item("Synthesized Fuel", "", "can", "Fireflies drop it."),
  crude_expl: item("Crude Explosives", "", "tnt", "Craft at Refiner I. Pops drop it too."),
  pop_trigger: item("Pop Trigger", "", "pin", "Destroy Pops, the small rolling ARC."),
  rusted_gear: item("Rusted Gear", "", "gear", "Mechanical loot zones."),
  adv_mech: item("Adv. Mechanical Components", "r", "gear", "Refiner II: 2 Steel Springs + 2 Mechanical Components."),
  sentinel_core: item("Sentinel Firing Core", "r", "cross", "Sentinels at the Breach and R&A (Dam), or Courier wrecks."),
  planks: item("Planks", "", "planks", "Buy from Celeste, or loot industrial areas."),
  sheet_metal: item("Sheet Metal", "", "plate", "Residential and commercial areas, best on Pendola Pass."),
  adv_elec: item("Adv. Electrical Components", "r", "pcb", "Refiner II: 3 Wires + 2 Electrical Components."),
  mini_pump: item("Mini Pump", "", "pump", "Tech lockers. Blue Gate Control Room locker is the best bet."),
  paperback: item("Battered Paperback", "c", "book", "Observatory and Fallen Emperor (Pendola), Grandioso (Buried City)."),
  coupler_ins: item("ARC Insulated Coupler", "", "coupler", "Harvester Payload, the big central container. Redirection only."),
  coupler_con: item("ARC Conductive Coupler", "", "coupler", "Harvester Payload, the big central container. Redirection only."),
  coupler_pla: item("ARC Plated Coupler", "", "coupler", "Harvester Payload, the big central container. Redirection only."),
  simple_gp: item("Simple Gun Parts", "u", "bolt", "Wasps and Hornets, Celeste for seeds, or recycle spare guns."),
  mech_comp: item("Mechanical Components", "u", "gear", "Craft at Refiner I: 7 Metal + 3 Rubber."),
  steel_spring: item("Steel Spring", "", "spring", "Mechanical loot zones."),
  wires: item("Wires", "u", "wires", "Power Generation Complex (Dam). Recycle Fried Motherboards for 15."),
};

export const RARITY_NAME: Record<Rarity, string> = { c: "Common", u: "Uncommon", r: "Rare", e: "Epic", l: "Legendary", "": "Rarity unconfirmed" };
export const RARITY_COLOR: Record<Rarity, string> = { c: "var(--r-c)", u: "var(--r-u)", r: "var(--r-r)", e: "var(--r-e)", l: "var(--r-l)", "": "var(--r-x)" };

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

export const GOALS: Goal[] = [
  { id: "med1", title: "Medical Lab", st: "medical", lv: 1, req: [["fabric", 50], ["arc_alloy", 6]] },
  { id: "ref2", title: "Refiner II", st: "refiner", lv: 2, req: [["toaster", 3], ["arc_motion_core", 5], ["fireball_burner", 8]] },
  { id: "retreat", title: "Sheltered Retreat", done: "outpost", flags: ["retreat_photo", "retreat_dmg"], req: [["planks", 3], ["sheet_metal", 5], ["arc_alloy", 10], ["adv_elec", 3]] },
  { id: "gear2", title: "Gear Bench II", st: "gear", lv: 2, req: [["power_cable", 3], ["elec_comp", 5], ["hornet_driver", 5]] },
  { id: "util2", title: "Utility II", st: "utility", lv: 2, req: [["heat_sink", 2], ["elec_comp", 5], ["snitch_scanner", 6]] },
  { id: "expl2", title: "Explosives II", st: "explosives", lv: 2, req: [["synth_fuel", 3], ["crude_expl", 5], ["pop_trigger", 5]] },
  { id: "rs1", title: "Research Station I", st: "research", lv: 1, needs: "outpost", req: [["mini_pump", 3], ["planks", 35], ["paperback", 5]] },
  { id: "gun3", title: "Gunsmith III", st: "gunsmith", lv: 3, req: [["rusted_gear", 3], ["adv_mech", 5], ["sentinel_core", 4]] },
  { id: "conduit", title: "Emperor Key", done: "conduit", flags: ["conduit_bp"], req: [["coupler_ins", 1], ["coupler_con", 1], ["coupler_pla", 1]] },
  { id: "stock", title: "Stockpile", ever: true, req: [["simple_gp", 20], ["mech_comp", 10], ["steel_spring", 10], ["wires", 15]] },
];
