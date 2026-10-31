import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import { CHECK_IN_SCHEMA, type CheckInProposal } from "@/lib/checkIn";
import { type LearningPlan, weekStatus } from "@/lib/plan";
import type { SkillMap } from "@/lib/skillMap";

/**
 * POST /api/check-in
 *
 * Body: { transcript: string, plan: LearningPlan, map: SkillMap }
 *
 * Reads a spoken week report and proposes what moved and how the rest of the
 * plan should absorb it. Judgement — what counts as done, what to cut when the
 * week was short — so it runs at medium reasoning effort.
 *
 * It returns a PROPOSAL. Applying it is the user's decision, made against a
 * diff on the timetable.
 */

export const maxDuration = 120;

const SYSTEM = `You process a weekly check-in for someone working through a learning plan toward a career change.

They will tell you, in loose spoken language, how the week actually went: what they finished, what they skipped, what went wrong, and often how many hours they really had. Expect understatement and self-criticism; read what happened, not how they feel about it.

You are given the plan with every task's id and status, and the stations on their skill map.

Return the changes you propose:

- "taskMoves": tasks the check-in says are finished or half finished. Use the EXACT taskId and weekIndex given. "done" when they describe completing it; "partial" when they started it, got part way, or did it badly. Only include tasks the check-in actually speaks to.
- "stationMoves": a station moves to "have" only when the evidence is real completion of the work that station needed — not one course watched. Move it to "partial" when they made genuine progress but the station is not cleared. Use the EXACT station name. Most check-ins move zero or one station. Be strict here; this is the thing the map is judged on.
- "dropped": tasks in LATER weeks to remove, with the exact taskId. Drop something when the week was short on hours, when they have already covered it another way, or when it no longer serves the goal. Say which in the reason.
- "added": new tasks for LATER weeks. Add work when something was skipped and still matters, when a task needs a second pass, or when they hit a problem worth a dedicated task. Keep each week's total at or under their weekly budget — if the week was short, the honest move is usually to drop or defer rather than to pile on.
- Never add or drop anything in a week that is already done.
- If they say they had fewer hours than planned, take that seriously: reduce load in the coming weeks rather than assuming they will catch up.

"summary" is one line in their own terms on how the week went. "reason" is two or three sentences on why the remaining weeks now look the way they do — addressed to them as "you", specific about trade-offs.

Propose nothing you cannot ground in what they said. An empty change set is a valid answer when the check-in reports no progress.`;

type Body = {
  transcript?: string;
  plan?: LearningPlan;
  map?: SkillMap;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const transcript = (body.transcript ?? "").trim();
  const plan = body.plan;
  const map = body.map;

  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "Say how the week went first." },
      { status: 400 },
    );
  }
  if (!plan || !Array.isArray(plan.weeks) || plan.weeks.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Build a plan on the Timetable first." },
      { status: 400 },
    );
  }

  const weeks = plan.weeks
    .map((week) => {
      const status = weekStatus(plan, week.index);
      const tasks = week.tasks
        .map((t) => `    [${t.id}] (${t.status}, ${t.hours}h) ${t.text}`)
        .join("\n");
      return `WEEK ${week.index} — ${week.theme} [${status}] — stations: ${
        week.stationNames.join(", ") || "none"
      }\n${tasks}`;
    })
    .join("\n\n");

  const stations = map
    ? map.skills
        .map((s) => `- ${s.name} (currently: ${s.status})`)
        .join("\n")
    : "No skill map on file.";

  const prompt = `WEEKLY BUDGET: ${plan.hoursPerWeek} hours per week.

THE PLAN:
${weeks}

STATIONS ON THEIR MAP:
${stations}

THEIR CHECK-IN, as dictated:
"""
${transcript}
"""`;

  try {
    const result = await getStructuredCompletion<CheckInProposal>({
      system: SYSTEM,
      prompt,
      schema: CHECK_IN_SCHEMA,
      schemaName: "weekly_check_in",
      reasoningEffort: "medium",
    });

    return NextResponse.json({ ok: true, proposal: sanitize(result.data, plan) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/**
 * Drops anything that doesn't refer to something real. A proposal is applied to
 * the user's plan wholesale on accept, so a hallucinated task id must not reach
 * the diff — it would show up as a change that then silently does nothing.
 */
function sanitize(proposal: CheckInProposal, plan: LearningPlan): CheckInProposal {
  const taskIds = new Set(plan.weeks.flatMap((w) => w.tasks.map((t) => t.id)));
  const doneWeeks = new Set(
    plan.weeks.filter((w) => weekStatus(plan, w.index) === "done").map((w) => w.index),
  );
  const weekIndexes = new Set(plan.weeks.map((w) => w.index));

  return {
    ...proposal,
    taskMoves: (proposal.taskMoves ?? []).filter((m) => taskIds.has(m.taskId)),
    dropped: (proposal.dropped ?? []).filter(
      (d) => taskIds.has(d.taskId) && !doneWeeks.has(d.weekIndex),
    ),
    added: (proposal.added ?? []).filter(
      (a) => weekIndexes.has(a.weekIndex) && !doneWeeks.has(a.weekIndex) && a.hours > 0,
    ),
    stationMoves: proposal.stationMoves ?? [],
  };
}
