import Anthropic from "@anthropic-ai/sdk";
import { FLAGS, GOALS, ITEMS, MAPS, PROJECT_FLAGS, STATIONS } from "../src/data.js";
import { have, level, needed, nextGoal, pct, raidStats, statusOf } from "../src/logic.js";
import {
  MAX_RAIDS,
  OUTCOMES,
  addToStash,
  count,
  maxLevel,
  newId,
  raidStashDelta,
  type Outcome,
  type Progress,
  type Raid,
  type RaidItem,
} from "../src/state.js";
import { searchCatalog, type CatalogItem } from "./catalog.js";

export type Mode = "ask" | "log";
export interface Turn {
  role: "user" | "assistant";
  text: string;
}
/** A ledger change, kept as a function so it can be replayed if another device saved first. */
export type Op = (p: Progress) => Progress;

// Haiku for quick raid logging, Sonnet for planning questions.
const MODEL: Record<Mode, string> = { log: "claude-haiku-5-5", ask: "claude-sonnet-5-5" };
const EFFORT: Record<Mode, "low" | "medium"> = { log: "low", ask: "medium" };
const MAX_STEPS = 6;

const SYSTEM = `You are the assistant inside Topside Ledger, one player's private ARC Raiders progress tracker. You help them remember and plan their progress: workshop station levels, upgrade jobs and projects, the parts they still need, and their raid history.

Each message includes a <ledger> snapshot. Treat it as the truth about the player's progress. Your general game knowledge may be out of date, so say when you are unsure and prefer the snapshot's "where" and "lootArea" hints.

Changing the ledger:
- Use the tools only when the player tells you something actually happened: they found, used, crafted, sold or recycled items, upgraded a station, ticked off a step, or finished a raid. For questions, just answer.
- When they describe a finished raid, call log_raid once with the map, the outcome and every item they brought home. Extracted raids add those items to the stash automatically, so do not also call adjust_stash for them. Died or aborted raids add nothing.
- Use item ids from the snapshot. For anything not listed there, call find_items first. Never invent ids.
- If amounts or items are unclear, ask a short question instead of guessing.
- After changing anything, confirm in a sentence what changed.

Style: short and practical. Plain sentences or a short list. Name items and maps the way the game does.`;

const itemList = { type: "array", items: { type: "object", properties: { id: { type: "string" }, count: { type: "integer" } }, required: ["id", "count"], additionalProperties: false } };

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "log_raid",
    description: "Record a finished raid. Extracted raids add the listed items to the stash.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        map: { type: "string", description: `Map name, one of: ${MAPS.join(", ")}` },
        outcome: { type: "string", enum: OUTCOMES },
        items: { ...itemList, description: "Items brought home, by item id. Empty if none." },
        note: { type: "string", description: "Short note in the player's words, or an empty string." },
      },
      required: ["map", "outcome", "items", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_raid",
    description: "Delete a raid from the log by id (from recentRaids), undoing its stash change.",
    strict: true,
    input_schema: { type: "object", properties: { raid_id: { type: "string" } }, required: ["raid_id"], additionalProperties: false },
  },
  {
    name: "adjust_stash",
    description: "Add or remove items outside a raid: crafting, using, selling, recycling, trading. Positive delta adds, negative removes.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        changes: {
          type: "array",
          items: { type: "object", properties: { id: { type: "string" }, delta: { type: "integer" } }, required: ["id", "delta"], additionalProperties: false },
        },
      },
      required: ["changes"],
      additionalProperties: false,
    },
  },
  {
    name: "set_stash",
    description: "Set the exact count of an item in the stash when the player states their total.",
    strict: true,
    input_schema: { type: "object", properties: { id: { type: "string" }, count: { type: "integer" } }, required: ["id", "count"], additionalProperties: false },
  },
  {
    name: "set_station_level",
    description: "Set a workshop station's level after the player upgrades it.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { station: { type: "string", enum: STATIONS.map((s) => s.id) }, level: { type: "integer" } },
      required: ["station", "level"],
      additionalProperties: false,
    },
  },
  {
    name: "set_flag",
    description: "Tick or untick a checklist step or mark a project complete.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { flag: { type: "string", enum: [...Object.keys(FLAGS), ...Object.keys(PROJECT_FLAGS)] }, on: { type: "boolean" } },
      required: ["flag", "on"],
      additionalProperties: false,
    },
  },
  {
    name: "find_items",
    description: "Search the full ARC Raiders item database by name. Returns ids to use with the other tools.",
    strict: true,
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
  },
];

function snapshot(p: Progress, catalog: CatalogItem[]) {
  const name = (id: string) => ITEMS[id]?.name ?? catalog.find((c) => c.id === id)?.name ?? id;
  const loot = (id: string) => catalog.find((c) => c.id === id)?.loot ?? "";
  const next = nextGoal(p);
  return JSON.stringify({
    stations: STATIONS.map((s) => ({ id: s.id, name: s.name, level: level(p, s.id), max: s.max })),
    jobs: GOALS.map((g) => ({
      title: g.title,
      status: statusOf(p, g, next),
      stocked: `${Math.round(pct(p, g) * 100)}%`,
      ...(g.st ? { completesWhen: `${g.st} reaches level ${g.lv}` } : g.done ? { completesWhen: `flag ${g.done}` } : {}),
      ...(g.needs ? { unlocksAfter: `flag ${g.needs}` } : {}),
      checklist: (g.flags ?? []).map((f) => ({ flag: f, label: FLAGS[f], done: !!p.flag[f] })),
      parts: g.req.map(([id, n]) => ({ id, have: have(p, id), need: n })),
    })),
    projectFlags: Object.entries(PROJECT_FLAGS).map(([flag, label]) => ({ flag, label, done: !!p.flag[flag] })),
    trackedItems: Object.entries(ITEMS).map(([id, it]) => ({
      id,
      name: it.name,
      have: have(p, id),
      stillNeeded: Math.max(0, needed(p, id) - have(p, id)),
      where: it.where,
      lootArea: loot(id),
    })),
    otherStash: Object.entries(p.inv)
      .filter(([id]) => !ITEMS[id])
      .map(([id, n]) => ({ id, name: name(id), have: n })),
    recentRaids: p.raids.slice(0, 15).map((r) => ({
      id: r.id,
      at: r.at.slice(0, 16).replace("T", " "),
      map: r.map,
      outcome: r.outcome,
      items: r.items.map((i) => `${i.n}x ${name(i.id)}`).join(", "),
      note: r.note,
    })),
    raidStats: raidStats(p),
  });
}

interface ToolOutcome {
  content: string;
  is_error?: boolean;
}

/** Runs one Claude turn (with tool calls) against `progress`. Returns the reply and the ledger changes it made. */
export async function runAssistant(opts: {
  mode: Mode;
  message: string;
  history: Turn[];
  progress: Progress;
  catalog: CatalogItem[];
  /** Injected in tests. */
  client?: Pick<Anthropic, "beta">;
}) {
  const { mode, message, history, catalog } = opts;
  let work = opts.progress;
  const ops: Op[] = [];
  const actions: string[] = [];
  const nameOf = (id: string) => ITEMS[id]?.name ?? catalog.find((c) => c.id === id)?.name ?? id;
  const known = (id: string) => !!ITEMS[id] || catalog.some((c) => c.id === id);
  const apply = (op: Op, action: string) => {
    work = op(work);
    ops.push(op);
    actions.push(action);
  };
  const ok = (data: unknown): ToolOutcome => ({ content: JSON.stringify({ ok: true, ...((data as object) ?? {}) }) });
  const err = (msg: string): ToolOutcome => ({ content: msg, is_error: true });

  function checkItems(list: unknown, key: "count" | "delta"): { items: RaidItem[]; signed: { id: string; d: number }[] } | string {
    if (!Array.isArray(list)) return "items must be a list";
    const unknown = list.map((x) => String((x as Record<string, unknown>)?.id ?? "")).filter((id) => !known(id));
    if (unknown.length) return `Unknown item ids: ${unknown.join(", ")}. Call find_items to get the right ids.`;
    const signed = list.map((x) => ({ id: String((x as Record<string, unknown>).id), d: Math.round(Number((x as Record<string, unknown>)[key]) || 0) })).filter((x) => x.d !== 0);
    return { items: signed.filter((x) => x.d > 0).map((x) => ({ id: x.id, n: x.d })), signed };
  }

  function exec(name: string, input: Record<string, unknown>): ToolOutcome {
    switch (name) {
      case "find_items": {
        const hits = searchCatalog(catalog, String(input.query ?? ""));
        const tracked = Object.entries(ITEMS)
          .filter(([, it]) => it.name.toLowerCase().includes(String(input.query ?? "").toLowerCase()))
          .map(([id, it]) => ({ id, name: it.name }));
        const seen = new Set<string>();
        const results = [...tracked, ...hits.map((h) => ({ id: h.id, name: h.name, rarity: h.rarity, type: h.type }))].filter((r) => !seen.has(r.id) && seen.add(r.id));
        return ok({ results: results.slice(0, 8) });
      }
      case "log_raid": {
        const outcome = OUTCOMES.includes(input.outcome as Outcome) ? (input.outcome as Outcome) : null;
        if (!outcome) return err("outcome must be extracted, died or aborted");
        const checked = checkItems(input.items, "count");
        if (typeof checked === "string") return err(checked);
        const typed = String(input.map ?? "").trim();
        const map = MAPS.find((m) => m.toLowerCase() === typed.toLowerCase()) ?? (typed.slice(0, 40) || "Unknown");
        const raid: Raid = { id: newId(), at: new Date().toISOString(), map, outcome, items: checked.items, note: String(input.note ?? "").slice(0, 500) };
        const parts = raid.items.reduce((a, i) => a + i.n, 0);
        apply(
          (p) => ({ ...p, raids: [raid, ...p.raids].slice(0, MAX_RAIDS), inv: addToStash(p.inv, raidStashDelta(raid)) }),
          `Logged raid: ${map}, ${outcome}${parts ? `, ${parts} item${parts === 1 ? "" : "s"}` : ""}`,
        );
        return ok({ raid_id: raid.id, stashAdded: outcome === "extracted" ? raid.items.map((i) => `${i.n}x ${nameOf(i.id)}`) : [] });
      }
      case "remove_raid": {
        const raid = work.raids.find((r) => r.id === input.raid_id);
        if (!raid) return err("No raid with that id in the log.");
        apply((p) => ({ ...p, raids: p.raids.filter((r) => r.id !== raid.id), inv: addToStash(p.inv, raidStashDelta(raid), -1) }), `Removed raid: ${raid.map}, ${raid.outcome}`);
        return ok({});
      }
      case "adjust_stash": {
        const checked = checkItems(input.changes, "delta");
        if (typeof checked === "string") return err(checked);
        if (!checked.signed.length) return err("No non-zero changes given.");
        apply(
          (p) => ({ ...p, inv: checked.signed.reduce((inv, c) => addToStash(inv, [{ id: c.id, n: Math.abs(c.d) }], c.d > 0 ? 1 : -1), p.inv) }),
          `Stash: ${checked.signed.map((c) => `${nameOf(c.id)} ${c.d > 0 ? "+" : "−"}${Math.abs(c.d)}`).join(", ")}`,
        );
        return ok({ now: Object.fromEntries(checked.signed.map((c) => [c.id, work.inv[c.id] ?? 0])) });
      }
      case "set_stash": {
        const id = String(input.id ?? "");
        if (!known(id)) return err(`Unknown item id ${id}. Call find_items first.`);
        const n = count(input.count);
        apply((p) => ({ ...p, inv: addToStash({ ...p.inv, [id]: 0 }, [{ id, n }]) }), `Stash: ${nameOf(id)} set to ${n}`);
        return ok({ now: n });
      }
      case "set_station_level": {
        const st = STATIONS.find((s) => s.id === input.station);
        if (!st) return err("Unknown station.");
        const lv = Math.min(count(input.level), maxLevel(st.id));
        apply((p) => ({ ...p, lvl: { ...p.lvl, [st.id]: lv } }), `${st.name} set to level ${lv}`);
        return ok({ now: lv });
      }
      case "set_flag": {
        const flag = String(input.flag ?? "");
        const label = FLAGS[flag] ?? PROJECT_FLAGS[flag];
        if (!label) return err("Unknown flag.");
        const on = input.on === true;
        apply((p) => ({ ...p, flag: { ...p.flag, [flag]: on } }), `${on ? "Ticked" : "Unticked"}: ${label}`);
        return ok({});
      }
      default:
        return err(`Unknown tool ${name}`);
    }
  }

  const parts = [`Today is ${new Date().toISOString().slice(0, 10)}.`, `<ledger>\n${snapshot(work, catalog)}\n</ledger>`];
  if (history.length) parts.push(`<earlier_chat>\n${history.map((t) => `${t.role === "user" ? "Player" : "Assistant"}: ${t.text}`).join("\n")}\n</earlier_chat>`);
  if (mode === "log") parts.push("The player is logging what just happened. Record it with the tools, then confirm in one or two sentences.");
  parts.push(`<player_message>\n${message}\n</player_message>`);

  const client = opts.client ?? new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: parts.join("\n\n") }];
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const base = {
      model: MODEL[mode],
      max_tokens: 16000,
      system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
      tools: TOOLS,
      output_config: { effort: EFFORT[mode] },
      messages,
    };
    // Server-side fallback re-runs a mistaken policy decline on another model (Sonnet on the Claude API only).
    const res =
      mode === "ask"
        ? await client.beta.messages.create({ ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
        : await client.beta.messages.create(base);

    if (res.stop_reason === "refusal") {
      reply = "I can't help with that one.";
      break;
    }
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) {
      reply = text;
      break;
    }
    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = uses.map((u) => ({
      type: "tool_result",
      tool_use_id: u.id,
      ...exec(u.name, (u.input ?? {}) as Record<string, unknown>),
    }));
    messages.push({ role: "user", content: results });
    reply = text;
  }

  return { reply: reply || (actions.length ? "Done." : "Sorry, I couldn't finish that. Try rephrasing?"), actions, ops };
}
