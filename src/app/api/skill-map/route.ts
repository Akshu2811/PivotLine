import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import type { CareerProfile } from "@/lib/profile";
import {
  type Importance,
  JD_EXTRACTION_BATCH_SCHEMA,
  type JobExtraction,
  type MappedSkill,
  MAX_JDS,
  orderMainLine,
  SKILL_COMPARISON_SCHEMA,
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
 * Two stages, because they are two different jobs:
 *
 *   1. Extract every posting's required / nice-to-have skills in a single
 *      call. Pure extraction, so low reasoning effort. This used to be one
 *      call per posting run concurrently; a single batched call is faster
 *      in practice (no per-call round-trip or concurrent-request queueing)
 *      and halves the number of model calls.
 *   2. Normalise the variations into canonical skills and rule each one gap /
 *      partial / have against the profile, with ordering and resources. That's
 *      judgement, so medium effort.
 *
 * Counting is not asked of the model at all. Stage two returns the aliases that
 * fold into each canonical skill; this route then matches those aliases back to
 * the stage-one extractions to derive how many postings asked for a skill and
 * which phrase each used. The demand tags are therefore arithmetic over the
 * real postings.
 *
 * The response is a stream of newline-delimited JSON events, so the screen can
 * announce real progress — each posting as it is actually read, then the
 * mapping stage — rather than animating a guess at how long this takes. A
 * heartbeat event keeps the stream from going idle during the long mapping
 * call, so nothing upstream mistakes the silence for a dead connection and
 * cuts it off before "done" ever arrives.
 */

/** Two model calls now instead of up to seven; the platform default would still cut it off. */
export const maxDuration = 120;

/** One line of NDJSON per event. The client renders these as announcements. */
export type SurveyEvent =
  | { type: "start"; total: number }
  | { type: "posting"; done: number; total: number; title: string; company: string | null }
  | { type: "mapping"; total: number }
  | { type: "heartbeat" }
  | { type: "done"; map: SkillMap }
  | { type: "error"; error: string };

const EXTRACT_SYSTEM = `You read several job postings and list the skills each one asks for, for a career-pivot tool.

Return one entry per posting in "jobs", in the SAME ORDER the postings are given — the first entry is posting 1, and so on, even if a posting is thin or oddly formatted. Never skip, merge or reorder postings.

For each posting:
- "required": skills the posting treats as necessary — in the requirements section, or phrased as "you have", "must", "strong", "X+ years".
- "niceToHave": skills phrased as bonus, plus, preferred, desirable, or "nice to have".
- Each skill "name" is the concrete, searchable thing: a technology, tool, technique or discipline ("RAG pipelines", "Docker", "evaluation", "stakeholder communication"). Two to three words, no sentences. Use the posting's own term — a later step normalises variations across postings, so do not try to standardise here.
- "phrase" is a SHORT VERBATIM QUOTE from the posting showing how it asked for that skill, at most 14 words. Never paraphrase, never invent a quote.
- Skip generic filler that applies to any job ("team player", "fast-paced environment", "bachelor's degree") unless it names a real competency.
- "title" is the role title and "company" the employer, or null if the posting does not say.`;

const COMPARE_SYSTEM = `You build a skill-gap map for someone pivoting careers. You are given their profile and the skills extracted from several real job postings for their target role.

Your job is to normalise and to judge. Do not count anything — counting is done elsewhere.

NORMALISE
- Fold variations into one canonical skill: "Python", "Python 3" and "production Python" are one skill; "RAG", "retrieval augmented generation" and "retrieval pipelines" are one skill; "pgvector", "Pinecone" and "vector store" are one skill ("Vector databases").
- "name" is the canonical form, at most three words where possible, as it will be printed on a metro station label.
- "aliases" MUST list every raw extracted name from the input that folds into this skill, copied EXACTLY as given. This is how the postings are matched back to the skill, so a missing alias silently loses a posting. Every raw name in the input belongs to exactly one canonical skill.
- Merge aggressively enough that the map is readable — aim for 8 to 14 canonical skills total — but never merge two genuinely different asks (retrieval is not evaluation; Docker is not Kubernetes).

JUDGE each canonical skill against the profile:
- "have": the profile shows they can already do this at the level the postings ask for.
- "partial": real but insufficient exposure — they script it but haven't shipped it, or did it once on a side project, or have an adjacent skill that transfers most of the way.
- "gap": nothing in the profile supports it.
- "reason" is one line, addressed to the user as "you", citing what in their profile drove the call ("You script confidently but have never shipped a Python service"). Never invent experience they didn't describe.
- "whyItMatters" is two or three sentences on why this role needs it, and where their background gives them an advantage or a shortcut. Concrete, not motivational.

ORDER
- "dependsOn" lists the canonical NAMES of skills that are genuinely prerequisite — you cannot build retrieval without the language it is written in. Only real dependencies; most skills have none. Never create a cycle.

RESOURCES
- Exactly 2 or 3 per skill with status gap or partial, and an EMPTY array for status have.
- Prefer first-party documentation, one well-known course or guide, and one concrete project that uses something from the user's own background. "kind" is one word: Docs, Course, Guide, Paper, Project. "why" is one line on why this resource specifically.
- Only name resources you are confident exist. A described project ("Port your alert bot to a typed service") is always safe; a specific course title you are unsure of is not.

"summary" is two sentences on what the postings agree about and where this person stands.`;

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

      // Keeps bytes flowing during the long single mapping call so an idle
      // connection is never mistaken for a dead one and cut before "done".
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 10_000);

      try {
        send({ type: "start", total: jds.length });

        // Stage one: every posting in one call. Announce each as it's
        // reported back, in order, so the board still fills one row at a
        // time even though the read itself wasn't incremental.
        const batch = await getStructuredCompletion<{ jobs: JobExtraction[] }>({
          system: EXTRACT_SYSTEM,
          prompt: jds.map((jd, index) => `JOB POSTING ${index + 1}:\n"""\n${jd}\n"""`).join("\n\n"),
          schema: JD_EXTRACTION_BATCH_SCHEMA,
          schemaName: "job_description_skills_batch",
        });

        const extractions: JobExtraction[] = jds.map(
          (_, index) =>
            batch.data.jobs[index] ?? { title: "Untitled posting", company: null, required: [], niceToHave: [] },
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

        // Stage two: normalise and judge, once, over everything.
        send({ type: "mapping", total: jds.length });
        const comparison = await getStructuredCompletion<{
          skills: ComparisonSkill[];
          summary: string;
        }>({
          system: COMPARE_SYSTEM,
          prompt: buildComparisonPrompt(extractions, profile),
          schema: SKILL_COMPARISON_SCHEMA,
          schemaName: "skill_gap_comparison",
          reasoningEffort: "medium",
        });

        send({ type: "done", map: assemble(extractions, comparison.data, profile) });
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

function buildComparisonPrompt(
  extractions: JobExtraction[],
  profile: CareerProfile | null,
): string {
  const postings = extractions
    .map((jd, i) => {
      const required = jd.required.map((s) => `    - ${s.name}`).join("\n") || "    (none)";
      const nice = jd.niceToHave.map((s) => `    - ${s.name}`).join("\n") || "    (none)";
      return `POSTING ${i + 1} — ${jd.title}${jd.company ? ` at ${jd.company}` : ""}\n  Required:\n${required}\n  Nice to have:\n${nice}`;
    })
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

  return `THEIR PROFILE:\n${who}\n\nSKILLS EXTRACTED FROM ${extractions.length} REAL POSTINGS (raw names, not yet normalised):\n\n${postings}`;
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
