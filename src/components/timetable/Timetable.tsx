"use client";

import { motion } from "framer-motion";
import {
  type LearningPlan,
  type PlanTask,
  type PlanWeek,
  type TaskStatus,
  weekHours,
  weekStatus,
  type WeekStatus,
} from "@/lib/plan";
import { LINE_COLOR } from "@/lib/stations";

const LEARN = LINE_COLOR.learn;
const PIVOT = LINE_COLOR.pivot;
const EASE = [0.16, 1, 0.3, 1] as const;

const STATUS_TEXT: Record<WeekStatus, string> = {
  done: "Departed",
  current: "Boarding",
  upcoming: "Scheduled",
};

/**
 * The plan as a printed timetable: one row per week, read like a service
 * listing — train number, theme, the stations it calls at, the work, and the
 * hours it is booked for. Checkboxes are the only interactive thing on the
 * page, because the timetable's job is to be read.
 */
export function Timetable({
  plan,
  onToggleTask,
}: {
  plan: LearningPlan;
  onToggleTask: (weekIndex: number, taskId: string) => void;
}) {
  return (
    <section className="card card-offset overflow-hidden">
      {/* Column headings, printed once like a real timetable. */}
      <div className="hidden items-center gap-4 border-b-2 border-ink bg-paper-sunken px-6 py-2.5 lg:flex">
        <span className="t-label w-[54px] shrink-0 text-ink-muted">Week</span>
        <span className="t-label w-[210px] shrink-0 text-ink-muted">Theme</span>
        <span className="t-label min-w-0 flex-1 text-ink-muted">Calling at · work</span>
        <span className="t-label w-[62px] shrink-0 text-right text-ink-muted">Hrs</span>
        <span className="t-label w-[86px] shrink-0 text-right text-ink-muted">Status</span>
      </div>

      <ul>
        {plan.weeks.map((week, i) => (
          <WeekRow
            key={week.index}
            week={week}
            status={weekStatus(plan, week.index)}
            budget={plan.hoursPerWeek}
            delay={i * 0.04}
            onToggleTask={onToggleTask}
          />
        ))}
      </ul>
    </section>
  );
}

function WeekRow({
  week,
  status,
  budget,
  delay,
  onToggleTask,
}: {
  week: PlanWeek;
  status: WeekStatus;
  budget: number;
  delay: number;
  onToggleTask: (weekIndex: number, taskId: string) => void;
}) {
  const hours = weekHours(week);
  const over = hours > budget;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      className="border-b border-paper-edge last:border-b-0"
      style={{
        background: status === "current" ? "var(--color-paper-raised)" : undefined,
        borderLeft: `4px solid ${
          status === "current" ? PIVOT : status === "done" ? LEARN : "transparent"
        }`,
      }}
    >
      <div className="flex flex-col gap-3 px-6 py-5 lg:flex-row lg:items-start lg:gap-4">
        {/* Train number. */}
        <div className="flex shrink-0 items-baseline gap-2 lg:w-[54px] lg:flex-col lg:gap-0">
          <span className="font-mono text-[26px] leading-none font-medium text-ink tabular-nums">
            {String(week.index).padStart(2, "0")}
          </span>
          <span className="t-mono text-[9px] text-ink-muted">WEEK</span>
        </div>

        <div className="min-w-0 lg:w-[210px] lg:shrink-0">
          <h3 className="t-h3 text-ink">{week.theme}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {week.stationNames.map((name) => (
              <span key={name} className="flex items-center gap-1.5">
                <span
                  className="block h-[8px] w-[8px] shrink-0 rounded-full"
                  style={{ background: PIVOT }}
                />
                <span className="t-small text-ink-soft">{name}</span>
              </span>
            ))}
            {week.stationNames.length === 0 && (
              <span className="t-small text-ink-faint">No station</span>
            )}
          </div>
        </div>

        <ul className="min-w-0 flex-1">
          {week.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(week.index, task.id)}
            />
          ))}
          {week.tasks.length === 0 && (
            <li className="t-small py-1 text-ink-muted">
              Nothing booked — a check-in cleared this week.
            </li>
          )}
        </ul>

        <div className="flex items-baseline gap-3 lg:w-[62px] lg:shrink-0 lg:flex-col lg:items-end lg:gap-1">
          <span
            className="font-mono text-[17px] leading-none font-medium tabular-nums"
            style={{ color: over ? PIVOT : "var(--color-ink)" }}
          >
            {hours}h
          </span>
          <span className="t-mono text-[9px] text-ink-muted">/{budget}H</span>
        </div>

        <div className="shrink-0 lg:w-[86px] lg:text-right">
          <span
            className="badge"
            style={
              status === "current"
                ? { background: PIVOT, color: "#FAF8F2" }
                : status === "done"
                  ? { background: LEARN, color: "#FAF8F2" }
                  : { background: "var(--color-paper-sunken)", color: "var(--color-ink-muted)" }
            }
          >
            {STATUS_TEXT[status]}
          </span>
        </div>
      </div>
    </motion.li>
  );
}

function TaskRow({ task, onToggle }: { task: PlanTask; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-3 border-b border-paper-edge py-2 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${task.text} — ${task.status}. Click to change.`}
        className="mt-[2px] shrink-0 cursor-pointer"
      >
        <Box status={task.status} />
      </button>

      <span
        className="t-small min-w-0 flex-1"
        style={{
          color: task.status === "done" ? "var(--color-ink-muted)" : "var(--color-ink)",
          textDecoration: task.status === "done" ? "line-through" : undefined,
        }}
      >
        {task.text}
        {task.projectId && (
          <span className="t-mono ml-2 text-[9px] text-ink-muted">PROJECT</span>
        )}
      </span>

      <span className="t-mono shrink-0 text-[10px] text-ink-muted">{task.hours}H</span>
    </li>
  );
}

/** Printed checkbox: empty, crossed, or half filled for partial. */
function Box({ status }: { status: TaskStatus }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="13"
        height="13"
        fill="var(--color-paper-raised)"
        stroke={status === "todo" ? "var(--color-rule)" : LEARN}
        strokeWidth="1.5"
      />
      {status === "done" && (
        <path
          d="M3.5 7.5 L6.5 10.5 L11.5 4.5"
          fill="none"
          stroke={LEARN}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {status === "partial" && <rect x="3" y="3" width="9" height="4.5" fill={LEARN} />}
    </svg>
  );
}
