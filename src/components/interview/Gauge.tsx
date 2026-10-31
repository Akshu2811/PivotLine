"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A semicircle gauge, 1-5. The track is the full arc; the fill draws to
 * `score / 5` of it and animates in whenever the score changes, which is what
 * "fills up" means here — there is no partial credit drawn mid-criterion.
 */
export function Gauge({
  score,
  max = 5,
  label,
  size = 96,
  color = "var(--color-amber)",
}: {
  score: number;
  max?: number;
  label: string;
  size?: number;
  color?: string;
}) {
  const r = size / 2 - 7;
  const cx = size / 2;
  const cy = size / 2;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fraction = Math.min(1, Math.max(0, score / max));

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <path d={path} fill="none" stroke="var(--color-panel-edge)" strokeWidth={8} strokeLinecap="round" />
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: fraction }}
          transition={{ duration: 0.7, ease: EASE }}
        />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill="var(--color-amber)"
          style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600 }}
        >
          {score}
        </text>
      </svg>
      <span className="t-label mt-1 text-center text-amber-dim" style={{ fontSize: 9.5 }}>
        {label}
      </span>
    </div>
  );
}
