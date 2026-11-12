"use client";

import { motion } from "framer-motion";
import type { TagStat } from "@/lib/applications";

const EASE = [0.16, 1, 0.3, 1] as const;
/** One series, one job (magnitude) — a single hue, not a categorical ramp. */
const BAR_COLOR = "var(--color-amber)";

/**
 * Response rate per tag. A single series of magnitudes, so one hue for every
 * bar rather than a categorical palette — identity here is the tag label,
 * not the color.
 */
export function ResponseRateChart({ stats }: { stats: TagStat[] }) {
  const top = stats.slice(0, 8);

  return (
    <section className="overflow-hidden rounded-sm border border-panel-edge bg-panel">
      <header className="flex items-center gap-3 border-b border-panel-edge px-5 py-3">
        <span className="t-label text-amber">Response rate by tag</span>
        <span className="t-mono ml-auto text-[10px] text-amber-dim">
          {top.length} {top.length === 1 ? "TAG" : "TAGS"}
        </span>
      </header>

      <div className="px-5 py-4">
        <ul className="flex flex-col gap-3" aria-label="Response rate by tag">
          {top.map((stat) => (
            <li key={stat.tag} className="flex items-center gap-3">
              <span
                className="t-mono w-[92px] shrink-0 truncate text-[11px] text-[#D8CFBA]"
                title={stat.tag}
              >
                {stat.tag.toUpperCase()}
              </span>
              <span
                className="relative h-[14px] min-w-0 flex-1 rounded-[4px] bg-panel-raised"
                role="img"
                aria-label={`${stat.tag}: ${stat.responded} of ${stat.total} responded, ${Math.round(stat.rate * 100)}%`}
              >
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-[4px]"
                  style={{ background: BAR_COLOR }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(stat.rate * 100)}%` }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              </span>
              <span className="t-mono w-[100px] shrink-0 text-right whitespace-nowrap text-[11px] text-amber-dim">
                {stat.responded}/{stat.total} · {Math.round(stat.rate * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
