import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Item, Stack } from "../game";
import { itemOf, useGame } from "../gamedata";
import type { Verdict } from "../logic";
import { useUi } from "../ui";

/** Item picture on a dark plate, with a rarity bar along the bottom. */
export function Ico({ item, size = "m" }: { item: Item; size?: "s" | "m" | "l" }) {
  return (
    <span className={`ico ${size} r-${item.rarity || "x"}`} aria-hidden="true">
      {item.icon ? <img src={item.icon} alt="" loading="lazy" decoding="async" draggable={false} /> : <b>{item.name.slice(0, 2)}</b>}
    </span>
  );
}

/** Icon and name that opens the item in the detail panel. */
export function ItemLink({ id, n, have, compact }: { id: string; n?: number; have?: number; compact?: boolean }) {
  const item = itemOf(useGame((s) => s.items), id);
  const open = useUi((s) => s.open);
  const met = have != null && n != null && have >= n;
  return (
    <button type="button" className={`ilink ${compact ? "compact" : ""}`} onClick={() => open(id)} title={item.name}>
      <Ico item={item} size="s" />
      {!compact && <span className="nm">{item.name}</span>}
      {n != null && (
        <data className={`qty ${have == null ? "" : met ? "met" : "miss"}`} value={n}>
          {have != null ? `${Math.min(have, n)}/${n}` : `×${n}`}
        </data>
      )}
    </button>
  );
}

export function Stacks({ list, inv, compact }: { list: Stack[]; inv?: Record<string, number>; compact?: boolean }) {
  if (!list.length) return <span className="none">—</span>;
  return (
    <span className={`stacks ${compact ? "compact" : ""}`}>
      {list.map(([id, n]) => (
        <ItemLink key={id} id={id} n={n} have={inv ? inv[id] || 0 : undefined} compact={compact} />
      ))}
    </span>
  );
}

const VERDICT: Record<Verdict, string> = { short: "Short", keep: "Keep", sell: "Sell", recycle: "Recycle", gear: "Gear" };

export function Tag({ v }: { v: Verdict }) {
  return <span className={`tag v-${v}`}>{VERDICT[v]}</span>;
}

/** Number field with − and + buttons. Edits apply as you type; blank snaps back on blur. */
export function Qty({ value, onChange, label, max }: { value: number; onChange: (n: number) => void; label: string; max?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(String(value));
  }, [value]);
  const set = (n: number) => onChange(Math.max(0, max != null ? Math.min(max, n) : n));
  return (
    <span className="qtyed" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label={`One less ${label}`} disabled={value <= 0} onClick={() => set(value - 1)}>
        −
      </button>
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={draft}
        aria-label={label}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value !== "") set(Number(e.target.value) || 0);
        }}
        onBlur={() => setDraft(String(value))}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <button type="button" aria-label={`One more ${label}`} disabled={max != null && value >= max} onClick={() => set(value + 1)}>
        +
      </button>
    </span>
  );
}

export function ScreenHead({ code, title, sub, children }: { code: string; title: string; sub: string; children?: ReactNode }) {
  return (
    <header className="scr-h">
      <div className="scr-t">
        <span className="code">[{code}]</span>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children && <div className="scr-tools">{children}</div>}
    </header>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string, number?][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([id, text, n]) => (
        <button key={id} type="button" className={value === id ? "on" : ""} aria-pressed={value === id} onClick={() => onChange(id)}>
          {text}
          {n != null && <em>{n}</em>}
        </button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder, id }: { value: string; onChange: (v: string) => void; placeholder: string; id?: string }) {
  return (
    <label className="find">
      <span aria-hidden="true">&gt;</span>
      <input id={id} type="search" placeholder={placeholder} aria-label={placeholder} autoComplete="off" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Kpis({ items }: { items: [label: string, value: ReactNode, note?: string, tone?: "warn" | "hot"][] }) {
  return (
    <dl className="kpis">
      {items.map(([k, v, note, tone]) => (
        <div key={k} className={tone ?? ""}>
          <dt>{k}</dt>
          <dd>{v}</dd>
          {note && <small>{note}</small>}
        </div>
      ))}
    </dl>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}

/** "increasedFireRate" → "Increased fire rate". */
export const humanize = (k: string) => {
  const s = k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
