import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "../motion";

interface Props {
  saving: boolean;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function Nav({ saving, onExport, onImport, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <header className="nav">
      <div className="nav-in">
        <a className="brand" href="#main">
          <Mark />
          <span>Topside Ledger</span>
        </a>
        <nav className="links" aria-label="Sections">
          <a href="#workshop">Workshop</a>
          <a href="#jobs">Jobs</a>
          <a href="#haul">Haul</a>
        </nav>
        <div className="nav-r">
          <span className={`status ${saving ? "on" : "err"}`}>
            <i />
            <span>{saving ? "Saved on this device" : "Not saving"}</span>
          </span>
          <div className="menu" ref={ref}>
            <button type="button" className="icon-btn" aria-haspopup="true" aria-expanded={open} aria-controls="menuList" aria-label="Data options" onClick={() => setOpen((o) => !o)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  id="menuList"
                  className="menu-list"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: EASE }}
                >
                  <button type="button" onClick={run(onExport)}>Export backup</button>
                  <button type="button" onClick={run(onImport)}>Import backup</button>
                  <button type="button" className="danger" onClick={run(onReset)}>Reset progress</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
