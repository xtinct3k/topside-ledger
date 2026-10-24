import { useMemo, useState } from "react";
import type { Quest } from "../game";
import { useGame } from "../gamedata";
import { useStoredState } from "../hooks";
import { questState, type QuestState } from "../logic";
import { useLedger } from "../store";
import { Empty, Kpis, ScreenHead, Search, Seg, Stacks } from "../components/bits";

type Filter = "available" | "locked" | "done" | "all";

const STATE_LABEL: Record<QuestState, string> = { done: "Done", locked: "Locked", ready: "Ready", open: "Open" };

/** How many quests deep each quest sits, so chains read in order. */
function depths(quests: Quest[]) {
  const byId = new Map(quests.map((q) => [q.id, q]));
  const memo = new Map<string, number>();
  const depth = (id: string, seen: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!;
    const q = byId.get(id);
    if (!q || seen.has(id)) return 0;
    seen.add(id);
    const d = q.prereq.length ? 1 + Math.max(...q.prereq.map((x) => depth(x, seen))) : 0;
    memo.set(id, d);
    return d;
  };
  quests.forEach((q) => depth(q.id, new Set()));
  return memo;
}

export function Quests({ toast }: { toast: (msg: string) => void }) {
  const { data, quests: byId } = useGame();
  const p = useLedger();
  const { toggleQuest, turnIn } = useLedger();
  const [filter, setFilter] = useStoredState<Filter>("topside-ledger:questFilter", "available");
  const [trader, setTrader] = useStoredState("topside-ledger:questTrader", "all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = data?.quests ?? [];
  const depth = useMemo(() => depths(list), [list]);
  const traders = useMemo(() => [...new Set(list.map((x) => x.trader).filter(Boolean))].sort(), [list]);
  const rows = list.map((x) => ({ q: x, st: questState(p, x) }));
  const match = (f: Filter, st: QuestState) => f === "all" || (f === "available" ? st === "open" || st === "ready" : st === f);
  const term = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => match(filter, r.st) && (trader === "all" || r.q.trader === trader) && (!term || `${r.q.name} ${r.q.objectives.join(" ")}`.toLowerCase().includes(term)))
    .sort((a, b) => (depth.get(a.q.id) ?? 0) - (depth.get(b.q.id) ?? 0) || a.q.trader.localeCompare(b.q.trader) || a.q.name.localeCompare(b.q.name));
  const done = rows.filter((r) => r.st === "done").length;
  const needItems = rows.filter((r) => r.st !== "done" && r.q.req.length).length;

  if (!data) return null;
  return (
    <>
      <ScreenHead code="03" title="Quests" sub="Every trader quest, what it asks for, what it pays, and what it unlocks." />
      <Kpis
        items={[
          ["Completed", `${done}/${list.length}`],
          ["Available", rows.filter((r) => r.st === "open" || r.st === "ready").length],
          ["Ready to turn in", rows.filter((r) => r.st === "ready").length, undefined, rows.some((r) => r.st === "ready") ? "hot" : undefined],
          ["Need items", needItems, "open quests that ask for items"],
        ]}
      />
      <div className="bar">
        <Seg
          label="Quest status"
          value={filter}
          onChange={setFilter}
          options={[
            ["available", "Available", rows.filter((r) => match("available", r.st)).length],
            ["locked", "Locked", rows.filter((r) => r.st === "locked").length],
            ["done", "Done", done],
            ["all", "All", rows.length],
          ]}
        />
        <div className="bar-r">
          <select className="select" value={trader} onChange={(e) => setTrader(e.target.value)} aria-label="Trader">
            <option value="all">All traders</option>
            {traders.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Search value={q} onChange={setQ} placeholder="Find a quest or objective" />
        </div>
      </div>

      {shown.length ? (
        <div className="tbl-wrap">
          <table className="tbl quests">
            <thead>
              <tr>
                <th>Quest</th>
                <th>Trader</th>
                <th>Hand in</th>
                <th className="wide">Rewards</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ q: x, st }) => {
                const isOpen = openId === x.id;
                return (
                  <QuestRow
                    key={x.id}
                    q={x}
                    st={st}
                    open={isOpen}
                    onToggle={() => setOpenId(isOpen ? null : x.id)}
                    prereqNames={x.prereq.map((id) => byId[id]?.name ?? id)}
                    unlocks={list.filter((y) => y.prereq.includes(x.id)).map((y) => y.name)}
                    onDone={() => toggleQuest(x.id)}
                    onTurnIn={() => {
                      turnIn(x.id, x.req.map(([id, n]) => ({ id, n })));
                      toast(`${x.name} turned in. Items taken out of your stash.`);
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No quests here">{filter === "available" ? "Nothing available with these filters. Mark earlier quests done to unlock more." : "Try another filter."}</Empty>
      )}
    </>
  );
}

interface RowProps {
  q: Quest;
  st: QuestState;
  open: boolean;
  onToggle: () => void;
  prereqNames: string[];
  unlocks: string[];
  onDone: () => void;
  onTurnIn: () => void;
}

function QuestRow({ q, st, open, onToggle, prereqNames, unlocks, onDone, onTurnIn }: RowProps) {
  const inv = useLedger((s) => s.inv);
  return (
    <>
      <tr className={`${open ? "sel" : ""} q-${st}`} onClick={onToggle}>
        <td>
          <button type="button" className="cell-q" aria-expanded={open} onClick={onToggle}>
            <span className="caret" aria-hidden="true">
              {open ? "▾" : "▸"}
            </span>
            <b>{q.name}</b>
          </button>
        </td>
        <td className="dim">{q.trader || "—"}</td>
        <td>
          <Stacks list={q.req} inv={st === "done" ? undefined : inv} compact />
        </td>
        <td className="wide">
          <Stacks list={q.rewards} compact />
        </td>
        <td>
          <span className={`state s-${st}`}>{STATE_LABEL[st]}</span>
        </td>
      </tr>
      {open && (
        <tr className="q-detail">
          <td colSpan={5}>
            <div className="q-body">
              <div>
                {q.desc && <p className="desc">{q.desc}</p>}
                <h4>Objectives</h4>
                <ol className="objs">
                  {q.objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>
                {prereqNames.length > 0 && <p className="fine">After: {prereqNames.join(", ")}</p>}
                {unlocks.length > 0 && <p className="fine">Unlocks: {unlocks.join(", ")}</p>}
              </div>
              <div>
                {q.req.length > 0 && (
                  <>
                    <h4>Hand in</h4>
                    <Stacks list={q.req} inv={inv} />
                  </>
                )}
                {q.rewards.length > 0 && (
                  <>
                    <h4>Rewards</h4>
                    <Stacks list={q.rewards} />
                  </>
                )}
                <div className="q-acts">
                  {st === "ready" && (
                    <button type="button" className="btn hot" onClick={onTurnIn}>
                      Turn in
                    </button>
                  )}
                  <button type="button" className="btn" onClick={onDone}>
                    {st === "done" ? "Mark not done" : "Mark done"}
                  </button>
                  {q.guide && (
                    <a className="btn ghost" href={`https://metaforge.app${q.guide}`} target="_blank" rel="noreferrer">
                      Guide ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
