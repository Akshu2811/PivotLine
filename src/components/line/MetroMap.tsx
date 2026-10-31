"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { branchLine, mainLine, type MappedSkill, type SkillMap } from "@/lib/skillMap";
import { LINE_COLOR } from "@/lib/stations";

const PIVOT = LINE_COLOR.pivot;
const MUSTARD = LINE_COLOR.talk;
const GREY = "var(--color-rule)";
const EASE = [0.16, 1, 0.3, 1] as const;

/* Geometry, in real pixels — the SVG is rendered 1:1 against its measured
   container rather than scaled from a fixed viewBox, so label text is the same
   size on a phone as on a laptop instead of shrinking with the artwork. */
const TOP_Y = 34;
const STEP = 82;
const BRANCH_DROP = 52;
const BRANCH_START = 58;

/* The trunk shifts right when week segments are shown, to open a gutter for
   the week brackets and their numbers. */
const TRUNK_X_PLAIN = 40;
const TRUNK_X_WEEKS = 78;
const LABEL_OFFSET = 26;

const DRAW_MS = 1150;

/** A run of consecutive stations covered by one week of the plan. */
export type WeekSegment = {
  index: number;
  theme: string;
  stationIds: string[];
};

export function MetroMap({
  map,
  selectedId,
  onSelect,
  /** Bumped on a new survey so the line redraws. */
  drawKey,
  /** Plan weeks, labelled against the track they cover. */
  weeks,
  /** Station ids to pick out; everything else dims. Drives project hover. */
  highlightIds,
  /** Station ids that have scored 2 or lower twice in the interview booth. */
  warningIds,
}: {
  map: SkillMap;
  selectedId: string | null;
  onSelect: (id: string) => void;
  drawKey: number;
  weeks?: WeekSegment[];
  highlightIds?: string[];
  warningIds?: string[];
}) {
  const [width, setWidth] = useState(640);
  // Keyboard focus is drawn as part of the map; the browser's default outline
  // puts a hard black rectangle through the artwork.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  // The container is the external system here: its width decides the layout,
  // so the map subscribes to it rather than guessing a breakpoint.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const main = mainLine(map);
  const branch = branchLine(map);

  const showWeeks = (weeks?.length ?? 0) > 0;
  const TRUNK_X = showWeeks ? TRUNK_X_WEEKS : TRUNK_X_PLAIN;
  const LABEL_X = TRUNK_X + LABEL_OFFSET;
  const highlight = highlightIds && highlightIds.length > 0 ? new Set(highlightIds) : null;
  const warning = warningIds && warningIds.length > 0 ? new Set(warningIds) : null;

  const junctionY = TOP_Y + STEP * 0.72;
  const branchY = junctionY + BRANCH_DROP;
  const hasBranch = branch.length > 0;

  const branchGap = hasBranch
    ? Math.max(
        64,
        Math.min(150, (width - (TRUNK_X + BRANCH_START) - 12) / Math.max(branch.length, 1)),
      )
    : 0;

  const mainStartY = (hasBranch ? branchY + 46 : junctionY) + 34;
  const stationY = (i: number) => mainStartY + i * STEP;
  const terminusY = stationY(main.length);
  const height = terminusY + 46;

  const trunkPath = `M ${TRUNK_X} ${TOP_Y} L ${TRUNK_X} ${terminusY}`;
  const branchPath = hasBranch
    ? `M ${TRUNK_X} ${junctionY} C ${TRUNK_X} ${junctionY + 30}, ${TRUNK_X + 18} ${branchY}, ${
        TRUNK_X + BRANCH_START
      } ${branchY} L ${TRUNK_X + BRANCH_START + (branch.length - 1) * branchGap} ${branchY}`
    : null;

  /* Demand meter: one block per posting, right-aligned on each station row.
     It only earns its place when there is width to spare, so a phone drops it
     and keeps the mono tag under the label. */
  const meterBlock = 7;
  const meterGap = 3;
  const meterWidth = map.jdTotal * (meterBlock + meterGap);
  const showMeter = width > 460 && map.jdTotal > 0;
  const meterX = width - meterWidth - 8;

  /** Characters a label can hold before it has to be cut. */
  const labelBudget = Math.max(
    10,
    Math.floor(((showMeter ? meterX - 16 : width - 16) - LABEL_X) / 8.4),
  );
  const branchBudget = Math.max(6, Math.floor(branchGap / 7.4));

  return (
    // min-w-0 matters: the svg carries an intrinsic pixel width, and a grid or
    // flex item defaults to min-width:auto, so without this the box grows to
    // fit the drawing, the observer measures the grown box, and the map ratchets
    // wider every pass instead of fitting its column.
    <div ref={hostRef} className="w-full min-w-0 overflow-hidden">
      <svg
        key={drawKey}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Skill gap line from ${map.jobs.length} job descriptions: ${main.length} stations ahead, ${branch.length} already cleared.`}
        style={{ display: "block", maxWidth: "100%" }}
      >
        {/* Week brackets in the gutter: each spans the stations that week of
            the plan covers, so the track reads as a schedule as well as a
            route. A week whose stations aren't adjacent still brackets the
            run it owns, which is the honest picture of the plan. */}
        {showWeeks &&
          weeks!.map((week) => {
            const rows = main
              .map((s, i) => (week.stationIds.includes(s.id) ? i : -1))
              .filter((i) => i >= 0);
            if (rows.length === 0) return null;
            const top = stationY(Math.min(...rows)) - 20;
            const bottom = stationY(Math.max(...rows)) + 20;
            const mid = (top + bottom) / 2;
            const x = TRUNK_X - 30;

            return (
              <motion.g
                key={`week-${week.index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + week.index * 0.05 }}
              >
                <title>{`Week ${week.index}: ${week.theme}`}</title>
                <path
                  d={`M ${x + 6} ${top} L ${x} ${top} L ${x} ${bottom} L ${x + 6} ${bottom}`}
                  fill="none"
                  stroke="var(--color-rule)"
                  strokeWidth={1.5}
                />
                <text
                  x={x - 6}
                  y={mid - 3}
                  textAnchor="end"
                  fill="var(--color-ink-muted)"
                  style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500 }}
                >
                  WK
                </text>
                <text
                  x={x - 6}
                  y={mid + 11}
                  textAnchor="end"
                  fill="var(--color-ink)"
                  style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600 }}
                >
                  {String(week.index).padStart(2, "0")}
                </text>
              </motion.g>
            );
          })}

        {/* Trunk: the gap, drawn as the main line. */}
        <motion.path
          d={trunkPath}
          fill="none"
          stroke={PIVOT}
          strokeWidth={6}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: DRAW_MS / 1000, ease: EASE }}
        />

        {/* Branch: what they already have, off to one side in grey. */}
        {branchPath && (
          <motion.path
            d={branchPath}
            fill="none"
            stroke={GREY}
            strokeWidth={4}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.28 }}
          />
        )}

        {/* Origin terminus: where they are standing now. */}
        <Terminus
          x={TRUNK_X}
          y={TOP_Y}
          label="You are here"
          sub={truncate(map.originRole, labelBudget)}
          delay={0}
          labelX={LABEL_X}
        />

        {hasBranch && (
          <>
            <motion.text
              x={TRUNK_X + BRANCH_START - 10}
              y={branchY - 16}
              textAnchor="start"
              className="t-label"
              fill="var(--color-ink-muted)"
              style={{ fontSize: 10, letterSpacing: "0.14em" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              ALREADY CLEARED
            </motion.text>
            {branch.map((skill, i) => (
              <BranchStation
                key={skill.id}
                skill={skill}
                x={TRUNK_X + BRANCH_START + i * branchGap}
                y={branchY}
                jdTotal={map.jdTotal}
                budget={branchBudget}
                selected={selectedId === skill.id}
                focused={focusedId === skill.id}
                onFocusChange={setFocusedId}
                onSelect={onSelect}
                delay={0.55 + i * 0.07}
              />
            ))}
          </>
        )}

        {main.map((skill, i) => (
          <MainStation
            key={skill.id}
            skill={skill}
            x={TRUNK_X}
            y={stationY(i)}
            labelX={LABEL_X}
            jdTotal={map.jdTotal}
            budget={labelBudget}
            selected={selectedId === skill.id}
            focused={focusedId === skill.id}
            onFocusChange={setFocusedId}
            meter={showMeter ? { x: meterX, block: meterBlock, gap: meterGap } : null}
            rowWidth={width}
            highlighted={highlight ? highlight.has(skill.id) : null}
            warned={warning ? warning.has(skill.id) : false}
            onSelect={onSelect}
            // Stations appear as the line reaches them.
            delay={0.12 + (stationY(i) / terminusY) * (DRAW_MS / 1000) * 0.9}
          />
        ))}

        {/* Destination terminus. */}
        <Terminus
          x={TRUNK_X}
          y={terminusY}
          label="Destination"
          sub={truncate(map.targetRole, labelBudget)}
          delay={DRAW_MS / 1000}
          labelX={LABEL_X}
          emphasis
        />
      </svg>
    </div>
  );
}

/** Radius carries demand: the more postings asked, the bigger the station. */
function radiusFor(skill: MappedSkill, jdTotal: number): number {
  const share = jdTotal > 0 ? skill.jdCount / jdTotal : 0;
  return 6.5 + share * 6.5;
}

function MainStation({
  skill,
  x,
  y,
  labelX,
  jdTotal,
  budget,
  selected,
  focused,
  onFocusChange,
  meter,
  rowWidth,
  highlighted,
  warned,
  onSelect,
  delay,
}: {
  skill: MappedSkill;
  x: number;
  y: number;
  labelX: number;
  jdTotal: number;
  budget: number;
  selected: boolean;
  focused: boolean;
  onFocusChange: (id: string | null) => void;
  meter: { x: number; block: number; gap: number } | null;
  rowWidth: number;
  /** null when nothing is being highlighted; false means "dim, not yours". */
  highlighted: boolean | null;
  /** Two or more interview answers on this station scored 2 or lower. */
  warned: boolean;
  onSelect: (id: string) => void;
  delay: number;
}) {
  const r = radiusFor(skill, jdTotal);
  const dim = highlighted === false;

  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={`${skill.name}, ${skill.status === "gap" ? "gap" : "partial"}, asked for by ${skill.jdCount} of ${jdTotal} job descriptions${warned ? ", flagged from weak interview answers" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect(skill.id)}
      onFocus={() => onFocusChange(skill.id)}
      onBlur={() => onFocusChange(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(skill.id);
        }
      }}
      style={{ cursor: "pointer", outline: "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: dim ? 0.26 : 1 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
    >
      {highlighted === true && (
        <motion.circle
          cx={x}
          cy={y}
          r={r + 11}
          fill="none"
          stroke={PIVOT}
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: EASE }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}

      {/* Mustard warning ring: this station has twice scored 2 or lower in the
          interview booth, so it's weaker than the map alone would show. */}
      {warned && (
        <motion.circle
          cx={x}
          cy={y}
          r={r + 5}
          fill="none"
          stroke={MUSTARD}
          strokeWidth={2.5}
          strokeDasharray="4 3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: EASE, delay }}
        >
          <title>Scored 2 or lower twice in the Interview Booth</title>
        </motion.circle>
      )}
      {/* The whole row is the hit area, dot through label to demand meter —
          the circles are small on purpose, and the gaps between the row's
          parts still read as part of the station. */}
      <rect
        x={0}
        y={y - STEP / 2 + 5}
        width={rowWidth}
        height={STEP - 10}
        fill="transparent"
      />

      {(selected || focused) && (
        <circle
          cx={x}
          cy={y}
          r={r + 7}
          fill="none"
          stroke={PIVOT}
          strokeWidth={focused && !selected ? 2 : 1.5}
          strokeDasharray={focused && !selected ? "3 3" : undefined}
          opacity={focused && !selected ? 0.9 : 0.5}
        />
      )}

      {meter && (
        <g aria-hidden="true">
          {Array.from({ length: jdTotal }, (_, i) => (
            <rect
              key={i}
              x={meter.x + i * (meter.block + meter.gap)}
              y={y - 7}
              width={meter.block}
              height={14}
              fill={i < skill.jdCount ? PIVOT : "transparent"}
              stroke={i < skill.jdCount ? PIVOT : "var(--color-paper-edge)"}
              strokeWidth={1}
            />
          ))}
        </g>
      )}

      <StationMark x={x} y={y} r={r} status={skill.status} />

      <text
        x={labelX}
        y={y - 3}
        fill="var(--color-ink)"
        style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}
      >
        {truncate(skill.name, budget)}
      </text>
      <text
        x={labelX}
        y={y + 14}
        fill="var(--color-ink-muted)"
        style={{
          fontSize: 10.5,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
        }}
      >
        {skill.jdCount} OF {jdTotal} JDS
        {skill.status === "partial" ? " · PARTIAL" : ""}
        {skill.importance === "nice-to-have" ? " · BONUS" : ""}
      </text>
    </motion.g>
  );
}

function BranchStation({
  skill,
  x,
  y,
  jdTotal,
  budget,
  selected,
  focused,
  onFocusChange,
  onSelect,
  delay,
}: {
  skill: MappedSkill;
  x: number;
  y: number;
  jdTotal: number;
  budget: number;
  selected: boolean;
  focused: boolean;
  onFocusChange: (id: string | null) => void;
  onSelect: (id: string) => void;
  delay: number;
}) {
  const r = Math.max(5.5, radiusFor(skill, jdTotal) - 1.5);

  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={`${skill.name}, already cleared, asked for by ${skill.jdCount} of ${jdTotal} job descriptions`}
      aria-pressed={selected}
      onClick={() => onSelect(skill.id)}
      onFocus={() => onFocusChange(skill.id)}
      onBlur={() => onFocusChange(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(skill.id);
        }
      }}
      style={{ cursor: "pointer", outline: "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: EASE, delay }}
    >
      {/* Dot plus the label beneath it, so the whole marker is clickable. */}
      <rect x={x - 26} y={y - 20} width={52} height={52} fill="transparent" />
      {(selected || focused) && (
        <circle
          cx={x}
          cy={y}
          r={r + 6}
          fill="none"
          stroke="var(--color-ink-muted)"
          strokeWidth={1.5}
          strokeDasharray={focused && !selected ? "3 3" : undefined}
        />
      )}
      <circle cx={x} cy={y} r={r} fill={GREY} />
      <text
        x={x}
        y={y + 22}
        textAnchor="middle"
        fill="var(--color-ink-muted)"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {truncate(skill.name, budget)}
      </text>
    </motion.g>
  );
}

/** Hollow for a gap, half-filled for partial — the ring is always the line. */
function StationMark({
  x,
  y,
  r,
  status,
}: {
  x: number;
  y: number;
  r: number;
  status: MappedSkill["status"];
}) {
  return (
    <>
      <circle cx={x} cy={y} r={r} fill="var(--color-paper-raised)" stroke={PIVOT} strokeWidth={3} />
      {status === "partial" && (
        // Right half of the disc, so "half done" is literal.
        <path d={`M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r} Z`} fill={PIVOT} />
      )}
    </>
  );
}

/** Line end: a ringed dot, the way a terminus is marked on a transit map. */
function Terminus({
  x,
  y,
  label,
  sub,
  delay,
  labelX,
  emphasis = false,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  delay: number;
  labelX: number;
  emphasis?: boolean;
}) {
  const r = emphasis ? 11 : 9;
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
    >
      <circle cx={x} cy={y} r={r} fill={PIVOT} />
      <circle cx={x} cy={y} r={r - 4} fill="var(--color-paper-raised)" />
      <text
        x={labelX}
        y={y - 3}
        fill="var(--color-ink-muted)"
        style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em" }}
      >
        {label.toUpperCase()}
      </text>
      <text
        x={labelX}
        y={y + 15}
        fill="var(--color-ink)"
        style={{
          fontSize: emphasis ? 19 : 16,
          fontFamily: "var(--font-display)",
        }}
      >
        {sub}
      </text>
    </motion.g>
  );
}

function truncate(text: string, budget: number): string {
  return text.length > budget ? `${text.slice(0, Math.max(1, budget - 1))}…` : text;
}
