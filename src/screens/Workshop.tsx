import { useGame } from "../gamedata";
import type { Station } from "../game";
import { level, levelState, roman } from "../logic";
import { useLedger } from "../store";
import { ItemLink, Kpis, Qty, ScreenHead, Stacks, humanize } from "../components/bits";

const STATE_LABEL = { built: "Built", ready: "Ready", short: "Short" } as const;

export function Workshop({ toast }: { toast: (msg: string) => void }) {
  const data = useGame((s) => s.data);
  const p = useLedger();
  if (!data) return null;

  const built = data.stations.reduce((a, s) => a + level(p, s.id), 0);
  const max = data.stations.reduce((a, s) => a + s.max, 0);
  const ready = data.stations.filter((s) => {
    const next = s.levels.find((L) => L.lv === level(p, s.id) + 1);
    return next && levelState(p, s, next) === "ready";
  });

  return (
    <>
      <ScreenHead code="02" title="Workshop" sub="Every station, every level, and the parts each one costs." />
      <Kpis
        items={[
          ["Levels built", `${built}/${max}`],
          ["Stations maxed", data.stations.filter((s) => level(p, s.id) >= s.max).length, `of ${data.stations.length}`],
          ["Ready to build", ready.length, ready.map((s) => s.name).join(", ") || "none yet", ready.length ? "hot" : undefined],
        ]}
      />
      <div className="stations">
        {data.stations.map((s) => (
          <StationPanel key={s.id} s={s} toast={toast} />
        ))}
      </div>
    </>
  );
}

function StationPanel({ s, toast }: { s: Station; toast: (msg: string) => void }) {
  const p = useLedger();
  const setLvl = useLedger((x) => x.setLvl);
  const build = useLedger((x) => x.build);
  const items = useGame((x) => x.items);
  const lv = level(p, s.id);

  return (
    <section className={`station ${lv >= s.max ? "maxed" : ""}`} aria-labelledby={`st-${s.id}`}>
      <header className="station-h">
        <div>
          <h2 id={`st-${s.id}`}>{s.name}</h2>
          <div className="pips" aria-label={`Level ${lv} of ${s.max}`}>
            {Array.from({ length: s.max }, (_, i) => (
              <i key={i} className={i < lv ? "on" : ""} />
            ))}
          </div>
        </div>
        <div className="lv">
          <span>LV</span>
          <Qty value={lv} max={s.max} onChange={(n) => setLvl(s.id, n)} label={`${s.name} level`} />
        </div>
      </header>
      <ol className="levels">
        {s.levels.map((L) => {
          const st = levelState(p, s, L);
          const isNext = L.lv === lv + 1;
          return (
            <li key={L.lv} className={`lvl s-${st} ${isNext ? "next" : ""}`}>
              <div className="lvl-h">
                <b>{roman(L.lv)}</b>
                <span className={`state s-${st}`}>{STATE_LABEL[st]}</span>
                {isNext && st === "ready" && (
                  <button
                    type="button"
                    className="btn hot"
                    onClick={() => {
                      build(s.id, L.lv, L.req.map(([id, n]) => ({ id, n })));
                      toast(`${s.name} ${roman(L.lv)} built. Parts taken out of your stash.`);
                    }}
                  >
                    Build
                  </button>
                )}
              </div>
              {L.req.length ? <Stacks list={L.req} inv={st === "built" ? undefined : p.inv} /> : <span className="none">No parts needed</span>}
              {L.unlock.length > 0 && (
                <p className="fine">
                  Unlocks after {L.unlock.map(([id, n]) => `${n} ${humanize(id).toLowerCase()}`).join(", ")}
                </p>
              )}
              {L.crafts.length > 0 && (
                <div className="crafts">
                  <span className="lbl">Crafts</span>
                  {L.crafts.map((id) => (items[id] ? <ItemLink key={id} id={id} /> : <span key={id} className="fine">{humanize(id)}</span>))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
