import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import type { CareerProfile } from "@/lib/profile";
import {
  type Importance,
  type JobExtraction,
  type MappedSkill,
  MAX_JDS,
  orderMainLine,
  SKILL_MAP_RESULT_SCHEMA,
  type SkillMap,
  type SkillMention,
  type SkillStatus,
  slug,
} from "@/lib/skillMap";

/**
 * POST /api/skill-map
 *
 * Body: { jobDescriptions: string[], profile: CareerProfile | null }
 *
 * One call, not two. This used to extract each posting's skills in its own
 * stage and then normalise/judge them in a second stage — correct, but the
 * round trip between the two was most of what made a 5-6 posting survey take
 * over a minute. The model now does both in a single pass: read every
 * posting, THEN normalise and judge, returned together. Reasoning effort is
 * "low" rather than the "medium" a judgement task would normally get — pure
 * speed trade for the live demo; quality of the normalisation/judging is the
 * cost of that, and it's easy to move back to "medium" if it reads too thin.
 *
 * Counting is not asked of the model at all. It returns the aliases that fold
 * into each canonical skill; this route matches those aliases back to its own
 * "jobs" extraction to derive how many postings asked for a skill and which
 * phrase each used. The demand tags are therefore arithmetic over the real
 * postings, not something the model asserted.
 *
 * The response is still a stream of newline-delimited JSON events, so the
 * screen can announce progress rather than sit on one line for the whole
 * call. A heartbeat event keeps the stream from going idle for the length of
 * that one call, so nothing upstream mistakes the silence for a dead
 * connection and cuts it off before "done" ever arrives.
 */

/** No AbortController or fetch timeout exists anywhere in this app — checked
 *  the client fetch, every store, next.config.ts, and the OpenAI SDK's own
 *  default (10 minutes). `maxDuration` is the only duration knob this route
 *  has; set generously so a slow run still has room to finish. */
export const maxDuration = 240;

/** One line of NDJSON per event. The client renders these as announcements. */
export type SurveyEvent =
  | { type: "start"; total: number }
  | { type: "posting"; done: number; total: number; title: string; company: string | null }
  | { type: "mapping"; total: number }
  | { type: "heartbeat" }
  | { type: "done"; map: SkillMap }
  | { type: "error"; error: string };

const SYSTEM = `You build a skill-gap map for someone pivoting careers, from several real job postings and their profile. Work in two phases, but return only the combined result the schema asks for.

PHASE 1 — READ each posting and list what it asks for, returned in "jobs" in the SAME ORDER the postings are given — the first entry is posting 1, and so on, even if a posting is thin or oddly formatted. Never skip, merge or reorder postings.
- "required": skills the posting treats as necessary — in the requirements section, or phrased as "you have", "must", "strong", "X+ years".
- "niceToHave": skills phrased as bonus, plus, preferred, desirable, or "nice to have".
- Each skill "name" is the concrete, searchable thing: a technology, tool, technique or discipline ("RAG pipelines", "Docker", "evaluation", "stakeholder communication"). Two to three words, no sentences. Use the posting's own term here — phase 2 normalises variations across postings, so do not try to standardise yet.
- "phrase" is a SHORT VERBATIM QUOTE from the posting showing how it asked for that skill, at most 14 words. Never paraphrase, never invent a quote.
- Skip generic filler that applies to any job ("team player", "fast-paced environment", "bachelor's degree") unless it names a real competency.
- "title" is the role title and "company" the employer, or null if the posting does not say.

PHASE 2 — NORMALISE every "required"/"niceToHave" name from phase 1 across every posting, and JUDGE each canonical skill against the profile, returned in "skills".
- Fold variations into one canonical skill: "Python", "Python 3" and "production Python" are one skill; "RAG", "retrieval augmented generation" and "retrieval pipelines" are one skill; "pgvector", "Pinecone" and "vector store" are one skill ("Vector databases").
- "name" is the canonical form, at most three words where possible, as it will be printed on a metro station label.
- "aliases" MUST list every raw name from phase 1 that folds into this skill, copied EXACTLY as you wrote it there. This is how postings get matched back to the skill, so a missing alias silently loses a posting. Every raw name belongs to exactly one canonical skill.
- Merge aggressively enough that the map is readable — aim for 8 to 14 canonical skills total — but never merge two genuinely different asks (retrieval is not evaluation; Docker is not Kubernetes).
- "have": the profile shows they can already do this at the level the postings ask for. "partial": real but insufficient exposure — they script it but haven't shipped it, or did it once on a side project, or have an adjacent skill that transfers most of the way. "gap": nothing in the profile supports it.
- "reason" is one line, addressed to the user as "you", citing what in their profile drove the call ("You script confidently but have never shipped a Python service"). Never invent experience they didn't describe.
- "whyItMatters" is two or three sentences on why this role needs it, and where their background gives them an advantage or a shortcut. Concrete, not motivational.
- "dependsOn" lists the canonical NAMES of skills that are genuinely prerequisite — you cannot build retrieval without the language it is written in. Only real dependencies; most skills have none. Never create a cycle.
- "resources": exactly 2 or 3 per skill with status gap or partial, an EMPTY array for status have. Prefer first-party documentation, one well-known course or guide, and one concrete project that uses something from the user's own background. "kind" is one word: Docs, Course, Guide, Paper, Project. "why" is one line. Only name resources you are confident exist — a described project ("Port your alert bot to a typed service") is always safe, a specific course title you are unsure of is not.

"summary" is two sentences on what the postings agree about and where this person stands. Do not count postings or mentions anywhere — that arithmetic happens outside this call.`;

type Body = {
  jobDescriptions?: string[];
  profile?: CareerProfile | null;
};

type ComparisonSkill = {
  name: string;
  aliases: string[];
  status: SkillStatus;
  reason: string;
  whyItMatters: string;
  dependsOn: string[];
  resources: { title: string; kind: string; why: string }[];
};

/** Postings are long; this keeps a pathological paste from blowing the call. */
const MAX_JD_CHARS = 9000;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const jds = (body.jobDescriptions ?? [])
    .map((jd) => (jd ?? "").trim().slice(0, MAX_JD_CHARS))
    .filter((jd) => jd.length > 0)
    .slice(0, MAX_JDS);

  if (jds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Paste at least one job description first." },
      { status: 400 },
    );
  }

  const profile = body.profile ?? null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SurveyEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      // Keeps bytes flowing for the length of the one call so an idle
      // connection is never mistaken for a dead one and cut before "done".
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 10_000);

      try {
        send({ type: "start", total: jds.length });
        send({ type: "mapping", total: jds.length });

        const result = await getStructuredCompletion<{
          jobs: JobExtraction[];
          skills: ComparisonSkill[];
          summary: string;
        }>({
          system: SYSTEM,
          prompt: buildPrompt(jds, profile),
          schema: SKILL_MAP_RESULT_SCHEMA,
          schemaName: "skill_gap_map",
        });

        const extractions: JobExtraction[] = jds.map(
          (_, index) =>
            result.data.jobs[index] ?? {
              title: "Untitled posting",
              company: null,
              required: [],
              niceToHave: [],
            },
        );
        extractions.forEach((extraction, index) => {
          send({
            type: "posting",
            done: index + 1,
            total: jds.length,
            title: extraction.title,
            company: extraction.company,
          });
        });

        send({ type: "done", map: assemble(extractions, result.data, profile) });
      } catch (error) {
        // The status line is already 200 by the time anything can fail, so a
        // failure is an event rather than a status code.
        send({
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function buildPrompt(jds: string[], profile: CareerProfile | null): string {
  const postings = jds
    .map((jd, i) => `JOB POSTING ${i + 1}:\n"""\n${jd}\n"""`)
    .join("\n\n");

  const who = profile
    ? [
        `Current role: ${profile.currentRole ?? "unstated"}`,
        `Target role: ${profile.targetRole ?? "unstated"}`,
        `Experience: ${profile.yearsExperience ?? "unstated"} years, ${profile.seniority ?? "unstated"}`,
        "Skills (1-5, with their own evidence):",
        ...profile.skills.map((s) => `  - ${s.name} — ${s.proficiency}/5 — "${s.evidence}"`),
        "Notable work:",
        ...profile.notableProjects.map((p) => `  - ${p.name}: ${p.description}`),
      ].join("\n")
    : "No profile on file. Treat every skill as a gap, and say so in each reason.";

  return `THEIR PROFILE:\n${who}\n\n${jds.length} REAL JOB POSTINGS:\n\n${postings}`;
}

/**
 * Joins the two stages: the model's canonical skills, the real counts, and the
 * user's own proficiencies. Anything the model named that no posting actually
 * asked for is dropped — a station has to be earned by a real mention.
 */
function assemble(
  extractions: JobExtraction[],
  comparison: { skills: ComparisonSkill[]; summary: string },
  profile: CareerProfile | null,
): SkillMap {
  // Every raw mention, keyed by lower-cased raw name.
  const rawMentions = new Map<string, SkillMention[]>();
  extractions.forEach((jd, jdIndex) => {
    const add = (name: string, phrase: string, importance: Importance) => {
      const key = name.trim().toLowerCase();
      const list = rawMentions.get(key) ?? [];
      list.push({
        jdIndex,
        jdTitle: jd.title,
        company: jd.company,
        phrase,
        importance,
      });
      rawMentions.set(key, list);
    };
    jd.required.forEach((s) => add(s.name, s.phrase, "required"));
    jd.niceToHave.forEach((s) => add(s.name, s.phrase, "nice-to-have"));
  });

  const claimed = new Set<string>();
  const profileSkill = (name: string) =>
    profile?.skills.find(
      (s) =>
        s.name.toLowerCase() === name.toLowerCase() ||
        s.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(s.name.toLowerCase()),
    ) ?? null;

  const skills: MappedSkill[] = comparison.skills.map((skill) => {
    const keys = [skill.name, ...skill.aliases].map((a) => a.trim().toLowerCase());
    const mentions: SkillMention[] = [];

    for (const key of new Set(keys)) {
      // A raw name belongs to one canonical skill; first claim wins, so an
      // alias listed under two skills can't double-count a posting.
      if (claimed.has(key)) continue;
      const found = rawMentions.get(key);
      if (!found) continue;
      claimed.add(key);
      mentions.push(...found);
    }

    // One posting, one vote, even if it listed the skill twice.
    const byJd = new Map<number, SkillMention>();
    for (const m of mentions) {
      const existing = byJd.get(m.jdIndex);
      if (!existing || (existing.importance === "nice-to-have" && m.importance === "required")) {
        byJd.set(m.jdIndex, m);
      }
    }
    const deduped = [...byJd.values()].sort((a, b) => a.jdIndex - b.jdIndex);
    const matched = profileSkill(skill.name);

    return {
      id: slug(skill.name),
      name: skill.name,
      aliases: skill.aliases,
      status: skill.status,
      reason: skill.reason,
      whyItMatters: skill.whyItMatters,
      dependsOn: skill.dependsOn.map(slug),
      resources: skill.status === "have" ? [] : skill.resources.slice(0, 3),
      mentions: deduped,
      jdCount: deduped.length,
      importance: deduped.some((m) => m.importance === "required")
        ? "required"
        : "nice-to-have",
      userProficiency: matched?.proficiency ?? null,
    };
  });

  const real = skills.filter((s) => s.jdCount > 0);
  const ordered = [
    ...orderMainLine(real.filter((s) => s.status !== "have")),
    ...real
      .filter((s) => s.status === "have")
      .sort((a, b) => b.jdCount - a.jdCount || a.name.localeCompare(b.name)),
  ];

  return {
    originRole: profile?.currentRole ?? "Current role",
    targetRole: profile?.targetRole ?? extractions[0]?.title ?? "Target role",
    jobs: extractions.map((jd, index) => ({
      index,
      title: jd.title,
      company: jd.company,
    })),
    jdTotal: extractions.length,
    skills: ordered,
    summary: comparison.summary,
  };
}
