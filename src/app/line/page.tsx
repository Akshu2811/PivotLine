"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import type { SurveyEvent } from "@/app/api/skill-map/route";
import { JobDescriptions } from "@/components/line/JobDescriptions";
import { MetroMap, type WeekSegment } from "@/components/line/MetroMap";
import { StationPanel } from "@/components/line/StationPanel";
import { type Announcement, SurveyBoard } from "@/components/line/SurveyBoard";
import { Screen, Stat } from "@/components/ui/Screen";
import { SAMPLE_JOBS } from "@/lib/sampleJobs";
import { lowScoreStationIds } from "@/lib/interview";
import { branchLine, DEMO_SKILL_MAP, mainLine, type SkillMap } from "@/lib/skillMap";
import { STATIONS } from "@/lib/stations";
import { useInterview } from "@/lib/store/interview";
import { usePlan } from "@/lib/store/plan";
import { useProfile } from "@/lib/store/profile";
import { useSkillMap } from "@/lib/store/skillMap";
import { useVoiceHandler } from "@/lib/store/voiceDock";

const STATION = STATIONS[1];
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The Line (LN2) — the skill-gap map. Postings in, metro line out: gaps and
 * partials are stations on the main line in dependency-then-demand order,
 * skills already held branch off in grey, and station size carries how many
 * postings asked for it.
 *
 * With nothing surveyed the screen shows a labelled sample map, so the station
 * is explorable with no key and no postings.
 */
export default function LinePage() {
  const jds = useSkillMap((s) => s.jds);
  const storedMap = useSkillMap((s) => s.map);
  const surveyed = useSkillMap((s) => s.surveyed);
  const mapFromSamples = useSkillMap((s) => s.mapFromSamples);
  const selectedId = useSkillMap((s) => s.selectedId);
  const addJd = useSkillMap((s) => s.addJd);
  const removeJd = useSkillMap((s) => s.removeJd);
  const setMap = useSkillMap((s) => s.setMap);
  const select = useSkillMap((s) => s.select);
  const promote = useSkillMap((s) => s.promote);
  const plan = usePlan((s) => s.plan);
  const interviewAnswers = useInterview((s) => s.answers);
  const warningIds = lowScoreStationIds(interviewAnswers);

  const [surveying, setSurveying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drawKey, setDrawKey] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    phase: "extracting" | "mapping";
  }>({ done: 0, total: 0, phase: "extracting" });

  const hydrated = useSyncExternalStore(
    (onChange) => useSkillMap.persist.onFinishHydration(onChange),
    () => useSkillMap.persist.hasHydrated(),
    () => false,
  );

  const isReal = hydrated && surveyed && storedMap !== null;
  const fromSamples = isReal && mapFromSamples;
  const map: SkillMap = isReal ? storedMap : DEMO_SKILL_MAP;
  const selected = map.skills.find((s) => s.id === selectedId) ?? null;

  const ahead = mainLine(map);
  const cleared = branchLine(map);

  // Once a plan exists, the track carries its week numbers — the same line,
  // read as a schedule.
  const weekSegments: WeekSegment[] | undefined = plan?.weeks.map((w) => ({
    index: w.index,
    theme: w.theme,
    stationIds: w.stationIds,
  }));

  const runSurvey = useCallback(async () => {
    const postings = useSkillMap.getState().jds;
    if (postings.length === 0) return;
    setSurveying(true);
    setError(null);
    setNotice(null);
    setAnnouncements([]);
    setProgress({ done: 0, total: postings.length, phase: "extracting" });

    const announce = (text: string, tag: string) =>
      setAnnouncements((prev) => [{ id: prev.length, text, tag }, ...prev]);

    try {
      const response = await fetch("/api/skill-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptions: postings.map((jd) => jd.text),
          profile: useProfile.getState().profile,
        }),
      });

      // Input errors still come back as a plain JSON status; everything after
      // the stream opens arrives as an event.
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Survey failed (${response.status}).`);
      }
      if (!response.body) throw new Error("The survey returned no data.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      // NDJSON: one event per line, and the last chunk may split a line.
      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as SurveyEvent;

          if (event.type === "start") {
            announce(
              `Survey beginning — ${event.total} ${event.total === 1 ? "posting" : "postings"} on the platform`,
              "LN2",
            );
          } else if (event.type === "posting") {
            const who = event.company ? `${event.title}, ${event.company}` : event.title;
            announce(
              `Posting ${event.done} of ${event.total} read — ${who}`,
              `${String(event.done).padStart(2, "0")}/${String(event.total).padStart(2, "0")}`,
            );
            // Extraction and mapping happen in one call now, so this just
            // updates the count — it doesn't mean reading finished early.
            setProgress((p) => ({ ...p, done: event.done, total: event.total }));
          } else if (event.type === "mapping") {
            announce("Reading the postings and mapping the line in one pass", "MAP");
            setProgress({ done: 0, total: event.total, phase: "mapping" });
          } else if (event.type === "error") {
            throw new Error(event.error);
          } else if (event.type === "done") {
            setMap(event.map);
            setDrawKey((k) => k + 1);
            finished = true;
          }
        }
      }

      if (!finished) throw new Error("The survey ended before the line was drawn.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSurveying(false);
      setAnnouncements([]);
    }
  }, [setMap]);

  const loadSamples = useCallback(() => {
    SAMPLE_JOBS.forEach((jd) => addJd(jd, true));
    setNotice(
      "Six sample postings loaded — these are invented, not scraped. Survey them to see the line build, then clear them and paste real ones.",
    );
  }, [addJd]);

  const clearSamples = useCallback(() => {
    useSkillMap
      .getState()
      .jds.filter((jd) => jd.sample)
      .forEach((jd) => removeJd(jd.id));
    setNotice(null);
  }, [removeJd]);

  /**
   * Dock input does one of two things. A long paste is another posting. A short
   * utterance is a progress report — "I write Python properly now" — which
   * moves the matching station along without spending a survey on it.
   */
  const handleVoice = useCallback(
    (text: string) => {
      setError(null);
      if (text.length > 220) {
        addJd(text);
        setNotice("Posting added. Survey when you've got them all in.");
        return;
      }

      const current = useSkillMap.getState().map ?? DEMO_SKILL_MAP;
      const spoken = text.toLowerCase();
      const hit = current.skills
        .filter((skill) => spoken.includes(skill.name.toLowerCase()))
        .sort((a, b) => b.name.length - a.name.length)[0];

      if (!hit) {
        setNotice(
          "That's too short for a posting, and it doesn't name a station on the line. Try naming the skill, or paste the full posting.",
        );
        return;
      }
      if (hit.status === "have") {
        setNotice(`${hit.name} is already cleared — it's on the grey branch.`);
        return;
      }
      promote(hit.id);
      select(hit.id);
      setNotice(
        `${hit.name} moved ${hit.status === "gap" ? "to partial" : "to cleared"}. Re-survey when you want the postings re-read.`,
      );
    },
    [addJd, promote, select],
  );

  useVoiceHandler(STATION.href, handleVoice);

  /**
   * Mapping is one call over everything and takes far longer than the reads,
   * so the board would otherwise sit on one line for over a minute. These say
   * what is still happening — they are descriptions of the running stage, not
   * invented progress, and nothing here claims to know how far along it is.
   */
  useEffect(() => {
    if (progress.phase !== "mapping") return;
    const add = (text: string) =>
      setAnnouncements((prev) => [{ id: prev.length, text, tag: "MAP" }, ...prev]);
    const timers = [
      setTimeout(() => add("Normalising skill names across every posting"), 14000),
      setTimeout(() => add("Measuring each station against your boarding pass"), 38000),
      setTimeout(() => add("Still working — this stage is the long one"), 66000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [progress.phase]);

  return (
    <Screen
      station={STATION}
      intro="The gap between where you are and where you're going, drawn as a line. Each station is a skill the postings actually ask for; the ones you've *genuinely* cleared branch off in grey. Paste five to eight real postings and the line redraws around them."
    >
      <JobDescriptions
        jds={jds}
        onAdd={addJd}
        onRemove={removeJd}
        onSurvey={runSurvey}
        onLoadSamples={loadSamples}
        onClearSamples={clearSamples}
        busy={surveying}
      />

      {surveying && (
        <SurveyBoard
          announcements={announcements}
          done={progress.done}
          total={progress.total}
          phase={progress.phase}
        />
      )}

      {error && (
        <div className="card mt-5 border-l-[4px] border-l-pivot px-5 py-4">
          <div className="t-label text-ink">Survey failed</div>
          <p className="t-small mt-2 max-w-[70ch] text-pretty text-ink-soft">{error}</p>
          <p className="t-small mt-2 text-ink-muted">
            The sample line below still works — the whole station is explorable
            without a key.
          </p>
        </div>
      )}

      {notice && !error && (
        <div className="card mt-5 px-5 py-3.5">
          <p className="t-small text-pretty text-ink-soft">{notice}</p>
        </div>
      )}

      {/* Survey summary. A line built from the built-in postings says so —
          the demand counts are real arithmetic over invented postings. */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <span className="t-label text-ink-muted">
          {!isReal ? "Sample line" : fromSamples ? "Line from sample postings" : "Your line"}
        </span>
        {(!isReal || fromSamples) && (
          <span
            className="badge"
            style={{ background: "var(--color-pivot)", color: "#FAF8F2" }}
          >
            Sample data
          </span>
        )}
        <span className="mb-[1px] block h-[2px] flex-1 bg-rule" />
        <span className="t-mono text-[10px] text-ink-muted">
          {map.jdTotal} POSTINGS SURVEYED
        </span>
      </div>

      {(!isReal || fromSamples) && (
        <p className="t-small mt-3 max-w-[70ch] text-pretty text-ink-muted">
          {isReal
            ? "Built from the six built-in sample postings, which are invented for the demo. The counts below are real arithmetic over those — paste your own postings for a line that means something."
            : "This is a worked example for the demo pivot, not your data. Paste five to eight real postings above and survey them to replace it."}
        </p>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <Stat label="Stations ahead" value={String(ahead.length)} unit="to clear" line="pivot" />
        <Stat label="Already cleared" value={String(cleared.length)} unit="on the branch" />
        <Stat
          label="Most demanded"
          value={`${map.skills[0]?.jdCount ?? 0}/${map.jdTotal}`}
          unit={map.skills[0]?.name ?? "—"}
        />
      </div>

      <p className="t-body mt-5 max-w-[70ch] text-pretty text-ink-soft">{map.summary}</p>

      {/* The map, with its panel alongside on laptop and beneath on phone. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_368px]">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
          className="card card-offset min-w-0 px-4 py-6 lg:px-6 lg:py-8"
        >
          <MetroMap
            map={map}
            selectedId={selectedId}
            onSelect={(id) => select(id === selectedId ? null : id)}
            drawKey={drawKey}
            weeks={weekSegments}
            warningIds={warningIds}
          />
        </motion.section>

        <div className="min-w-0 lg:sticky lg:top-4">
          <StationPanel
            skill={selected}
            jdTotal={map.jdTotal}
            onClose={() => select(null)}
            onPromote={(id) => {
              promote(id);
              setNotice(null);
            }}
          />
        </div>
      </div>
    </Screen>
  );
}
