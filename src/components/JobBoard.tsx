import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FLAGS, GOALS, STATIONS, type Goal } from "../data";
import { flagOn, have, pct, statusOf, type Status } from "../logic";
import { EASE } from "../motion";
import { useLedger, type Progress } from "../store";
import { SectionHead } from "./SectionHead";
import { Tile } from "./Tile";

export const FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["ready", "Ready"],
  ["done", "Done"],
] as const;
export type Filter = (typeof FILTERS)[number][0];

const matches = (f: Filter, s: Status) => f === "all" || (f === "active" ? s !== "done" : s === f);

const PILL: Record<Status, string> = { ever: "Ongoing", done: "Done", locked: "Locked", ready: "Ready", next: "Next", open: "Open" };

interface Props {
  p: Progress;
  next: Goal | undefined;
  filter: Filter;
  setFilter: (f: Filter) => void;
  onOpen: (k: string) => void;
}

export function JobBoard({ p, next, filter, setFilter, onOpen }: Props) {
  const f: Filter = FILTERS.some(([id]) => id === filter) ? filter : "all";
  const rows = GOALS.map((g, i) => ({ g, i, s: statusOf(p, g, next) }));
  const shown = rows.filter((r) => matches(f, r.s));

  return (
    <section className="sec" id="jobs">
      <SectionHead num="02" title="Job board" sub="Tap any item to update your stash.">
        <div className="seg" role="group" aria-label="Filter jobs">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={f === id ? "on" : ""} aria-pressed={f === id} onClick={() => setFilter(id)}>
              {label}
              <em>{rows.filter((r) => matches(id, r.s)).length}</em>
            </button>
          ))}
        </div>
      </SectionHead>
      <motion.div className="jobs" layout>
        <AnimatePresence mode="popLayout">
          {shown.map(({ g, i, s }, n) => (
            <JobCard key={g.id} g={g} idx={i} order={n} status={s} p={p} onOpen={onOpen} />
          ))}
          {!shown.length && (
            <motion.div key="empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <b>Nothing here</b>
              {f === "ready" ? "No job has every part in the stash yet." : "No jobs match this filter."}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

interface CardProps {
  g: Goal;
  idx: number;
  order: number;
  status: Status;
  p: Progress;
  onOpen: (k: string) => void;
}

const JobCard = forwardRef<HTMLElement, CardProps>(function JobCard({ g, idx, order, status, p, onOpen }, ref) {
  const setLvl = useLedger((s) => s.setLvl);
  const toggleFlag = useLedger((s) => s.toggleFlag);
  const done = status === "done";
  const station = STATIONS.find((s) => s.id === g.st);
  const kind = station ? `${station.name} · Level ${g.lv}` : g.ever ? "Standing order" : "Project";
  const blocker = g.needs ? GOALS.find((x) => x.done === g.needs) : undefined;
  const percent = Math.round(pct(p, g) * 100);

  let action: { label: string; run: () => void } | null = null;
  if (g.st && g.lv != null && status !== "locked") {
    const st = g.st;
    const lv = g.lv;
    action = done ? { label: "Undo", run: () => setLvl(st, lv - 1) } : { label: "Mark built", run: () => setLvl(st, lv) };
  } else if (g.done) {
    const flag = g.done;
    action = { label: done ? "Undo" : "Mark complete", run: () => toggleFlag(flag) };
  }

  return (
    <motion.article
      ref={ref}
      layout
      className={`job s-${status}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: done ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: EASE, delay: Math.min(order, 10) * 0.03 }}
    >
      <div className="wm" aria-hidden="true">
        {String(idx + 1).padStart(2, "0")}
      </div>
      <div className="job-h">
        <div>
          <span className="job-k">{kind}</span>
          <h3>{g.title}</h3>
        </div>
        <span className={`pill ${status}`}>{PILL[status]}</span>
      </div>
      <div className="prog-row">
        <div className="prog">
          <motion.b initial={false} animate={{ width: `${percent}%` }} transition={{ duration: 0.5, ease: EASE }} />
        </div>
        <span>{percent}%</span>
      </div>
      {status === "locked" && blocker && <p className="lock-note">Finish {blocker.title} to unlock.</p>}
      {g.flags && (
        <div className="chips">
          {g.flags.map((f) => (
            <button key={f} type="button" className={`chip ${flagOn(p, f) ? "on" : ""}`} aria-pressed={flagOn(p, f)} onClick={() => toggleFlag(f)}>
              <span className="bx">{flagOn(p, f) ? "✓" : ""}</span>
              {FLAGS[f]}
            </button>
          ))}
        </div>
      )}
      <div className="tiles">
        {g.req.map(([k, n]) => (
          <Tile key={k} k={k} have={have(p, k)} need={n} onOpen={onOpen} />
        ))}
      </div>
      {action && (
        <div className="job-f">
          <button type="button" className="act" onClick={action.run}>
            {action.label}
          </button>
        </div>
      )}
    </motion.article>
  );
});
