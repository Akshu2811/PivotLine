/**
 * Weekly check-ins. The user says how the week actually went — "finished the
 * RAG course, skipped Docker, only had four hours" — and gets back a proposal:
 * which stations moved, which tasks are done or half done, and how the rest of
 * the plan changes to absorb it.
 *
 * Nothing is applied until the user accepts. The proposal is shown as a diff
 * precisely because a plan that silently rewrites itself can't be trusted.
 */

export type StationMove = {
  /** Canonical station name as printed on the map. */
  stationName: string;
  to: "partial" | "have";
  reason: string;
};

export type TaskMove = {
  weekIndex: number;
  taskId: string;
  to: "done" | "partial";
};

export type AddedTask = {
  weekIndex: number;
  text: string;
  hours: number;
  reason: string;
};

export type DroppedTask = {
  weekIndex: number;
  taskId: string;
  reason: string;
};

export type CheckInProposal = {
  /** One line on how the week went, in the user's terms. */
  summary: string;
  stationMoves: StationMove[];
  taskMoves: TaskMove[];
  added: AddedTask[];
  dropped: DroppedTask[];
  /** Why the remaining weeks change shape the way they do. */
  reason: string;
};

export type CheckInRecord = {
  id: number;
  /** ISO date, stamped when the check-in was dictated. */
  at: string;
  /** What the user actually said. */
  text: string;
  summary: string;
  /** False when the user rejected the proposal. */
  applied: boolean;
  /** Counts kept so the log reads without re-deriving anything. */
  stationsMoved: number;
  tasksAdded: number;
  tasksDropped: number;
};

export const CHECK_IN_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    summary: { type: "string" },
    stationMoves: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stationName: { type: "string" },
          to: { type: "string", enum: ["partial", "have"] },
          reason: { type: "string" },
        },
        required: ["stationName", "to", "reason"],
        additionalProperties: false,
      },
    },
    taskMoves: {
      type: "array",
      items: {
        type: "object",
        properties: {
          weekIndex: { type: "integer" },
          taskId: { type: "string" },
          to: { type: "string", enum: ["done", "partial"] },
        },
        required: ["weekIndex", "taskId", "to"],
        additionalProperties: false,
      },
    },
    added: {
      type: "array",
      items: {
        type: "object",
        properties: {
          weekIndex: { type: "integer" },
          text: { type: "string" },
          hours: { type: "number" },
          reason: { type: "string" },
        },
        required: ["weekIndex", "text", "hours", "reason"],
        additionalProperties: false,
      },
    },
    dropped: {
      type: "array",
      items: {
        type: "object",
        properties: {
          weekIndex: { type: "integer" },
          taskId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["weekIndex", "taskId", "reason"],
        additionalProperties: false,
      },
    },
    reason: { type: "string" },
  },
  required: ["summary", "stationMoves", "taskMoves", "added", "dropped", "reason"],
  additionalProperties: false,
};

/** True when a proposal would actually change something. */
export function isEmptyProposal(p: CheckInProposal): boolean {
  return (
    p.stationMoves.length === 0 &&
    p.taskMoves.length === 0 &&
    p.added.length === 0 &&
    p.dropped.length === 0
  );
}
