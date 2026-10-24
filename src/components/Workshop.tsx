import { motion } from "framer-motion";
import { STATIONS } from "../data";
import { level } from "../logic";
import { rise, stagger } from "../motion";
import { useLedger, type Progress } from "../store";
import { Icon } from "./Icon";
import { SectionHead } from "./SectionHead";

function Dial({ lv, max }: { lv: number; max: number }) {
  const r = 34;
  const C = 2 * Math.PI * r;
  const seg = C / max;
  const gap = 4;
  return (
    <svg className="ring" viewBox="0 0 78 78" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <circle
          key={i}
          cx="39"
          cy="39"
          r={r}
          fill="none"
          stroke={i < lv ? "var(--teal)" : "var(--line-2)"}
          strokeWidth="5"
          strokeDasharray={`${seg - gap} ${C}`}
          strokeDashoffset={-i * seg}
          style={i < lv ? { filter: "drop-shadow(0 0 4px rgba(63,179,166,.7))" } : undefined}
        />
      ))}
    </svg>
  );
}

export function Workshop({ p }: { p: Progress }) {
  const setLvl = useLedger((s) => s.setLvl);
  return (
    <section className="sec" id="workshop">
      <SectionHead num="01" title="Workshop" sub="Set each station's level. Jobs tick themselves off." />
      <motion.div className="rack" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
        {STATIONS.map((s) => {
          const lv = level(p, s.id);
          return (
            <motion.div key={s.id} className={`st ${lv ? "" : "zero"} ${lv >= s.max ? "max" : ""}`} variants={rise}>
              <div className="dial">
                <Dial lv={lv} max={s.max} />
                <div className="ic">
                  <Icon name={s.icon} />
                </div>
              </div>
              <div className="nm">{s.name}</div>
              <div className="ctl">
                <button type="button" className="mini" aria-label={`Lower ${s.name}`} disabled={lv <= 0} onClick={() => setLvl(s.id, lv - 1)}>
                  −
                </button>
                <b>
                  {lv}
                  <em>/{s.max}</em>
                </b>
                <button type="button" className="mini" aria-label={`Raise ${s.name}`} disabled={lv >= s.max} onClick={() => setLvl(s.id, lv + 1)}>
                  +
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
