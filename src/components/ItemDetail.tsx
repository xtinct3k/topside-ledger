import { useEffect, useRef } from "react";
import { TIPS } from "../data";
import { RARITY_NAME } from "../game";
import { useGame, useItem } from "../gamedata";
import { coins, recycleValue } from "../logic";
import { useLedger } from "../store";
import { useAdvice, useUi } from "../ui";
import { Ico, ItemLink, Qty, Stacks, Tag, humanize } from "./bits";

/** Stats worth showing even when MetaForge sends a zero-padded block. */
const STAT_ORDER = ["damage", "fireRate", "magazineSize", "range", "stability", "agility", "stealth", "weight", "stackSize"];

export function ItemDetail() {
  const id = useUi((s) => s.item)!;
  const close = useUi((s) => s.close);
  const it = useItem(id);
  const { items, arcs } = useGame();
  const { inv, reserve, raids, setInv, setReserve } = useLedger();
  const row = useAdvice().find((r) => r.id === id);
  const ref = useRef<HTMLElement>(null);
  const n = inv[id] || 0;

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
    ref.current?.focus({ preventScroll: true });
  }, [id]);

  const rv = recycleValue(it, items);
  const stats = Object.entries(it.stats).sort(([a], [b]) => {
    const ia = STAT_ORDER.indexOf(a);
    const ib = STAT_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const found = raids.filter((r) => r.outcome === "extracted" && r.items.some((i) => i.id === id));
  const foundN = found.reduce((a, r) => a + (r.items.find((i) => i.id === id)?.n ?? 0), 0);
  const tip = TIPS[id];

  return (
    <aside className="detail" ref={ref} tabIndex={-1} aria-labelledby="dtT">
      <header className="dt-h">
        <Ico item={it} size="l" />
        <div>
          <span className={`rar r-${it.rarity || "x"}`}>
            {[RARITY_NAME[it.rarity] !== "—" ? RARITY_NAME[it.rarity] : "", it.type, it.sub && it.sub !== it.type ? it.sub : ""].filter(Boolean).join(" · ")}
          </span>
          <h2 id="dtT">{it.name}</h2>
          <span className="fine">{it.value ? `${coins(it.value)} each` : "No trade value"}</span>
        </div>
        <button type="button" className="x" aria-label="Close item" onClick={close}>
          ✕
        </button>
      </header>

      <section className="dt-sec counts">
        <div>
          <span className="lbl">In stash</span>
          <Qty value={n} onChange={(v) => setInv(id, v)} label={`${it.name} in stash`} />
        </div>
        <div>
          <span className="lbl">Always keep</span>
          <Qty value={reserve[id] || 0} onChange={(v) => setReserve(id, v)} label={`${it.name} to always keep`} />
        </div>
        <div className="quick">
          <button type="button" className="btn" onClick={() => setInv(id, n + 5)}>
            +5
          </button>
          <button type="button" className="btn" onClick={() => setInv(id, n + 10)}>
            +10
          </button>
          {row && row.short > 0 && (
            <button type="button" className="btn" onClick={() => setInv(id, row.need)}>
              Fill to {row.need}
            </button>
          )}
        </div>
      </section>

      {row && (
        <section className="dt-sec">
          <h3>
            Advice <Tag v={row.verdict} />
          </h3>
          <p className="advice">{row.reason}</p>
          {row.needs.length > 0 && (
            <ul className="needs">
              {row.needs.map((x, i) => (
                <li key={`${x.ref}-${i}`}>
                  <span>{x.label}</span>
                  <data value={x.n}>{x.n}</data>
                </li>
              ))}
              <li className="sum">
                <span>Total needed</span>
                <data value={row.need}>{row.need}</data>
              </li>
            </ul>
          )}
        </section>
      )}

      {(it.desc || it.flavor) && (
        <section className="dt-sec">
          {it.desc && <p>{it.desc}</p>}
          {it.flavor && <p className="flavor">{it.flavor}</p>}
        </section>
      )}

      {(tip || it.loot || it.maps.length > 0 || foundN > 0) && (
        <section className="dt-sec">
          <h3>Where to find</h3>
          {tip && <p>{tip}</p>}
          <dl className="facts">
            {it.loot && (
              <>
                <dt>Loot areas</dt>
                <dd>{it.loot}</dd>
              </>
            )}
            {it.maps.length > 0 && (
              <>
                <dt>Known spawns</dt>
                <dd>{it.maps.map(humanize).join(", ")}</dd>
              </>
            )}
            {foundN > 0 && (
              <>
                <dt>Your raids</dt>
                <dd>
                  {foundN} over {found.length} raid{found.length === 1 ? "" : "s"} ({[...new Set(found.map((r) => r.map))].join(", ")})
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      {it.drops.length > 0 && (
        <section className="dt-sec">
          <h3>Dropped by</h3>
          <p>{it.drops.map((a) => arcs[a]?.name ?? humanize(a)).join(", ")}</p>
        </section>
      )}

      {it.recycle.length > 0 && (
        <section className="dt-sec">
          <h3>
            Recycles into <span className="fine">{coins(rv)} total</span>
          </h3>
          <Stacks list={it.recycle} />
        </section>
      )}

      {it.craft.length > 0 && (
        <section className="dt-sec">
          <h3>
            Crafted from {it.bench && <span className="fine">at {it.bench}</span>}
          </h3>
          <Stacks list={it.craft} inv={inv} />
        </section>
      )}

      {it.usedIn.length > 0 && (
        <section className="dt-sec">
          <h3>Used to craft</h3>
          <Stacks list={it.usedIn} />
        </section>
      )}

      {it.from.length > 0 && (
        <section className="dt-sec">
          <h3>Get it by recycling</h3>
          <Stacks list={it.from} />
        </section>
      )}

      {it.sold.length > 0 && (
        <section className="dt-sec">
          <h3>Sold by</h3>
          <dl className="facts">
            {it.sold.map((s) => (
              <div key={s.trader} className="fact-row">
                <dt>{s.trader}</dt>
                <dd>{coins(s.price)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {stats.length > 0 && (
        <section className="dt-sec">
          <h3>Stats</h3>
          <dl className="facts grid">
            {stats.map(([k, v]) => (
              <div key={k} className="fact-row">
                <dt>{humanize(k)}</dt>
                <dd>{typeof v === "number" ? v.toLocaleString("en-US") : v}</dd>
              </div>
            ))}
            {it.ammo && (
              <div className="fact-row">
                <dt>Ammo</dt>
                <dd>{humanize(it.ammo)}</dd>
              </div>
            )}
            {it.slots.length > 0 && (
              <div className="fact-row">
                <dt>Fits in</dt>
                <dd>{it.slots.map(humanize).join(", ")}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {it.mods.length > 0 && (
        <section className="dt-sec">
          <h3>Variants</h3>
          <span className="stacks">
            {it.mods.map((m) => (
              <ItemLink key={m} id={m} />
            ))}
          </span>
        </section>
      )}

      <footer className="dt-f">
        <a href={`https://metaforge.app${it.guide || `/arc-raiders/database/item/${encodeURIComponent(id)}`}`} target="_blank" rel="noreferrer">
          {it.guide ? "Guide on MetaForge ↗" : "View on MetaForge ↗"}
        </a>
      </footer>
    </aside>
  );
}
