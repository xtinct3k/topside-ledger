import { useEffect, useMemo, useRef, useState } from "react";
import { searchItems, useGame } from "../gamedata";
import { level, levelState, questState } from "../logic";
import { useLedger } from "../store";
import { useSync, type Phase } from "../sync";
import { useAdvice, useUi } from "../ui";
import { until, useNow } from "../screens/Events";
import { Ico } from "./bits";

export const ROUTES = [
  ["stash", "01", "Stash"],
  ["workshop", "02", "Workshop"],
  ["quests", "03", "Quests"],
  ["items", "04", "Database"],
  ["traders", "05", "Traders"],
  ["arcs", "06", "ARCs"],
  ["events", "07", "Events"],
  ["raids", "08", "Raids"],
] as const;
export type Route = (typeof ROUTES)[number][0];

const STATUS: Partial<Record<Phase, [cls: string, label: string]>> = {
  loading: ["", "Linking"],
  synced: ["on", "Synced"],
  saving: ["busy", "Saving"],
  offline: ["err", "Offline"],
};

interface SideProps {
  route: Route;
  onCopy: () => void;
  onExport: () => void;
  onImport: () => void;
  onLock: () => void;
  onReset: () => void;
}

export function Sidebar({ route, onCopy, onExport, onImport, onLock, onReset }: SideProps) {
  const { phase, message } = useSync();
  const [cls, label] = STATUS[phase] ?? ["", ""];
  const rows = useAdvice();
  const p = useLedger();
  const { data, events } = useGame();
  const now = useNow();
  const [tools, setTools] = useState(false);

  const badges: Partial<Record<Route, [number, string]>> = useMemo(() => {
    if (!data) return {};
    const readyLv = data.stations.filter((s) => {
      const next = s.levels.find((L) => L.lv === level(p, s.id) + 1);
      return next && levelState(p, s, next) === "ready";
    }).length;
    return {
      stash: [rows.filter((r) => r.verdict === "short").length, "short"],
      workshop: [readyLv, "ready"],
      quests: [data.quests.filter((q) => questState(p, q) === "ready").length, "ready"],
      events: [events.filter((e) => e.start <= now && e.end > now).length, "live"],
      raids: [p.raids.length, ""],
    };
  }, [data, rows, p, events, now]);

  return (
    <aside className="side">
      <a className="brand" href="#stash">
        <span className="mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>
          Topside
          <br />
          Ledger
        </span>
      </a>
      <nav className="nav" aria-label="Screens">
        {ROUTES.map(([id, code, name]) => {
          const b = badges[id];
          return (
            <a key={id} href={`#${id}`} className={route === id ? "on" : ""} aria-current={route === id ? "page" : undefined}>
              <span className="code">{code}</span>
              <span className="nm">{name}</span>
              {b && b[0] > 0 && (
                <em className={b[1] === "short" ? "warn" : b[1] ? "hot" : ""} title={b[1] ? `${b[0]} ${b[1]}` : undefined}>
                  {b[0]}
                </em>
              )}
            </a>
          );
        })}
      </nav>
      <button type="button" className="side-toggle" aria-expanded={tools} onClick={() => setTools((t) => !t)}>
        Menu
      </button>
      <div className={`side-tools ${tools ? "open" : ""}`}>
        <button type="button" className="btn wide" onClick={onCopy}>
          Copy for Claude
        </button>
        <div className="side-row">
          <button type="button" className="btn" onClick={onExport}>
            Export
          </button>
          <button type="button" className="btn" onClick={onImport}>
            Import
          </button>
        </div>
        <div className="side-row">
          <button type="button" className="btn" onClick={onLock}>
            Lock
          </button>
          <button type="button" className="btn danger" onClick={onReset}>
            Reset
          </button>
        </div>
        <p className={`sync ${cls}`} title={message || undefined}>
          <i />
          {label}
        </p>
        <p className="credit">
          Game data:{" "}
          <a href="https://metaforge.app/arc-raiders" target="_blank" rel="noreferrer">
            MetaForge
          </a>
          <br />
          Fan-made. Not affiliated with Embark Studios.
        </p>
      </div>
    </aside>
  );
}

export function TopBar({ route }: { route: Route }) {
  const { data, events } = useGame();
  const open = useUi((s) => s.open);
  const inv = useLedger((s) => s.inv);
  const now = useNow(15000);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (data ? searchItems(data.items, q, 8) : []), [data, q]);
  const live = events.filter((e) => e.start <= now && e.end > now);
  const next = events.find((e) => e.start > now);
  const name = ROUTES.find((r) => r[0] === route)?.[2] ?? "";

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/input|textarea|select/i.test(t.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    setHi(0);
  }, [q]);

  const pick = (id: string) => {
    open(id);
    setQ("");
    input.current?.blur();
  };

  return (
    <header className="top">
      <span className="path">
        Topside <i>//</i> <b>{name}</b>
      </span>
      <div className="combo gsearch">
        <label className="find">
          <span aria-hidden="true">&gt;</span>
          <input
            ref={input}
            type="search"
            placeholder="Search any item"
            aria-label="Search any item"
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setHi((h) => Math.min(h + 1, results.length - 1)));
              else if (e.key === "ArrowUp") (e.preventDefault(), setHi((h) => Math.max(h - 1, 0)));
              else if (e.key === "Enter" && results[hi]) pick(results[hi].id);
              else if (e.key === "Escape") (setQ(""), e.currentTarget.blur());
            }}
          />
          <kbd>/</kbd>
        </label>
        {q.trim() && (
          <ul className="combo-list" role="listbox" aria-label="Matching items">
            {results.map((it, i) => (
              <li key={it.id}>
                <button type="button" className={i === hi ? "hi" : ""} onMouseEnter={() => setHi(i)} onClick={() => pick(it.id)}>
                  <Ico item={it} size="s" />
                  <span className="nm">{it.name}</span>
                  <em>{inv[it.id] ? `have ${inv[it.id]}` : it.type}</em>
                </button>
              </li>
            ))}
            {!results.length && <li className="none">{data ? "No item by that name." : "Game data still loading."}</li>}
          </ul>
        )}
      </div>
      <a className="ticker" href="#events">
        {live.length ? (
          <>
            <span className="dot" aria-hidden="true" />
            <b>Live</b> {live[0].name} · {live[0].map} · {until(live[0].end - now)} left{live.length > 1 ? ` +${live.length - 1}` : ""}
          </>
        ) : next ? (
          <>
            <b>Next</b> {next.name} · {next.map} · in {until(next.start - now)}
          </>
        ) : null}
      </a>
      <time className="clock" dateTime={new Date(now).toISOString()}>
        {new Date(now).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </time>
    </header>
  );
}
