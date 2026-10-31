"use client";

import { motion } from "framer-motion";

const BARS = 12;
const SIZE = 52;
const R_INNER = 13; // bars start here, on the ring
const BAR_MAX = 9; // full-height bar length
const BAR_W = 2.5;

/**
 * Twelve bars standing on a ring. Each bar is a rect drawn pointing up from the
 * ring and then rotated into place about the centre, so `scaleY` from its own
 * bottom edge grows it outward — rotating a scaled line about an arbitrary
 * origin does not survive SVG's transform resolution and scatters the bars.
 *
 * Animates only while text is arriving; otherwise it holds a static part-lit
 * state so the dock reads as idle rather than broken.
 */
export function WaveformRing({ active }: { active: boolean }) {
  const c = SIZE / 2;

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle
          cx={c}
          cy={c}
          r={R_INNER - 3.5}
          fill="none"
          stroke={active ? "var(--color-amber)" : "var(--color-amber-dim)"}
          strokeWidth={1.5}
        />
        {Array.from({ length: BARS }).map((_, i) => (
          // The rotation lives on the group, not the rect: Framer animates
          // scaleY via the CSS `transform` property, which would otherwise
          // override the rect's SVG `transform` attribute and stack all twelve
          // bars at zero degrees.
          <g key={i} transform={`rotate(${(i * 360) / BARS} ${c} ${c})`}>
            <motion.rect
              x={c - BAR_W / 2}
              y={c - R_INNER - BAR_MAX}
              width={BAR_W}
              height={BAR_MAX}
              fill={active ? "var(--color-amber)" : "var(--color-amber-dim)"}
              style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
              animate={
                active
                  ? {
                      scaleY: [0.3, 1, 0.45, 0.85, 0.3],
                      opacity: [0.6, 1, 0.75, 1, 0.6],
                    }
                  : { scaleY: 0.5, opacity: 0.9 }
              }
              transition={
                active
                  ? {
                      duration: 0.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (i % 6) * 0.06,
                    }
                  : { duration: 0.2 }
              }
            />
          </g>
        ))}
      </svg>
      <span className="sr-only">
        {active ? "Receiving dictation" : "Microphone idle"}
      </span>
    </div>
  );
}
