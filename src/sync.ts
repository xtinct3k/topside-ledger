import { create } from "zustand";
import { ApiError, api, getPass, setPass } from "./api.js";
import { isEmpty, type Ledger } from "./state.js";
import { progressOf, useLedger } from "./store.js";

export type Phase = "locked" | "unconfigured" | "loading" | "synced" | "saving" | "offline";

// With a remembered password, show the cached ledger straight away while connecting.
export const useSync = create<{ phase: Phase; message: string }>(() => ({ phase: getPass() ? "loading" : "locked", message: "" }));
const setPhase = (phase: Phase, message = "") => useSync.setState({ phase, message });

interface Hooks {
  notify: (msg: string, err?: boolean) => void;
  /** Called before data arrives from elsewhere, so "ready to build" toasts stay quiet. */
  hush: () => void;
}
let hooks: Hooks = { notify: () => {}, hush: () => {} };
let timer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<void> | null = null;

const live = () => ["synced", "saving", "offline"].includes(useSync.getState().phase);

function adopt(l: Ledger) {
  hooks.hush();
  useLedger.getState().adopt(l);
}

function fail(e: unknown) {
  if (e instanceof ApiError && e.status === 401) {
    setPass("");
    setPhase("locked", "Wrong password.");
  } else if (e instanceof ApiError && (e.code === "not_configured" || e.code === "storage_missing")) {
    setPhase("unconfigured", e.message);
  } else {
    setPhase("offline", "Offline. Changes stay on this device and sync when you're back.");
  }
}

async function push() {
  const s = useLedger.getState();
  const sent = s.edits;
  setPhase("saving");
  try {
    const l = await api<Ledger>("/api/state", { method: "PUT", body: { state: progressOf(s), baseRev: s.rev } });
    useLedger.getState().markSaved(l.rev, sent);
    setPhase("synced");
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.data.ledger) {
      adopt(e.data.ledger as Ledger);
      hooks.notify("Another device changed your ledger, so its version was loaded.", true);
      setPhase("synced");
    } else fail(e);
  }
}

/** Save now, waiting for any save already running. */
export async function flush() {
  clearTimeout(timer);
  if (inflight) await inflight;
  if (!useLedger.getState().unsynced || !live()) return;
  inflight = push().finally(() => (inflight = null));
  await inflight;
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), 700);
}

/** Load the server copy, or upload this device's copy if it has unsaved edits or the server is empty. */
export async function connect() {
  if (!getPass()) return setPhase("locked");
  if (!live()) setPhase("loading");
  try {
    const server = await api<Ledger>("/api/state");
    const local = useLedger.getState();
    // First run against an empty server: upload what this device already has.
    const seed = server.rev === 0 && isEmpty(server) && !isEmpty(local);
    if (seed) useLedger.setState({ rev: 0, unsynced: true });
    if (seed || local.unsynced) {
      setPhase("synced");
      await flush();
    } else {
      adopt(server);
      setPhase("synced");
    }
  } catch (e) {
    fail(e);
  }
}

export function lock() {
  setPass("");
  setPhase("locked");
}

/** Wire up autosave and refresh-on-focus. Returns a cleanup function. */
export function startSync(h: Hooks) {
  hooks = h;
  const unsub = useLedger.subscribe((s, prev) => {
    if (s.edits !== prev.edits && live()) schedule();
  });
  const refresh = () => {
    if (document.visibilityState !== "visible" || inflight || !getPass()) return;
    if (useLedger.getState().unsynced) void flush();
    else void connect();
  };
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  void connect();
  return () => {
    unsub();
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
