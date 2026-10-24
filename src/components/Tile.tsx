import { ITEMS } from "../data";
import { Icon } from "./Icon";

interface Props {
  k: string;
  have: number;
  /** When set, shows a fill bar and an x/need badge. */
  need?: number;
  onOpen?: (k: string) => void;
}

export function Tile({ k, have, need, onOpen }: Props) {
  const it = ITEMS[k];
  const met = need != null && have >= need;
  const fill = need ? Math.min(100, Math.round((have / need) * 100)) : 0;
  const cls = `tile ${it.rarity} ${met ? "met" : ""}`;
  const inner = (
    <>
      {need != null && (
        <span className="bar">
          <b style={{ width: `${fill}%` }} />
        </span>
      )}
      <Icon name={it.icon} />
      {need != null && (
        <span className="ct">
          {Math.min(have, need)}/{need}
        </span>
      )}
    </>
  );
  if (!onOpen) return <div className={cls}>{inner}</div>;
  return (
    <button type="button" className={cls} title={it.name} aria-label={`${it.name}, ${have}${need != null ? ` of ${need}` : ""}`} onClick={() => onOpen(k)}>
      {inner}
    </button>
  );
}
