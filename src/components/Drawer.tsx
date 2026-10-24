import { useEffect, useRef, type ReactNode } from "react";
import { motion, useDragControls, type MotionStyle } from "framer-motion";

interface Props {
  desktop: boolean;
  labelledBy: string;
  onClose: () => void;
  /** Accent colour for the corner glow. */
  glow?: string;
  wide?: boolean;
  children: ReactNode;
}

const SPRING = { type: "spring", damping: 32, stiffness: 340 } as const;

/** Bottom sheet on phones (drag the grip down to close), side drawer on desktop. */
export function Drawer({ desktop, labelledBy, onClose, glow, wide, children }: Props) {
  const drag = useDragControls();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const auto = document.querySelector<HTMLElement>(".sheet [data-autofocus]");
    (auto ?? closeRef.current)?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const hidden = desktop ? { x: 48, opacity: 0 } : { y: "100%" };
  const shown = desktop ? { x: 0, opacity: 1 } : { y: 0 };

  return (
    <>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className={`sheet ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={(glow ? { "--glow": glow } : {}) as unknown as MotionStyle}
        initial={hidden}
        animate={shown}
        exit={hidden}
        transition={SPRING}
        drag={desktop ? false : "y"}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
      >
        <div className="grip" aria-hidden="true" onPointerDown={(e) => drag.start(e)} />
        <button ref={closeRef} type="button" className="close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        {children}
      </motion.div>
    </>
  );
}
