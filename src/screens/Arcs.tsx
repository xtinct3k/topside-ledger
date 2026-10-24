import { useMemo } from "react";
import { useGame } from "../gamedata";
import { useNeeds } from "../ui";
import { ItemLink, ScreenHead } from "../components/bits";

export function Arcs() {
  const { data } = useGame();
  const needs = useNeeds();
  const drops = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const it of data?.items ?? []) for (const a of it.drops) m.set(a, [...(m.get(a) ?? []), it.id]);
    return m;
  }, [data]);

  if (!data) return null;
  return (
    <>
      <ScreenHead code="06" title="ARCs" sub="Every ARC machine and what it drops. Drops you still need are marked." />
      <div className="arcs">
        {data.arcs.map((a) => {
          const list = drops.get(a.id) ?? [];
          const wanted = list.filter((id) => needs.has(id)).length;
          return (
            <article key={a.id} className="arc">
              <div className="arc-img">{a.image || a.icon ? <img src={a.image || a.icon} alt="" loading="lazy" decoding="async" /> : null}</div>
              <div className="arc-body">
                <header>
                  <h2>{a.name}</h2>
                  {wanted > 0 && <span className="state s-ready">{wanted} needed</span>}
                </header>
                {a.desc && !/placeholder/i.test(a.desc) && <p>{a.desc}</p>}
                {list.length > 0 ? (
                  <div className="stacks">
                    {list.map((id) => (
                      <span key={id} className={needs.has(id) ? "want" : ""}>
                        <ItemLink id={id} />
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="none">No drop data</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
