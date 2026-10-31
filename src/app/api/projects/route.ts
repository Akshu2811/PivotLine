import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import type { CareerProfile } from "@/lib/profile";
import { assembleProjects, type DraftProject, PROJECTS_SCHEMA } from "@/lib/projects";
import { mainLine, type SkillMap } from "@/lib/skillMap";

/**
 * POST /api/projects
 *
 * Body: { map: SkillMap, profile: CareerProfile | null, steer?: string }
 *
 * Three portfolio projects, each closing several gap stations at once. This is
 * judgement — what's worth building, what an interviewer will actually notice —
 * so it runs at medium reasoning effort.
 */

export const maxDuration = 120;

const SYSTEM = `You propose portfolio projects for someone pivoting careers, aimed at the gaps real job postings showed.

Propose EXACTLY THREE projects.

Each project must:
- Close SEVERAL gap stations at once, not one. List them in "stations", copied EXACTLY as the station names were given.
- Be scoped to one or two weekends. "weekends" is 1 or 2. If it cannot be finished in two weekends it is the wrong project — cut it down until it can.
- Use the person's OWN material and background wherever possible. Someone from support has runbooks, incident timelines and alert history; someone from finance has reconciliations. A project built on their own corpus is worth three generic tutorial clones, and you should say so.
- Have "stack" as 3 to 5 concrete technologies, favouring what the postings named.
- "pitch" is ONE sentence a person could send to a friend. No marketing language.
- "scope" says what each weekend produces, concretely.
- "hiringManagerNotices" is the specific thing an interviewer picks up on and why it separates them from other candidates. Be concrete about the contrast — what most applicants bring versus what this shows. Two sentences.
- "tasks" are the steps that go into the learning plan. Each has a "stationName" (one of this project's stations, copied exactly), the action, and realistic hours. One or two tasks per station, 2 to 4 tasks per project, each between 1 and 3 hours.

The three projects together should cover as much of the line as they reasonably can, and should differ in kind — not three variations of the same build.`;

type Body = {
  map?: SkillMap;
  profile?: CareerProfile | null;
  /** Optional steer dictated by the user, e.g. "something with evals". */
  steer?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const map = body.map;
  if (!map || !Array.isArray(map.skills) || map.skills.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Survey some job postings on The Line first." },
      { status: 400 },
    );
  }

  const ahead = mainLine(map);
  const profile = body.profile ?? null;
  const steer = (body.steer ?? "").trim().slice(0, 400);

  const gaps = ahead
    .map((s) => `- ${s.name} (${s.status}, ${s.jdCount}/${map.jdTotal} postings): ${s.reason}`)
    .join("\n");

  const background = profile
    ? [
        `Current role: ${profile.currentRole ?? "unstated"}`,
        `Strengths: ${profile.skills
          .filter((s) => s.proficiency >= 4)
          .map((s) => s.name)
          .join(", ") || "none recorded"}`,
        "Things they have actually built or run:",
        ...profile.notableProjects.map((p) => `  - ${p.name}: ${p.description}`),
        profile.constraints.hoursPerWeek
          ? `They have about ${profile.constraints.hoursPerWeek} hours a week.`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : `Current role: ${map.originRole}. No detailed profile on file.`;

  const prompt = `TARGET ROLE: ${map.targetRole}

GAP STATIONS TO CLOSE:
${gaps}

THEIR BACKGROUND AND MATERIAL:
${background}${steer ? `\n\nTHE USER ASKED SPECIFICALLY FOR: "${steer}" — honour this while keeping the rules above.` : ""}`;

  try {
    const result = await getStructuredCompletion<{ projects: DraftProject[] }>({
      system: SYSTEM,
      prompt,
      schema: PROJECTS_SCHEMA,
      schemaName: "portfolio_projects",
      reasoningEffort: "medium",
    });

    const projects = assembleProjects(
      result.data.projects.slice(0, 3),
      map.skills.map((s) => ({ id: s.id, name: s.name })),
    );

    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
