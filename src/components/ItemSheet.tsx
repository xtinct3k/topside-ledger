import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, type MotionStyle } from "framer-motion";
import { GOALS, ITEMS, RARITY_COLOR, RARITY_NAME } from "../data";
import { have, isDone, needed } from "../logic";
import { useLedger, type Progress } from "../store";
import { Icon } from "./Icon";
import { Tile } from "./Tile";

interface Props {
  k: string;
  p: Progress;
  desktop: boolean;
  onClose: () => void;
}

const SPRING = { type: "spring", damping: 32, stiffness: 340 } as const;

export function ItemSheet({ k, p, desktop, onClose }: Props) {
  const it = ITEMS[k];
  const n = have(p, k);
  const need = needed(p, k);
  const setInv = useLedger((s) => s.setInv);
  const drag = useDragControls();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(String(n));

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(n));
  }, [n]);
  useEffect(() => closeRef.current?.focus(), []);

  const users = GOALS.filter((g) => !isDone(p, g) && g.req.some((r) => r[0] === k));
  const hidden = desktop ? { x: 48, opacity: 0 } : { y: "100%" };
  const shown = desktop ? { x: 0, opacity: 1 } : { y: 0 };

  return (
    <>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shT"
        style={{ "--glow": RARITY_COLOR[it.rarity] } as unknown as MotionStyle}
        initial={hidden}
        animate={shown}
        exit={hidden}
        transition={SPRING}
        drag={desktop ? false : "y"}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
      >
        <div className="grip" aria-hidden="true" onPointerDown={(e) => drag.start(e)} />
        <button ref={closeRef} type="button" className="close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="sheet-hero">
          <Tile k={k} have={n} />
          <div>
            <span className="rar" style={{ color: RARITY_COLOR[it.rarity] }}>
              {RARITY_NAME[it.rarity]}
            </span>
            <h3 id="shT">{it.name}</h3>
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
            aria-label={`${it.name} count`}
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

        <div className="where">
          <Icon name="pinmap" />
          <div>
            <span className="k">Where to find</span>
            <p>{it.where}</p>
          </div>
        </div>

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
      </motion.div>
    </>
  );
}
