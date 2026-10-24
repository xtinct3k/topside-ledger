import { itemOf, useGame } from "../gamedata";
import { useStoredState } from "../hooks";
import { coins } from "../logic";
import { useLedger } from "../store";
import { useUi } from "../ui";
import { Empty, Ico, ScreenHead, Seg } from "../components/bits";

export function Traders() {
  const { data, items } = useGame();
  const inv = useLedger((s) => s.inv);
  const { open, item: selected } = useUi();
  const [who, setWho] = useStoredState("topside-ledger:trader", "");

  if (!data) return null;
  const traders = data.traders;
  const t = traders.find((x) => x.name === who) ?? traders[0];

  return (
    <>
      <ScreenHead code="05" title="Traders" sub="What each trader stocks and what it costs." />
      {t ? (
        <>
          <div className="bar">
            <Seg label="Trader" value={t.name} onChange={setWho} options={traders.map((x) => [x.name, x.name, x.stock.length] as [string, string, number])} />
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Price</th>
                  <th className="num">Sells back for</th>
                  <th className="num">Have</th>
                </tr>
              </thead>
              <tbody>
                {t.stock.map((s) => {
                  const it = itemOf(items, s.id);
                  return (
                    <tr key={s.id} className={selected === s.id ? "sel" : ""} onClick={() => open(s.id)}>
                      <td>
                        <button type="button" className="cell-item" onClick={() => open(s.id)}>
                          <Ico item={it} />
                          <span>
                            <b>{it.name}</b>
                            <small>{it.type || "Item"}</small>
                          </span>
                        </button>
                      </td>
                      <td className="num">{s.price ? coins(s.price) : "—"}</td>
                      <td className="num dim">{it.value ? coins(it.value) : "—"}</td>
                      <td className="num">{inv[s.id] || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty title="No trader data">MetaForge didn't return trader stock.</Empty>
      )}
    </>
  );
}
