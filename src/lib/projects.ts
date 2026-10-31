/**
 * Portfolio projects: three builds, each one closing several gap stations at
 * once, scoped to a weekend or two so they actually get finished.
 *
 * A project carries its own tasks tagged by station, which is what lets the
 * timetable drop each task into the week that already covers that station
 * rather than bolting a project onto the end of the plan.
 */

import { slug } from "./skillMap";

export type ProjectTask = {
  /** Station this task belongs to; decides which week it lands in. */
  stationName: string;
  text: string;
  hours: number;
};

export type ProjectIdea = {
  id: string;
  name: string;
  /** One line, the way you'd pitch it in a message. */
  pitch: string;
  stationIds: string[];
  stationNames: string[];
  stack: string[];
  /** One or two weekends — anything longer doesn't get built. */
  weekends: 1 | 2;
  scope: string;
  /** The specific thing an interviewer will pick up on. */
  hiringManagerNotices: string;
  tasks: ProjectTask[];
};

export const PROJECTS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          pitch: { type: "string" },
          stations: { type: "array", items: { type: "string" } },
          stack: { type: "array", items: { type: "string" } },
          weekends: { type: "integer", enum: [1, 2] },
          scope: { type: "string" },
          hiringManagerNotices: { type: "string" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                stationName: { type: "string" },
                text: { type: "string" },
                hours: { type: "number" },
              },
              required: ["stationName", "text", "hours"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "name",
          "pitch",
          "stations",
          "stack",
          "weekends",
          "scope",
          "hiringManagerNotices",
          "tasks",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["projects"],
  additionalProperties: false,
};

export type DraftProject = Omit<ProjectIdea, "id" | "stationIds" | "stationNames"> & {
  stations: string[];
};

/** Attaches ids and resolves station names against the map they came from. */
export function assembleProjects(
  drafts: DraftProject[],
  known: { id: string; name: string }[],
): ProjectIdea[] {
  const byId = new Map(known.map((s) => [s.id, s.name]));

  return drafts.map((draft, i) => {
    const ids = draft.stations.map(slug).filter((id) => byId.has(id));
    return {
      id: `project-${i + 1}-${slug(draft.name)}`,
      name: draft.name,
      pitch: draft.pitch,
      stationIds: ids,
      stationNames: ids.map((id) => byId.get(id) ?? id),
      stack: draft.stack,
      weekends: draft.weekends === 2 ? 2 : 1,
      scope: draft.scope,
      hiringManagerNotices: draft.hiringManagerNotices,
      tasks: draft.tasks.map((t) => ({
        ...t,
        hours: Math.max(0.5, Math.round(t.hours * 2) / 2),
      })),
    };
  });
}

/** Seeded projects for the demo pivot, so the depot is explorable with no key. */
export const DEMO_PROJECTS: ProjectIdea[] = [
  {
    id: "project-1-runbook-answers",
    name: "Runbook Answers",
    pitch:
      "Ask your own on-call runbooks a question in plain English and get the answer with the page it came from.",
    stationIds: ["rag-pipelines", "vector-databases", "production-python"],
    stationNames: ["RAG pipelines", "Vector databases", "Production Python"],
    stack: ["Python", "FastAPI", "pgvector", "OpenAI API"],
    weekends: 2,
    scope: "Two weekends: one to index and retrieve, one to make the answers cite their source.",
    hiringManagerNotices:
      "The corpus is yours, not a tutorial's. Anyone can index Wikipedia; indexing four years of real incident runbooks says you understand the documents and the failure modes.",
    tasks: [
      { stationName: "RAG pipelines", text: "Build the Runbook Answers index: load, chunk, embed", hours: 3 },
      { stationName: "Vector databases", text: "Store Runbook Answers embeddings in pgvector and query them", hours: 2 },
      { stationName: "Production Python", text: "Put Runbook Answers behind a typed FastAPI endpoint", hours: 2 },
    ],
  },
  {
    id: "project-2-alert-triage-grader",
    name: "Alert Triage Grader",
    pitch:
      "Replay a month of real alerts through an LLM triage prompt and score how often it agrees with what you actually did.",
    stationIds: ["evaluation-testing", "llm-apis"],
    stationNames: ["Evaluation & testing", "LLM APIs"],
    stack: ["Python", "OpenAI structured outputs", "pytest"],
    weekends: 1,
    scope: "One weekend: a labelled set, a scoring script, and a number you can defend.",
    hiringManagerNotices:
      "You brought a labelled evaluation set to the interview. Most candidates talk about evals; almost none arrive with a number and the reason it moved.",
    tasks: [
      { stationName: "Evaluation & testing", text: "Label 20 past alerts with the action you took, then score the model against them", hours: 3 },
      { stationName: "LLM APIs", text: "Make the triage call return strict JSON with a confidence field", hours: 2 },
    ],
  },
  {
    id: "project-3-incident-postmortem-drafter",
    name: "Postmortem Drafter",
    pitch:
      "Feed it an incident timeline and it drafts the postmortem you'd have written at 3am, containerised and deployed.",
    stationIds: ["docker-deployment", "llm-apis", "production-python"],
    stationNames: ["Docker & deployment", "LLM APIs", "Production Python"],
    stack: ["Python", "FastAPI", "Docker", "Fly.io"],
    weekends: 1,
    scope: "One weekend: draft generation, a container, and a URL someone else can open.",
    hiringManagerNotices:
      "It is deployed and it solves a problem you have personally had at 3am. A link beats a repo, and a repo beats a description.",
    tasks: [
      { stationName: "Docker & deployment", text: "Containerise Postmortem Drafter and deploy it with a public URL", hours: 2.5 },
      { stationName: "LLM APIs", text: "Draft the postmortem from a timeline with a structured prompt", hours: 2 },
    ],
  },
];
