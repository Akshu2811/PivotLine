"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { MetroMap, type WeekSegment } from "@/components/line/MetroMap";
import { CarriageCard } from "@/components/projects/CarriageCard";
import { Screen } from "@/components/ui/Screen";
import { DEMO_PROJECTS, type ProjectIdea } from "@/lib/projects";
import { DEMO_SKILL_MAP, type SkillMap } from "@/lib/skillMap";
import { STATIONS } from "@/lib/stations";
import { usePlan } from "@/lib/store/plan";
import { useProfile } from "@/lib/store/profile";
import { useSkillMap } from "@/lib/store/skillMap";
import { useVoiceHandler } from "@/lib/store/voiceDock";

const STATION = STATIONS[3];

/**
 * Project Depot (PD4) — three builds, each closing several stations at once.
 *
 * The map sits beside the carriages: hovering a project lights the stations it
 * would clear, so the trade between projects is visible rather than described.
 */
export default function ProjectDepotPage() {
  const storedProjects = usePlan((s) => s.projects);
  const accepted = usePlan((s) => s.acceptedProjectIds);
  const plan = usePlan((s) => s.plan);
  const setProjects = usePlan((s) => s.setProjects);
  const acceptProject = usePlan((s) => s.acceptProject);

  const storedMap = useSkillMap((s) => s.map);
  const surveyed = useSkillMap((s) => s.surveyed);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string[] | null>(null);

  const hydrated = useSyncExternalStore(
    (onChange) => usePlan.persist.onFinishHydration(onChange),
    () => usePlan.persist.hasHydrated(),
    () => false,
  );

  const isReal = hydrated && storedProjects.length > 0;
  const projects: ProjectIdea[] = isReal ? storedProjects : DEMO_PROJECTS;
  const map: SkillMap = hydrated && surveyed && storedMap ? storedMap : DEMO_SKILL_MAP;
  const canAccept = hydrated && plan !== null;

  // The plan's weeks label the track here too, so it's clear which week a
  // project's tasks would land in.
  const weeks: WeekSegment[] | undefined = plan?.weeks.map((w) => ({
    index: w.index,
    theme: w.theme,
    stationIds: w.stationIds,
  }));

  const generate = useCallback(
    async (steer?: string) => {
      const currentMap = useSkillMap.getState().map;
      if (!currentMap) {
        setError("Survey job postings on The Line first — projects are aimed at its gaps.");
        return;
      }
      setGenerating(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            map: currentMap,
            profile: useProfile.getState().profile,
            steer,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || `Could not draw up projects (${response.status}).`);
        }
        setProjects(data.projects as ProjectIdea[]);
        setNotice(
          steer
            ? "Three projects, steered the way you asked."
            : "Three projects, each closing several stations at once.",
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setGenerating(false);
      }
    },
    [setProjects],
  );

  /** Dictation here steers the next set of ideas. */
  const handleVoice = useCallback(
    async (text: string) => {
      await generate(text);
    },
    [generate],
  );

  useVoiceHandler(STATION.href, handleVoice);

  return (
    <Screen
      station={STATION}
      intro="Three things worth building, each one closing several stations at once. Scoped to a weekend or two, because a project that takes a *quarter* never gets finished. Hover a carriage to see the stretch of line it clears."
    >
      <section className="card card-offset overflow-hidden">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-paper-edge bg-paper-sunken px-5 py-3.5">
          <span className="t-label text-ink">{isReal ? "Your depot" : "Sample depot"}</span>
          {!isReal && (
            <span className="badge" style={{ background: "var(--color-pivot)", color: "#FAF8F2" }}>
              Sample data
            </span>
          )}
          <span className="t-mono ml-auto text-[10px] text-ink-muted">
            {String(projects.length).padStart(2, "0")} CARRIAGES
          </span>
        </header>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <button
            type="button"
            className="btn"
            onClick={() => void generate()}
            disabled={generating}
          >
            {generating ? "Drawing up…" : isReal ? "Draw up three more" : "Draw up my projects"}
          </button>
          <span className="t-small w-full text-ink-muted sm:w-auto sm:min-w-0 sm:flex-1">
            {!surveyed
              ? "Survey job postings on The Line first — projects are aimed at its gap stations."
              : "Or dictate a steer into the dock: “something that uses my incident data”."}
          </span>
        </div>
      </section>

      {generating && (
        <div className="card mt-5 flex items-center gap-4 px-5 py-3.5">
          <motion.span
            aria-hidden="true"
            className="block h-[11px] w-[11px] shrink-0 rounded-full"
            style={{ background: "var(--color-build)" }}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="t-label text-ink">In the depot</span>
          <span className="t-small min-w-0 flex-1 text-ink-muted">
            Looking for builds that close several stations at once using material
            you already have.
          </span>
          <span className="t-mono shrink-0 text-[10px] text-ink-muted">PD4</span>
        </div>
      )}

      {error && (
        <div className="card mt-5 border-l-[4px] border-l-pivot px-5 py-4">
          <div className="t-label text-ink">Depot unchanged</div>
          <p className="t-small mt-2 max-w-[70ch] text-pretty text-ink-soft">{error}</p>
          <p className="t-small mt-2 text-ink-muted">
            The sample carriages below still work without a key.
          </p>
        </div>
      )}

      {notice && !error && (
        <div className="card mt-5 px-5 py-3.5">
          <p className="t-small text-pretty text-ink-soft">{notice}</p>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {projects.map((project, i) => (
            <CarriageCard
              key={project.id}
              project={project}
              accepted={accepted.includes(project.id)}
              canAccept={canAccept}
              onHover={setHovered}
              onAccept={() => {
                acceptProject(project);
                setNotice(
                  `${project.name} added — its tasks went into the weeks covering ${project.stationNames.join(", ")}.`,
                );
              }}
              delay={i * 0.08}
            />
          ))}
        </div>

        <div className="min-w-0 lg:sticky lg:top-4">
          <section className="card card-offset min-w-0 overflow-hidden">
            <header className="flex items-center gap-3 border-b border-paper-edge bg-paper-sunken px-5 py-3">
              <span className="t-label text-ink">The line</span>
              <span className="t-mono ml-auto text-[10px] text-ink-muted">
                {hovered ? `${hovered.length} COVERED` : "HOVER A CARRIAGE"}
              </span>
            </header>
            <div className="px-4 py-5">
              <MetroMap
                map={map}
                selectedId={null}
                onSelect={() => {}}
                drawKey={0}
                weeks={weeks}
                highlightIds={hovered ?? undefined}
              />
            </div>
          </section>
        </div>
      </div>
    </Screen>
  );
}
