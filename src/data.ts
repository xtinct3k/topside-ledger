// Static bits the live MetaForge data doesn't cover: save migration, raid maps, curated field notes.

/** Station ids and max levels, so saves can be checked without loading game data. Matches MetaForge's hideout. */
export const STATION_MAX: Record<string, number> = {
  scrappy: 6,
  "weapon-bench": 4,
  "equipment-bench": 3,
  "med-station": 3,
  "explosives-bench": 3,
  "utility-bench": 3,
  refiner: 3,
  "research-station": 4,
  outpost: 4,
};

/** Station ids used before the switch to MetaForge's hideout data. */
export const LEGACY_STATIONS: Record<string, string> = {
  gunsmith: "weapon-bench",
  gear: "equipment-bench",
  medical: "med-station",
  explosives: "explosives-bench",
  utility: "utility-bench",
  refiner: "refiner",
  research: "research-station",
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

/** Always-keep amounts for saves made before reserves existed (the old Stockpile job). */
export const DEFAULT_RESERVE: Record<string, number> = {
  "simple-gun-parts": 20,
  "mechanical-components": 10,
  spring: 10,
  "wires-recipe": 15,
};

export const MAPS = ["Dam", "Buried City", "Spaceport", "Blue Gate", "Stella Montis", "Pendola Pass", "Riven Tides"];

/** Hand-written farming tips, shown beside MetaForge's loot areas. */
export const TIPS: Record<string, string> = {
  fabric: "Residential and medical loot. Scrappy brings some back too.",
  "arc-alloy": "Wasps and Hornets. Recycle spare Hornet Drivers for 2 each.",
  toaster: "Kitchen cabinets: Ruby Residences (Dam), Grandioso Apartments (Buried City).",
  "arc-motion-core": "Larger ARC wrecks and Harvester Payload debris.",
  "fireball-burner": "Destroy Fireballs, the rolling flame ARC.",
  "power-cable": "Electrical zones. Power Generation Complex on Dam.",
  "electrical-components": "Craft at Refiner I, or recycle tech junk.",
  "hornet-driver": "Hornets. Shoot the rear thrusters.",
  "damaged-heat-sink": "Electrical and tech loot. Turn on Track Resources in game.",
  "snitch-scanner": "Loot every Snitch you shoot down.",
  "synthesized-fuel": "Fireflies drop it.",
  "crude-explosives": "Craft at Refiner I. Pops drop it too.",
  "pop-trigger": "Destroy Pops, the small rolling ARC.",
  "rusted-gear": "Mechanical loot zones.",
  "advanced-mechanical-components": "Refiner II: 2 Steel Springs + 2 Mechanical Components.",
  "sentinel-part": "Sentinels at the Breach and R&A (Dam), or Courier wrecks.",
  planks: "Buy from Celeste, or loot industrial areas.",
  "sheet-metal": "Residential and commercial areas, best on Pendola Pass.",
  "advanced-electrical-components": "Refiner II: 3 Wires + 2 Electrical Components.",
  "mini-pump": "Tech lockers. Blue Gate Control Room locker is the best bet.",
  "battered-paperback": "Observatory and Fallen Emperor (Pendola), Grandioso (Buried City).",
  "arc-insulated-coupler": "Harvester Payload, the big central container. Redirection only.",
  "arc-conductive-coupler": "Harvester Payload, the big central container. Redirection only.",
  "arc-plated-coupler": "Harvester Payload, the big central container. Redirection only.",
  "simple-gun-parts": "Wasps and Hornets, Celeste for seeds, or recycle spare guns.",
  "mechanical-components": "Craft at Refiner I: 7 Metal + 3 Rubber.",
  spring: "Mechanical loot zones.",
  "wires-recipe": "Power Generation Complex (Dam). Recycle Fried Motherboards for 15.",
};
