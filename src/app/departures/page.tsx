"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { DepartureBoard } from "@/components/departures/DepartureBoard";
import { InsightBanner } from "@/components/departures/InsightBanner";
import { ResponseRateChart } from "@/components/departures/ResponseRateChart";
import { EmptyState, Screen, Stat } from "@/components/ui/Screen";
import {
  DEMO_APPLICATIONS,
  DEMO_INSIGHT_REPORT,
  type DepartureOp,
  type InsightReport,
  MIN_APPLICATIONS_FOR_INSIGHTS,
  tagResponseRates,
} from "@/lib/applications";
import { STATIONS } from "@/lib/stations";
import { useDepartures } from "@/lib/store/departures";
import { usePlan } from "@/lib/store/plan";
import { useVoiceHandler } from "@/lib/store/voiceDock";

const STATION = STATIONS[5];

/**
 * Departures (DP6) — every application, logged by voice, on a mechanical
 * board. Five applications in, the board starts reading itself back: which
 * tags are actually getting a response, and one change to the plan that
 * follows from it.
 */
export default function DeparturesPage() {
  const storedApplications = useDepartures((s) => s.applications);
  const log = useDepartures((s) => s.log);
  const storedInsights = useDepartures((s) => s.insights);
  const planChangeApplied = useDepartures((s) => s.planChangeApplied);
  const upsertFromOps = useDepartures((s) => s.upsertFromOps);
  const setInsights = useDepartures((s) => s.setInsights);
  const markPlanChangeApplied = useDepartures((s) => s.markPlanChangeApplied);

  const plan = usePlan((s) => s.plan);
  const addAdHocTask = usePlan((s) => s.addAdHocTask);

  const [parsing, setParsing] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hydrated = useSyncExternalStore(
    (onChange) => useDepartures.persist.onFinishHydration(onChange),
    () => useDepartures.persist.hasHydrated(),
    () => false,
  );

  const isReal = hydrated && storedApplications.length > 0;
  const applications = isReal ? storedApplications : DEMO_APPLICATIONS;
  const tagStats = tagResponseRates(applications);
  const showInsights = applications.length >= MIN_APPLICATIONS_FOR_INSIGHTS;
  const report: InsightReport | null = isReal ? storedInsights : DEMO_INSIGHT_REPORT;
  const canReadBoard = isReal && showInsights;

  const handleVoice = useCallback(
    async (text: string) => {
      setParsing(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch("/api/departures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || `Could not read that update (${response.status}).`);
        }
        const { created, updated } = upsertFromOps(data.ops as DepartureOp[], text);
        if (created.length === 0 && updated.length === 0) {
          setNotice("Didn't catch a company in that — try naming who you applied to or heard from.");
        } else {
          const parts = [
            created.length > 0 ? `${created.join(", ")} added` : null,
            updated.length > 0 ? `${updated.join(", ")} updated` : null,
          ].filter(Boolean);
          setNotice(`${parts.join(" · ")}.`);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setParsing(false);
      }
    },
    [upsertFromOps],
  );

  useVoiceHandler(STATION.href, handleVoice);

  const readBoard = useCallback(async () => {
    setReading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/departures/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications, tagStats }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.error || `Could not read the board (${response.status}).`);
      }
      setInsights(data.report as InsightReport);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setReading(false);
    }
  }, [applications, tagStats, setInsights]);

  return (
    <Screen
      station={STATION}
      intro="Every application you've sent, on the board: company, role, status, and days since you sent it. Say who you applied to and what happened — existing companies update in place. Five in, the board starts reading itself back."
    >
      {(parsing || reading) && (
        <div className="mb-5 flex items-center gap-4 rounded-sm border border-panel-edge bg-panel px-5 py-3.5">
          <motion.span
            aria-hidden="true"
            className="block h-[11px] w-[11px] shrink-0 rounded-full"
            style={{ background: "var(--color-amber)" }}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="t-label text-amber">{parsing ? "Reading the update" : "Reading the board"}</span>
          <span className="t-small min-w-0 flex-1 text-amber-dim">
            {parsing
              ? "Working out who moved and what happened."
              : "Totalling response rates and drafting the plan change."}
          </span>
          <span className="t-mono shrink-0 text-[10px] text-amber-dim">DP6</span>
        </div>
      )}

      {error && (
        <div className="card mb-5 border-l-[4px] border-l-pivot px-5 py-4">
          <div className="t-label text-ink">Board unchanged</div>
          <p className="t-small mt-2 max-w-[70ch] text-pretty text-ink-soft">{error}</p>
        </div>
      )}

      {notice && !error && (
        <div className="card mb-5 px-5 py-3.5">
          <p className="t-small text-pretty text-ink-soft">{notice}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!isReal && (
          <span className="badge" style={{ background: "var(--color-talk)", color: "#17150F" }}>
            Sample data
          </span>
        )}
        <span className="t-small text-ink-muted">
          {isReal
            ? `${applications.length} ${applications.length === 1 ? "application" : "applications"} logged.`
            : "Say who you applied to — your own board replaces this sample the moment you do."}
        </span>
      </div>

      <div className="mt-4">
        <DepartureBoard applications={applications} />
      </div>

      {showInsights && (
        <div className="mt-6">
          <ResponseRateChart stats={tagStats} />
        </div>
      )}

      {canReadBoard && (
        <div className="mt-5">
          <button type="button" className="btn" onClick={() => void readBoard()} disabled={reading}>
            {reading ? "Reading…" : storedInsights ? "Read the board again" : "Read the board"}
          </button>
        </div>
      )}

      {report && (
        <div className="mt-6 overflow-hidden rounded-sm border border-panel-edge bg-panel">
          <header className="flex items-center gap-3 border-b border-panel-edge px-5 py-3">
            <span className="t-label text-amber">What the board shows</span>
          </header>
          <ul className="px-5 py-4">
            {report.insights.map((line, i) => (
              <li key={i} className="flex gap-3 border-b border-panel-edge py-3 last:border-b-0">
                <span className="t-mono shrink-0 pt-[2px] text-[11px] text-amber-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="t-small text-[#D8CFBA]">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report && (
        <div className="mt-5">
          <InsightBanner
            announcement={report.planChange.announcement}
            applied={isReal && planChangeApplied}
            canApply={isReal && plan !== null}
            disabledReason={
              !isReal
                ? "This is the sample board's suggestion — log five applications of your own to get yours."
                : plan === null
                  ? "Build a plan on the Timetable first — there's nowhere for this task to land yet."
                  : undefined
            }
            onApply={() => {
              addAdHocTask(report.planChange.taskText, report.planChange.hours);
              markPlanChangeApplied();
              setNotice("Added to the timetable's current week.");
            }}
          />
        </div>
      )}

      {!isReal && (
        <div className="mt-6">
          <EmptyState
            line={STATION.line}
            heading="No departures on the board."
            sayThis={[
              "I applied to Monzo for an AI engineer role on Tuesday.",
              "The Stripe one came back — technical screen on LangGraph booked for Thursday.",
              "I applied to Acme for AI Engineer and Zeta for Gen AI Developer, and Acme replied for a screening call.",
            ]}
            notes="Say who you applied to and what happened — existing companies update in place rather than duplicating."
          />
        </div>
      )}

      {hydrated && log.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-sm border border-panel-edge bg-panel">
          <header className="flex items-center gap-3 border-b border-panel-edge px-5 py-3">
            <span className="t-label text-amber">Dictation log</span>
            <span className="t-mono ml-auto text-[10px] text-amber-dim">
              {String(log.length).padStart(2, "0")} LOGGED
            </span>
          </header>
          <ul>
            {log.map((entry) => (
              <li key={entry.id} className="border-b border-panel-edge px-5 py-3 last:border-b-0">
                <span className="t-small block text-pretty text-[#D8CFBA] italic">“{entry.text}”</span>
                {entry.companies.length > 0 && (
                  <span className="t-mono mt-1.5 block text-[10px] text-amber-dim">
                    {entry.companies.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        <Stat label="On the board" value={String(applications.length)} unit="logged" />
        <Stat
          label="Responded"
          value={String(applications.filter((a) => a.status !== "Applied").length)}
          unit={`of ${applications.length}`}
        />
        <Stat label="Tags tracked" value={String(tagStats.length)} unit="distinct" />
      </div>
    </Screen>
  );
}
