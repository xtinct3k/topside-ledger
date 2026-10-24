import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ApiError, api } from "../api";
import { EASE } from "../motion";
import type { Ledger } from "../state";
import { useLedger } from "../store";
import { flush, lock } from "../sync";
import { Drawer } from "./Drawer";

type Mode = "ask" | "log";
interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  actions?: string[];
  error?: boolean;
}

const SUGGEST: Record<Mode, string[]> = {
  ask: ["What should I farm next, and where?", "Which job am I closest to finishing?", "Which map has been best for me so far?"],
  log: ["Extracted from Dam with 3 Wires, a Toaster and 2 ARC Alloy", "Died on Buried City, lost everything", "Crafted 2 Advanced Electrical Components"],
};

const PLACEHOLDER: Record<Mode, string> = {
  ask: "Ask about your progress…",
  log: "Describe the raid or what changed…",
};

interface Props {
  desktop: boolean;
  onClose: () => void;
  /** Called before the assistant's ledger replaces the local one. */
  onAdopt: () => void;
  msgs: Msg[];
  setMsgs: (fn: (m: Msg[]) => Msg[]) => void;
}

export type { Msg as ChatMsg };

export function Assistant({ desktop, onClose, onAdopt, msgs, setMsgs }: Props) {
  const [mode, setMode] = useState<Mode>("log");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || busy) return;
    const history = msgs.filter((x) => !x.error).slice(-10).map((x) => ({ role: x.role, text: x.text }));
    setMsgs((s) => [...s, { id: Date.now(), role: "user", text: m }]);
    setText("");
    setBusy(true);
    try {
      await flush(); // the assistant works on the server copy, so save pending edits first
      const res = await api<{ reply: string; actions: string[]; ledger: Ledger }>("/api/chat", { method: "POST", body: { message: m, mode, history } });
      if (res.actions.length) {
        onAdopt();
        useLedger.getState().adopt(res.ledger);
      }
      setMsgs((s) => [...s, { id: Date.now() + 1, role: "assistant", text: res.reply, actions: res.actions }]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) lock();
      const text = e instanceof ApiError ? e.message : "Something went wrong.";
      setMsgs((s) => [...s, { id: Date.now() + 1, role: "assistant", text, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer desktop={desktop} labelledBy="asT" onClose={onClose} wide glow="var(--teal)">
      <div className="sheet-title">
        <span className="k">Assistant · knows your ledger</span>
        <h3 id="asT">Ask Claude</h3>
      </div>
      <div className="seg full" role="group" aria-label="Mode">
        <button type="button" className={mode === "log" ? "on" : ""} aria-pressed={mode === "log"} onClick={() => setMode("log")}>
          Log in words
        </button>
        <button type="button" className={mode === "ask" ? "on" : ""} aria-pressed={mode === "ask"} onClick={() => setMode("ask")}>
          Ask
        </button>
      </div>

      <div className="chat" ref={listRef} aria-live="polite">
        {!msgs.length && (
          <div className="chat-empty">
            <p>{mode === "log" ? "Tell me what happened and I'll update your stash and raid log." : "Ask anything about your progress. I can see your stash, jobs and raids."}</p>
            <div className="suggest">
              {SUGGEST[mode].map((s) => (
                <button key={s} type="button" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div key={m.id} className={`msg ${m.role} ${m.error ? "err" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}>
              <p>{m.text}</p>
              {m.actions && m.actions.length > 0 && (
                <ul className="acts">
                  {m.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
          {busy && (
            <motion.div key="typing" className="msg assistant typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <i />
              <i />
              <i />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <textarea
          rows={2}
          value={text}
          maxLength={2000}
          placeholder={PLACEHOLDER[mode]}
          aria-label="Message"
          data-autofocus
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
        />
        <button type="submit" className="act primary" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </Drawer>
  );
}
