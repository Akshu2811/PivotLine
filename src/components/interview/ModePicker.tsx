"use client";

import { INTERVIEW_MODES, type InterviewMode } from "@/lib/interview";

export function ModePicker({ onPick }: { onPick: (mode: InterviewMode) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {INTERVIEW_MODES.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onPick(m.key)}
          className="rounded-sm border border-panel-edge bg-panel-raised px-5 py-6 text-left transition-colors hover:border-amber"
        >
          <span className="t-h3 block text-amber" style={{ fontFamily: "var(--font-display)", fontSize: 19 }}>
            {m.label}
          </span>
          <span className="mt-2 block text-[13px] leading-[1.5] text-pretty text-amber-dim">
            {m.blurb}
          </span>
        </button>
      ))}
    </div>
  );
}
