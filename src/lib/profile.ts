/**
 * The career profile: the structured object we pull out of messy dictated
 * speech (or pasted résumé text) at the Boarding Pass station.
 *
 * Shared by the API route (which validates against PROFILE_SCHEMA) and the
 * client store/ticket UI, so there is exactly one shape in the app.
 */

export type Skill = {
  /** Short skill name, as it would be printed on a ticket stub. */
  name: string;
  /** 1 = heard of it … 5 = others come to you with it. */
  proficiency: number;
  /** What the user actually said that justifies the rating. Never invented. */
  evidence: string;
};

/**
 * One term the extractor decided was a mistranscription and rewrote. Dictation
 * mangles tech terms and company names constantly, so the fix is shown on the
 * ticket rather than applied silently — the user can see what was changed and
 * click the field to put it back.
 */
export type TranscriptionFix = {
  /** Exactly what the transcript said. */
  heardAs: string;
  /** What it was written as on the pass. */
  corrected: string;
};

export type NotableProject = {
  name: string;
  /** One or two sentences, in the user's own terms. */
  description: string;
  /** Skills this project demonstrates. */
  demonstrates: string[];
};

export type Constraints = {
  /** e.g. "Remote only", "Hybrid, 2 days in office", or null if not mentioned. */
  workMode: string | null;
  /** Study/practice hours the user can give per week, or null. */
  hoursPerWeek: number | null;
  /** e.g. "interview-ready by March", or null. */
  timeline: string | null;
  /** Anything else binding: visa, salary floor, caring responsibilities. */
  other: string[];
};

export type CareerProfile = {
  name: string | null;
  currentRole: string | null;
  targetRole: string | null;
  yearsExperience: number | null;
  /** Junior / Mid / Senior / Staff / Lead, or whatever the evidence supports. */
  seniority: string | null;
  /** Most relevant to the pivot first — the ticket stub prints the first five. */
  skills: Skill[];
  notableProjects: NotableProject[];
  constraints: Constraints;
  /** Mistranscribed terms that were rewritten, surfaced on the ticket. */
  transcriptionFixes: TranscriptionFix[];
  /**
   * Set only when something required is missing — above all the target role.
   * The screen asks it in the dock instead of guessing a destination.
   */
  followUpQuestion: string | null;
};

/** OpenAI structured-outputs schema. Strict mode: every key required, nullable via unions. */
export const PROFILE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    name: { type: ["string", "null"] },
    currentRole: { type: ["string", "null"] },
    targetRole: { type: ["string", "null"] },
    yearsExperience: { type: ["number", "null"] },
    seniority: { type: ["string", "null"] },
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          proficiency: { type: "integer", minimum: 1, maximum: 5 },
          evidence: { type: "string" },
        },
        required: ["name", "proficiency", "evidence"],
        additionalProperties: false,
      },
    },
    notableProjects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          demonstrates: { type: "array", items: { type: "string" } },
        },
        required: ["name", "description", "demonstrates"],
        additionalProperties: false,
      },
    },
    constraints: {
      type: "object",
      properties: {
        workMode: { type: ["string", "null"] },
        hoursPerWeek: { type: ["number", "null"] },
        timeline: { type: ["string", "null"] },
        other: { type: "array", items: { type: "string" } },
      },
      required: ["workMode", "hoursPerWeek", "timeline", "other"],
      additionalProperties: false,
    },
    transcriptionFixes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heardAs: { type: "string" },
          corrected: { type: "string" },
        },
        required: ["heardAs", "corrected"],
        additionalProperties: false,
      },
    },
    followUpQuestion: { type: ["string", "null"] },
  },
  required: [
    "name",
    "currentRole",
    "targetRole",
    "yearsExperience",
    "seniority",
    "skills",
    "notableProjects",
    "constraints",
    "transcriptionFixes",
    "followUpQuestion",
  ],
  additionalProperties: false,
};

/** The empty profile, used as the base for a first extraction. */
export const EMPTY_PROFILE: CareerProfile = {
  name: null,
  currentRole: null,
  targetRole: null,
  yearsExperience: null,
  seniority: null,
  skills: [],
  notableProjects: [],
  constraints: { workMode: null, hoursPerWeek: null, timeline: null, other: [] },
  transcriptionFixes: [],
  followUpQuestion: null,
};

/**
 * Seeded profile so the Boarding Pass is fully explorable with no API key and
 * no login — rule 3. This is a plausible pivot, not the user's data, and the
 * screen labels it as a demo pass until the user dictates their own.
 */
export const DEMO_PROFILE: CareerProfile = {
  name: "Sam Okafor",
  currentRole: "L2 Application Support Engineer",
  targetRole: "AI Engineer",
  yearsExperience: 4,
  seniority: "Mid",
  skills: [
    {
      name: "Production debugging",
      proficiency: 5,
      evidence: "Four years on L2 — \"I'm the one they page when the queue backs up.\"",
    },
    {
      name: "SQL",
      proficiency: 4,
      evidence: "\"I write the gnarly joins for the incident reports myself.\"",
    },
    {
      name: "Python",
      proficiency: 2,
      evidence: "\"Scripting only — I've never shipped a Python service.\"",
    },
    {
      name: "LLM APIs",
      proficiency: 2,
      evidence: "\"I've played with the OpenAI API on a weekend thing.\"",
    },
    {
      name: "RAG pipelines",
      proficiency: 1,
      evidence: "\"Never built one. I know roughly what retrieval means.\"",
    },
    {
      name: "Incident communication",
      proficiency: 4,
      evidence: "\"I run the comms bridge during a sev-1.\"",
    },
  ],
  notableProjects: [
    {
      name: "Alert triage bot",
      description:
        "A Slack bot that grouped duplicate alerts and cut the overnight page volume by about a third.",
      demonstrates: ["Python", "Production debugging"],
    },
  ],
  constraints: {
    workMode: "Remote only",
    hoursPerWeek: 6,
    timeline: "Interview-ready by March",
    other: ["Evenings only — no weekend study"],
  },
  transcriptionFixes: [
    { heardAs: "rag pipeline", corrected: "RAG pipelines" },
    { heardAs: "a I engineer", corrected: "AI Engineer" },
  ],
  followUpQuestion: null,
};

/**
 * The fix that produced this printed value, if any. Matched on the corrected
 * term appearing in the value, so one fix annotates wherever that term was
 * written — the skill stub, the route, a project title.
 */
export function fixFor(
  fixes: TranscriptionFix[],
  value: string | null,
): TranscriptionFix | null {
  if (!value) return null;
  const haystack = value.toLowerCase();
  // Longest match wins, so a short corrected term ("AI") can't claim a field
  // that a more specific one ("AI engineer") actually explains.
  return (
    fixes
      .filter((fix) => {
        const term = fix.corrected.toLowerCase();
        return term.length > 1 && haystack.includes(term);
      })
      .sort((a, b) => b.corrected.length - a.corrected.length)[0] ?? null
  );
}

/** The five the ticket stub prints: model order first, proficiency as tiebreak. */
export function topSkills(profile: CareerProfile, count = 5): Skill[] {
  return profile.skills.slice(0, count);
}

/**
 * Deterministic ticket number from the route, so the printed serial is stable
 * across renders (a random or time-based one would mismatch on hydration).
 */
export function ticketNumber(profile: CareerProfile): string {
  const seed = `${profile.name ?? ""}|${profile.currentRole ?? ""}|${profile.targetRole ?? ""}`;
  let hash = 7;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  return `PL-${String(hash).padStart(5, "0")}`;
}

/** Three-letter station code for a role, the way an airport codes a city. */
export function roleCode(role: string | null): string {
  if (!role) return "???";
  const words = role.replace(/[^a-zA-Z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "???";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .padEnd(3, words[words.length - 1][1]?.toUpperCase() ?? "X");
}
