"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { AnswerLog } from "@/components/interview/AnswerLog";
import { ModePicker } from "@/components/interview/ModePicker";
import { QuestionCard } from "@/components/interview/QuestionCard";
import { ScoreCard } from "@/components/interview/ScoreCard";
import { DEMO_ANSWER, type InterviewMode } from "@/lib/interview";
import { DEMO_SKILL_MAP, mainLine, type SkillMap } from "@/lib/skillMap";
import { STATIONS } from "@/lib/stations";
import { useInterview } from "@/lib/store/interview";
import { useProfile } from "@/lib/store/profile";
import { useSkillMap } from "@/lib/store/skillMap";
import { useVoiceHandler } from "@/lib/store/voiceDock";

const STATION = STATIONS[4];

type Status = "idle" | "loading" | "asking" | "scoring" | "scored";

/**
 * Interview Booth (IB5) — a dark, fullscreen mock-interview room. Three modes,
 * one question at a time, typed out and read aloud. Answers come in through
 * the shared voice dock and get scored against a five-criterion rubric at
 * medium reasoning effort; the gauges and the log are read back from that
 * score, never asserted separately.
 */
export default function InterviewBoothPage() {
  const mode = useInterview((s) => s.mode);
  const question = useInterview((s) => s.question);
  const storedAnswers = useInterview((s) => s.answers);
  const muted = useInterview((s) => s.muted);
  const setMode = useInterview((s) => s.setMode);
  const setQuestion = useInterview((s) => s.setQuestion);
  const recordAnswer = useInterview((s) => s.recordAnswer);
  const toggleMuted = useInterview((s) => s.toggleMuted);

  const storedMap = useSkillMap((s) => s.map);
  const surveyed = useSkillMap((s) => s.surveyed);
  const profile = useProfile((s) => s.profile);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hydrated = useSyncExternalStore(
    (onChange) => useInterview.persist.onFinishHydration(onChange),
    () => useInterview.persist.hasHydrated(),
    () => false,
  );

  const map: SkillMap = surveyed && storedMap ? storedMap : DEMO_SKILL_MAP;
  const targetRole = profile?.targetRole ?? map.targetRole;
  const ahead = mainLine(map);
  const stationIdByName = useMemo(
    () => new Map(map.skills.map((s) => [s.name, s.id])),
    [map],
  );

  const isReal = hydrated && storedAnswers.length > 0;
  const answers = isReal ? storedAnswers : [DEMO_ANSWER];
  const lastScoredAnswer = isReal && status === "scored" ? storedAnswers[0] : null;

  const askQuestion = useCallback(
    async (nextMode: InterviewMode) => {
      setStatus("loading");
      setError(null);
      setNotice(null);
      try {
        const history = useInterview
          .getState()
          .answers.filter((a) => a.mode === nextMode)
          .slice(0, 5)
          .map((a) => ({ question: a.questionText, overall: a.overall }));

        const response = await fetch("/api/interview/question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: nextMode,
            targetRole,
            stationNames: ahead.map((s) => s.name),
            history,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || `Could not draw up a question (${response.status}).`);
        }

        const draft = data.draft as {
          question: string;
          difficulty: number;
          targetStationNames: string[];
        };
        const targetStationNames = draft.targetStationNames.filter((n) => stationIdByName.has(n));

        setQuestion({
          text: draft.question,
          mode: nextMode,
          difficulty: draft.difficulty,
          targetStationIds: targetStationNames.map((n) => stationIdByName.get(n)!).filter(Boolean),
          targetStationNames,
        });
        setStatus("asking");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        setStatus("idle");
      }
    },
    [targetRole, ahead, stationIdByName, setQuestion],
  );

  const handleVoice = useCallback(
    async (text: string) => {
      const live = useInterview.getState().question;
      if (!live) {
        setNotice("Ask for a question first, then answer it into the dock.");
        return;
      }
      setStatus("scoring");
      setError(null);
      try {
        const response = await fetch("/api/interview/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: live.mode,
            targetRole,
            question: live.text,
            answer: text,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || `Could not score that answer (${response.status}).`);
        }
        recordAnswer(text, data.scores);
        setStatus("scored");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        setStatus("asking");
      }
    },
    [targetRole, recordAnswer],
  );

  useVoiceHandler(STATION.href, handleVoice);

  const next = STATIONS[(STATIONS.findIndex((s) => s.href === STATION.href) + 1) % STATIONS.length];

  return (
    <div className="min-h-full bg-panel px-5 pt-7 pb-10 lg:px-10 lg:pt-10 lg:pb-12">
      <div className="mx-auto max-w-[900px]">
        <header className="pb-6 lg:pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge" style={{ background: "var(--color-talk)", color: "#17150F" }}>
              Interview Line
            </span>
            <span className="t-mono text-[11px] text-amber-dim">PLATFORM {STATION.code}</span>
          </div>
          <h1
            className="mt-6 text-[38px] leading-[0.95] text-amber lg:mt-8 lg:text-[52px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {STATION.name}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-pretty text-amber-dim">
            A soundproof booth on the platform. Pick a mode, answer out loud through the
            dock below, and get scored on substance — never on how polished it sounded.
          </p>
        </header>

        {!mode && (
          <ModePicker
            onPick={(m) => {
              setMode(m);
              void askQuestion(m);
            }}
          />
        )}

        {mode && (
          <div className="flex flex-wrap items-center gap-3 pb-5">
            <span className="t-label text-amber-dim">
              {mode === "technical" ? "Technical" : mode === "deep-dive" ? "Project deep dive" : "Behavior"}
            </span>
            <button
              type="button"
              className="t-mono text-[10px] text-amber-dim underline-offset-2 hover:text-amber hover:underline"
              onClick={() => {
                setMode(null);
                setStatus("idle");
                setError(null);
                setNotice(null);
              }}
            >
              Change mode
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-sm border border-panel-edge bg-panel-raised px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-talk)" }}>
            <div className="t-label text-amber">Booth went quiet</div>
            <p className="mt-2 max-w-[70ch] text-[13px] text-pretty text-amber-dim">{error}</p>
          </div>
        )}

        {notice && !error && (
          <div className="mb-5 rounded-sm border border-panel-edge bg-panel-raised px-5 py-3.5">
            <p className="text-[13px] text-pretty text-amber-dim">{notice}</p>
          </div>
        )}

        {mode && status === "loading" && (
          <div className="mb-5 flex items-center gap-3 rounded-sm border border-panel-edge bg-panel-raised px-5 py-4">
            <span className="h-[9px] w-[9px] shrink-0 animate-pulse rounded-full bg-amber" />
            <span className="t-small text-amber-dim">Drawing up the next question…</span>
          </div>
        )}

        {mode && question && (status === "asking" || status === "scoring") && (
          <div className="mb-5">
            <QuestionCard
              key={question.text}
              question={question}
              muted={muted}
              onToggleMuted={toggleMuted}
            />
            {status === "scoring" && (
              <div className="mt-3 flex items-center gap-3 px-1">
                <span className="h-[9px] w-[9px] shrink-0 animate-pulse rounded-full bg-amber" />
                <span className="t-small text-amber-dim">Scoring your answer…</span>
              </div>
            )}
          </div>
        )}

        {mode && status === "scored" && lastScoredAnswer && (
          <div className="mb-5 flex flex-col gap-4">
            <ScoreCard scores={lastScoredAnswer.scores} overall={lastScoredAnswer.overall} />
            <button type="button" className="btn self-start" onClick={() => void askQuestion(mode)}>
              Next question
            </button>
          </div>
        )}

        {mode && status === "idle" && !error && (
          <button type="button" className="btn mb-5" onClick={() => void askQuestion(mode)}>
            Ask a question
          </button>
        )}

        <div className="mt-2">
          <AnswerLog answers={answers} />
          {!isReal && (
            <p className="mt-3 text-[12px] text-pretty text-amber-dim">
              The answer above is a seeded example so the scoring view is explorable before
              you&apos;ve answered anything — your own answers will replace it here.
            </p>
          )}
        </div>

        <a
          href={next.href}
          className="mt-8 flex items-center gap-4 border-t border-panel-edge pt-5 text-amber-dim transition-colors hover:text-amber"
        >
          <span className="t-label shrink-0">Next stop</span>
          <span className="block h-[2px] flex-1 bg-panel-edge" />
          <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: 19 }}>
            {next.name}
          </span>
          <span className="t-mono shrink-0 text-[10px]">{next.code}</span>
        </a>
      </div>
    </div>
  );
}
