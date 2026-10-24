import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { MAX_RAIDS, addToStash, count, maxLevel, newId, raidStashDelta, sanitize, type Ledger, type Progress, type Raid } from "./state.js";

export type { Progress } from "./state.js";

const CACHE_KEY = "topside-ledger:v2";
const LEGACY_KEY = "topside-ledger:v1";

interface LedgerStore extends Progress {
  /** Server revision this copy is based on. */
  rev: number;
  /** Local edits not yet confirmed by the server. */
  unsynced: boolean;
  /** Bumped on every local edit; the sync loop saves when it moves. */
  edits: number;
  setInv: (k: string, v: number | string) => void;
  setLvl: (k: string, v: number) => void;
  toggleFlag: (k: string) => void;
  addRaid: (raid: Omit<Raid, "id">) => void;
  removeRaid: (id: string) => void;
  replace: (p: unknown) => void;
  reset: () => void;
  /** Take the server's copy. Not a local edit, so it never triggers a save. */
  adopt: (l: Ledger) => void;
  markSaved: (rev: number, editsSent: number) => void;
}

const pickProgress = ({ inv, lvl, flag, raids }: Progress): Progress => ({ inv, lvl, flag, raids });
export const progressOf = (s: Progress) => pickProgress(s);

// Read the pre-sync (v1) local save once, so nothing entered before this version is lost.
const storage: StateStorage = {
  getItem: (name) => localStorage.getItem(name) ?? (name === CACHE_KEY ? localStorage.getItem(LEGACY_KEY) : null),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

export const useLedger = create<LedgerStore>()(
  persist(
    (set) => {
      const edit = (fn: (s: LedgerStore) => Partial<Progress>) => set((s) => ({ ...fn(s), unsynced: true, edits: s.edits + 1 }));
      return {
        inv: {},
        lvl: {},
        flag: {},
        raids: [],
        rev: 0,
        unsynced: false,
        edits: 0,
        setInv: (k, v) => edit((s) => ({ inv: addToStash({ ...s.inv, [k]: 0 }, [{ id: k, n: count(v) }]) })),
        setLvl: (k, v) => edit((s) => ({ lvl: { ...s.lvl, [k]: Math.min(count(v), maxLevel(k)) } })),
        toggleFlag: (k) => edit((s) => ({ flag: { ...s.flag, [k]: !s.flag[k] } })),
        addRaid: (r) =>
          edit((s) => {
            const raid: Raid = { ...r, id: newId() };
            return { raids: [raid, ...s.raids].slice(0, MAX_RAIDS), inv: addToStash(s.inv, raidStashDelta(raid)) };
          }),
        removeRaid: (id) =>
          edit((s) => {
            const raid = s.raids.find((r) => r.id === id);
            return raid ? { raids: s.raids.filter((r) => r.id !== id), inv: addToStash(s.inv, raidStashDelta(raid), -1) } : {};
          }),
        replace: (p) => edit(() => sanitize(p)),
        reset: () => edit(() => ({ inv: {}, lvl: {}, flag: {}, raids: [] })),
        adopt: (l) => set({ ...sanitize(l), rev: l.rev, unsynced: false }),
        markSaved: (rev, editsSent) => set((s) => ({ rev, unsynced: s.edits !== editsSent })),
      };
    },
    {
      name: CACHE_KEY,
      version: 2,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({ ...pickProgress(s), rev: s.rev, unsynced: s.unsynced }),
      migrate: (saved) => ({ ...sanitize(saved), rev: 0, unsynced: false }),
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<LedgerStore>;
        return { ...current, ...sanitize(saved), rev: Number(s.rev) || 0, unsynced: !!s.unsynced };
      },
    },
  ),
);

export const isBackup = (o: unknown) =>
  !!o && typeof o === "object" && ["inv", "lvl", "flag", "raids"].some((c) => typeof (o as Record<string, unknown>)[c] === "object");
