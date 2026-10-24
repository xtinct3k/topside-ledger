import { AnimatePresence, motion } from "framer-motion";

export interface Toast {
  id: number;
  msg: string;
  err?: boolean;
}

export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast ${t.err ? "err" : ""}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
