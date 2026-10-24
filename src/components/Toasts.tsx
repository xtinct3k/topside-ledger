export interface Toast {
  id: number;
  msg: string;
  err?: boolean;
}

export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.err ? "err" : ""}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
