"use client";

import type { InterviewAnswer } from "@/lib/interview";

const MODE_LABEL: Record<InterviewAnswer["mode"], string> = {
  technical: "Technical",
  "deep-dive": "Deep dive",
  behavioral: "Behavior",
};

/** The plain log of past answers and their overall scores, newest first. */
export function AnswerLog({ answers }: { answers: InterviewAnswer[] }) {
  if (answers.length === 0) return null;

  return (
    <section className="rounded-sm border border-panel-edge bg-panel-raised">
      <div className="flex items-center justify-between gap-3 border-b border-panel-edge px-5 py-3">
        <span className="t-label text-amber">On the record</span>
        <span className="t-mono text-[10px] text-amber-dim">
          {String(answers.length).padStart(2, "0")} ANSWERED
        </span>
      </div>
      <ul>
        {answers.map((a) => (
          <li
            key={a.id}
            className="flex items-start gap-4 border-b border-panel-edge px-5 py-3.5 last:border-b-0"
          >
            <span className="t-mono shrink-0 pt-[2px] text-[10px] text-amber-dim">{a.at}</span>
            <span className="t-mono shrink-0 pt-[2px] text-[10px] text-amber-dim">
              {MODE_LABEL[a.mode]}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[#D9CFAE]">
              {a.questionText}
            </span>
            <span className="t-mono shrink-0 text-[11px] text-amber">{a.overall}/5</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
