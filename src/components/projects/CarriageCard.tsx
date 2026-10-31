"use client";

import { motion } from "framer-motion";
import type { ProjectIdea } from "@/lib/projects";
import { LINE_COLOR } from "@/lib/stations";

const PIVOT = LINE_COLOR.pivot;
const BUILD = LINE_COLOR.build;
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A project drawn as a carriage: windows along the top, a coupling at each end,
 * and the stations it closes printed on its side as a short stretch of line.
 * Hovering it lights those stations up on the map beside it.
 */
export function CarriageCard({
  project,
  accepted,
  canAccept,
  onAccept,
  onHover,
  delay,
}: {
  project: ProjectIdea;
  accepted: boolean;
  canAccept: boolean;
  onAccept: () => void;
  onHover: (ids: string[] | null) => void;
  delay: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.36, ease: EASE, delay }}
      onMouseEnter={() => onHover(project.stationIds)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(project.stationIds)}
      onBlur={() => onHover(null)}
      tabIndex={0}
      aria-label={`${project.name}, covering ${project.stationNames.join(", ")}`}
      className="card card-offset overflow-hidden outline-none transition-transform focus-visible:ring-0"
      style={{ borderLeft: `4px solid ${accepted ? BUILD : "var(--color-paper-edge)"}` }}
    >
      {/* Carriage roof: windows and the coupling either side. */}
      <div className="flex items-center gap-2 border-b border-paper-edge bg-paper-sunken px-5 py-2.5">
        <Coupling />
        <div className="flex min-w-0 flex-1 items-center gap-[5px]" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className="block h-[12px] min-w-0 flex-1 rounded-[1px] border"
              style={{
                borderColor: "var(--color-rule)",
                background: i < project.weekends * 3 ? "var(--color-paper)" : "transparent",
              }}
            />
          ))}
        </div>
        <span className="t-mono shrink-0 text-[10px] text-ink-muted">
          {project.weekends === 1 ? "1 WEEKEND" : "2 WEEKENDS"}
        </span>
        <Coupling />
      </div>

      <div className="px-5 py-5">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <h3 className="t-h2 min-w-0 text-ink">{project.name}</h3>
          {accepted && (
            <span className="badge mt-1" style={{ background: BUILD, color: "#FAF8F2" }}>
              On the plan
            </span>
          )}
        </div>

        <p className="t-body mt-2.5 max-w-[68ch] text-pretty text-ink-soft">{project.pitch}</p>

        {/* The stretch of line this carriage covers. */}
        <div className="mt-5">
          <div className="t-label text-ink-muted">Closes these stations</div>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-y-3">
            {project.stationNames.map((name, i) => (
              <span key={name} className="flex min-w-0 items-center">
                {i > 0 && (
                  <span
                    className="block h-[3px] w-5 shrink-0"
                    style={{ background: PIVOT }}
                    aria-hidden="true"
                  />
                )}
                <span
                  className="block h-[11px] w-[11px] shrink-0 rounded-full border-[2.5px] bg-paper-raised"
                  style={{ borderColor: PIVOT }}
                  aria-hidden="true"
                />
                <span className="t-small ml-2 mr-1 min-w-0 text-ink">{name}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-paper-edge pt-4 sm:grid-cols-2">
          <div>
            <div className="t-label text-ink-muted">Stack</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {project.stack.map((tech) => (
                <span key={tech} className="t-mono text-[11px] text-ink-soft">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="t-label text-ink-muted">Scope</div>
            <p className="t-small mt-2 text-pretty text-ink-soft">{project.scope}</p>
          </div>
        </div>

        <div className="mt-4 border-l-2 pl-3" style={{ borderColor: BUILD }}>
          <div className="t-label text-ink-muted">What a hiring manager notices</div>
          <p className="t-small mt-1.5 max-w-[68ch] text-pretty text-ink">
            {project.hiringManagerNotices}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-paper-edge bg-paper-sunken px-5 py-3.5">
        <button
          type="button"
          className="btn"
          onClick={onAccept}
          disabled={accepted || !canAccept}
        >
          {accepted ? "Added to the timetable" : "Add to my plan"}
        </button>
        <span className="t-small w-full text-ink-muted sm:w-auto sm:min-w-0 sm:flex-1">
          {accepted
            ? `${project.tasks.length} ${project.tasks.length === 1 ? "task" : "tasks"} went into the weeks covering these stations.`
            : canAccept
              ? "Drops its tasks into the weeks that already cover these stations."
              : "Build a plan on the Timetable first, then this can be scheduled."}
        </span>
      </div>
    </motion.article>
  );
}

/** The link between carriages, drawn rather than iconified. */
function Coupling() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true" className="shrink-0">
      <path d="M5 0v4M2 4h6M5 8v4M2 8h6" stroke="var(--color-rule)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
