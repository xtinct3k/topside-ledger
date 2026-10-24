import { useMemo, useState } from "react";
import { RARITY_NAME, type Rarity } from "../game";
import { searchItems, useGame } from "../gamedata";
import { useStoredState } from "../hooks";
import { coins, recycleValue } from "../logic";
import { useLedger } from "../store";
import { useUi } from "../ui";
import { Empty, Ico, ScreenHead, Search, Stacks } from "../components/bits";

const PAGE = 120;
const RARITIES: Rarity[] = ["c", "u", "r", "e", "l", "a"];

export function Database() {
  const { data, items } = useGame();
  const inv = useLedger((s) => s.inv);
  const { open, item: selected } = useUi();
  const [q, setQ] = useState("");
  const [type, setType] = useStoredState("topside-ledger:dbType", "all");
  const [rarity, setRarity] = useStoredState<Rarity | "all">("topside-ledger:dbRarity", "all");
  const [sort, setSort] = useStoredState<"name" | "value">("topside-ledger:dbSort", "name");
  const [limit, setLimit] = useState(PAGE);

  const list = data?.items ?? [];
  const types = useMemo(() => [...new Set(list.map((i) => i.type).filter(Boolean))].sort(), [list]);
  const shown = useMemo(() => {
    const base = q.trim() ? searchItems(list, q, 400) : [...list];
    const out = base.filter((i) => (type === "all" || i.type === type) && (rarity === "all" || i.rarity === rarity));
    if (!q.trim() && sort === "value") out.sort((a, b) => b.value - a.value);
    return out;
  }, [list, q, type, rarity, sort]);

  if (!data) return null;
  return (
    <>
      <ScreenHead code="04" title="Database" sub={`All ${list.length.toLocaleString("en-US")} items: value, recipes, recycling, drops and traders.`} />
      <div className="bar">
        <div className="bar-l">
          <select className="select" value={type} onChange={(e) => (setType(e.target.value), setLimit(PAGE))} aria-label="Item type">
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className="select" value={rarity} onChange={(e) => (setRarity(e.target.value as Rarity | "all"), setLimit(PAGE))} aria-label="Rarity">
            <option value="all">All rarities</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_NAME[r]}
              </option>
            ))}
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as "name" | "value")} aria-label="Sort">
            <option value="name">A to Z</option>
            <option value="value">Most valuable</option>
          </select>
        </div>
        <div className="bar-r">
          <span className="fine">{shown.length.toLocaleString("en-US")} items</span>
          <Search value={q} onChange={(v) => (setQ(v), setLimit(PAGE))} placeholder="Search all items" />
        </div>
      </div>

      {shown.length ? (
        <>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Rarity</th>
                  <th className="num">Value</th>
                  <th className="wide">Recycles into</th>
                  <th className="num">Recycle ¢</th>
                  <th className="num">Have</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, limit).map((it) => {
                  const rv = recycleValue(it, items);
                  return (
                    <tr key={it.id} className={selected === it.id ? "sel" : ""} onClick={() => open(it.id)}>
                      <td>
                        <button type="button" className="cell-item" onClick={() => open(it.id)}>
                          <Ico item={it} />
                          <span>
                            <b>{it.name}</b>
                            <small>{[it.type, it.sub && it.sub !== it.type ? it.sub : ""].filter(Boolean).join(" · ") || "Item"}</small>
                          </span>
                        </button>
                      </td>
                      <td className={`rar r-${it.rarity || "x"}`}>{RARITY_NAME[it.rarity]}</td>
                      <td className="num">{it.value ? coins(it.value) : "—"}</td>
                      <td className="wide">
                        <Stacks list={it.recycle} compact />
                      </td>
                      <td className={`num ${rv > it.value ? "up" : ""}`}>{rv ? coins(rv) : "—"}</td>
                      <td className="num">{inv[it.id] || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shown.length > limit && (
            <button type="button" className="btn more" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, shown.length - limit)} more
            </button>
          )}
        </>
      ) : (
        <Empty title="No items found">Try another search or filter.</Empty>
      )}
    </>
  );
}
