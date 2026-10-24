import { useMemo, useState } from "react";
import { MAPS } from "../data";
import { itemOf, searchItems, useGame } from "../gamedata";
import { raidStats } from "../logic";
import { OUTCOMES, type Outcome } from "../state";
import { useLedger } from "../store";
import { useAdvice } from "../ui";
import { Empty, Ico, ItemLink, Kpis, Qty, ScreenHead, Search, Seg } from "../components/bits";

const LABEL: Record<Outcome, string> = { extracted: "Extracted", died: "Died", aborted: "Aborted" };

function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function Raids({ toast }: { toast: (msg: string) => void }) {
  const raids = useLedger((s) => s.raids);
  const removeRaid = useLedger((s) => s.removeRaid);
  const rows = useAdvice();
  const [shown, setShown] = useState(20);
  const short = useMemo(() => new Set(rows.filter((r) => r.short > 0).map((r) => r.id)), [rows]);
  const stats = raidStats(raids, short, MAPS);
  const best = [...stats.maps].filter((m) => m.useful > 0).sort((a, b) => b.useful / b.raids - a.useful / a.raids)[0];

  return (
    <>
      <ScreenHead code="08" title="Raids" sub="Log what you brought home. Extracted loot goes straight into your stash." />
      <LogRaid toast={toast} />

      {stats.total > 0 && (
        <>
          <Kpis
            items={[
              ["Raids", stats.total],
              ["Extract rate", `${Math.round(stats.rate * 100)}%`, `${stats.extracted} extracted`],
              ["Items home", stats.parts],
              ["Best map", best?.map ?? "—", best ? "for parts you still need" : undefined],
            ]}
          />
          {stats.maps.length > 1 && (
            <div className="mapbars">
              {stats.maps.map((m) => (
                <div key={m.map} className="mapbar">
                  <span>{m.map}</span>
                  <i>
                    <b style={{ width: `${Math.round((m.extracted / m.raids) * 100)}%` }} />
                  </i>
                  <em>
                    {m.extracted}/{m.raids}
                  </em>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {raids.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th>
                <th>Map</th>
                <th>Outcome</th>
                <th className="wide">Brought home</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {raids.slice(0, shown).map((r) => (
                <tr key={r.id}>
                  <td className="mono dim">{ago(r.at)}</td>
                  <td>
                    <b>{r.map}</b>
                    {r.note && <small className="note">{r.note}</small>}
                  </td>
                  <td>
                    <span className={`state o-${r.outcome}`}>{LABEL[r.outcome]}</span>
                  </td>
                  <td className="wide">
                    {r.items.length ? (
                      <span className="stacks compact">
                        {r.items.map((i) => (
                          <ItemLink key={i.id} id={i.id} n={i.n} compact />
                        ))}
                      </span>
                    ) : (
                      <span className="none">—</span>
                    )}
                  </td>
                  <td className="num">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        if (window.confirm(r.outcome === "extracted" ? "Delete this raid and take its items back out of your stash?" : "Delete this raid?")) removeRaid(r.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No raids logged">Your raid history and per-map stats show up here.</Empty>
      )}
      {raids.length > shown && (
        <button type="button" className="btn more" onClick={() => setShown((n) => n + 30)}>
          Show older raids
        </button>
      )}
    </>
  );
}

function LogRaid({ toast }: { toast: (msg: string) => void }) {
  const addRaid = useLedger((s) => s.addRaid);
  const last = useLedger((s) => s.raids[0]?.map);
  const { data, items: byId } = useGame();
  const rows = useAdvice();
  const [map, setMap] = useState(last ?? MAPS[0]);
  const [outcome, setOutcome] = useState<Outcome>("extracted");
  const [items, setItems] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");

  const wanted = useMemo(() => rows.filter((r) => r.short > 0).sort((a, b) => b.short - a.short).slice(0, 14), [rows]);
  const results = useMemo(() => (data ? searchItems(data.items, q, 8) : []), [data, q]);
  const set = (id: string, n: number) =>
    setItems((s) => {
      const next = { ...s, [id]: Math.max(0, n) };
      if (!next[id]) delete next[id];
      return next;
    });
  const picked = Object.entries(items);
  const total = picked.reduce((a, [, n]) => a + n, 0);

  const save = () => {
    addRaid({ at: new Date().toISOString(), map, outcome, items: picked.map(([id, n]) => ({ id, n })), note: note.trim() });
    toast(outcome === "extracted" && total ? `Raid logged. ${total} item${total === 1 ? "" : "s"} added to your stash.` : "Raid logged.");
    setItems({});
    setNote("");
    setQ("");
  };

  return (
    <section className="lograid" aria-label="Log a raid">
      <div className="lr-row">
        <span className="lbl">Map</span>
        <Seg label="Map" value={map} onChange={setMap} options={MAPS.map((m) => [m, m] as [string, string])} />
      </div>
      <div className="lr-row">
        <span className="lbl">Outcome</span>
        <Seg label="Outcome" value={outcome} onChange={setOutcome} options={OUTCOMES.map((o) => [o, LABEL[o]] as [Outcome, string])} />
        {outcome !== "extracted" && <span className="fine">Nothing is added to your stash for this raid.</span>}
      </div>
      <div className="lr-row stack">
        <span className="lbl">Loot{total ? ` · ${total}` : ""}</span>
        <div className="lr-loot">
          {picked.length > 0 && (
            <ul className="picked">
              {picked.map(([id, n]) => {
                const it = itemOf(byId, id);
                return (
                  <li key={id}>
                    <Ico item={it} size="s" />
                    <span className="nm">{it.name}</span>
                    <Qty value={n} onChange={(v) => set(id, v)} label={it.name} />
                  </li>
                );
              })}
            </ul>
          )}
          <div className="combo">
            <Search value={q} onChange={setQ} placeholder="Add any item" />
            {q.trim() && (
              <ul className="combo-list" role="listbox" aria-label="Matching items">
                {results.map((it) => (
                  <li key={it.id}>
                    <button type="button" onClick={() => (set(it.id, (items[it.id] ?? 0) + 1), setQ(""))}>
                      <Ico item={it} size="s" />
                      <span className="nm">{it.name}</span>
                      <em>+1</em>
                    </button>
                  </li>
                ))}
                {!results.length && <li className="none">No item by that name.</li>}
              </ul>
            )}
          </div>
          {wanted.length > 0 && (
            <div className="quickadd">
              <span className="fine">Still short. Click to add one:</span>
              {wanted.map((r) => (
                <button key={r.id} type="button" className="chipbtn" title={r.item.name} onClick={() => set(r.id, (items[r.id] ?? 0) + 1)}>
                  <Ico item={r.item} size="s" />
                  {items[r.id] ? <em>×{items[r.id]}</em> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="lr-row">
        <span className="lbl">Note</span>
        <input className="text" value={note} maxLength={500} placeholder="Optional" onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn hot" onClick={save}>
          Save raid
        </button>
      </div>
    </section>
  );
}
