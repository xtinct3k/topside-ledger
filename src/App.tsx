import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { loadCatalog } from "./catalog";
import { GOALS } from "./data";
import { useMediaQuery, useStoredState } from "./hooks";
import { nextGoal, statusOf } from "./logic";
import { isBackup, progressOf, useLedger } from "./store";
import { lock, startSync, useSync } from "./sync";
import { Assistant, type ChatMsg } from "./components/Assistant";
import { Haul } from "./components/Haul";
import { Hero } from "./components/Hero";
import { ItemSheet } from "./components/ItemSheet";
import { JobBoard, type Filter } from "./components/JobBoard";
import { LogRaidSheet } from "./components/LogRaidSheet";
import { Login } from "./components/Login";
import { Mark, Nav } from "./components/Nav";
import { RaidLog } from "./components/RaidLog";
import { Toasts, type Toast } from "./components/Toasts";
import { Workshop } from "./components/Workshop";

export default function App() {
  const phase = useSync((s) => s.phase);
  const p = useLedger();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [filter, setFilter] = useStoredState<Filter>("topside-ledger:filter", "all");
  const [hideDone, setHideDone] = useStoredState("topside-ledger:hideDone", false);
  const [q, setQ] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const desktop = useMediaQuery("(min-width: 900px)");
  const opener = useRef<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((msg: string, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  // Announce jobs that just became buildable, but not after bulk loads (sync, import, reset, assistant).
  const next = nextGoal(p);
  const readyKey = GOALS.filter((g) => statusOf(p, g, next) === "ready")
    .map((g) => g.id)
    .join(",");
  const prevReady = useRef(readyKey);
  const quietUntil = useRef(0);
  const hush = useCallback(() => {
    quietUntil.current = Date.now() + 800;
  }, []);
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

  useEffect(() => startSync({ notify: toast, hush }), [toast, hush]);
  useEffect(() => void loadCatalog(), []);

  const remember = () => (opener.current = document.activeElement as HTMLElement | null);
  const restore = () => opener.current?.focus();
  const openSheet = useCallback((k: string) => {
    remember();
    setOpenItem(k);
  }, []);
  const closeSheet = useCallback(() => {
    setOpenItem(null);
    restore();
  }, []);
  const openLog = useCallback(() => {
    remember();
    setLogOpen(true);
  }, []);
  const closeLog = useCallback(() => {
    setLogOpen(false);
    restore();
  }, []);
  const closeChat = useCallback(() => {
    setChatOpen(false);
    restore();
  }, []);

  const anyOpen = !!openItem || logOpen || chatOpen;
  useEffect(() => {
    document.documentElement.classList.toggle("lock", anyOpen);
  }, [anyOpen]);

  const exportBackup = () => {
    const body = JSON.stringify({ app: "topside-ledger", version: 2, exportedAt: new Date().toISOString(), ...progressOf(useLedger.getState()) }, null, 2);
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
      if (!window.confirm("Replace your current progress with this backup?")) return;
      hush();
      useLedger.getState().replace(data);
      toast("Backup imported");
    } catch {
      toast("That file isn't a Topside Ledger backup", true);
    }
  };

  const reset = () => {
    if (!window.confirm("Reset all progress, on every device? Export a backup first if you might want it back.")) return;
    hush();
    useLedger.getState().reset();
    toast("Progress reset");
  };

  if (phase === "locked" || phase === "unconfigured") {
    return (
      <MotionConfig reducedMotion="user">
        <Login />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav onExport={exportBackup} onImport={() => fileRef.current?.click()} onLock={lock} onReset={reset} />

      <main id="main" className="wrap">
        <Hero p={p} next={next} onOpen={openSheet} />
        <Workshop p={p} />
        <JobBoard p={p} next={next} filter={filter} setFilter={setFilter} onOpen={openSheet} />
        <Haul p={p} q={q} setQ={setQ} hideDone={hideDone} setHideDone={setHideDone} onOpen={openSheet} />
        <RaidLog p={p} onLog={openLog} onOpen={openSheet} />
      </main>

      <footer className="foot">
        <div className="foot-in">
          <Mark />
          <p>
            Item data and icons from{" "}
            <a href="https://metaforge.app/arc-raiders" target="_blank" rel="noreferrer">
              MetaForge
            </a>
            . Job costs from post-2.0 guides; if the game differs, trust the game.
          </p>
          <p>Your progress is private to this site's password and syncs across your devices.</p>
          <p>Fan-made tool, not affiliated with Embark Studios.</p>
        </div>
      </footer>

      <motion.button
        type="button"
        className="fab"
        onClick={() => {
          remember();
          setChatOpen(true);
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: anyOpen ? 0 : 1, scale: anyOpen ? 0.8 : 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 300, delay: 0.4 }}
        aria-label="Ask Claude"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
        </svg>
        <span>Ask Claude</span>
      </motion.button>

      <AnimatePresence>
        {openItem && <ItemSheet key={`i-${openItem}`} k={openItem} p={p} desktop={desktop} onClose={closeSheet} />}
        {logOpen && <LogRaidSheet key="log" p={p} desktop={desktop} onClose={closeLog} onSaved={toast} />}
        {chatOpen && <Assistant key="chat" desktop={desktop} onClose={closeChat} onAdopt={hush} msgs={chat} setMsgs={setChat} />}
      </AnimatePresence>
      <Toasts items={toasts} />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
    </MotionConfig>
  );
}
