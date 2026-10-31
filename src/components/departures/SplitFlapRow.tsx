"use client";

import { SplitFlapCell } from "./SplitFlapCell";

/** A half-open [start, end) range of character indexes within the row. */
export type ColorRange = { start: number; end: number; color: string };

/**
 * A fixed-width line of flap cells. Used for both the board's data rows and
 * its header — the header is just a static row with the same cell grid, so
 * the columns line up without hand-measuring widths.
 */
export function SplitFlapRow({
  value,
  length,
  align = "left",
  defaultColor = "var(--color-amber-dim)",
  colorRanges = [],
}: {
  value: string;
  length: number;
  align?: "left" | "right";
  defaultColor?: string;
  colorRanges?: ColorRange[];
}) {
  const upper = value.toUpperCase().slice(0, length);
  const padded = align === "right" ? upper.padStart(length, " ") : upper.padEnd(length, " ");
  const chars = padded.split("");

  const colorAt = (i: number) => colorRanges.find((r) => i >= r.start && i < r.end)?.color ?? defaultColor;

  return (
    <div className="flex gap-[2px]">
      {chars.map((ch, i) => (
        <SplitFlapCell key={i} char={ch} color={colorAt(i)} />
      ))}
    </div>
  );
}
