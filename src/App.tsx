import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { GOALS } from "./data";
import { useMediaQuery, useStoredState } from "./hooks";
import { nextGoal, statusOf } from "./logic";
import { STORE_KEY, isBackup, storageWorks, useLedger } from "./store";
import { Haul } from "./components/Haul";
import { Hero } from "./components/Hero";
import { ItemSheet } from "./components/ItemSheet";
import { JobBoard, type Filter } from "./components/JobBoard";
import { Mark, Nav } from "./components/Nav";
import { Toasts, type Toast } from "./components/Toasts";
import { Workshop } from "./components/Workshop";

export default function App() {
  const p = useLedger();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [filter, setFilter] = useStoredState<Filter>("topside-ledger:filter", "all");
  const [hideDone, setHideDone] = useStoredState("topside-ledger:hideDone", false);
  const [q, setQ] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving] = useState(storageWorks);
  const desktop = useMediaQuery("(min-width: 900px)");
  const opener = useRef<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((msg: string, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const next = nextGoal(p);

  // Announce jobs that just became buildable, but not after bulk loads (import, reset, another tab).
  const readyKey = GOALS.filter((g) => statusOf(p, g, next) === "ready")
    .map((g) => g.id)
    .join(",");
  const prevReady = useRef(readyKey);
  const quietUntil = useRef(0);
  const hush = () => (quietUntil.current = Date.now() + 500);
  useEffect(() => {
    const before = new Set(prevReady.current.split(","));
    if (Date.now() > quietUntil.current) {
      readyKey
        .split(",")
        .filter((id) => id && !before.has(id))
        .forEach((id) => toast(`${GOALS.find((g) => g.id === id)?.title} is ready to build`));
    }
    prevReady.current = readyKey;
  }, [readyKey, toast]);

  // Keep several open tabs in step.
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== STORE_KEY) return;
      hush();
      void useLedger.persist.rehydrate();
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const open = useCallback((k: string) => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpenItem(k);
  }, []);
  const close = useCallback(() => {
    setOpenItem(null);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("lock", !!openItem);
    if (!openItem) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [openItem, close]);

  const exportBackup = () => {
    const { inv, lvl, flag } = useLedger.getState();
    const body = JSON.stringify({ app: "topside-ledger", version: 1, exportedAt: new Date().toISOString(), inv, lvl, flag }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `topside-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup downloaded");
  };

  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error("not a backup");
      hush();
      useLedger.getState().replace(data);
      toast("Backup imported");
    } catch {
      toast("That file isn't a Topside Ledger backup", true);
    }
  };

  const reset = () => {
    if (!window.confirm("Reset all progress on this device? Export a backup first if you might want it back.")) return;
    hush();
    useLedger.getState().reset();
    toast("Progress reset");
  };

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav saving={saving} onExport={exportBackup} onImport={() => fileRef.current?.click()} onReset={reset} />

      <main id="main" className="wrap">
        <Hero p={p} next={next} onOpen={open} />
        <Workshop p={p} />
        <JobBoard p={p} next={next} filter={filter} setFilter={setFilter} onOpen={open} />
        <Haul p={p} q={q} setQ={setQ} hideDone={hideDone} setHideDone={setHideDone} onOpen={open} />
      </main>

      <footer className="foot">
        <div className="foot-in">
          <Mark />
          <p>Costs from post-2.0 guides. If the Workshop menu in game differs, trust the game.</p>
          <p>Progress is saved in this browser only. Export a backup to move it to another device.</p>
          <p>Fan-made tool, not affiliated with Embark Studios.</p>
        </div>
      </footer>

      <AnimatePresence>{openItem && <ItemSheet key={openItem} k={openItem} p={p} desktop={desktop} onClose={close} />}</AnimatePresence>
      <Toasts items={toasts} />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
    </MotionConfig>
  );
}
