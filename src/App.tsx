import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { brief } from "./brief";
import { loadEvents, loadGame, useGame } from "./gamedata";
import { isBackup, progressOf, useLedger } from "./store";
import { lock, startSync, useSync } from "./sync";
import { useAdvice, useUi } from "./ui";
import { ItemDetail } from "./components/ItemDetail";
import { Login } from "./components/Login";
import { ROUTES, Sidebar, TopBar, type Route } from "./components/Shell";
import { Toasts, type Toast } from "./components/Toasts";
import { Arcs } from "./screens/Arcs";
import { Database } from "./screens/Database";
import { Events } from "./screens/Events";
import { Quests } from "./screens/Quests";
import { Raids } from "./screens/Raids";
import { Stash } from "./screens/Stash";
import { Traders } from "./screens/Traders";
import { Workshop } from "./screens/Workshop";

const routeOf = (hash: string): Route => {
  const id = hash.replace(/^#/, "");
  return ROUTES.some((r) => r[0] === id) ? (id as Route) : "stash";
};

function useRoute() {
  const [route, setRoute] = useState(() => routeOf(location.hash));
  useEffect(() => {
    const on = () => setRoute(routeOf(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export default function App() {
  const phase = useSync((s) => s.phase);
  const route = useRoute();
  const gameStatus = useGame((s) => s.status);
  const selected = useUi((s) => s.item);
  const close = useUi((s) => s.close);
  const rows = useAdvice();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const toast = useCallback((msg: string, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => startSync({ notify: toast, hush: () => {} }), [toast]);
  useEffect(() => {
    void loadGame();
    void loadEvents();
    const t = setInterval(() => void loadEvents(), 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [route]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !(e.target as HTMLElement).closest("input, textarea, select") && close();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [close]);

  const copyForClaude = async () => {
    const data = useGame.getState().data;
    if (!data) return toast("Game data is still loading.", true);
    const s = useLedger.getState();
    try {
      await navigator.clipboard.writeText(brief(progressOf(s), data, rows, useUi.getState().plan));
      toast("Copied. Paste it into a Claude chat and ask away.");
    } catch {
      toast("Couldn't reach the clipboard in this browser.", true);
    }
  };

  const exportBackup = () => {
    const body = JSON.stringify({ app: "topside-ledger", version: 3, exportedAt: new Date().toISOString(), ...progressOf(useLedger.getState()) }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `topside-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup downloaded.");
  };

  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error("not a backup");
      if (!window.confirm("Replace your current progress with this backup?")) return;
      useLedger.getState().replace(data);
      toast("Backup imported.");
    } catch {
      toast("That file isn't a Topside Ledger backup.", true);
    }
  };

  const reset = () => {
    if (!window.confirm("Reset all progress, on every device? Export a backup first if you might want it back.")) return;
    useLedger.getState().reset();
    toast("Progress reset.");
  };

  if (phase === "locked" || phase === "unconfigured") return <Login />;

  return (
    <div className={`app ${selected ? "has-detail" : ""}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Sidebar route={route} onCopy={copyForClaude} onExport={exportBackup} onImport={() => fileRef.current?.click()} onLock={lock} onReset={reset} />
      <TopBar route={route} />
      <main id="main" className="main" ref={mainRef}>
        {gameStatus === "error" && (
          <p className="banner">MetaForge game data couldn't be loaded. Your stash still works; names and details will fill in once it's back.</p>
        )}
        {route === "stash" && <Stash />}
        {route === "workshop" && <Workshop toast={toast} />}
        {route === "quests" && <Quests toast={toast} />}
        {route === "items" && <Database />}
        {route === "traders" && <Traders />}
        {route === "arcs" && <Arcs />}
        {route === "events" && <Events />}
        {route === "raids" && <Raids toast={toast} />}
        {gameStatus === "loading" && route !== "stash" && route !== "events" && route !== "raids" && <p className="loading">Loading game data…</p>}
      </main>
      {selected && (
        <>
          <div className="scrim" onClick={close} aria-hidden="true" />
          <ItemDetail />
        </>
      )}
      <Toasts items={toasts} />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
    </div>
  );
}
