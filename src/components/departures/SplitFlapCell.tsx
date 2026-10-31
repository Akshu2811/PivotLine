"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * One mechanical character cell. Only the glyph flips — the cell's face color
 * is set by the caller, so a status column can tint itself without the
 * animation knowing anything about status. `size` is the font-size in px that
 * the cell's box and glyph both scale from, so a column can run smaller than
 * the rest of the board without a separate set of dimension classes.
 */
export function SplitFlapCell({
  char,
  color = "var(--color-amber-dim)",
  size = 15,
}: {
  char: string;
  color?: string;
  size?: number;
}) {
  const display = char === " " ? " " : char;
  const width = size * 0.92;
  const height = size * 1.5;
  const glyphSize = Math.round(size * 0.8);

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-panel-edge bg-panel-raised"
      style={{ width, height, perspective: "220px" }}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={display}
          initial={{ rotateX: -100, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 100, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          style={{ color, fontSize: glyphSize }}
          className="t-mono absolute inset-0 flex items-center justify-center font-semibold"
        >
          {display}
        </motion.span>
      </AnimatePresence>
      {/* The seam between the two mechanical halves. */}
      <span className="pointer-events-none absolute top-1/2 left-0 h-[1px] w-full bg-black/40" />
    </span>
  );
}
