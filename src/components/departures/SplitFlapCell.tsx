"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * One mechanical character cell. Only the glyph flips — the cell's face color
 * is set by the caller, so a status column can tint itself without the
 * animation knowing anything about status.
 */
export function SplitFlapCell({
  char,
  color = "var(--color-amber-dim)",
}: {
  char: string;
  color?: string;
}) {
  const display = char === " " ? " " : char;

  return (
    <span
      className="relative inline-flex h-[1.5em] w-[0.92em] shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-panel-edge bg-panel-raised"
      style={{ perspective: "220px" }}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={display}
          initial={{ rotateX: -100, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 100, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          style={{ color }}
          className="t-mono absolute inset-0 flex items-center justify-center text-[12px] font-semibold"
        >
          {display}
        </motion.span>
      </AnimatePresence>
      {/* The seam between the two mechanical halves. */}
      <span className="pointer-events-none absolute top-1/2 left-0 h-[1px] w-full bg-black/40" />
    </span>
  );
}
