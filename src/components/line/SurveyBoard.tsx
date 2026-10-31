"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export type Announcement = {
  id: number;
  /** The announcement itself, written the way a station board phrases things. */
  text: string;
  /** Mono slug on the left, e.g. "03/06". */
  tag: string;
};

/**
 * The survey takes the better part of a minute and makes seven model calls, so
 * the wait is staffed rather than left silent: every line here is a real event
 * from the server — a posting actually read, the mapping stage actually
 * starting — announced as it happens.
 *
 * Styled as the station board rather than a progress bar: dark panel, amber
 * mono, newest line at the top with the flap still settling.
 */
export function SurveyBoard({
  announcements,
  done,
  total,
  phase,
}: {
  announcements: Announcement[];
  done: number;
  total: number;
  phase: "extracting" | "mapping";
}) {
  const elapsed = useElapsed();
  // Mapping is one long call, so the bar holds at full while it runs rather
  // than pretending to know how far through it is.
  const progress = total > 0 ? (phase === "mapping" ? 1 : done / total) : 0;

  return (
    <section
      aria-live="polite"
      aria-label="Survey progress"
      className="mt-5 overflow-hidden rounded-sm border border-panel-edge bg-panel"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-panel-edge px-5 py-3">
        <motion.span
          aria-hidden="true"
          className="block h-[9px] w-[9px] shrink-0 rounded-full"
          style={{ background: "var(--color-amber)" }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="t-label text-amber">Survey in progress</span>
        <span className="t-mono ml-auto text-[10px] text-amber-dim">
          {phase === "mapping" ? "MAPPING" : `${pad(done)}/${pad(total)} READ`} ·{" "}
          {elapsed}
        </span>
      </header>

      {/* Progress rule, in the line's own colour. */}
      <div className="h-[3px] w-full bg-panel-raised">
        <motion.div
          className="h-full"
          style={{ background: "var(--color-pivot)", transformOrigin: "left" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>

      <ul className="px-5 py-3">
        <AnimatePresence initial={false}>
          {announcements.map((a, i) => (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: i === 0 ? 1 : 0.55, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-baseline gap-3 py-[5px]"
            >
              <span className="t-mono shrink-0 text-[10px] text-amber-dim">{a.tag}</span>
              <span
                className="t-mono min-w-0 text-[12px]"
                style={{ color: i === 0 ? "var(--color-amber)" : "#C9BFA6" }}
              >
                {a.text}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** MM:SS since mount. The board only mounts while a survey is running. */
function useElapsed(): string {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}
