import { useEffect, useRef, useState } from "react";
import { useItemInfo } from "../catalog";
import { GOALS, RARITY_COLOR, RARITY_NAME } from "../data";
import { have, isDone, needed } from "../logic";
import { useLedger, type Progress } from "../store";
import { Drawer } from "./Drawer";
import { Icon } from "./Icon";
import { Tile } from "./Tile";

interface Props {
  k: string;
  p: Progress;
  desktop: boolean;
  onClose: () => void;
}

export function ItemSheet({ k, p, desktop, onClose }: Props) {
  const info = useItemInfo(k);
  const n = have(p, k);
  const need = needed(p, k);
  const setInv = useLedger((s) => s.setInv);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(n));

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(n));
  }, [n]);

  const users = GOALS.filter((g) => !isDone(p, g) && g.req.some((r) => r[0] === k));
  const found = p.raids.filter((r) => r.outcome === "extracted" && r.items.some((i) => i.id === k));
  const foundN = found.reduce((a, r) => a + (r.items.find((i) => i.id === k)?.n ?? 0), 0);
  const maps = [...new Set(found.map((r) => r.map))];

  return (
    <Drawer desktop={desktop} labelledBy="shT" onClose={onClose} glow={RARITY_COLOR[info.rarity]}>
      <div className="sheet-hero">
        <Tile k={k} have={n} />
        <div>
          <span className="rar" style={{ color: RARITY_COLOR[info.rarity] }}>
            {RARITY_NAME[info.rarity]}
            {info.type ? ` · ${info.type}` : ""}
          </span>
          <h3 id="shT">{info.name}</h3>
          <p className="tot">{need ? `${n} of ${need} needed` : `${n} in stash · not needed right now`}</p>
        </div>
      </div>

      <div className="stepper">
        <button type="button" aria-label="One less" disabled={n <= 0} onClick={() => setInv(k, n - 1)}>
          −
        </button>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          aria-label={`${info.name} count`}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value !== "") setInv(k, e.target.value);
          }}
          onBlur={() => setDraft(String(useLedger.getState().inv[k] || 0))}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <button type="button" aria-label="One more" onClick={() => setInv(k, n + 1)}>
          +
        </button>
      </div>

      <div className="quick">
        <button type="button" onClick={() => setInv(k, n + 5)}>+5</button>
        <button type="button" onClick={() => setInv(k, n + 10)}>+10</button>
        <button type="button" disabled={!n} onClick={() => setInv(k, 0)}>Clear</button>
        {need > n && (
          <button type="button" className="fill" onClick={() => setInv(k, need)}>
            Fill to {need}
          </button>
        )}
      </div>

      {(info.where || info.loot) && (
        <div className="where">
          <Icon name="pinmap" />
          <div>
            <span className="k">Where to find</span>
            {info.where && <p>{info.where}</p>}
            {info.loot && <p className="loot">Loot areas: {info.loot}</p>}
          </div>
        </div>
      )}

      {foundN > 0 && (
        <div className="used">
          <span className="k">Your raids</span>
          <p className="found">
            Brought home {foundN} over {found.length} raid{found.length === 1 ? "" : "s"}, on {maps.join(", ")}.
          </p>
        </div>
      )}

      {users.length > 0 && (
        <div className="used">
          <span className="k">Needed for</span>
          <div>
            {users.map((g) => (
              <span key={g.id} className="u">
                {g.title}
                <b>{g.req.find((r) => r[0] === k)?.[1]}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <a className="mf-link" href={`https://metaforge.app/arc-raiders/database/item/${encodeURIComponent(k)}`} target="_blank" rel="noreferrer">
        View on MetaForge ↗
      </a>
    </Drawer>
  );
}
