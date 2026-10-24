import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { unknownItem, useGame } from "./gamedata";
import { DEFAULT_PLAN, advise, needsIndex, type Plan } from "./logic";
import { useLedger } from "./store";

interface UiState {
  /** Item open in the detail panel. */
  item: string | null;
  plan: Plan;
  open: (id: string) => void;
  close: () => void;
  setPlan: (p: Partial<Plan>) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      item: null,
      plan: DEFAULT_PLAN,
      open: (id) => set({ item: id }),
      close: () => set({ item: null }),
      setPlan: (p) => set((s) => ({ plan: { ...s.plan, ...p } })),
    }),
    { name: "topside-ledger:ui", partialize: (s) => ({ plan: s.plan }) },
  ),
);

/** Advisor rows for the whole stash, recomputed when progress, game data or the plan changes. */
export function useAdvice() {
  const { inv, lvl, quest, reserve } = useLedger();
  const { data, items } = useGame();
  const plan = useUi((s) => s.plan);
  return useMemo(() => (data ? advise({ inv, lvl, quest, reserve }, data, items, plan, unknownItem) : []), [inv, lvl, quest, reserve, data, items, plan]);
}

/** Per-item list of what still needs it, under the current plan. */
export function useNeeds() {
  const { inv, lvl, quest, reserve } = useLedger();
  const data = useGame((s) => s.data);
  const plan = useUi((s) => s.plan);
  return useMemo(() => (data ? needsIndex({ inv, lvl, quest, reserve }, data, plan) : new Map()), [inv, lvl, quest, reserve, data, plan]);
}
