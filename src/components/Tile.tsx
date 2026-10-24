import { useItemInfo, type ItemInfo } from "../catalog";
import { Icon } from "./Icon";

/** Item picture: MetaForge icon when loaded, built-in glyph otherwise. */
export function ItemArt({ info }: { info: ItemInfo }) {
  return info.icon ? <img src={info.icon} alt="" loading="lazy" decoding="async" draggable={false} /> : <Icon name={info.glyph} />;
}

interface Props {
  k: string;
  have: number;
  /** When set, shows a fill bar and an x/need badge. */
  need?: number;
  /** Overrides the badge text. */
  badge?: string;
  onOpen?: (k: string) => void;
}

export function Tile({ k, have, need, badge, onOpen }: Props) {
  const info = useItemInfo(k);
  const met = need != null && have >= need;
  const fill = need ? Math.min(100, Math.round((have / need) * 100)) : 0;
  const cls = `tile ${info.rarity} ${met ? "met" : ""}`;
  const label = badge ?? (need != null ? `${Math.min(have, need)}/${need}` : null);
  const inner = (
    <>
      {need != null && (
        <span className="bar">
          <b style={{ width: `${fill}%` }} />
        </span>
      )}
      <ItemArt info={info} />
      {label != null && <span className="ct">{label}</span>}
    </>
  );
  if (!onOpen) return <div className={cls}>{inner}</div>;
  return (
    <button type="button" className={cls} title={info.name} aria-label={`${info.name}, ${have}${need != null ? ` of ${need}` : ""}`} onClick={() => onOpen(k)}>
      {inner}
    </button>
  );
}
