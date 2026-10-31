"use client";

import { useEffect, useRef, useState } from "react";
import type { BoothQuestion } from "@/lib/store/interview";

const TYPE_MS = 22;

/**
 * The question on the floor: typed out letter by letter and read aloud with
 * the browser's speech synthesis at the same time, muteable. A new question
 * resets both — the old utterance is cancelled so two questions never
 * overlap in the speaker.
 */
export function QuestionCard({
  question,
  muted,
  onToggleMuted,
}: {
  question: BoothQuestion;
  muted: boolean;
  onToggleMuted: () => void;
}) {
  const [shown, setShown] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setShown(question.text.slice(0, i));
      if (i >= question.text.length) clearInterval(interval);
    }, TYPE_MS);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (!muted) {
        const utterance = new SpeechSynthesisUtterance(question.text);
        utterance.rate = 0.98;
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
    // Only the question identity should restart the reveal/speech — toggling
    // mute mid-question shouldn't retype what's already on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.text]);

  useEffect(() => {
    if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [muted]);

  return (
    <div className="rounded-sm border border-panel-edge bg-panel-raised px-5 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="t-label text-amber-dim">
          {question.mode === "technical"
            ? "Technical"
            : question.mode === "deep-dive"
              ? "Project deep dive"
              : "Behavior"}{" "}
          · DIFFICULTY {question.difficulty}/5
        </span>
        <button
          type="button"
          onClick={onToggleMuted}
          className="t-mono rounded-sm border px-2.5 py-1 text-[10px] transition-colors"
          style={{
            borderColor: "var(--color-panel-edge)",
            color: "var(--color-amber-dim)",
          }}
        >
          {muted ? "UNMUTE" : "MUTE"}
        </button>
      </div>

      {question.targetStationNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {question.targetStationNames.map((name) => (
            <span
              key={name}
              className="t-mono rounded-sm border px-2 py-0.5 text-[10px]"
              style={{ borderColor: "var(--color-amber-dim)", color: "var(--color-amber-dim)" }}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <p className="mt-5 min-h-[3lh] text-[22px] leading-[1.4] text-pretty text-amber lg:text-[26px]">
        {shown}
        <span className="animate-pulse">{shown.length < question.text.length ? "▌" : ""}</span>
      </p>
    </div>
  );
}
