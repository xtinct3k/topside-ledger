import type { Variants } from "framer-motion";

export const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
