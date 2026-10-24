import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STATIONS } from "./data";

export const STORE_KEY = "topside-ledger:v1";

export interface Progress {
  inv: Record<string, number>;
  lvl: Record<string, number>;
  flag: Record<string, boolean>;
}

interface Ledger extends Progress {
  setInv: (k: string, v: number | string) => void;
  setLvl: (k: string, v: number) => void;
  toggleFlag: (k: string) => void;
  replace: (p: unknown) => void;
  reset: () => void;
}

const count = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
const maxLevel = (k: string) => STATIONS.find((s) => s.id === k)?.max ?? 4;

/** Coerce anything (old saves, imported files) into a clean Progress. */
export function sanitize(o: unknown): Progress {
  const out: Progress = { inv: {}, lvl: {}, flag: {} };
  if (!o || typeof o !== "object") return out;
  const src = o as Partial<Record<keyof Progress, unknown>>;
  const each = (col: keyof Progress, fn: (k: string, v: unknown) => void) => {
    const m = src[col];
    if (m && typeof m === "object") Object.entries(m).forEach(([k, v]) => fn(k, v));
  };
  each("inv", (k, v) => (out.inv[k] = count(v)));
  each("lvl", (k, v) => (out.lvl[k] = Math.min(count(v), maxLevel(k))));
  each("flag", (k, v) => (out.flag[k] = !!v));
  return out;
}

export const isBackup = (o: unknown) =>
  !!o && typeof o === "object" && ["inv", "lvl", "flag"].some((c) => typeof (o as Record<string, unknown>)[c] === "object");

export const useLedger = create<Ledger>()(
  persist(
    (set) => ({
      inv: {},
      lvl: {},
      flag: {},
      setInv: (k, v) => set((s) => ({ inv: { ...s.inv, [k]: count(v) } })),
      setLvl: (k, v) => set((s) => ({ lvl: { ...s.lvl, [k]: Math.min(count(v), maxLevel(k)) } })),
      toggleFlag: (k) => set((s) => ({ flag: { ...s.flag, [k]: !s.flag[k] } })),
      replace: (p) => set(sanitize(p)),
      reset: () => set({ inv: {}, lvl: {}, flag: {} }),
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ inv, lvl, flag }) => ({ inv, lvl, flag }),
      merge: (saved, current) => ({ ...current, ...sanitize(saved) }),
    },
  ),
);

export function storageWorks() {
  try {
    localStorage.setItem("__tl", "1");
    localStorage.removeItem("__tl");
    return true;
  } catch {
    return false;
  }
}
