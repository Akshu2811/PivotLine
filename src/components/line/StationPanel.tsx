"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { MappedSkill } from "@/lib/skillMap";
import { LINE_COLOR } from "@/lib/stations";

const PIVOT = LINE_COLOR.pivot;
const EASE = [0.16, 1, 0.3, 1] as const;

const STATUS_LABEL: Record<MappedSkill["status"], string> = {
  gap: "Gap",
  partial: "Partial",
  have: "Cleared",
};

/**
 * The panel beside the map. Opening a station answers three things in order:
 * why this matters for the target role, which postings actually asked for it
 * and in whose words, and what to do about it next.
 */
export function StationPanel({
  skill,
  jdTotal,
  onClose,
  onPromote,
}: {
  skill: MappedSkill | null;
  jdTotal: number;
  onClose: () => void;
  onPromote: (id: string) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {skill ? (
        <motion.aside
          key={skill.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.26, ease: EASE }}
          aria-label={`${skill.name} station details`}
          className="card card-offset overflow-hidden"
        >
          <header
            className="flex items-start gap-3 border-b border-paper-edge bg-paper-sunken px-5 py-4"
            style={{ borderLeft: `4px solid ${skill.status === "have" ? "var(--color-rule)" : PIVOT}` }}
          >
            <div className="min-w-0 flex-1">
              <div className="t-label text-ink-muted">
                {STATUS_LABEL[skill.status]}
                {skill.importance === "nice-to-have" ? " · Bonus" : ""}
              </div>
              <h3 className="t-h2 mt-1.5 text-ink">{skill.name}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close station details"
              className="t-mono shrink-0 cursor-pointer px-1 text-[11px] text-ink-muted hover:text-ink"
            >
              CLOSE
            </button>
          </header>

          <div className="px-5 py-4">
            {/* Demand, as a bar of one block per posting. */}
            <div className="flex items-center gap-3">
              <div className="flex gap-[3px]" aria-hidden="true">
                {Array.from({ length: jdTotal }, (_, i) => (
                  <span
                    key={i}
                    className="block h-[14px] w-[7px] border"
                    style={{
                      background: i < skill.jdCount ? PIVOT : "transparent",
                      borderColor: i < skill.jdCount ? PIVOT : "var(--color-paper-edge)",
                    }}
                  />
                ))}
              </div>
              <span className="t-mono text-[11px] text-ink-muted">
                {skill.jdCount} OF {jdTotal} JDS
              </span>
            </div>

            <p className="t-body mt-4 text-pretty text-ink">{skill.whyItMatters}</p>

            <div className="mt-4 border-l-2 pl-3" style={{ borderColor: "var(--color-rule)" }}>
              <div className="t-label text-ink-muted">Where you stand</div>
              <p className="t-small mt-1.5 text-pretty text-ink-soft">
                {skill.reason}
                {skill.userProficiency !== null && (
                  <span className="t-mono ml-1.5 text-[10px] text-ink-muted">
                    YOUR PASS: {skill.userProficiency}/5
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="border-t border-paper-edge px-5 py-4">
            <div className="t-label text-ink-muted">Who asked for it</div>
            <ul className="mt-3">
              {skill.mentions.map((m) => (
                <li
                  key={`${m.jdIndex}-${m.phrase}`}
                  className="border-b border-paper-edge py-2.5 last:border-b-0"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="t-mono shrink-0 text-[10px] text-ink-muted">
                      JD{String(m.jdIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="t-small min-w-0 font-medium text-ink">
                      {m.company ? `${m.jdTitle} · ${m.company}` : m.jdTitle}
                    </span>
                    {m.importance === "nice-to-have" && (
                      <span className="t-mono shrink-0 text-[9px] text-ink-faint">BONUS</span>
                    )}
                  </div>
                  <p className="t-small mt-1 text-pretty text-ink-soft italic">“{m.phrase}”</p>
                </li>
              ))}
              {skill.mentions.length === 0 && (
                <li className="t-small py-2 text-ink-muted">No posting named this directly.</li>
              )}
            </ul>
          </div>

          {skill.resources.length > 0 && (
            <div className="border-t border-paper-edge px-5 py-4">
              <div className="t-label text-ink-muted">Where to start</div>
              <ul className="mt-3">
                {skill.resources.map((r) => (
                  <li
                    key={r.title}
                    className="border-b border-paper-edge py-2.5 last:border-b-0"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="t-mono shrink-0 text-[9px] text-ink-muted">
                        {r.kind.toUpperCase()}
                      </span>
                      <span className="t-small min-w-0 font-medium text-ink">{r.title}</span>
                    </div>
                    <p className="t-small mt-1 text-pretty text-ink-muted">{r.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skill.status !== "have" && (
            <div className="flex flex-wrap items-center gap-3 border-t border-paper-edge bg-paper-sunken px-5 py-3.5">
              <button type="button" className="btn btn-ghost" onClick={() => onPromote(skill.id)}>
                {skill.status === "gap" ? "Mark progress" : "Mark cleared"}
              </button>
              <span className="t-small w-full text-ink-muted sm:w-auto sm:min-w-0 sm:flex-1">
                Moves your train one station along this line.
              </span>
            </div>
          )}
        </motion.aside>
      ) : (
        <motion.aside
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.24 }}
          className="card px-5 py-5"
        >
          <div className="t-label text-ink-muted">Station details</div>
          <p className="t-body mt-3 text-pretty text-ink-soft">
            Click any station on the line to see why the role needs it, which
            postings asked for it and in whose words, and where to start.
          </p>
          <ul className="mt-5 space-y-2.5">
            <Key shape="gap" text="Hollow — a gap. Nothing in your pass covers it." />
            <Key shape="partial" text="Half filled — partial. Real, but not to the level asked." />
            <Key shape="have" text="Grey and filled — already cleared, on the side branch." />
            <Key shape="size" text="Bigger stations were demanded by more postings." />
          </ul>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Legend row, drawn with the same marks the map uses. */
function Key({ shape, text }: { shape: "gap" | "partial" | "have" | "size"; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <svg width="26" height="20" className="mt-[1px] shrink-0" aria-hidden="true">
        {shape === "size" ? (
          <>
            <circle cx="7" cy="10" r="4" fill="none" stroke={PIVOT} strokeWidth="2.5" />
            <circle cx="19" cy="10" r="7.5" fill="none" stroke={PIVOT} strokeWidth="3" />
          </>
        ) : (
          <>
            <circle
              cx="13"
              cy="10"
              r="7"
              fill={shape === "have" ? "var(--color-rule)" : "var(--color-paper-raised)"}
              stroke={shape === "have" ? "var(--color-rule)" : PIVOT}
              strokeWidth="3"
            />
            {shape === "partial" && <path d="M 13 3 A 7 7 0 0 1 13 17 Z" fill={PIVOT} />}
          </>
        )}
      </svg>
      <span className="t-small min-w-0 text-ink-soft">{text}</span>
    </li>
  );
}
