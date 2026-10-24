import { useEffect, useState } from "react";

/** Small per-device UI preferences (filters, toggles). Falls back to the default if storage is blocked. */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // preference only; nothing to do
    }
  }, [key, value]);
  return [value, setValue] as const;
}
