"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CheckInProposal, CheckInRecord } from "@/lib/checkIn";
import { type LearningPlan, nextTaskId, type PlanTask, type TaskStatus } from "@/lib/plan";
import type { ProjectIdea } from "@/lib/projects";
import { slug } from "@/lib/skillMap";
import { useSkillMap } from "./skillMap";

/**
 * Plan, projects and check-in history. Persisted, since a plan costs a model
 * call and a half-finished week is the whole point of coming back.
 */

type PlanState = {
  plan: LearningPlan | null;
  planned: boolean;
  projects: ProjectIdea[];
  acceptedProjectIds: string[];
  /** Awaiting accept or reject on the timetable. */
  pending: CheckInProposal | null;
  /** The dictation that produced `pending`, kept so the log records it. */
  pendingText: string;
  checkIns: CheckInRecord[];

  setPlan: (plan: LearningPlan) => void;
  setTaskStatus: (weekIndex: number, taskId: string, status: TaskStatus) => void;
  cycleTask: (weekIndex: number, taskId: string) => void;

  setProjects: (projects: ProjectIdea[]) => void;
  acceptProject: (project: ProjectIdea) => void;

  propose: (proposal: CheckInProposal, text: string) => void;
  acceptCheckIn: () => void;
  rejectCheckIn: () => void;
  reset: () => void;
};

const INITIAL = {
  plan: null as LearningPlan | null,
  planned: false,
  projects: [] as ProjectIdea[],
  acceptedProjectIds: [] as string[],
  pending: null as CheckInProposal | null,
  pendingText: "",
  checkIns: [] as CheckInRecord[],
};

/** Checkbox order: not done, done, half done, back to not done. */
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "done",
  done: "partial",
  partial: "todo",
};

function mapTasks(
  plan: LearningPlan,
  weekIndex: number,
  fn: (tasks: PlanTask[]) => PlanTask[],
): LearningPlan {
  return {
    ...plan,
    weeks: plan.weeks.map((w) => (w.index === weekIndex ? { ...w, tasks: fn(w.tasks) } : w)),
  };
}

export const usePlan = create<PlanState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      /**
       * A new plan contains none of the tasks an accepted project put into the
       * old one, so the acceptances are released with it — otherwise the depot
       * would go on claiming those projects are scheduled when their work is
       * gone. Check-in history survives: those weeks still happened.
       */
      setPlan: (plan) =>
        set({
          plan,
          planned: true,
          pending: null,
          pendingText: "",
          acceptedProjectIds: [],
        }),

      setTaskStatus: (weekIndex, taskId, status) =>
        set((s) =>
          s.plan
            ? {
                plan: mapTasks(s.plan, weekIndex, (tasks) =>
                  tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
                ),
              }
            : s,
        ),

      cycleTask: (weekIndex, taskId) =>
        set((s) =>
          s.plan
            ? {
                plan: mapTasks(s.plan, weekIndex, (tasks) =>
                  tasks.map((t) =>
                    t.id === taskId ? { ...t, status: NEXT_STATUS[t.status] } : t,
                  ),
                ),
              }
            : s,
        ),

      setProjects: (projects) => set({ projects }),

      /**
       * Each of a project's tasks lands in the week that already covers its
       * station, so accepting a project threads it through the plan instead of
       * bolting it on the end. A task whose station isn't scheduled anywhere
       * goes to the last unfinished week rather than being dropped.
       */
      acceptProject: (project) =>
        set((s) => {
          if (!s.plan || s.acceptedProjectIds.includes(project.id)) return s;

          const weeks = s.plan.weeks.map((w) => ({ ...w, tasks: [...w.tasks] }));
          const fallback =
            weeks.find((w) => w.tasks.some((t) => t.status !== "done")) ??
            weeks[weeks.length - 1];

          for (const task of project.tasks) {
            const id = slug(task.stationName);
            const target = weeks.find((w) => w.stationIds.includes(id)) ?? fallback;
            if (!target) continue;
            target.tasks.push({
              id: nextTaskId(target, project.id),
              text: task.text,
              hours: task.hours,
              status: "todo",
              projectId: project.id,
            });
          }

          return {
            plan: { ...s.plan, weeks },
            acceptedProjectIds: [...s.acceptedProjectIds, project.id],
          };
        }),

      propose: (pending, pendingText) => set({ pending, pendingText }),

      /**
       * Applies the proposal in one move: task statuses, dropped and added
       * work, then the station moves on the map itself.
       */
      acceptCheckIn: () => {
        const { plan, pending, pendingText } = get();
        if (!plan || !pending) return;

        let weeks = plan.weeks.map((w) => ({ ...w, tasks: [...w.tasks] }));

        for (const move of pending.taskMoves) {
          const week = weeks.find((w) => w.index === move.weekIndex);
          const task = week?.tasks.find((t) => t.id === move.taskId);
          if (task) task.status = move.to;
        }

        const droppedIds = new Set(pending.dropped.map((d) => d.taskId));
        weeks = weeks.map((w) => ({ ...w, tasks: w.tasks.filter((t) => !droppedIds.has(t.id)) }));

        pending.added.forEach((add, i) => {
          const week = weeks.find((w) => w.index === add.weekIndex);
          if (!week) return;
          week.tasks.push({
            id: `w${week.index}-add${plan.revision}-${i + 1}`,
            text: add.text,
            hours: add.hours,
            status: "todo",
            projectId: null,
          });
        });

        // Stations live on the skill map, so the line redraws from the same
        // accept — the plan and the map can't disagree about what's cleared.
        const skillStore = useSkillMap.getState();
        for (const move of pending.stationMoves) {
          skillStore.setSkillStatus(slug(move.stationName), move.to, move.reason);
        }

        const record: CheckInRecord = {
          id: Date.now(),
          at: new Date().toISOString(),
          text: pendingText,
          summary: pending.summary,
          applied: true,
          stationsMoved: pending.stationMoves.length,
          tasksAdded: pending.added.length,
          tasksDropped: pending.dropped.length,
        };

        set({
          plan: { ...plan, weeks, revision: plan.revision + 1 },
          pending: null,
          pendingText: "",
          checkIns: [record, ...get().checkIns],
        });
      },

      /** Rejecting still logs the check-in — the week happened either way. */
      rejectCheckIn: () => {
        const { pending, pendingText } = get();
        if (!pending) return;
        const record: CheckInRecord = {
          id: Date.now(),
          at: new Date().toISOString(),
          text: pendingText,
          summary: pending.summary,
          applied: false,
          stationsMoved: 0,
          tasksAdded: 0,
          tasksDropped: 0,
        };
        set({ pending: null, pendingText: "", checkIns: [record, ...get().checkIns] });
      },

      reset: () => set(INITIAL),
    }),
    { name: "pivotline:plan" },
  ),
);
