import { useMemo, useState } from "react";
import { searchItems, useGame } from "../gamedata";
import { useStoredState } from "../hooks";
import { coins, levelState, questState, type Row, type Verdict } from "../logic";
import { useLedger } from "../store";
import { useAdvice, useUi } from "../ui";
import { Empty, Ico, Kpis, Qty, ScreenHead, Search, Seg, Tag } from "../components/bits";

type Filter = "all" | Verdict;
type SortKey = "advice" | "name" | "have" | "need" | "spare" | "value";

const ORDER: Record<Verdict, number> = { short: 0, recycle: 1, sell: 2, keep: 3, gear: 4 };

const SORTS: Record<SortKey, (a: Row, b: Row) => number> = {
  // Things you hold first, so the sell/keep calls lead and the shopping list follows.
  advice: (a, b) => Number(b.have > 0) - Number(a.have > 0) || ORDER[a.verdict] - ORDER[b.verdict] || b.spareValue - a.spareValue || b.short - a.short || a.item.name.localeCompare(b.item.name),
  name: (a, b) => a.item.name.localeCompare(b.item.name),
  have: (a, b) => b.have - a.have,
  need: (a, b) => b.need - a.need,
  spare: (a, b) => b.spare - a.spare,
  value: (a, b) => b.spareValue - a.spareValue || b.item.value - a.item.value,
};

export function Stash() {
  const rows = useAdvice();
  const data = useGame((s) => s.data);
  const p = useLedger();
  const setInv = useLedger((s) => s.setInv);
  const { plan, setPlan, open, item: selected } = useUi();
  const [filter, setFilter] = useStoredState<Filter>("topside-ledger:stashFilter", "all");
  const [sort, setSort] = useStoredState<SortKey>("topside-ledger:stashSort", "advice");
  const [q, setQ] = useState("");
  const [add, setAdd] = useState("");

  const count = (v: Filter) => (v === "all" ? rows.length : rows.filter((r) => r.verdict === v).length);
  const term = q.trim().toLowerCase();
  const shown = useMemo(
    () => rows.filter((r) => (filter === "all" || r.verdict === filter) && (!term || r.item.name.toLowerCase().includes(term))).sort(SORTS[sort]),
    [rows, filter, term, sort],
  );
  const results = useMemo(() => (data ? searchItems(data.items, add, 8) : []), [data, add]);

  const held = rows.filter((r) => r.have > 0);
  const units = held.reduce((a, r) => a + r.have, 0);
  const worth = held.reduce((a, r) => a + r.have * r.item.value, 0);
  const spare = rows.filter((r) => r.verdict === "sell" || r.verdict === "recycle").reduce((a, r) => a + r.spareValue, 0);
  const short = rows.filter((r) => r.verdict === "short");
  const ready = data ? data.stations.filter((s) => s.levels.some((L) => levelState(p, s, L) === "ready" && L.lv === (p.lvl[s.id] ?? 0) + 1)).length + data.quests.filter((x) => questState(p, x) === "ready").length : 0;

  const head = (k: SortKey, label: string, cls = "") => (
    <th className={cls} aria-sort={sort === k ? "descending" : "none"}>
      <button type="button" className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
        {label}
      </button>
    </th>
  );

  return (
    <>
      <ScreenHead code="01" title="Stash" sub="What to keep, sell, recycle and still go and find.">
        <Seg
          label="Plan horizon"
          value={plan.horizon}
          onChange={(horizon) => setPlan({ horizon })}
          options={[
            ["next", "Next level"],
            ["all", "All levels"],
          ]}
        />
        <label className="check">
          <input type="checkbox" checked={plan.quests} onChange={(e) => setPlan({ quests: e.target.checked })} />
          <span aria-hidden="true" />
          Count quests
        </label>
      </ScreenHead>

      <Kpis
        items={[
          ["Held", units.toLocaleString("en-US"), `${held.length} kinds`],
          ["Stash value", coins(worth)],
          ["Spare value", coins(spare), "sell + recycle", spare ? "hot" : undefined],
          ["Short", short.length, `${short.reduce((a, r) => a + r.short, 0)} units to find`, short.length ? "warn" : undefined],
          ["Ready to build", ready, "levels + quests"],
        ]}
      />

      <div className="bar">
        <Seg
          label="Filter by advice"
          value={filter}
          onChange={setFilter}
          options={[
            ["all", "All", count("all")],
            ["short", "Short", count("short")],
            ["recycle", "Recycle", count("recycle")],
            ["sell", "Sell", count("sell")],
            ["keep", "Keep", count("keep")],
            ["gear", "Gear", count("gear")],
          ]}
        />
        <div className="bar-r">
          <Search value={q} onChange={setQ} placeholder="Filter stash" />
          <div className="combo">
            <Search value={add} onChange={setAdd} placeholder="Add item to stash" />
            {add.trim() && (
              <ul className="combo-list" role="listbox" aria-label="Matching items">
                {results.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setInv(it.id, (p.inv[it.id] ?? 0) + 1);
                        open(it.id);
                        setAdd("");
                      }}
                    >
                      <Ico item={it} size="s" />
                      <span className="nm">{it.name}</span>
                      <em>{p.inv[it.id] ? `have ${p.inv[it.id]}` : "+1"}</em>
                    </button>
                  </li>
                ))}
                {!results.length && <li className="none">No item by that name.</li>}
              </ul>
            )}
          </div>
        </div>
      </div>

      {shown.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {head("name", "Item")}
                {head("have", "Have", "num")}
                {head("need", "Need", "num")}
                {head("spare", "Spare", "num")}
                {head("value", "Spare ¢", "num")}
                {head("advice", "Advice")}
                <th className="wide">Why</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`${selected === r.id ? "sel" : ""} row-${r.verdict}`} onClick={() => open(r.id)}>
                  <td>
                    <button type="button" className="cell-item" onClick={() => open(r.id)}>
                      <Ico item={r.item} />
                      <span>
                        <b>{r.item.name}</b>
                        <small>{r.item.type || "Item"}</small>
                      </span>
                    </button>
                  </td>
                  <td className="num">
                    <Qty value={r.have} onChange={(n) => setInv(r.id, n)} label={`${r.item.name} in stash`} />
                  </td>
                  <td className="num">{r.need || "—"}</td>
                  <td className={`num ${r.short ? "miss" : ""}`}>{r.short ? `−${r.short}` : r.spare || "—"}</td>
                  <td className="num">{r.spareValue ? coins(r.spareValue) : "—"}</td>
                  <td>
                    <Tag v={r.verdict} />
                  </td>
                  <td className="wide why">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={rows.length ? "Nothing matches" : data ? "Stash empty" : "Loading game data"}>
          {rows.length ? "Try another filter or search." : "Add items with the box above, or log a raid. Everything your upgrades and quests need will show up here as Short."}
        </Empty>
      )}
    </>
  );
}
