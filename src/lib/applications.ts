/**
 * The departure board: every application the user has dictated, tracked as a
 * single record per company that updates in place rather than piling up
 * duplicates, plus the response-rate read on tags once there are enough of
 * them to say anything.
 */

export type ApplicationStatus = "Applied" | "Replied" | "Interview" | "Offer" | "Rejected";

export type ApplicationRecord = {
  id: number;
  company: string;
  role: string;
  /** ISO date the application was first logged. */
  appliedAt: string;
  status: ApplicationStatus;
  tags: string[];
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "Applied",
  "Replied",
  "Interview",
  "Offer",
  "Rejected",
];

/**
 * Dark-panel glyph colors. The brief names amber/teal/green/red for four of
 * the five statuses; Offer gets its own rather than borrowing one of those —
 * the best outcome on the board shouldn't look like "Interview" from across
 * the room.
 */
export const STATUS_COLOR: Record<ApplicationStatus, string> = {
  Applied: "#f0b429",
  Replied: "#2dd4bf",
  Interview: "#4ade80",
  Offer: "#c084fc",
  Rejected: "#f87171",
};

const STATUS_SET = new Set<string>(STATUS_ORDER);

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return STATUS_SET.has(value);
}

/** Whole days since the application was logged, floored at zero. */
export function daysSince(iso: string): number {
  const applied = new Date(iso).getTime();
  return Math.max(0, Math.floor((Date.now() - applied) / 86_400_000));
}

/** Anything other than "Applied" is evidence the company actually wrote back. */
export function hasResponded(status: ApplicationStatus): boolean {
  return status !== "Applied";
}

export type TagStat = {
  tag: string;
  total: number;
  responded: number;
  rate: number;
};

/**
 * Response rate per tag, computed here rather than asked of the model — a
 * number the insights route can cite but never has to produce itself.
 */
export function tagResponseRates(applications: ApplicationRecord[]): TagStat[] {
  const byTag = new Map<string, { total: number; responded: number }>();
  for (const app of applications) {
    for (const rawTag of app.tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      const entry = byTag.get(tag) ?? { total: 0, responded: 0 };
      entry.total += 1;
      if (hasResponded(app.status)) entry.responded += 1;
      byTag.set(tag, entry);
    }
  }
  return [...byTag.entries()]
    .map(([tag, { total, responded }]) => ({ tag, total, responded, rate: responded / total }))
    .sort((a, b) => b.total - a.total || b.rate - a.rate);
}

export const MIN_APPLICATIONS_FOR_INSIGHTS = 5;

/* ── Dictation parsing ───────────────────────────────────────────────── */

/**
 * One company mentioned in a dictated update — a new application, a status
 * change on one already on the board, or both in the same breath.
 */
export type DepartureOp = {
  company: string;
  role: string | null;
  status: ApplicationStatus | null;
  tags: string[];
};

export const DEPARTURE_OPS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    ops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: ["string", "null"] },
          status: { type: ["string", "null"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["company", "role", "status", "tags"],
        additionalProperties: false,
      },
    },
  },
  required: ["ops"],
  additionalProperties: false,
};

/* ── Insights ─────────────────────────────────────────────────────────── */

export type PlanChangeProposal = {
  /** Shown on the platform announcement banner. */
  announcement: string;
  /** The task text that lands in the timetable if the user hits Apply. */
  taskText: string;
  hours: number;
};

export type InsightReport = {
  insights: string[];
  planChange: PlanChangeProposal;
};

export const INSIGHTS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    insights: { type: "array", items: { type: "string" } },
    planChange: {
      type: "object",
      properties: {
        announcement: { type: "string" },
        taskText: { type: "string" },
        hours: { type: "number" },
      },
      required: ["announcement", "taskText", "hours"],
      additionalProperties: false,
    },
  },
  required: ["insights", "planChange"],
  additionalProperties: false,
};

/* ── Demo board ───────────────────────────────────────────────────────── */

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Seeded board, same companies as the sample skill map's postings, so the
 * sample pivot reads as one continuous story. Explorable with no key.
 */
export const DEMO_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 1,
    company: "Northwind Labs",
    role: "AI Engineer",
    appliedAt: daysAgo(21),
    status: "Interview",
    tags: ["rag", "startup", "3+ years"],
  },
  {
    id: 2,
    company: "Mesa Health",
    role: "AI Engineer (Platform)",
    appliedAt: daysAgo(17),
    status: "Replied",
    tags: ["mlops", "healthcare", "remote"],
  },
  {
    id: 3,
    company: "Corvid",
    role: "Machine Learning Engineer",
    appliedAt: daysAgo(14),
    status: "Rejected",
    tags: ["mlops", "5+ years"],
  },
  {
    id: 4,
    company: "Tessellate",
    role: "AI Engineer",
    appliedAt: daysAgo(10),
    status: "Applied",
    tags: ["rag", "remote", "startup"],
  },
  {
    id: 5,
    company: "Bright Ferry",
    role: "LLM Engineer",
    appliedAt: daysAgo(6),
    status: "Replied",
    tags: ["rag", "startup"],
  },
  {
    id: 6,
    company: "Halden & Co",
    role: "AI Engineer, Product",
    appliedAt: daysAgo(2),
    status: "Applied",
    tags: ["remote", "3+ years"],
  },
];

export const DEMO_INSIGHT_REPORT: InsightReport = {
  insights: [
    "MLOps-tagged roles are your best responders — both on file wrote back, against one in three remote roles.",
    "RAG-tagged applications are answering twice as often as the rest of the board — it's the thread worth leading with.",
  ],
  planChange: {
    announcement:
      "Remote-tagged applications are the coldest string on the board. Spend an hour sharpening how you open with your RAG project work before sending more of them.",
    taskText:
      "Rewrite your application opener to foreground RAG project work ahead of remote-specific framing",
    hours: 1,
  },
};
