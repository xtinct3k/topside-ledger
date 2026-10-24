import { motion } from "framer-motion";
import { FLAGS, GOALS, STATIONS, type Goal } from "../data";
import { flagOn, have, haulRows, isDone, level, pct } from "../logic";
import { EASE, rise, stagger } from "../motion";
import { useLedger, type Progress } from "../store";
import { Tile } from "./Tile";

const R = 52;
const C = 2 * Math.PI * R;

interface Props {
  p: Progress;
  next: Goal | undefined;
  onOpen: (k: string) => void;
}

export function Hero({ p, next, onOpen }: Props) {
  const toggleFlag = useLedger((s) => s.toggleFlag);
  const tracked = GOALS.filter((g) => !g.ever);
  const doneN = tracked.filter((g) => isDone(p, g)).length;
  const frac = doneN / tracked.length;

  const rows = haulRows(p);
  const totalNeed = rows.reduce((a, r) => a + r.n, 0);
  const stocked = totalNeed ? Math.round((rows.reduce((a, r) => a + Math.min(have(p, r.k), r.n), 0) / totalNeed) * 100) : 100;
  const lvSum = STATIONS.reduce((a, s) => a + level(p, s.id), 0);
  const lvMax = STATIONS.reduce((a, s) => a + s.max, 0);
  const left = rows.reduce((a, r) => a + r.left, 0);

  return (
    <motion.section className="hero" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="hero-copy" variants={stagger}>
        <motion.p className="eyebrow" variants={rise}>
          <span className="stripes" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          Raider workshop tracker
        </motion.p>
        <motion.h1 className="title" variants={rise}>
          <span>Topside</span>
          <span className="accent">Ledger</span>
        </motion.h1>
        <motion.p className="lede" variants={rise}>
          Every station upgrade, every project, every part you still have to drag back from topside. Tap any item to log what's in your stash.
        </motion.p>
        <motion.div className="stats" variants={rise}>
          <div className="stat">
            <span className="k">Stocked</span>
            <b>
              {stocked}
              <small>%</small>
            </b>
          </div>
          <div className="stat">
            <span className="k">Station levels</span>
            <b>
              {lvSum}
              <small>/{lvMax}</small>
            </b>
          </div>
          <div className="stat">
            <span className="k">Parts to haul</span>
            <b>{left}</b>
          </div>
        </motion.div>
      </motion.div>

      <motion.div className="hero-side" variants={stagger}>
        <motion.div className="gauge-card" variants={rise}>
          <svg className="gauge" viewBox="0 0 132 132" aria-hidden="true">
            <circle cx="66" cy="66" r={R} className="g-track" />
            <g transform="rotate(-90 66 66)">
              <motion.circle
                cx="66"
                cy="66"
                r={R}
                className="g-arc"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - frac), opacity: frac ? 1 : 0 }}
                transition={{ duration: 1, ease: EASE, delay: 0.3 }}
              />
            </g>
            <text x="66" y="72" textAnchor="middle" className="g-num">
              {doneN}
            </text>
            <text x="66" y="92" textAnchor="middle" className="g-of">
              OF {tracked.length}
            </text>
          </svg>
          <div className="g-lbl">
            <span>
              Jobs
              <br />
              done
            </span>
            <small>{tracked.length - doneN} to go</small>
          </div>
        </motion.div>

        <motion.div variants={rise}>
          {next ? (
            <div className="next-card">
              <div className="next-top">
                <span>Next up</span>
                <span>{Math.round(pct(p, next) * 100)}% stocked</span>
              </div>
              <h2>{next.title}</h2>
              <div className="next-bar">
                <motion.b initial={false} animate={{ width: `${Math.round(pct(p, next) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
              </div>
              <NextBody p={p} g={next} onOpen={onOpen} onFlag={toggleFlag} />
            </div>
          ) : (
            <div className="next-card clear">
              <div className="next-top">
                <span>All clear</span>
              </div>
              <h2>Every job done</h2>
              <div className="go">The workshop is built out. Keep the stockpile topped up.</div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

function NextBody({ p, g, onOpen, onFlag }: { p: Progress; g: Goal; onOpen: (k: string) => void; onFlag: (k: string) => void }) {
  const missing = g.req.filter(([k, n]) => have(p, k) < n);
  const flags = (g.flags ?? []).filter((f) => !flagOn(p, f));
  if (!missing.length && !flags.length) return <div className="go">Everything is in the stash. Go build it.</div>;
  return (
    <>
      {missing.length > 0 && (
        <div className="tiles">
          {missing.map(([k, n]) => (
            <Tile key={k} k={k} have={have(p, k)} need={n} onOpen={onOpen} />
          ))}
        </div>
      )}
      {flags.length > 0 && (
        <div className="chips">
          {flags.map((f) => (
            <button key={f} type="button" className="chip" onClick={() => onFlag(f)}>
              <span className="bx" />
              {FLAGS[f]}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
