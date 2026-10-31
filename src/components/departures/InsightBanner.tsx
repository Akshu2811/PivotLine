"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The platform announcement: one plan change the response-rate numbers
 * justify, with an Apply button that actually drops the task into the
 * timetable. Nothing moves until the user presses it.
 */
export function InsightBanner({
  announcement,
  applied,
  canApply,
  disabledReason,
  onApply,
}: {
  announcement: string;
  applied: boolean;
  canApply: boolean;
  disabledReason?: string;
  onApply: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="overflow-hidden rounded-sm border border-panel-edge bg-panel"
    >
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <motion.span
          aria-hidden="true"
          className="block h-[9px] w-[9px] shrink-0 rounded-full"
          style={{ background: "var(--color-amber)" }}
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="min-w-0 flex-1">
          <span className="t-label block text-amber">Platform announcement</span>
          <p className="t-small mt-1.5 max-w-[65ch] text-pretty text-[#D8CFBA]">{announcement}</p>
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={applied || !canApply}
          className="shrink-0 rounded-sm border px-4 py-2 text-[13px] font-semibold tracking-wide transition-colors disabled:cursor-not-allowed"
          style={{
            borderColor: applied ? "var(--color-panel-edge)" : "var(--color-amber)",
            background: applied ? "transparent" : "var(--color-amber)",
            color: applied ? "var(--color-amber-dim)" : "#17150F",
          }}
        >
          {applied ? "Applied" : "Apply"}
        </button>
      </div>
      {!canApply && !applied && disabledReason && (
        <p className="t-small border-t border-panel-edge px-5 py-3 text-amber-dim">{disabledReason}</p>
      )}
    </motion.section>
  );
}
