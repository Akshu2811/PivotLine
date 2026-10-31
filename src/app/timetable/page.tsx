"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { CheckInDiff } from "@/components/timetable/CheckInDiff";
import { Timetable } from "@/components/timetable/Timetable";
import { EmptyState, Screen, Stat } from "@/components/ui/Screen";
import type { CheckInProposal } from "@/lib/checkIn";
import { DEMO_PLAN, type LearningPlan, planProgress, weekHours } from "@/lib/plan";
import { DEMO_SKILL_MAP } from "@/lib/skillMap";
import { STATIONS } from "@/lib/stations";
import { usePlan } from "@/lib/store/plan";
import { useProfile } from "@/lib/store/profile";
import { useSkillMap } from "@/lib/store/skillMap";
import { useVoiceHandler } from "@/lib/store/voiceDock";

const STATION = STATIONS[2];
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Timetable (TT3) — the plan, and the weekly check-in that keeps it honest.
 *
 * Dictating into the dock here is a check-in: how the week actually went. The
 * reply is an amendment to approve, not an edit that has already happened.
 */
export default function TimetablePage() {
  const storedPlan = usePlan((s) => s.plan);
  const planned = usePlan((s) => s.planned);
  const pending = usePlan((s) => s.pending);
  const checkIns = usePlan((s) => s.checkIns);
  const acceptedCount = usePlan((s) => s.acceptedProjectIds.length);
  const setPlan = usePlan((s) => s.setPlan);
  const cycleTask = usePlan((s) => s.cycleTask);
  const propose = usePlan((s) => s.propose);
  const acceptCheckIn = usePlan((s) => s.acceptCheckIn);
  const rejectCheckIn = usePlan((s) => s.rejectCheckIn);

  const storedMap = useSkillMap((s) => s.map);
  const surveyed = useSkillMap((s) => s.surveyed);

  const [building, setBuilding] = useState(false);
  const [checking, setChecking] = useState(false);
  /** Armed by a first click on Rebuild; a rebuild discards ticked-off work. */
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hydrated = useSyncExternalStore(
    (onChange) => usePlan.persist.onFinishHydration(onChange),
    () => usePlan.persist.hasHydrated(),
    () => false,
  );

  const isReal = hydrated && planned && storedPlan !== null;
  const plan: LearningPlan = isReal ? storedPlan : DEMO_PLAN;
  const hasSurvey = hydrated && surveyed && storedMap !== null;

  const progress = planProgress(plan);
  const booked = plan.weeks.reduce((total, w) => total + weekHours(w), 0);

  const buildPlan = useCallback(async () => {
    const map = useSkillMap.getState().map;
    if (!map) {
      setError("Survey some job postings on The Line first — the plan is built from them.");
      return;
    }
    setBuilding(true);
    setConfirmRebuild(false);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          map,
          hoursPerWeek: useProfile.getState().profile?.constraints.hoursPerWeek ?? 6,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.error || `Could not build the plan (${response.status}).`);
      }
      setPlan(data.plan as LearningPlan);
      setNotice("Plan built. Dictate a check-in at the end of each week to keep it current.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBuilding(false);
    }
  }, [setPlan]);

  /** Dock input on this screen is the weekly check-in. */
  const handleVoice = useCallback(
    async (text: string) => {
      const current = usePlan.getState().plan;
      if (!current) {
        setError("Build a plan first — there's nothing yet for a check-in to amend.");
        return;
      }
      setChecking(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            plan: current,
            map: useSkillMap.getState().map,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || `Check-in failed (${response.status}).`);
        }
        propose(data.proposal as CheckInProposal, text);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setChecking(false);
      }
    },
    [propose],
  );

  useVoiceHandler(STATION.href, handleVoice);

  return (
    <Screen
      station={STATION}
      intro="Your plan, printed as a service timetable. One row per week: the theme, the stations it calls at, the work, and the hours it's booked for. Say how a week *actually* went and the remaining weeks are re-timetabled around it."
    >
      {/* Build / rebuild. */}
      <section className="card card-offset overflow-hidden">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-paper-edge bg-paper-sunken px-5 py-3.5">
          <span className="t-label text-ink">
            {isReal ? `Plan · revision ${plan.revision}` : "Sample plan"}
          </span>
          {!isReal && (
            <span className="badge" style={{ background: "var(--color-pivot)", color: "#FAF8F2" }}>
              Sample data
            </span>
          )}
          <span className="t-mono ml-auto text-[10px] text-ink-muted">
            {plan.weeks.length} WEEKS · {plan.hoursPerWeek}H / WEEK
          </span>
        </header>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          {/* A first plan just builds. Replacing one that has work ticked off
              takes a second, deliberate click — same guard as Start fresh on
              the boarding pass. */}
          <button
            type="button"
            className="btn"
            disabled={building}
            onClick={() => {
              if (isReal && !confirmRebuild) {
                setConfirmRebuild(true);
                return;
              }
              void buildPlan();
            }}
          >
            {building
              ? "Building…"
              : !isReal
                ? "Build my plan"
                : confirmRebuild
                  ? "Confirm — discard this plan"
                  : "Rebuild from the line"}
          </button>

          {confirmRebuild && !building && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmRebuild(false)}
            >
              Keep this plan
            </button>
          )}

          <span className="t-small w-full text-ink-muted sm:w-auto sm:min-w-0 sm:flex-1">
            {!hasSurvey
              ? "Survey job postings on The Line first — the plan is built from the gap stations."
              : confirmRebuild
                ? `This replaces the plan entirely: ${progress.done} of ${progress.total} ticked-off ${
                    progress.total === 1 ? "task" : "tasks"
                  }${
                    acceptedCount > 0
                      ? ` and ${acceptedCount} scheduled ${acceptedCount === 1 ? "project" : "projects"}`
                      : ""
                  } will be lost. Check-ins stay in the log.`
                : isReal
                  ? "Rebuilding starts a fresh plan from the current line and discards this one's progress."
                  : "Builds six to eight weeks from your line, inside the hours on your boarding pass."}
          </span>
        </div>
      </section>

      {(building || checking) && (
        <div className="card mt-5 flex items-center gap-4 px-5 py-3.5">
          <motion.span
            aria-hidden="true"
            className="block h-[11px] w-[11px] shrink-0 rounded-full"
            style={{ background: "var(--color-pivot)" }}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="t-label text-ink">
            {building ? "Drawing up the timetable" : "Reading your check-in"}
          </span>
          <span className="t-small min-w-0 flex-1 text-ink-muted">
            {building
              ? "Sequencing the stations into weeks that fit your hours."
              : "Working out what moved, and how the remaining weeks absorb it."}
          </span>
          <span className="t-mono shrink-0 text-[10px] text-ink-muted">TT3</span>
        </div>
      )}

      {error && (
        <div className="card mt-5 border-l-[4px] border-l-pivot px-5 py-4">
          <div className="t-label text-ink">Timetable unchanged</div>
          <p className="t-small mt-2 max-w-[70ch] text-pretty text-ink-soft">{error}</p>
        </div>
      )}

      {notice && !error && (
        <div className="card mt-5 px-5 py-3.5">
          <p className="t-small text-pretty text-ink-soft">{notice}</p>
        </div>
      )}

      {pending && isReal && (
        <CheckInDiff
          proposal={pending}
          plan={plan}
          busy={checking}
          onAccept={() => {
            acceptCheckIn();
            setNotice("Amendment applied. Your line and timetable both moved.");
          }}
          onReject={() => {
            rejectCheckIn();
            setNotice("Amendment rejected. The check-in is still in the log.");
          }}
        />
      )}

      {!isReal && (
        <div className="mt-6">
          <EmptyState
            line={STATION.line}
            heading="No timetable drawn up yet."
            sayThis={[
              "I finished the RAG course, skipped Docker, and only had four hours this week.",
              "Week three went fine but the eval set took way longer than planned.",
              "I didn't touch any of it — work was brutal.",
            ]}
            notes="These are check-ins, not commands. Say what actually happened and the remaining weeks get re-timetabled — you approve the change before anything moves."
          />
        </div>
      )}

      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        <Stat
          label="Tasks done"
          value={`${progress.done}/${progress.total}`}
          unit="booked"
          line="learn"
        />
        <Stat label="Hours booked" value={String(booked)} unit="total" />
        <Stat
          label="Check-ins"
          value={String(hydrated ? checkIns.length : 0)}
          unit="logged"
        />
      </div>

      <p className="t-body mt-5 max-w-[70ch] text-pretty text-ink-soft">{plan.summary}</p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE }}
        className="mt-6"
      >
        <Timetable plan={plan} onToggleTask={cycleTask} />
      </motion.div>

      {hydrated && checkIns.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <header className="flex items-center gap-3 border-b border-paper-edge bg-paper-sunken px-5 py-3">
            <span className="t-label text-ink">Check-in log</span>
            <span className="t-mono ml-auto text-[10px] text-ink-muted">
              {String(checkIns.length).padStart(2, "0")} FILED
            </span>
          </header>
          <ul>
            {checkIns.map((record) => (
              <li
                key={record.id}
                className="flex gap-4 border-b border-paper-edge px-5 py-3.5 last:border-b-0"
              >
                <span className="t-mono w-[76px] shrink-0 pt-[2px] text-[10px] text-ink-muted">
                  {record.at.slice(0, 10)}
                  <br />
                  {record.applied ? "APPLIED" : "REJECTED"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-small block text-ink">{record.summary}</span>
                  <span className="t-small mt-1 block text-pretty text-ink-muted italic">
                    “{record.text}”
                  </span>
                  {record.applied && (
                    <span className="t-mono mt-1.5 block text-[10px] text-ink-muted">
                      {record.stationsMoved} STATIONS · +{record.tasksAdded} ADDED · −
                      {record.tasksDropped} DROPPED
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The line this plan was built from, for context when nothing is surveyed. */}
      {!hasSurvey && (
        <p className="t-small mt-6 max-w-[70ch] text-pretty text-ink-muted">
          This sample plan is built from the sample line at{" "}
          {DEMO_SKILL_MAP.jdTotal} invented postings. Survey real postings on The
          Line, then build your own.
        </p>
      )}
    </Screen>
  );
}
