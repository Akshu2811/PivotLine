"use client";

import { motion } from "framer-motion";
import { Gauge } from "./Gauge";
import { CRITERIA, type InterviewScores } from "@/lib/interview";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Five filling gauges, the overall figure, and the per-criterion breakdown. */
export function ScoreCard({
  scores,
  overall,
}: {
  scores: InterviewScores;
  overall: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="rounded-sm border border-panel-edge bg-panel-raised"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-panel-edge px-5 py-4">
        <span className="t-label text-amber">On the record</span>
        <div className="flex items-baseline gap-2">
          <span className="t-mono-lg text-amber">{overall}</span>
          <span className="t-mono text-[11px] text-amber-dim">/ 5 OVERALL</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-around gap-4 px-5 py-6">
        {CRITERIA.map((c) => (
          <Gauge key={c.key} score={scores[c.key].score} label={c.label} />
        ))}
      </div>

      <div className="border-t border-panel-edge">
        {CRITERIA.map((c) => {
          const r = scores[c.key];
          return (
            <div key={c.key} className="border-b border-panel-edge px-5 py-4 last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span className="t-label text-amber">{c.label}</span>
                <span className="t-mono text-[11px] text-amber-dim">{r.score}/5</span>
              </div>
              <p className="mt-2 text-[13px] leading-[1.5] text-pretty text-[#D9CFAE]">
                &ldquo;{r.evidence}&rdquo;
              </p>
              <p className="mt-2 text-[12px] leading-[1.5] text-pretty text-amber-dim">
                <span className="font-semibold text-amber">Biggest fix — </span>
                {r.fix}
              </p>
              <p className="mt-2 text-[12px] leading-[1.5] text-pretty text-amber-dim">
                <span className="font-semibold text-amber">A stronger answer — </span>
                {r.strongerExample}
              </p>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
