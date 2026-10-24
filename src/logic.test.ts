// Advisor and save-migration checks. Run with `npm test`; no network.
import assert from "node:assert/strict";
import { unknownItem } from "./gamedata.js";
import type { Item, Quest, Station } from "./game.js";
import { advise, levelState, needsIndex, questState, type Plan } from "./logic.js";
import { emptyProgress, sanitize } from "./state.js";

const item = (id: string, over: Partial<Item> = {}): Item => ({ ...unknownItem(id), name: id, type: "Recyclable", ...over });
const items: Record<string, Item> = Object.fromEntries(
  [
    item("gear", { value: 300, recycle: [["mech", 2]] }),
    item("mech", { value: 640, type: "Refined Material" }),
    item("junk", { value: 1000, recycle: [["scrap", 1]] }),
    item("scrap", { value: 10, type: "Basic Material" }),
    item("toaster", { value: 400 }),
    item("rifle", { value: 5000, type: "Weapon" }),
  ].map((i) => [i.id, i]),
);
const stations: Station[] = [
  {
    id: "bench",
    name: "Bench",
    max: 2,
    levels: [
      { lv: 1, req: [["toaster", 2]], unlock: [], crafts: [] },
      { lv: 2, req: [["mech", 4]], unlock: [], crafts: [] },
    ],
  },
];
const quests: Quest[] = [
  { id: "q1", name: "First", trader: "Celeste", desc: "", objectives: [], req: [["toaster", 1]], rewards: [], prereq: [], xp: 0, image: "", guide: "", order: 0 },
  { id: "q2", name: "Second", trader: "Celeste", desc: "", objectives: [], req: [], rewards: [], prereq: ["q1"], xp: 0, image: "", guide: "", order: 0 },
];
const g = { stations, quests };
const all: Plan = { horizon: "all", quests: true };
const verdicts = (p: ReturnType<typeof emptyProgress>, plan = all) =>
  Object.fromEntries(advise(p, g, items, plan, unknownItem).map((r) => [r.id, r]));

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

test("needs add up station levels, quests and reserves", () => {
  const p = { ...emptyProgress(), reserve: { toaster: 1 } };
  const toaster = needsIndex(p, g, all).get("toaster")!;
  assert.deepEqual(toaster.map((n) => n.n), [2, 1, 1]);
  assert.equal(needsIndex(p, g, { horizon: "next", quests: false }).get("mech"), undefined, "level 2 is not next");
});

test("built levels and done quests stop counting", () => {
  const p = { ...emptyProgress(), lvl: { bench: 1 }, quest: { q1: true } };
  assert.equal(needsIndex(p, g, all).get("toaster"), undefined);
});

test("short when you have less than needed", () => {
  const r = verdicts({ ...emptyProgress(), inv: { toaster: 1 } }).toaster;
  assert.equal(r.verdict, "short");
  assert.equal(r.short, 2);
});

test("keep when everything is spoken for", () => {
  assert.equal(verdicts({ ...emptyProgress(), inv: { toaster: 3 } }).toaster.verdict, "keep");
});

test("recycle spare items whose parts you still need", () => {
  const r = verdicts({ ...emptyProgress(), inv: { gear: 5 } }).gear;
  assert.equal(r.verdict, "recycle");
  assert.equal(r.spareValue, 5 * 2 * 640);
});

test("recycle when parts are worth more than the item", () => {
  const p = { ...emptyProgress(), lvl: { bench: 2 }, inv: { gear: 1 } };
  assert.equal(verdicts(p).gear.verdict, "recycle");
});

test("sell when the item is worth more whole", () => {
  const r = verdicts({ ...emptyProgress(), inv: { junk: 2 } }).junk;
  assert.equal(r.verdict, "sell");
  assert.equal(r.spareValue, 2000);
});

test("loadout items are left to you", () => {
  assert.equal(verdicts({ ...emptyProgress(), inv: { rifle: 1 } }).rifle.verdict, "gear");
});

test("partly needed items keep some and sell the rest", () => {
  const r = verdicts({ ...emptyProgress(), inv: { toaster: 7 } }).toaster;
  assert.equal(r.keep, 3);
  assert.equal(r.spare, 4);
  assert.equal(r.verdict, "sell");
});

test("level and quest states", () => {
  const p = { ...emptyProgress(), inv: { toaster: 2 } };
  assert.equal(levelState(p, stations[0], stations[0].levels[0]), "ready");
  assert.equal(levelState(p, stations[0], stations[0].levels[1]), "short");
  assert.equal(questState(p, quests[0]), "ready");
  assert.equal(questState(p, quests[1]), "locked");
});

test("old saves migrate station ids and get the old stockpile as reserves", () => {
  const p = sanitize({ inv: { rusted_gear: 4 }, lvl: { gunsmith: 2, workbench: 1, medical: 9 }, flag: { outpost: true }, raids: [] });
  assert.deepEqual(p.inv, { "rusted-gear": 4 });
  assert.deepEqual(p.lvl, { "weapon-bench": 2, "med-station": 3 });
  assert.equal(p.reserve["simple-gun-parts"], 20);
  assert.deepEqual(p.quest, {});
});

test("new saves keep their own reserves", () => {
  assert.deepEqual(sanitize({ inv: {}, reserve: { fabric: 5 } }).reserve, { fabric: 5 });
});

console.log(`\n${passed} passed`);
