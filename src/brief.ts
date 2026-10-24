import type { GameData } from "./game.js";
import { coins, level, levelState, questState, roman, type Plan, type Row } from "./logic.js";
import type { Progress } from "./state.js";

/** Plain-text snapshot to paste into a Claude chat, so questions get answered against real numbers. */
export function brief(p: Progress, g: GameData, rows: Row[], plan: Plan): string {
  const name = (id: string) => g.items.find((i) => i.id === id)?.name ?? id;
  const lines: string[] = [];
  lines.push("My ARC Raiders progress (from Topside Ledger, game data from MetaForge). Use these numbers when you answer.", "");

  lines.push("## Workshop");
  for (const s of g.stations) {
    const lv = level(p, s.id);
    const next = s.levels.find((L) => L.lv === lv + 1);
    const need = next ? ` · next ${roman(next.lv)} (${levelState(p, s, next)}): ${next.req.map(([id, n]) => `${name(id)} ${p.inv[id] ?? 0}/${n}`).join(", ") || "no items"}` : " · maxed";
    lines.push(`- ${s.name}: level ${lv}/${s.max}${need}`);
  }

  const qs = g.quests.map((q) => ({ q, st: questState(p, q) }));
  lines.push("", `## Quests: ${qs.filter((x) => x.st === "done").length}/${g.quests.length} done`);
  const open = qs.filter((x) => x.st === "open" || x.st === "ready");
  if (open.length) lines.push(`Available: ${open.map((x) => x.q.name).join(", ")}`);

  const by = (v: Row["verdict"]) => rows.filter((r) => r.verdict === v);
  const fmt = (r: Row, n: number) => `${r.item.name} ×${n}`;
  lines.push("", `## Advice (counting ${plan.horizon === "all" ? "every future station level" : "each station's next level"}${plan.quests ? " and unfinished quests" : ""})`);
  lines.push(`- Still need: ${by("short").map((r) => fmt(r, r.short)).join(", ") || "nothing"}`);
  lines.push(`- Sell: ${by("sell").map((r) => fmt(r, r.spare)).join(", ") || "nothing"}`);
  lines.push(`- Recycle: ${by("recycle").map((r) => fmt(r, r.spare)).join(", ") || "nothing"}`);
  lines.push(`- Spare value: ${coins([...by("sell"), ...by("recycle")].reduce((a, r) => a + r.spareValue, 0))}`);

  lines.push("", "## Full stash");
  const held = rows.filter((r) => r.have > 0).sort((a, b) => a.item.name.localeCompare(b.item.name));
  lines.push(held.map((r) => `${r.item.name} ${r.have}${r.need ? ` (need ${r.need})` : ""}`).join("; ") || "empty");
  const reserve = Object.entries(p.reserve);
  if (reserve.length) lines.push("", `Always keep: ${reserve.map(([id, n]) => `${name(id)} ${n}`).join(", ")}`);
  return lines.join("\n");
}
