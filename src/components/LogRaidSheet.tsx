import { useMemo, useState } from "react";
import { itemInfo, searchItems, useCatalog } from "../catalog";
import { MAPS } from "../data";
import { haulRows } from "../logic";
import { OUTCOMES, type Outcome } from "../state";
import { useLedger, type Progress } from "../store";
import { Drawer } from "./Drawer";
import { ItemArt } from "./Tile";

interface Props {
  p: Progress;
  desktop: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

const LABEL: Record<Outcome, string> = { extracted: "Extracted", died: "Died", aborted: "Aborted" };

export function LogRaidSheet({ p, desktop, onClose, onSaved }: Props) {
  const addRaid = useLedger((s) => s.addRaid);
  const { byId, list } = useCatalog();
  const [map, setMap] = useState(p.raids[0]?.map ?? MAPS[0]);
  const [outcome, setOutcome] = useState<Outcome>("extracted");
  const [items, setItems] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");

  const wanted = useMemo(() => haulRows(p).filter((r) => r.left > 0).slice(0, 18), [p]);
  const results = useMemo(() => searchItems(q, byId, list), [q, byId, list]);
  const bump = (id: string, d: number) =>
    setItems((s) => {
      const n = Math.max(0, (s[id] ?? 0) + d);
      const next = { ...s, [id]: n };
      if (!n) delete next[id];
      return next;
    });
  const picked = Object.entries(items);
  const total = picked.reduce((a, [, n]) => a + n, 0);

  const save = () => {
    addRaid({ at: new Date().toISOString(), map: map.trim() || "Unknown", outcome, items: picked.map(([id, n]) => ({ id, n })), note: note.trim() });
    onSaved(outcome === "extracted" && total ? `Raid logged. ${total} item${total === 1 ? "" : "s"} added to your stash.` : "Raid logged.");
    onClose();
  };

  return (
    <Drawer desktop={desktop} labelledBy="lrT" onClose={onClose} wide>
      <div className="sheet-title">
        <span className="k">After the raid</span>
        <h3 id="lrT">Log raid</h3>
      </div>

      <div className="field">
        <span className="k">Map</span>
        <div className="chips">
          {MAPS.map((m) => (
            <button key={m} type="button" className={`chip pick ${map === m ? "on" : ""}`} aria-pressed={map === m} onClick={() => setMap(m)}>
              {m}
            </button>
          ))}
        </div>
        {!MAPS.includes(map) && <input className="text" value={map} onChange={(e) => setMap(e.target.value)} aria-label="Map name" />}
        {MAPS.includes(map) && (
          <button type="button" className="link" onClick={() => setMap("")}>
            Other map…
          </button>
        )}
      </div>

      <div className="field">
        <span className="k">Outcome</span>
        <div className="seg full" role="group" aria-label="Outcome">
          {OUTCOMES.map((o) => (
            <button key={o} type="button" className={outcome === o ? "on" : ""} aria-pressed={outcome === o} onClick={() => setOutcome(o)}>
              {LABEL[o]}
            </button>
          ))}
        </div>
        {outcome !== "extracted" && <p className="hint">Nothing is added to your stash for this raid. Still worth logging for your stats.</p>}
      </div>

      <div className="field">
        <span className="k">Brought home{total ? ` · ${total}` : ""}</span>
        {picked.length > 0 && (
          <ul className="picked">
            {picked.map(([id, n]) => {
              const info = itemInfo(id, byId);
              return (
                <li key={id}>
                  <span className={`tile xs ${info.rarity}`}>
                    <ItemArt info={info} />
                  </span>
                  <span className="pn">{info.name}</span>
                  <span className="mini-step">
                    <button type="button" className="mini" aria-label={`One less ${info.name}`} onClick={() => bump(id, -1)}>
                      −
                    </button>
                    <b>{n}</b>
                    <button type="button" className="mini" aria-label={`One more ${info.name}`} onClick={() => bump(id, 1)}>
                      +
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <label className="search full">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input type="search" placeholder="Search any item" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search any item" autoComplete="off" data-autofocus />
        </label>
        {q ? (
          <div className="results">
            {results.map((r) => (
              <button key={r.id} type="button" className="result" onClick={() => bump(r.id, 1)}>
                <span className={`tile xs ${r.rarity}`}>
                  <ItemArt info={r} />
                </span>
                <span className="pn">{r.name}</span>
                <span className="add">+1</span>
              </button>
            ))}
            {!results.length && <p className="hint">{list.length ? "No item by that name." : "Item database still loading."}</p>}
          </div>
        ) : (
          wanted.length > 0 && (
            <>
              <p className="hint">Still needed. Tap to add one.</p>
              <div className="tiles sm">
                {wanted.map((r) => {
                  const info = itemInfo(r.k, byId);
                  return (
                    <button key={r.k} type="button" className={`tile ${info.rarity}`} title={info.name} aria-label={`Add ${info.name}`} onClick={() => bump(r.k, 1)}>
                      <ItemArt info={info} />
                      {items[r.k] ? <span className="ct">×{items[r.k]}</span> : null}
                    </button>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>

      <label className="field">
        <span className="k">Note</span>
        <textarea className="text" rows={2} value={note} maxLength={500} placeholder="Optional: what happened, where you found things" onChange={(e) => setNote(e.target.value)} />
      </label>

      <button type="button" className="act primary block" onClick={save} disabled={!map.trim()}>
        Save raid
      </button>
    </Drawer>
  );
}
