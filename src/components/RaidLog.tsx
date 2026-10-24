import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { raidStats } from "../logic";
import { EASE } from "../motion";
import type { Raid } from "../state";
import { useLedger, type Progress } from "../store";
import { SectionHead } from "./SectionHead";
import { Tile } from "./Tile";

const OUTCOME_LABEL: Record<Raid["outcome"], string> = { extracted: "Extracted", died: "Died", aborted: "Aborted" };

function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

interface Props {
  p: Progress;
  onLog: () => void;
  onOpen: (k: string) => void;
}

export function RaidLog({ p, onLog, onOpen }: Props) {
  const removeRaid = useLedger((s) => s.removeRaid);
  const [shown, setShown] = useState(8);
  const stats = raidStats(p);
  const best = [...stats.maps].filter((m) => m.useful > 0).sort((a, b) => b.useful / b.raids - a.useful / a.raids)[0];

  return (
    <section className="sec" id="raids">
      <SectionHead num="04" title="Raid log" sub="What you brought home, and where it's been worth going.">
        <button type="button" className="act primary" onClick={onLog}>
          + Log raid
        </button>
      </SectionHead>

      {stats.total > 0 && (
        <div className="raid-stats">
          <div className="stat">
            <span className="k">Raids</span>
            <b>{stats.total}</b>
          </div>
          <div className="stat">
            <span className="k">Extracted</span>
            <b>
              {Math.round(stats.rate * 100)}
              <small>%</small>
            </b>
          </div>
          <div className="stat">
            <span className="k">Parts home</span>
            <b>{stats.parts}</b>
          </div>
          <div className="stat">
            <span className="k">Best map</span>
            <b className="txt">{best ? best.map : "—"}</b>
          </div>
        </div>
      )}

      {stats.maps.length > 1 && (
        <div className="map-bars">
          {stats.maps.map((m) => (
            <div key={m.map} className="map-bar">
              <span>{m.map}</span>
              <div className="prog">
                <motion.b initial={false} animate={{ width: `${Math.round((m.extracted / m.raids) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
              </div>
              <em>
                {m.extracted}/{m.raids}
              </em>
            </div>
          ))}
        </div>
      )}

      <motion.div className="raids" layout>
        <AnimatePresence mode="popLayout" initial={false}>
          {p.raids.slice(0, shown).map((r) => (
            <motion.article
              key={r.id}
              layout
              className={`raid o-${r.outcome}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="raid-h">
                <div>
                  <h3>{r.map}</h3>
                  <span className="when">{ago(r.at)}</span>
                </div>
                <span className={`pill ${r.outcome === "extracted" ? "ready" : r.outcome === "died" ? "locked" : "open"}`}>{OUTCOME_LABEL[r.outcome]}</span>
              </div>
              {r.items.length > 0 && (
                <div className="tiles sm">
                  {r.items.map((i) => (
                    <Tile key={i.id} k={i.id} have={i.n} badge={`×${i.n}`} onOpen={onOpen} />
                  ))}
                </div>
              )}
              {r.note && <p className="note">{r.note}</p>}
              <div className="job-f">
                <button
                  type="button"
                  className="act ghost"
                  onClick={() => {
                    if (window.confirm(r.outcome === "extracted" ? "Delete this raid and take its items back out of your stash?" : "Delete this raid?")) removeRaid(r.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
        {!p.raids.length && (
          <div className="empty">
            <b>No raids yet</b>
            After your next raid, log what you brought home, or just tell the assistant.
          </div>
        )}
      </motion.div>
      {p.raids.length > shown && (
        <button type="button" className="act more" onClick={() => setShown((n) => n + 12)}>
          Show older raids
        </button>
      )}
    </section>
  );
}
