/**
 * The weekly learning plan: the gap map turned into a timetable the user can
 * actually run, at the number of hours they said they have.
 *
 * As with the skill map, the model does the judgement — themes, sequencing,
 * what a week's work should be — and this module does the bookkeeping: ids,
 * statuses, station lookups and hour arithmetic.
 */

import type { SkillMap } from "./skillMap";
import { slug } from "./skillMap";

export type TaskStatus = "todo" | "done" | "partial";

export type PlanTask = {
  id: string;
  text: string;
  hours: number;
  status: TaskStatus;
  /** Set when a Project Depot project put this task here. */
  projectId: string | null;
};

export type PlanWeek = {
  /** 1-based, and the printed train number on the timetable. */
  index: number;
  theme: string;
  /** Skill ids from the map that this week clears. */
  stationIds: string[];
  stationNames: string[];
  tasks: PlanTask[];
};

export type LearningPlan = {
  weeks: PlanWeek[];
  /** The budget every week was built to fit. */
  hoursPerWeek: number;
  summary: string;
  /** Bumped each time a check-in is accepted, so the timetable can show it. */
  revision: number;
};

export type WeekStatus = "done" | "current" | "upcoming";

export const MIN_WEEKS = 6;
export const MAX_WEEKS = 8;

/* ── Schema ───────────────────────────────────────────────────────────── */

export const PLAN_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    weeks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: { type: "string" },
          stations: { type: "array", items: { type: "string" } },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                hours: { type: "number" },
              },
              required: ["text", "hours"],
              additionalProperties: false,
            },
          },
        },
        required: ["theme", "stations", "tasks"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["weeks", "summary"],
  additionalProperties: false,
};

/** Raw shape the model returns, before ids and statuses are attached. */
export type DraftPlan = {
  weeks: { theme: string; stations: string[]; tasks: { text: string; hours: number }[] }[];
  summary: string;
};

/* ── Assembly ─────────────────────────────────────────────────────────── */

/**
 * Turns a drafted plan into a stored one: stable task ids, every station name
 * resolved against the map it came from, and hours rounded to the half hour so
 * a week's total reads like something a person would write down.
 */
export function assemblePlan(
  draft: DraftPlan,
  map: SkillMap,
  hoursPerWeek: number,
): LearningPlan {
  const byId = new Map(map.skills.map((s) => [s.id, s]));

  const weeks: PlanWeek[] = draft.weeks.map((week, i) => {
    const ids = week.stations
      .map((name) => slug(name))
      .filter((id) => byId.has(id));

    return {
      index: i + 1,
      theme: week.theme,
      stationIds: ids,
      stationNames: ids.map((id) => byId.get(id)?.name ?? id),
      tasks: week.tasks.map((task, t) => ({
        id: `w${i + 1}-t${t + 1}`,
        text: task.text,
        hours: Math.max(0.5, Math.round(task.hours * 2) / 2),
        status: "todo" as TaskStatus,
        projectId: null,
      })),
    };
  });

  return { weeks, hoursPerWeek, summary: draft.summary, revision: 1 };
}

export function weekHours(week: PlanWeek): number {
  return Math.round(week.tasks.reduce((total, t) => total + t.hours, 0) * 2) / 2;
}

/** A week is done when nothing is left to do; the first unfinished one is now. */
export function weekStatus(plan: LearningPlan, index: number): WeekStatus {
  const isDone = (w: PlanWeek) => w.tasks.length > 0 && w.tasks.every((t) => t.status === "done");
  const week = plan.weeks.find((w) => w.index === index);
  if (!week) return "upcoming";
  if (isDone(week)) return "done";
  const firstOpen = plan.weeks.find((w) => !isDone(w));
  return firstOpen?.index === index ? "current" : "upcoming";
}

export function planProgress(plan: LearningPlan): { done: number; total: number } {
  const tasks = plan.weeks.flatMap((w) => w.tasks);
  return {
    done: tasks.filter((t) => t.status === "done").length,
    total: tasks.length,
  };
}

/** Next task id for a week, so an injected task can't collide with a planned one. */
export function nextTaskId(week: PlanWeek, suffix: string): string {
  return `w${week.index}-${suffix}-${week.tasks.length + 1}`;
}

/* ── Demo plan ────────────────────────────────────────────────────────── */

function task(id: string, text: string, hours: number, status: TaskStatus = "todo"): PlanTask {
  return { id, text, hours, status, projectId: null };
}

/**
 * Seeded plan for the demo pivot, at the six hours a week the sample pass
 * claims. Explorable with no key and no survey.
 */
export const DEMO_PLAN: LearningPlan = {
  hoursPerWeek: 6,
  revision: 1,
  summary:
    "Six weeks, six hours each. Python first because everything downstream is written in it, then retrieval, then the evaluation work that makes the rest defensible in an interview.",
  weeks: [
    {
      index: 1,
      theme: "Script to service",
      stationIds: ["production-python"],
      stationNames: ["Production Python"],
      tasks: [
        task("w1-t1", "Work through the typing and packaging sections of the Real Python track", 2.5, "done"),
        task("w1-t2", "Convert your alert bot from a script into an installable package", 2, "done"),
        task("w1-t3", "Add pytest with three tests that would have caught a real incident", 1.5, "done"),
      ],
    },
    {
      index: 2,
      theme: "A service you can call",
      stationIds: ["production-python"],
      stationNames: ["Production Python"],
      tasks: [
        task("w2-t1", "FastAPI tutorial end to end, typed request and response models", 2.5, "done"),
        task("w2-t2", "Put the alert bot behind two HTTP endpoints", 2.5, "partial"),
        task("w2-t3", "Write a README a stranger could run it from", 1),
      ],
    },
    {
      index: 3,
      theme: "Talking to models properly",
      stationIds: ["llm-apis"],
      stationNames: ["LLM APIs"],
      tasks: [
        task("w3-t1", "Read the structured-outputs guide and make one call that returns strict JSON", 2),
        task("w3-t2", "Add retries, timeouts and a cost log to your weekend project", 2.5),
        task("w3-t3", "Write down what happens at the rate limit — you'll be asked", 1.5),
      ],
    },
    {
      index: 4,
      theme: "Retrieval, first pass",
      stationIds: ["rag-pipelines", "vector-databases"],
      stationNames: ["RAG pipelines", "Vector databases"],
      tasks: [
        task("w4-t1", "Index your own runbooks: load, chunk, embed, store", 3),
        task("w4-t2", "Stand up pgvector locally — it is a Postgres extension, lean on your SQL", 2),
        task("w4-t3", "Ask it ten real questions and write down where it fails", 1),
      ],
    },
    {
      index: 5,
      theme: "Making retrieval behave",
      stationIds: ["rag-pipelines"],
      stationNames: ["RAG pipelines"],
      tasks: [
        task("w5-t1", "Change chunking strategy and measure what moved", 2.5),
        task("w5-t2", "Add re-ranking and keep the before and after", 2.5),
        task("w5-t3", "Write the retrieval design up in one page", 1),
      ],
    },
    {
      index: 6,
      theme: "Proof it works",
      stationIds: ["evaluation-testing", "docker-deployment"],
      stationNames: ["Evaluation & testing", "Docker & deployment"],
      tasks: [
        task("w6-t1", "Build a twenty-question eval set with expected answers", 2.5),
        task("w6-t2", "Score the pipeline on it and record the number", 2),
        task("w6-t3", "Containerise the service and deploy it somewhere with a URL", 1.5),
      ],
    },
  ],
};
