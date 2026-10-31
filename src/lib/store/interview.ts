"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type InterviewAnswer,
  type InterviewMode,
  type InterviewScores,
  overallOf,
} from "@/lib/interview";

/**
 * The interview booth's session state: which mode is live, the question on
 * the floor, and the log of scored answers. Persisted so past answers survive
 * a reload — re-scoring costs a model call.
 */

export type BoothQuestion = {
  text: string;
  mode: InterviewMode;
  difficulty: number;
  targetStationIds: string[];
  targetStationNames: string[];
};

type InterviewState = {
  mode: InterviewMode | null;
  question: BoothQuestion | null;
  answers: InterviewAnswer[];
  muted: boolean;

  setMode: (mode: InterviewMode | null) => void;
  setQuestion: (question: BoothQuestion) => void;
  recordAnswer: (answerText: string, scores: InterviewScores) => void;
  toggleMuted: () => void;
  reset: () => void;
};

function stamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const INITIAL = {
  mode: null as InterviewMode | null,
  question: null as BoothQuestion | null,
  answers: [] as InterviewAnswer[],
  muted: false,
};

export const useInterview = create<InterviewState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setMode: (mode) => set({ mode, question: null }),

      setQuestion: (question) => set({ question }),

      recordAnswer: (answerText, scores) => {
        const { question } = get();
        if (!question) return;
        const record: InterviewAnswer = {
          id: Date.now(),
          at: stamp(),
          mode: question.mode,
          questionText: question.text,
          difficulty: question.difficulty,
          targetStationIds: question.targetStationIds,
          targetStationNames: question.targetStationNames,
          answerText,
          scores,
          overall: overallOf(scores),
        };
        set((s) => ({ answers: [record, ...s.answers], question: null }));
      },

      toggleMuted: () => set((s) => ({ muted: !s.muted })),

      reset: () => set(INITIAL),
    }),
    { name: "pivotline:interview" },
  ),
);
