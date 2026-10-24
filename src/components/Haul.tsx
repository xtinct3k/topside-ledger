import { AnimatePresence, motion } from "framer-motion";
import { itemInfo, useCatalog } from "../catalog";
import { ITEMS } from "../data";
import { have, haulRows } from "../logic";
import { EASE } from "../motion";
import type { Progress } from "../store";
import { SectionHead } from "./SectionHead";
import { ItemArt } from "./Tile";

interface Props {
  p: Progress;
  q: string;
  setQ: (q: string) => void;
  hideDone: boolean;
  setHideDone: (v: boolean) => void;
  onOpen: (k: string) => void;
}

export function Haul({ p, q, setQ, hideDone, setHideDone, onOpen }: Props) {
  const byId = useCatalog((s) => s.byId);
  const all = haulRows(p);
  const term = q.trim().toLowerCase();
  const rows = all.filter((r) => (!hideDone || r.left > 0) && (!term || ITEMS[r.k].name.toLowerCase().includes(term)));

  return (
    <section className="sec" id="haul">
      <SectionHead num="03" title="Haul list" sub="Everything the unfinished jobs still need, biggest gaps first.">
        <div className="tools">
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
            </svg>
            <input type="search" placeholder="Find an item" aria-label="Find an item" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            <span className="sw" aria-hidden="true" />
            Hide collected
          </label>
        </div>
      </SectionHead>
      <div className="legend">
        <span><i style={{ background: "var(--r-c)" }} />Common</span>
        <span><i style={{ background: "var(--r-u)" }} />Uncommon</span>
        <span><i style={{ background: "var(--r-r)" }} />Rare</span>
        <span><i style={{ background: "var(--r-e)" }} />Epic</span>
        <span><i style={{ background: "var(--r-l)" }} />Legendary</span>
      </div>
      <motion.div className="haul" layout>
        <AnimatePresence mode="popLayout">
          {rows.map(({ k, n, left }) => {
            const it = itemInfo(k, byId);
            return (
              <motion.div
                key={k}
                layout
                className={`hcell ${left ? "" : "done"}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: left ? 1 : 0.6, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <button type="button" className={`tile ${it.rarity} ${left ? "" : "met"}`} aria-label={`${it.name}, ${left} missing`} onClick={() => onOpen(k)}>
                  <span className="bar">
                    <b style={{ width: `${Math.min(100, Math.round((have(p, k) / n) * 100))}%` }} />
                  </span>
                  <ItemArt info={it} />
                  <span className="ct">{left ? `−${left}` : "✓"}</span>
                </button>
                <div className="nm">{it.name}</div>
              </motion.div>
            );
          })}
          {!rows.length && (
            <motion.div key="empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <b>{all.length && !term ? "Fully stocked" : "Nothing found"}</b>
              {all.length && !term ? "Every part for the open jobs is in your stash." : term ? `No item matches “${q.trim()}”.` : "No open jobs need anything."}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
