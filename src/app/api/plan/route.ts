import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import { assemblePlan, type DraftPlan, MAX_WEEKS, MIN_WEEKS, PLAN_SCHEMA } from "@/lib/plan";
import { mainLine, type SkillMap } from "@/lib/skillMap";

/**
 * POST /api/plan
 *
 * Body: { map: SkillMap, hoursPerWeek: number }
 *
 * Builds the weekly timetable from the gap map. Planning, not extraction, so
 * this runs at medium reasoning effort per the project's effort rules.
 */

export const maxDuration = 120;

const SYSTEM = `You build a weekly learning plan for someone pivotting careers, from a gap analysis of real job postings.

You are given the stations still to clear, in the order the map puts them (foundations first, then by how many postings demanded them), with how many postings asked for each and where the person currently stands.

Rules:
- Produce between ${MIN_WEEKS} and ${MAX_WEEKS} weeks. Fewer weeks with real work beats more weeks padded out.
- Each week has ONE theme — a short phrase naming what changes about them that week ("Script to service", "Retrieval, first pass"). Not a restatement of the skill name.
- "stations" lists the station names this week covers, copied EXACTLY as given. One or two per week. Every station on the line must be covered by some week, and the highest-demand ones must come early enough to be finished.
- Respect the order you were given: a station that depends on another must not be scheduled before it.
- 2 to 4 tasks per week. Each is one concrete action with a verb and an object — something you could do on a Tuesday evening and know whether you did it. "Index your own runbooks: load, chunk, embed" not "Learn about RAG".
- Prefer tasks that build on what this person already does. Their existing strengths are given; a task that reuses them is worth two that don't.
- "hours" per task must be realistic, and EVERY WEEK'S TASK HOURS MUST SUM TO THE WEEKLY BUDGET OR JUST UNDER IT. Never exceed the budget. Use half hours.
- The last week should produce something demonstrable, not more reading.

"summary" is two sentences: the shape of the plan and why it is ordered that way.`;

type Body = { map?: SkillMap; hoursPerWeek?: number };

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

  // A plan has to fit a real budget; six hours is the sensible fallback when
  // the boarding pass never captured one.
  const hoursPerWeek =
    typeof body.hoursPerWeek === "number" && body.hoursPerWeek > 0
      ? Math.min(40, body.hoursPerWeek)
      : 6;

  const ahead = mainLine(map);
  if (ahead.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Every station on this line is already cleared." },
      { status: 400 },
    );
  }

  const stations = ahead
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} — ${s.status}, asked for by ${s.jdCount} of ${map.jdTotal} postings. Where they stand: ${s.reason}`,
    )
    .join("\n");

  const strengths = map.skills
    .filter((s) => s.status === "have")
    .map((s) => `- ${s.name}: ${s.reason}`)
    .join("\n");

  const prompt = `TARGET ROLE: ${map.targetRole}
CURRENT ROLE: ${map.originRole}
WEEKLY BUDGET: ${hoursPerWeek} hours per week — this is a hard ceiling.

STATIONS STILL TO CLEAR, in order:
${stations}

ALREADY STRONG (reuse these in the tasks where you can):
${strengths || "- nothing recorded"}`;

  try {
    const result = await getStructuredCompletion<DraftPlan>({
      system: SYSTEM,
      prompt,
      schema: PLAN_SCHEMA,
      schemaName: "weekly_learning_plan",
      reasoningEffort: "medium",
    });

    return NextResponse.json({
      ok: true,
      plan: assemblePlan(result.data, map, hoursPerWeek),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
